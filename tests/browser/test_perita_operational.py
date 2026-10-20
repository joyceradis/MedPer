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


    def test_06_evidence_chain_to_quesitos_and_printed_document(self):
        """Simulated perita: source first, then assertion and question; no invented conclusion."""
        self.create_demo_case()
        self.page.locator('#sidebar button[data-step="analysis"]').click()
        self.page.locator('button[data-action="add-claim"]').click()
        expect(self.page.locator("#toast")).to_contain_text("Cadastre ao menos uma fonte")

        self.page.locator('#sidebar button[data-step="sources"]').click()
        self.page.locator('button[data-action="add-source"]').click()
        form = self.page.locator("#edit-form")
        expect(form).to_be_visible()
        form.locator('[name="type"]').select_option("documento_autos")
        form.locator('[name="title"]').fill("Documento fictício de demonstração")
        form.locator('[name="origin"]').fill("Autos simulados, página fictícia 12")
        form.locator('[name="notes"]').fill("Este documento é inventado para QA.")
        form.get_by_role("button", name="Salvar").click()
        expect(self.page.locator("#workspace")).to_contain_text("Documento fictício de demonstração")

        self.page.locator('#sidebar button[data-step="analysis"]').click()
        self.page.locator('button[data-action="add-claim"]').click()
        form = self.page.locator("#edit-form")
        expect(form).to_be_visible()
        self.assertIn("Documento fictício de demonstração",
                      form.locator('[name="sourceId"]').inner_text())
        form.locator('[name="statement"]').fill("Fato documentado apenas em fonte simulada")
        form.locator('[name="finding"]').fill("Achado descritivo fictício")
        form.locator('[name="interpretation"]').fill("Hipótese de demonstração, sem conclusão causal")
        form.locator('[name="limitations"]').fill("Sem exame ou material real")
        form.get_by_role("button", name="Salvar").click()
        expect(self.page.locator("#workspace")).to_contain_text("Documento fictício de demonstração")
        expect(self.page.locator("#workspace")).to_contain_text("Sem exame ou material real")
        self.page.locator('textarea[data-bind="analysis.reasoning"]').fill(
            "Exercício fictício com fonte e limitações explícitas."
        )

        self.page.locator('#sidebar button[data-step="questions"]').click()
        self.page.locator('button[data-action="add-question"]').click()
        expect(self.page.locator('[data-list-bind="questions"][data-key="question"]')).to_have_count(1)
        self.page.locator('[data-list-bind="questions"][data-key="origin"]').fill("Quesito simulado do juízo")
        self.page.locator('[data-list-bind="questions"][data-key="question"]').fill("Há nexo demonstrado nos dados fictícios?")
        self.page.locator('[data-list-bind="questions"][data-key="answer"]').fill(
            "Indeterminado: o cenário de teste não contém evidência clínica suficiente."
        )
        self.page.locator('#sidebar button[data-step="document"]').click()
        expect(self.page.locator("#workspace")).to_contain_text("A conclusão ainda não foi preenchida.")
        with self.page.expect_popup() as popup_info:
            self.page.locator('button[data-action="print"]').click()
        popup = popup_info.value
        expect(popup.locator("body")).to_contain_text("Documento fictício de demonstração")
        expect(popup.locator("body")).to_contain_text("Quesito simulado do juízo")
        expect(popup.locator("body")).to_contain_text("Sem exame ou material real")
        expect(popup.locator("body")).to_contain_text("Indeterminado")
        self.assertNotIn("Existe nexo comprovado", popup.locator("body").inner_text())
        pdf = popup.pdf(format="A4", print_background=True)
        self.assertTrue(pdf.startswith(b"%PDF-"))
        (OUT / "medper-synthetic-document.pdf").write_bytes(pdf)
        popup.close()

        self.page.locator('button[data-action="dashboard"]').click()
        self.page.reload(wait_until="load")
        self.page.locator('[data-open-case]').first.click()
        self.page.locator('#sidebar button[data-step="questions"]').click()
        expect(self.page.locator('[data-list-bind="questions"][data-key="answer"]')).to_have_value(
            "Indeterminado: o cenário de teste não contém evidência clínica suficiente."
        )

    def test_07_posas_and_aipe_are_independent_and_never_choose_clinical_judgment(self):
        """A scar route shows POSAS + AIPE, but does not derive one score from the other."""
        self.create_demo_case()
        self.page.locator('textarea[data-bind="context.object"]').fill(
            "Analisar cicatriz em cenário fictício e eventual dano estético."
        )
        self.page.locator('#sidebar button[data-step="methods"]').click()
        expect(self.page.locator("#workspace")).to_contain_text("AIPE — registro estruturado")
        expect(self.page.locator("#workspace")).to_contain_text("POSAS 2.0")
        aipe = self.page.locator('input[data-method="aipe"][data-key="score"]')
        posas = self.page.locator('input[data-method="posas"][data-key^="posasPatient_"]')
        expect(aipe).to_have_value("")
        self.assertGreater(posas.count(), 1)
        posas.first.fill("4")
        expect(aipe).to_have_value("")  # POSAS must not populate the AIPE score.
        expect(self.page.locator("#workspace")).to_contain_text("incompleto")
        aipe.fill("17")  # Independent dummy entry; NOT a method-derived value.
        self.page.locator('#sidebar button[data-step="summary"]').click()
        self.page.locator('#sidebar button[data-step="methods"]').click()
        expect(aipe).to_have_value("17")
        expect(posas.first).to_have_value("4")
        self.page.locator('#sidebar button[data-step="document"]').click()
        with self.page.expect_popup() as popup_info:
            self.page.locator('button[data-action="print"]').click()
        popup = popup_info.value
        try:
            expect(popup.locator("body")).to_contain_text("AIPE")
            expect(popup.locator("body")).to_contain_text("POSAS 2.0")
        finally:
            popup.close()

    def test_08_backup_duplicate_import_does_not_overwrite_case(self):
        """Backup must be recoverable yet fail closed for duplicate case identifiers."""
        self.create_demo_case()
        self.page.locator('#sidebar button[data-step="document"]').click()
        self.page.once("dialog", lambda dialog: dialog.accept())
        with self.page.expect_download() as download_event:
            self.page.locator('button[data-action="backup"]').click()
        backup = download_event.value
        self.assertTrue(backup.suggested_filename.endswith(".json"))
        backup_path = OUT / "medper-synthetic-backup.json"
        backup.save_as(str(backup_path))
        saved = json.loads(backup_path.read_text(encoding="utf-8"))
        self.assertEqual(saved["schemaVersion"], 2)
        self.page.locator('button[data-action="dashboard"]').click()
        expect(self.page.locator('[data-open-case]')).to_have_count(1)
        self.page.locator('button[data-action="import"]').click()
        self.page.locator("#import-file").set_input_files(str(backup_path))
        expect(self.page.locator("#toast")).to_contain_text("Já existe um caso", timeout=10000)
        expect(self.page.locator('[data-open-case]')).to_have_count(1)
        self.page.reload(wait_until="load")
        expect(self.page.locator('[data-open-case]')).to_have_count(1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
