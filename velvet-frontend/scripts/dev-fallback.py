#!/usr/bin/env python3
"""Dev fallback: serve dist/ + proxy /api quando Vite sul Desktop/iCloud non risponde."""
from __future__ import annotations

import http.server
import os
import socketserver
import sys
import urllib.error
import urllib.request
from pathlib import Path

PORT = int(os.environ.get("VELVET_DEV_PORT", "5173"))
API_TARGET = os.environ.get("VELVET_PROXY_API_TARGET", "http://127.0.0.1:8080").rstrip("/")
DIST = Path(__file__).resolve().parent.parent / "dist"


class DevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def _proxy(self) -> None:
        target = f"{API_TARGET}{self.path}"
        length = int(self.headers.get("Content-Length", "0") or "0")
        body = self.rfile.read(length) if length else None
        headers = {k: v for k, v in self.headers.items() if k.lower() not in {"host", "connection"}}
        req = urllib.request.Request(target, data=body, headers=headers, method=self.command)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                self.send_response(resp.status)
                for key, value in resp.headers.items():
                    if key.lower() not in {"transfer-encoding", "connection", "content-encoding"}:
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(resp.read())
        except urllib.error.HTTPError as err:
            self.send_response(err.code)
            self.end_headers()
            self.wfile.write(err.read())
        except Exception as err:  # noqa: BLE001
            msg = f"Proxy error: {err}".encode()
            self.send_response(502)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_GET(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        path = DIST / self.path.lstrip("/").split("?", 1)[0]
        if self.path != "/" and not path.exists():
            self.path = "/index.html"
        super().do_GET()

    def do_HEAD(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        super().do_HEAD()

    def do_OPTIONS(self) -> None:
        if self.path.startswith("/api"):
            self.send_response(204)
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_POST(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        self.send_error(405)

    def do_PUT(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        self.send_error(405)

    def do_PATCH(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        self.send_error(405)

    def do_DELETE(self) -> None:
        if self.path.startswith("/api"):
            self._proxy()
            return
        self.send_error(405)


def main() -> None:
    if not DIST.is_dir():
        sys.stderr.write(f"Missing dist/: {DIST}\nRun: npm run build\n")
        sys.exit(1)
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), DevHandler) as httpd:
        sys.stderr.write(
            f"Velvet dev fallback → http://127.0.0.1:{PORT}\n"
            f"  static: {DIST}\n"
            f"  /api → {API_TARGET}\n"
        )
        httpd.serve_forever()


if __name__ == "__main__":
    main()
