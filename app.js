const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const toast = (message) => {
  const element = $("#toast");
  $("p", element).textContent = message;
  element.classList.add("show");
  clearTimeout(window.__mlksToast);
  window.__mlksToast = setTimeout(() => element.classList.remove("show"), 2800);
};

const viewNames = {
  overview: "Visão geral",
  cases: "Casos",
  evidence: "Evidências",
  reasoning: "Raciocínio",
  references: "Referências",
  templates: "Modelos",
};

$$('[data-view]').forEach((item) => {
  item.addEventListener("click", () => {
    $$('[data-view]').forEach((nav) => nav.classList.toggle("active", nav === item));
    const view = item.dataset.view;
    $("#breadcrumbCurrent").textContent = viewNames[view];
    if (view !== "overview") toast(`${viewNames[view]}: módulo preparado para a próxima camada do MVP.`);
    $("#sidebar").classList.remove("open");
  });
});

$("#openMenu").addEventListener("click", () => $("#sidebar").classList.add("open"));
$("#closeMenu").addEventListener("click", () => $("#sidebar").classList.remove("open"));

const modal = $("#modalBackdrop");
const openModal = () => {
  modal.hidden = false;
  $("#caseName").focus();
};
const closeModal = () => { modal.hidden = true; };
$("#newCaseButton").addEventListener("click", openModal);
$("#modalClose").addEventListener("click", closeModal);
$("#modalCancel").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.hidden) closeModal(); });

$("#createCase").addEventListener("click", () => {
  const name = $("#caseName").value.trim();
  const type = $("#caseType").value;
  if (!name) {
    $("#caseName").focus();
    toast("Dê um nome ao caso para continuar.");
    return;
  }
  closeModal();
  $("#caseName").value = "";
  toast(`Espaço criado: ${name} · ${type}.`);
});

const phaseNotes = {
  1: "Revise a pergunta pericial e os limites do objeto antes de reunir documentos.",
  2: "Evidências, entrevista e exame clínico devem estar identificados e vinculados ao ponto que sustentam.",
  3: "Registre a base de achados antes de avançar para o raciocínio.",
  4: "Separe o que está documentado da inferência técnica e explicite o grau de suporte.",
  5: "A síntese deve responder ao objeto com fundamentação proporcional à prova disponível.",
};
$$('[data-phase]').forEach((step) => {
  step.addEventListener("click", () => {
    const selected = Number(step.dataset.phase);
    $$('[data-phase]').forEach((item) => {
      const phase = Number(item.dataset.phase);
      item.classList.toggle("active", phase === selected);
      item.classList.toggle("done", phase < selected);
      $("i", item).textContent = phase < selected ? "✓" : phase === selected ? "•" : "○";
    });
    $("#phaseNote").innerHTML = `<strong>${selected === 3 ? "Você está aqui." : `Etapa ${selected}.`}</strong> ${phaseNotes[selected]}`;
    toast(`Etapa ${selected} selecionada.`);
  });
});

$$('[data-filter]').forEach((filter) => {
  filter.addEventListener("click", () => {
    const value = filter.dataset.filter;
    $$('[data-filter]').forEach((item) => item.classList.toggle("active", item === filter));
    $$('[data-reasoning]').forEach((card) => card.classList.toggle("hidden", value !== "all" && card.dataset.reasoning !== value));
  });
});

$$('[data-resolve]').forEach((item) => {
  item.addEventListener("click", () => {
    const resolved = item.classList.toggle("resolved");
    $(".signal-bullet", item).textContent = resolved ? "✓" : "!";
    $(".signal-bullet", item).classList.toggle("green-fill", resolved);
    $(".signal-bullet", item).classList.toggle("amber-fill", !resolved);
    $("i", item).textContent = resolved ? "✓" : "○";
    toast(resolved ? `${item.dataset.resolve} marcado como verificado.` : `${item.dataset.resolve} voltou para revisão.`);
  });
});

$$('[data-finding]').forEach((tab) => {
  tab.addEventListener("click", () => {
    const value = tab.dataset.finding;
    $$('[data-finding]').forEach((item) => item.classList.toggle("active", item === tab));
    $$('[data-finding-content]').forEach((row) => {
      row.style.display = value === "clinical" || row.dataset.findingContent === value ? "flex" : "none";
    });
    if (value !== "clinical") toast(`${tab.textContent}: filtro pronto para receber achados.`);
  });
});

$("#addFinding").addEventListener("click", () => toast("Campo de novo achado ativado no próximo ciclo do MVP."));
$("#methodButton").addEventListener("click", () => toast("Fundamentação técnica: módulo de referências em construção."));
$("#openCaseButton").addEventListener("click", () => toast("Caso completo: estação de análise em construção."));
$("#caseArrow").addEventListener("click", () => toast("Abrindo o caso MLKS-024…"));
$("#exportButton").addEventListener("click", () => toast("Síntese preparada: exportação será habilitada na próxima versão."));

$("#themeToggle").addEventListener("click", () => {
  const light = document.body.dataset.theme === "light";
  document.body.dataset.theme = light ? "dark" : "light";
  localStorage.setItem("mlks-theme", light ? "dark" : "light");
  toast(light ? "Tema escuro ativado." : "Tema claro ativado.");
});
const savedTheme = localStorage.getItem("mlks-theme");
if (savedTheme) document.body.dataset.theme = savedTheme;
