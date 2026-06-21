#!/usr/bin/env python3
"""Static server for Vorbraut 14 that disables browser caching, so every
reload always shows the latest version (no more stale-cache surprises).

Run:  python3 serve.py        (then open http://localhost:5173)
Stop: Ctrl+C
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass  # quiet


class Server(socketserver.TCPServer):
    allow_reuse_address = True


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"Vorbraut 14 — http://localhost:{PORT}  (no cache; Ctrl+C to stop)")
    httpd.serve_forever()
