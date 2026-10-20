"""Real browser regression for the V2 experience layer (js/v2/ui-experience.js).

Covers real startup in the browser, the command palette, keyboard shortcuts,
focus handling, listener duplication across renders, dark-theme contrast,
print, reduced motion and the local-storage boundary. Fictitious data only.
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

CONTRAST_JS = """
([selector, property]) => {
  const parse = value => value.match(/[\\d.]+/g).slice(0, 3).map(Number);
  const luminance = rgb => {
    const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const element = document.querySelector(selector);
  const fg = parse(getComputedStyle(element).color);
  let node = element, bg = null;
  while (node && !bg) {
    const style = getComputedStyle(node);
    const color = style[property || 'backgroundColor'];
    if (color && !/rgba\\(.*,\\s*0\\)$/.test(color) && color !== 'transparent') bg = parse(color);
    node = node.parentElement;
  }
  const [a, b] = [luminance(fg), luminance(bg || [255, 255, 255])].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}
"""


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class ExperienceLayer(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        handler = partial(QuietHandler, directory=str(ROOT))
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
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

    def open(self, **context_options):
        self.context = self.browser.new_context(locale="pt-BR", viewport={"width": 1365, "height": 900}, **context_options)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.goto(self.url, wait_until="load")
        expect(self.page.locator(".dashboard h1")).to_have_text("Casos periciais", timeout=10000)
        return self.page

    def tearDown(self):
        if not hasattr(self, "context"):
            return
        try:
            title = self.id().split(".")[-1]
            self.page.screenshot(path=str(OUT / f"experience_{title}.png"), full_page=True, animations="disabled")
            (OUT / f"experience_{title}.json").write_text(
                json.dumps({"page_errors": self.errors}, ensure_ascii=False, indent=2), encoding="utf-8")
            self.assertFalse(self.errors, "Browser JavaScript errors: " + str(self.errors))
        finally:
            self.context.close()

    def create_case(self, title="CASO FICTICIO - EXPERIENCIA", deadline=""):
        page = self.page
        page.locator('button[data-action="new-case"]').first.click()
        form = page.locator("#new-case-form")
        expect(form).to_be_visible()
        form.locator('input[name="title"]').fill(title)
        if deadline:
            form.locator('input[name="reportDeadline"]').fill(deadline)
        form.locator('textarea[name="object"]').fill("Objeto inteiramente fictício para teste de interface.")
        form.locator("button.btn.primary").click()
        expect(page.locator(".case-mini strong")).to_have_text(title)

    def palette_count(self):
        return self.page.locator("#command-palette").count()

    # ---------- startup and rendering ----------

    def test_real_startup_renders_insights_once_and_survives_rerenders(self):
        page = self.open()
        expect(page.locator(".insight-strip .insight")).to_have_count(4)
        self.create_case(deadline="2020-01-01")
        expect(page.locator(".case-progress-value")).to_contain_text("%")
        for _ in range(3):
            page.locator('button[data-action="dashboard"]').click()
            expect(page.locator(".insight-strip")).to_have_count(1)
            page.locator(".case-card").first.click()
            expect(page.locator(".case-mini")).to_be_visible()
        page.locator('button[data-action="dashboard"]').click()
        expect(page.locator(".scroll-progress")).to_have_count(1)
        expect(page.locator('.insight.is-danger .insight-value')).to_have_text("1")

        # One install only: a single shortcut press opens exactly one palette,
        # and a click produces at most one ripple.
        page.keyboard.press("Control+k")
        expect(page.locator("#command-palette")).to_have_count(1)
        page.keyboard.press("Escape")
        page.locator('button[data-action="new-case"]').first.dispatch_event("pointerdown", {"clientX": 10, "clientY": 10})
        self.assertLessEqual(page.locator('button[data-action="new-case"] .ripple').count(), 1)

    def test_step_progress_follows_typing(self):
        page = self.open()
        self.create_case()
        page.locator('button[data-step="exam"]').click()
        expect(page.locator('button[data-step="exam"]')).to_have_attribute("data-progress", "empty")
        page.locator('textarea[data-bind="examination.summary"]').fill("Achado fictício descrito para teste.")
        expect(page.locator('button[data-step="exam"]')).to_have_attribute("data-progress", "partial")
        expect(page.locator('textarea[data-bind="examination.summary"] ~ .word-count')).to_have_text("5 palavras")

    def test_textareas_stay_scrollable_when_not_autosized_or_capped(self):
        page = self.open()
        page.locator('button[data-action="new-case"]').first.click()
        modal_area = page.locator('#new-case-form textarea[name="object"]')
        modal_area.fill("linha fictícia\n" * 40)
        self.assertNotEqual(modal_area.evaluate("el => getComputedStyle(el).overflowY"), "hidden")
        page.keyboard.press("Escape")
        self.create_case()
        area = page.locator('textarea[data-bind="context.object"]')
        area.fill("linha curta")
        self.assertEqual(area.evaluate("el => getComputedStyle(el).overflowY"), "hidden")
        area.fill("linha fictícia\n" * 80)
        self.assertEqual(area.evaluate("el => getComputedStyle(el).overflowY"), "auto")
        self.assertLessEqual(area.evaluate("el => el.getBoundingClientRect().height"), 641)

    # ---------- palette, focus and shortcuts ----------

    def test_palette_opens_with_ctrl_and_meta_and_restores_focus(self):
        page = self.open()
        search = page.locator("#case-search")
        search.focus()
        page.keyboard.press("Control+k")
        expect(page.locator("#palette-input")).to_be_focused()
        page.keyboard.press("Tab")
        expect(page.locator("#palette-input")).to_be_focused()
        page.keyboard.press("Escape")
        self.assertEqual(self.palette_count(), 0)
        expect(search).to_be_focused()

        page.keyboard.press("Meta+k")
        expect(page.locator("#palette-input")).to_be_focused()
        page.locator("#command-palette").click(position={"x": 5, "y": 5})
        self.assertEqual(self.palette_count(), 0)

    def test_palette_navigates_steps_and_hides_destructive_actions(self):
        page = self.open()
        self.create_case()
        page.keyboard.press("Control+k")
        labels = page.locator(".palette-item").all_inner_texts()
        self.assertIn("Exame pericial", labels)
        self.assertNotIn("Excluir caso", labels)
        page.locator("#palette-input").fill("exame")
        page.keyboard.press("Enter")
        expect(page.locator(".step.active")).to_contain_text("Exame pericial")
        expect(page.locator(".content h1")).to_have_text("Exame pericial")

    def test_escape_in_palette_does_not_close_modal_underneath(self):
        page = self.open()
        page.locator('button[data-action="new-case"]').first.click()
        expect(page.locator("#new-case-form")).to_be_visible()
        page.keyboard.press("Control+k")
        page.keyboard.press("Escape")
        self.assertEqual(self.palette_count(), 0)
        expect(page.locator("#new-case-form")).to_be_visible()
        page.keyboard.press("Escape")
        expect(page.locator("#case-modal")).to_have_count(0)

    def test_shortcuts_do_not_hijack_typing(self):
        page = self.open()
        self.create_case()
        page.locator('button[data-step="history"]').click()
        area = page.locator('textarea[data-bind="history.summary"]')
        area.click()
        page.keyboard.type("linha um / dois")
        page.keyboard.press("Alt+ArrowDown")
        expect(page.locator(".step.active")).to_contain_text("História e antecedentes")
        expect(area).to_have_value("linha um / dois")
        expect(area).to_be_focused()

        page.locator(".content h1").click()
        page.keyboard.press("Alt+ArrowDown")
        expect(page.locator(".step.active")).to_contain_text("Exame pericial")

        page.locator('button[data-action="dashboard"]').click()
        page.locator(".dashboard h1").click()
        page.keyboard.press("/")
        expect(page.locator("#case-search")).to_be_focused()
        expect(page.locator("#case-search")).to_have_value("")

    # ---------- theme, storage, print and motion ----------

    def test_dark_theme_contrast_meets_wcag_aa(self):
        page = self.open(color_scheme="dark")
        self.create_case()
        checks = {
            ".content h1": 4.5,
            ".field label": 4.5,
            'input[data-bind="identity.title"]': 4.5,
            ".section-head p": 4.5,
            ".card h3": 4.5,
        }
        for selector, minimum in checks.items():
            ratio = page.evaluate(CONTRAST_JS, [selector, "backgroundColor"])
            self.assertGreaterEqual(ratio, minimum, f"{selector} contrast {ratio:.2f} < {minimum}")

    def test_theme_toggle_is_session_only_and_never_touches_storage(self):
        page = self.open()
        before = page.evaluate("() => [Object.keys(localStorage).sort(), Object.keys(sessionStorage).sort()]")
        page.keyboard.press("Control+k")
        page.locator("#palette-input").fill("tema")
        page.keyboard.press("Enter")
        self.assertEqual(page.evaluate("() => document.documentElement.dataset.theme"), "dark")
        after = page.evaluate("() => [Object.keys(localStorage).sort(), Object.keys(sessionStorage).sort()]")
        self.assertEqual(before, after)
        page.reload(wait_until="load")
        self.assertIsNone(page.evaluate("() => document.documentElement.dataset.theme || null"))

    def test_print_hides_interface_chrome(self):
        page = self.open()
        page.emulate_media(media="print")
        for selector in (".scroll-progress", ".insight-strip"):
            self.assertEqual(page.evaluate(f"() => getComputedStyle(document.querySelector('{selector}')).display"), "none")

    def test_reduced_motion_shows_final_values_immediately(self):
        page = self.open(reduced_motion="reduce")
        self.create_case(deadline="2020-01-01")
        page.locator('button[data-action="dashboard"]').click()
        self.assertEqual(page.locator(".insight .insight-value").first.inner_text(), "1")
        self.assertEqual(page.locator(".case-count").inner_text(), "1")
        page.locator('button[data-action="new-case"]').first.dispatch_event("pointerdown", {"clientX": 10, "clientY": 10})
        self.assertEqual(page.locator(".ripple").count(), 0)


if __name__ == "__main__":
    unittest.main()
