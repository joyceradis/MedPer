"""Read-only smoke test of the real PUBLIC Pages URL, separate from branch E2E.

This makes no accounts, submissions, clicks that modify state, or case records.
It does not claim the public preview is safe for real patient/process data.
"""
import os
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

URL = "https://joyceradis.github.io/MedPer/"
OUT = Path(os.environ.get("PUBLIC_SMOKE_OUTPUT", "test-artifacts/production")).resolve()
OUT.mkdir(parents=True, exist_ok=True)


class PublicEntrypoint(unittest.TestCase):
    def test_landing_and_demo_route_are_visibly_reachable(self):
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1365, "height": 900})
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            landing = page.goto(URL, wait_until="domcontentloaded", timeout=25000)
            self.assertIsNotNone(landing, "Pages landing returned no HTTP response")
            self.assertEqual(landing.status, 200, "Public Pages landing must return 200")
            expect(page.locator("#hero-title")).to_be_visible(timeout=15000)
            expect(page.locator('a[href="./app.html"]').first).to_be_visible()
            page.screenshot(path=str(OUT / "live-landing.png"), full_page=True, animations="disabled")

            demo = page.goto(URL + "app.html", wait_until="load", timeout=25000)
            self.assertIsNotNone(demo, "Pages demo returned no HTTP response")
            self.assertEqual(demo.status, 200, "Published V2 must return 200")
            expect(page.locator("#app")).to_be_visible(timeout=15000)
            # A protected edition may present a genuine sign-in UI in future.
            # Today the published V2 should either show its known demo dashboard,
            # or an explicit sign-in state, never an empty spinner or script error.
            visible = page.locator("body").inner_text().strip()
            self.assertTrue(
                any(term in visible for term in (
                    "Casos periciais", "Entrar", "Iniciar sessão", "Fazer login",
                    "Autenticação necessária", "Acesso restrito"
                )),
                "Published app lacks both a working demonstration and a clear login state",
            )
            self.assertNotIn("Não foi possível iniciar o MedPer", visible,
                             "Live app failed to initialize")
            self.assertFalse(errors, "Live JavaScript errors: " + str(errors))
            page.screenshot(path=str(OUT / "live-app.png"), full_page=True, animations="disabled")
            context.close()
            browser.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
