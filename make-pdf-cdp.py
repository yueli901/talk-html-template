#!/usr/bin/env python3
"""Export slides.pdf from index.html using reveal's native print view.

The template's Chrome fallback prints too early: reveal builds its .pdf-page
layout in an async coroutine (three requestAnimationFrame yields) that has not
finished when --print-to-pdf fires, so the output is blank. This drives Chrome
over the DevTools Protocol instead, waits until the .pdf-page elements exist and
KaTeX has rendered, then calls Page.printToPDF. Pure standard library, no Node.

Usage:  python3 make-pdf-cdp.py [--port 8134] [--out slides.pdf]
"""
import base64, json, os, shutil, socket, struct, subprocess, sys, tempfile, time, urllib.request, http.server, threading, functools

HERE = os.path.dirname(os.path.abspath(__file__))
HTTP_PORT = 8134
DBG_PORT = 9333
OUT = os.path.join(HERE, "slides.pdf")
CHROME = os.environ.get("CHROME", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

# ---- minimal websocket client (client frames must be masked) ----------------
class WS:
    def __init__(self, url):
        assert url.startswith("ws://")
        host_port, self.path = url[5:].split("/", 1)
        self.path = "/" + self.path
        self.host, self.port = host_port.split(":")
        self.sock = socket.create_connection((self.host, int(self.port)))
        key = base64.b64encode(os.urandom(16)).decode()
        req = (f"GET {self.path} HTTP/1.1\r\nHost: {self.host}:{self.port}\r\n"
               "Upgrade: websocket\r\nConnection: Upgrade\r\n"
               f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n")
        self.sock.sendall(req.encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.sock.recv(4096)
        assert b"101" in buf.split(b"\r\n")[0], buf[:80]

    def _recvall(self, n):
        b = b""
        while len(b) < n:
            chunk = self.sock.recv(n - len(b))
            if not chunk:
                raise ConnectionError("socket closed")
            b += chunk
        return b

    def send(self, obj):
        data = json.dumps(obj).encode()
        hdr = bytearray([0x81])  # FIN + text
        n = len(data)
        mask = os.urandom(4)
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126); hdr += struct.pack(">H", n)
        else:
            hdr.append(0x80 | 127); hdr += struct.pack(">Q", n)
        hdr += mask
        masked = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        self.sock.sendall(bytes(hdr) + masked)

    def recv(self):
        # reassemble one logical message across continuation frames
        payload = b""
        while True:
            b0, b1 = self._recvall(2)
            fin = b0 & 0x80
            opcode = b0 & 0x0F
            masked = b1 & 0x80
            ln = b1 & 0x7F
            if ln == 126:
                ln = struct.unpack(">H", self._recvall(2))[0]
            elif ln == 127:
                ln = struct.unpack(">Q", self._recvall(8))[0]
            mask = self._recvall(4) if masked else b""
            data = self._recvall(ln)
            if masked:
                data = bytes(c ^ mask[i % 4] for i, c in enumerate(data))
            if opcode == 0x9:      # ping -> pong, keep reading
                self.sock.sendall(b"\x8A\x00"); continue
            if opcode == 0x8:      # close
                raise ConnectionError("ws closed by peer")
            payload += data
            if fin:
                return payload

    def call(self, _id, method, params=None):
        self.send({"id": _id, "method": method, "params": params or {}})
        while True:
            msg = json.loads(self.recv())
            if msg.get("id") == _id:
                if "error" in msg:
                    raise RuntimeError(f"{method}: {msg['error']}")
                return msg.get("result", {})

# ---- serve the folder statically -------------------------------------------
def serve(port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=HERE)
    httpd = http.server.HTTPServer(("127.0.0.1", port), handler)
    httpd.log_message = lambda *a, **k: None
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def main():
    args = sys.argv[1:]
    global HTTP_PORT, OUT
    if "--port" in args: HTTP_PORT = int(args[args.index("--port")+1])
    if "--out" in args:  OUT = args[args.index("--out")+1]

    httpd = serve(HTTP_PORT)
    url = f"http://127.0.0.1:{HTTP_PORT}/index.html?print-pdf"
    # fresh profile every run: the deck registers a service worker, and a reused
    # profile would serve a previously exported deck from cache on the same origin
    profile = tempfile.mkdtemp(prefix="cdp_profile_")
    chrome = subprocess.Popen(
        [CHROME, "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
         f"--remote-debugging-port={DBG_PORT}", f"--user-data-dir={profile}", "about:blank"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        # wait for the debugger, then find the page target
        ws_url = None
        for _ in range(60):
            try:
                data = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{DBG_PORT}/json").read())
                pages = [t for t in data if t.get("type") == "page"]
                if pages:
                    ws_url = pages[0]["webSocketDebuggerUrl"]; break
            except Exception:
                pass
            time.sleep(0.25)
        if not ws_url:
            raise RuntimeError("Chrome DevTools endpoint not reachable")

        ws = WS(ws_url)
        ws.call(1, "Page.enable")
        ws.call(2, "Runtime.enable")
        ws.call(3, "Page.navigate", {"url": url})

        # wait until reveal has built .pdf-page AND KaTeX has rendered, and both are stable
        prev = (-1, -1); stable = 0; built = False
        for _ in range(80):  # up to ~24 s
            r = ws.call(100, "Runtime.evaluate", {
                "expression": "JSON.stringify([document.querySelectorAll('.pdf-page').length,"
                              "document.querySelectorAll('.katex').length])",
                "returnByValue": True})
            try:
                pages, katex = json.loads(r["result"]["value"])
            except Exception:
                pages, katex = 0, 0
            if pages > 0 and (pages, katex) == prev:
                stable += 1
                if stable >= 3:
                    built = True; break
            else:
                stable = 0
            prev = (pages, katex)
            time.sleep(0.3)
        if not built:
            print(f"warning: proceeding with pdf-pages={prev[0]}, katex={prev[1]}", file=sys.stderr)

        res = ws.call(200, "Page.printToPDF", {
            "printBackground": True, "preferCSSPageSize": True,
            "marginTop": 0, "marginBottom": 0, "marginLeft": 0, "marginRight": 0})
        pdf = base64.b64decode(res["data"])
        with open(OUT, "wb") as f:
            f.write(pdf)
        print(f"wrote {OUT} ({len(pdf)} bytes); pdf-pages={prev[0]}, katex spans={prev[1]}")
    finally:
        chrome.terminate()
        try: chrome.wait(timeout=5)
        except Exception: chrome.kill()
        httpd.shutdown()
        shutil.rmtree(profile, ignore_errors=True)

if __name__ == "__main__":
    main()
