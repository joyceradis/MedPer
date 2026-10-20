"""Real browser regression: MedPer V2's operational path from a perita's perspective.

Only fictitious values. No contact with GitHub Pages, real records, or credentials.
The workflow mimics tasks, not a person's clinical judgments or identity.
"""
from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
import unittest

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(os.environ.get("E2E_ARTIFACT_DIR", "test-artifacts/medper")).resolve()
OUT.mkdir(parents=True, exist_ok=True)

STEPS = (
    "Resumo", "Objeto e contexto", "Autos e fontes", "Cronologia",
    "História e antecedentes", "Exame pericial", "Método e instrumentos",
    "Análise médico-pericial", "Quesitos", "Conclusão", "Documento final",
)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

class PeritaOperationalJourney(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        server_handler = partial(QuietHandler, directory=str(ROOT))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), server_handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = "http://127.0.0.1:" + str(cls.server.server_port) + "/app.html"
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(locale="pt-BR", viewport={"width": 1365, "height": 900},
                                                accept_downloads=True)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(self.url, wait_until="load")
        expect(self.page.locator(".dashboard h1")).to_have_text("Casos periciais", timeout=10000)

    def tearDown(self):
        try:
            title = self.id().split(".")[-1]
            self.page.screenshot(path=str(OUT / f"{title}.png"), full_page=True, animations="disabled")
            (OUT / f"{title}.json").write_text(
                json.dumps({"page_errors": self.errors}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            self.assertFalse(self.errors, "Browser JavaScript errors: " + str(self.errors))
        finally:
            self.context.close()

    def create_demo_case(self):
        self.page.locator('button[data-action="new-case"]').first.click()
        form = self.page.locator("#new-case-form")
        expect(form).to_be_visible()
        form.locator('input[name="title"]').fill("CASO FICTICIO - DANO ESTETICO")
        form.locator('select[name="professionalRole"]').select_option("perita_judicial")
        form.locator('select[name="context"]').select_option("civel")
        form.locator('textarea[name="object"]').fill("Analisar dano estético em cenário inteiramente fictício.")
        form.locator('button[type="submit"], button.btn.primary').click()
        expect(self.page.locator(".case-mini strong")).to_have_text("CASO FICTICIO - DANO ESTETICO")
        expect(self.page.locator("#sidebar button[data-step]")).to_have_count(len(STEPS))

    def test_01_startup_without_fake_login_and_desktop_ui(self):
        self.assertIn("MedPer V2", self.page.title())
        expect(self.page.locator("h1")).to_have_text("Casos periciais")
        self.assertEqual(self.page.locator('input[type="password"]').count(), 0)
        expect(self.page.locator('button[data-action="new-case"]').first).to_be_visible()
        self.assertLessEqual(self.page.evaluate("document.documentElement.scrollWidth - innerWidth"), 2)

    def test_02_case_navigation_saves_and_reopens_after_reload(self):
        self.create_demo_case()
        self.assertEqual(self.page.locator("#sidebar button[data-step]").all_inner_texts().__len__(), len(STEPS))
        for step_id in ["context", "sources", "timeline", "history", "exam", "methods", "analysis", "questions", "conclusion", "document"]:
            self.page.locator(f'#sidebar button[data-step="{step_id}"]').click()
            expect(self.page.locator(".content h1")).to_be_visible()
        self.page.locator('#sidebar button[data-step="context"]').click()
        question = self.page.locator('textarea[data-bind="analysis.medicoLegalQuestion"]')
        question.fill("Questão técnico-pericial fictícia, sem conclusão automatizada.")
        expect(self.page.locator(".save-state")).to_have_text("Salvo localmente", timeout=15000)
        self.page.locator('button[data-action="dashboard"]').click()
        expect(self.page.locator('[data-open-case]')).to_have_count(1)
        self.page.reload(wait_until="load")
        expect(self.page.locator('[data-open-case]')).to_have_count(1, timeout=10000)
        self.page.locator('[data-open-case]').first.click()
        self.page.locator('#sidebar button[data-step="context"]').click()
        expect(self.page.locator('textarea[data-bind="analysis.medicoLegalQuestion"]')).to_have_value(
            "Questão técnico-pericial fictícia, sem conclusão automatizada."
        )

    def test_03_no_conclusion_without_professional_documentation(self):
        self.create_demo_case()
        self.page.locator('#sidebar button[data-step="summary"]').click()
        expect(self.page.locator("#workspace")).to_contain_text("Nenhuma fonte/autos cadastrados")
        expect(self.page.locator("#workspace")).to_contain_text("Exame pericial ainda não registrado")
        self.page.locator('#sidebar button[data-step="conclusion"]').click()
        expect(self.page.locator('textarea[data-bind="conclusion.summary"]')).to_have_value("")
        expect(self.page.locator("#workspace")).to_contain_text("O MedPer não decide por você")
        self.page.locator('#sidebar button[data-step="questions"]').click()
        expect(self.page.locator("#workspace")).to_contain_text("Nenhum quesito cadastrado")

    def test_04_mobile_navigation_without_horizontal_overflow(self):
        self.page.set_viewport_size({"width": 390, "height": 844})
        self.page.reload(wait_until="load")
        expect(self.page.locator(".dashboard h1")).to_be_visible()
        expect(self.page.locator('button[data-action="new-case"]').first).to_be_visible()
        self.assertLessEqual(
            self.page.evaluate("document.documentElement.scrollWidth - innerWidth"), 2,
            "MedPer overflow on iPhone-sized viewport"
        )
        self.create_demo_case()
        expect(self.page.locator('button[data-action="menu"]')).to_be_visible()
        self.page.locator('button[data-action="menu"]').click()
        expect(self.page.locator('#sidebar button[data-step="context"]')).to_be_visible()


    def test_05_visual_identity_includes_canonical_sidebar_and_facet_icon(self):
        self.create_demo_case()
        sidebar_background = self.page.locator(".sidebar").evaluate(
            "(el) => getComputedStyle(el).backgroundImage"
        )
        self.assertIn("linear-gradient(", sidebar_background,
                      "V2 must preserve the approved blue-to-navy sidebar, not revert to white")
        logo = self.page.locator(".brand").evaluate(
            "(el) => getComputedStyle(el, '::before').backgroundImage"
        )
        self.assertIn("icon.svg", logo, "MedPer facet brand mark has gone missing")
        active_color = self.page.locator(".step.active").evaluate(
            "(el) => getComputedStyle(el).color"
        )
        self.assertIn("255", active_color, "Active navigation must remain readable over the navy sidebar")


if __name__ == "__main__":
    unittest.main(verbosity=2)
