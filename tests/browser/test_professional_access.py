"""Professional V2 real browser journey with an ephemeral fake API.

No external requests, accounts, patient data or live production services.
The backend's actual authorization/encryption semantics are tested separately
by backend/tests/test_v2_remote_bridge.py.
"""
from __future__ import annotations

import json
import os
import threading
import unittest
import urllib.parse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("E2E_ARTIFACT_DIR", "test-artifacts/medper")).resolve()
OUT.mkdir(parents=True, exist_ok=True)


class ProfessionalFakeAPI(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def respond(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def auth(self):
        return self.headers.get("Authorization") == "Bearer browser-synthetic-token"

    def do_GET(self):
        if self.path == "/js/professional/config.js":
            body = (
                "export const MEDPER_PROFESSIONAL_API_ORIGIN = "
                + json.dumps(self.server.origin) + ";\n"
            ).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/javascript; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
            return
        if self.path == "/ready":
            return self.respond(200, {"status": "ready", "security": "ok", "fileStorage": "ready", "professionalAccess": "ready"})
        if self.path == "/auth/me":
            return self.respond(200 if self.auth() else 401,
                                {"id": "synthetic-user", "role": "perito", "email": "synthetic@example.com"}
                                if self.auth() else {"detail": "Unauthorized"})
        if self.path == "/cases":
            return self.respond(200 if self.auth() else 401,
                                [{"id": identifier, "title": item["payload"]["identity"]["title"]}
                                 for identifier, item in self.server.cases.items()]
                                if self.auth() else {"detail": "Unauthorized"})
        if self.path.startswith("/cases/") and self.path.endswith("/state"):
            identifier = self.path.split("/")[2]
            item = self.server.cases.get(identifier)
            return self.respond(200, item) if self.auth() and item else self.respond(404, {"detail": "Not found"})
        return super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length)
        if self.path == "/auth/token":
            fields = urllib.parse.parse_qs(data.decode("utf-8"))
            if fields.get("password") == ["synthetic-pass-12"] and fields.get("username") == ["synthetic@example.com"]:
                return self.respond(200, {"access_token": "browser-synthetic-token",
                                          "refresh_token": "browser-synthetic-refresh", "token_type": "bearer"})
            return self.respond(401, {"detail": "Unauthorized"})
        if self.path == "/cases/v2":
            if not self.auth():
                return self.respond(401, {"detail": "Unauthorized"})
            incoming = json.loads(data.decode("utf-8"))["payload"]
            identifier = "11111111-1111-4111-8111-111111111111"
            updated = {**incoming, "id": identifier}
            self.server.cases[identifier] = {"payload": updated, "revision": 1}
            return self.respond(201, {"id": identifier, "revision": 1})
        return self.respond(404, {"detail": "Not found"})

    def do_PUT(self):
        if not self.auth():
            return self.respond(401, {"detail": "Unauthorized"})
        identifier = self.path.split("/")[2]
        current = self.server.cases.get(identifier)
        if not current:
            return self.respond(404, {"detail": "Not found"})
        content = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        incoming = json.loads(content)
        if incoming["expectedRevision"] != current["revision"]:
            return self.respond(409, {"detail": "Revision conflict"})
        current["payload"] = incoming["payload"]
        current["revision"] += 1
        return self.respond(200, {"revision": current["revision"], "updatedAt": "now"})


class ProfessionalBrowserJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(
            ("127.0.0.1", 0), partial(ProfessionalFakeAPI, directory=str(ROOT))
        )
        cls.server.origin = "http://127.0.0.1:" + str(cls.server.server_port)
        cls.server.cases = {}
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def test_server_login_case_edit_reload_and_zero_browser_persistence(self):
        context = self.browser.new_context(viewport={"width": 1350, "height": 900})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            page.goto(self.server.origin + "/professional.html", wait_until="load")
            expect(page.locator("#login-form")).to_be_visible()
            self.assertEqual(page.locator("#app").is_visible(), False)
            page.locator("#email").fill("synthetic@example.com")
            page.locator("#password").fill("wrong-password")
            page.locator("#login-submit").click()
            expect(page.locator("#access-status")).to_contain_text("Acesso não autorizado")
            expect(page.locator("#app")).to_be_hidden()

            page.locator("#password").fill("synthetic-pass-12")
            page.locator("#login-submit").click()
            expect(page.locator(".dashboard h1")).to_have_text("Casos periciais", timeout=10000)
            expect(page.locator(".dashboard-safety")).to_contain_text("autenticada")
            expect(page.locator(".empty--cases h2")).to_have_text("Nenhum caso nesta conta")

            page.locator(".dashboard-hero button[data-action='new-case']").click()
            form = page.locator("#new-case-form")
            form.locator("[name=title]").fill("Caso QA - sem paciente")
            form.locator("[name=object]").fill("Demonstração totalmente sintética")
            form.locator("button.btn.primary").click()
            expect(page.locator(".case-mini strong")).to_have_text("Caso QA - sem paciente")
            page.locator('#sidebar button[data-step="history"]').click()
            field = page.locator('textarea[data-bind="history.summary"]')
            field.fill("História simulada e exclusiva da suíte E2E")
            expect(page.locator(".save-state")).to_have_text("Salvo no servidor", timeout=10000)
            page.locator('button[data-action="dashboard"]').click()
            self.assertEqual(len(self.server.cases), 1)
            saved = next(iter(self.server.cases.values()))
            self.assertEqual(saved["payload"]["history"]["summary"],
                             "História simulada e exclusiva da suíte E2E")

            self.assertEqual(page.evaluate("localStorage.length"), 0)
            self.assertEqual(page.evaluate("indexedDB.databases().then(x => x.length)"), 0)

            # Session is deliberately memory-only, so a reload MUST require
            # reauthentication; it must not silently fall back to local V2.
            page.reload(wait_until="load")
            expect(page.locator("#login-form")).to_be_visible()
            expect(page.locator("#app")).to_be_hidden()
            page.locator("#email").fill("synthetic@example.com")
            page.locator("#password").fill("synthetic-pass-12")
            page.locator("#login-submit").click()
            expect(page.locator('[data-open-case]')).to_have_count(1)
            page.locator('[data-open-case]').first.click()
            page.locator('#sidebar button[data-step="history"]').click()
            expect(page.locator('textarea[data-bind="history.summary"]')).to_have_value(
                "História simulada e exclusiva da suíte E2E"
            )
            self.assertEqual(errors, [])
            page.screenshot(path=str(OUT / "professional-server-backed-synthetic.png"), full_page=True)
        finally:
            context.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
