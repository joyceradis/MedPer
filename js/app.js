(() => {
  'use strict';

  const STORAGE_KEY = 'mlks.prototype.v1';
  const workspace = document.querySelector('#workspace');
  const navigation = document.querySelector('#mainNavigation');
  const dialog = document.querySelector('#newCaseDialog');
  const newCaseForm = document.querySelector('#newCaseForm');
  const toast = document.querySelector('#toast');
  const connectionStatus = document.querySelector('#connectionStatus');

  const objectTypes = [
    'Dano corporal',
    'Dano estético',
    'Incapacidade',
    'Nexo causal',
    'Erro médico',
    'Responsabilidade profissional',
    'Acidente de trabalho',
    'Acidente de trânsito'
  ];

  const evidenceTypes = ['Documento', 'Fotografia', 'Entrevista', 'Exame clínico', 'Quesito', 'Vídeo', 'Escala'];
  const findingTypes = ['Lesão', 'Tratamento', 'Complicação', 'Sequela', 'Função', 'Sistema', 'Repercussão'];

  let state = loadState();
  let currentView = location.hash.replace('#/', '') || 'overview';
  let toastTimer;

  function createId(prefix) {
    if (crypto?.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function emptyState() {
    return {
      version: 1,
      updatedAt: nowIso(),
      currentCaseId: null,
      cases: []
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.cases)) return emptyState();
      return parsed;
    } catch (error) {
      console.warn('MLKS: não foi possível carregar os dados locais.', error);
      return emptyState();
    }
  }

  function saveState(message) {
    state.updatedAt = nowIso();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('MLKS: salvamento local indisponível neste contexto.', error);
    }
    if (message) showToast(message);
  }

  function getCurrentCase() {
    const found = state.cases.find((item) => item.id === state.currentCaseId) || null;
    return found ? window.MLKSCaseSchema.ensure(found) : null;
  }

  function caseTemplate({ title, reference, objectType }) {
    const timestamp = nowIso();
    return {
      id: createId('case'),
      title,
      reference,
      objectType,
      status: 'Em coleta',
      createdAt: timestamp,
      updatedAt: timestamp,
      person: {
        initials: '',
        birthDate: '',
        role: 'Periciando(a)'
      },
      scope: '',
      events: [],
      evidence: [],
      observations: [],
      findings: [],
      reasoning: {
        nexus: '',
        temporality: '',
        consolidation: '',
        repercussions: '',
        notes: ''
      },
      conclusions: []
    };
  }

  function seedDemoCase() {
    const demo = caseTemplate({
      title: 'Caso demonstrativo · queimadura e sequela cicatricial',
      reference: 'DEMO-MLKS-001',
      objectType: 'Dano corporal'
    });

    demo.status = 'Em análise';
    demo.person = {
      initials: 'A. B.',
      birthDate: '1990-05-12',
      role: 'Periciando(a)'
    };
    demo.scope = 'Avaliar a existência de sequelas, sua temporalidade, repercussões funcionais e compatibilidade médico-legal com o evento descrito.';
    demo.events = [
      {
        id: createId('event'),
        date: '2025-03-14',
        title: 'Evento alegado',
        description: 'Contato térmico descrito em região cervical e membro superior.',
        sourceIds: []
      },
      {
        id: createId('event'),
        date: '2025-03-14',
        title: 'Atendimento inicial',
        description: 'Registro assistencial com descrição de lesão térmica e conduta local.',
        sourceIds: []
      },
      {
        id: createId('event'),
        date: '2026-07-28',
        title: 'Avaliação médico-legal',
        description: 'Coleta estruturada de observações, achados e repercussões.',
        sourceIds: []
      }
    ];

    const prontuarioId = createId('evidence');
    const fotografiaId = createId('evidence');
    const exameId = createId('evidence');

    demo.evidence = [
      {
        id: prontuarioId,
        type: 'Documento',
        title: 'Prontuário do atendimento inicial',
        date: '2025-03-14',
        description: 'Registro contemporâneo ao evento com descrição da topografia e da extensão inicial.',
        reliability: 'Primária',
        createdAt: nowIso()
      },
      {
        id: fotografiaId,
        type: 'Fotografia',
        title: 'Registro fotográfico padronizado',
        date: '2026-07-28',
        description: 'Vista panorâmica e aproximação com escala métrica, iluminação uniforme e identificação de lateralidade.',
        reliability: 'Primária',
        createdAt: nowIso()
      },
      {
        id: exameId,
        type: 'Exame clínico',
        title: 'Exame físico pericial',
        date: '2026-07-28',
        description: 'Inspeção, palpação, avaliação de elasticidade e amplitude de movimento.',
        reliability: 'Primária',
        createdAt: nowIso()
      }
    ];

    const obs1 = createId('observation');
    const obs2 = createId('observation');
    const obs3 = createId('observation');

    demo.observations = [
      {
        id: obs1,
        sourceId: fotografiaId,
        title: 'Alteração de relevo e coloração',
        text: 'Área cicatricial visível, com heterogeneidade cromática e discreto relevo em comparação à pele adjacente.',
        createdAt: nowIso()
      },
      {
        id: obs2,
        sourceId: exameId,
        title: 'Redução de elasticidade local',
        text: 'Mobilidade cutânea diminuída à palpação na área cicatricial.',
        createdAt: nowIso()
      },
      {
        id: obs3,
        sourceId: exameId,
        title: 'Amplitude funcional',
        text: 'Limitação leve em movimento específico, a ser quantificada por goniometria padronizada.',
        createdAt: nowIso()
      }
    ];

    const finding1 = createId('finding');
    const finding2 = createId('finding');
    const finding3 = createId('finding');

    demo.findings = [
      {
        id: finding1,
        type: 'Lesão',
        title: 'Cicatriz pós-traumática',
        description: 'Achado morfológico compatível com sequela cicatricial, sem definição etiológica isolada.',
        observationIds: [obs1, obs2],
        evidenceIds: [fotografiaId, exameId],
        confidence: 'Moderada',
        createdAt: nowIso()
      },
      {
        id: finding2,
        type: 'Função',
        title: 'Elasticidade cutânea reduzida',
        description: 'Alteração mecânica local que pode interferir na excursão tecidual.',
        observationIds: [obs2],
        evidenceIds: [exameId],
        confidence: 'Alta',
        createdAt: nowIso()
      },
      {
        id: finding3,
        type: 'Repercussão',
        title: 'Possível repercussão funcional leve',
        description: 'Hipótese dependente de mensuração objetiva e correlação anatômico-funcional.',
        observationIds: [obs3],
        evidenceIds: [exameId],
        confidence: 'Baixa',
        createdAt: nowIso()
      }
    ];

    demo.reasoning = {
      nexus: 'Compatível, a confirmar pelo conjunto documental',
      temporality: 'Cronologia compatível',
      consolidation: 'Aparentemente consolidado',
      repercussions: 'Repercussão estética presente; repercussão funcional em avaliação',
      notes: 'A morfologia isolada não define etiologia. A análise depende da convergência entre documentação contemporânea, exame atual, cronologia e ausência de causas alternativas relevantes.'
    };

    demo.conclusions = [
      {
        id: createId('conclusion'),
        title: 'Conclusão preliminar rastreável',
        text: 'Há sequela cicatricial objetivamente demonstrada. A atribuição causal definitiva permanece condicionada à análise integral da cronologia e dos documentos contemporâneos ao evento.',
        evidenceIds: [prontuarioId, fotografiaId, exameId],
        findingIds: [finding1, finding2],
        status: 'Preliminar',
        createdAt: nowIso()
      }
    ];

    return demo;
  }

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value) {
    if (!value) return 'sem data';
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())
      ? escapeHtml(value)
      : new Intl.DateTimeFormat('pt-BR').format(date);
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? escapeHtml(value)
      : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }

  function truncate(value, size = 90) {
    const string = String(value || '');
    return string.length > size ? `${string.slice(0, size - 1)}…` : string;
  }

  function getEvidence(caseData, id) {
    return caseData.evidence.find((item) => item.id === id);
  }

  function getObservation(caseData, id) {
    return caseData.observations.find((item) => item.id === id);
  }

  function getFinding(caseData, id) {
    return caseData.findings.find((item) => item.id === id);
  }

  function completeness(caseData) {
    const checks = [
      Boolean(caseData.title && caseData.objectType),
      caseData.evidence.length > 0,
      caseData.observations.length > 0,
      caseData.findings.length > 0,
      Object.values(caseData.reasoning).some(Boolean),
      caseData.conclusions.length > 0
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function updateConnectionStatus() {
    const online = navigator.onLine;
    connectionStatus.textContent = online ? 'online · salvamento local' : 'offline · salvamento local';
    connectionStatus.classList.toggle('is-online', online);
    connectionStatus.classList.toggle('is-offline', !online);
  }

  function setCurrentView(view) {
    currentView = view;
    if (location.hash !== `#/${view}`) history.replaceState(null, '', `#/${view}`);
    navigation.querySelectorAll('[data-view]').forEach((item) => {
      item.classList.toggle('is-active', item.dataset.view === view);
    });
    render();
  }

  function caseSelector(caseData) {
    if (!state.cases.length) return '';
    return `
      <select id="caseSwitcher" class="case-switcher" aria-label="Selecionar caso">
        ${state.cases.map((item) => `
          <option value="${escapeHtml(item.id)}" ${item.id === caseData.id ? 'selected' : ''}>
            ${escapeHtml(truncate(item.title, 42))}
          </option>
        `).join('')}
      </select>
    `;
  }

  function pageHeader(caseData, eyebrow, title, description) {
    return `
      <header class="page-header">
        <div>
          <span class="eyebrow">${escapeHtml(eyebrow)}</span>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(description)}</p>
        </div>
        ${caseSelector(caseData)}
      </header>
    `;
  }

  function renderEmpty() {
    const template = document.querySelector('#emptyStateTemplate');
    workspace.replaceChildren(template.content.cloneNode(true));
    workspace.querySelector('[data-action="new-case"]')?.addEventListener('click', openNewCaseDialog);
    workspace.querySelector('[data-action="load-demo"]')?.addEventListener('click', () => {
      const demo = seedDemoCase();
      state.cases.push(demo);
      state.currentCaseId = demo.id;
      saveState('Caso demonstrativo carregado.');
      setCurrentView('overview');
    });
  }

  function renderOverview(caseData) {
    const percent = completeness(caseData);
    const steps = [
      ['Caso', Boolean(caseData.title && caseData.objectType)],
      ['Evidências', caseData.evidence.length > 0],
      ['Observações', caseData.observations.length > 0],
      ['Achados', caseData.findings.length > 0],
      ['Raciocínio', Object.values(caseData.reasoning).some(Boolean)],
      ['Conclusão', caseData.conclusions.length > 0]
    ];

    const events = [...caseData.events].sort((a, b) => String(a.date).localeCompare(String(b.date)));

    workspace.innerHTML = `
      ${pageHeader(caseData, 'Visão geral', caseData.title, 'Painel de integridade do caso, fluxo pericial e estado da rastreabilidade.')}

      <section class="metric-grid" aria-label="Indicadores do caso">
        <article class="metric-card"><span>Evidências</span><strong>${caseData.evidence.length}</strong><small>fontes registradas</small></article>
        <article class="metric-card"><span>Achados</span><strong>${caseData.findings.length}</strong><small>entidades estruturadas</small></article>
        <article class="metric-card"><span>Conclusões</span><strong>${caseData.conclusions.length}</strong><small>todas exigem fonte</small></article>
        <article class="metric-card"><span>Integridade</span><strong>${percent}%</strong><small>progresso estrutural</small></article>
      </section>

      <section class="panel panel-callout">
        <div class="panel-header">
          <div>
            <span class="eyebrow">Fluxo operacional</span>
            <h2>Do fato à conclusão</h2>
          </div>
          <span class="badge ${percent === 100 ? 'badge-success' : 'badge-warning'}">${percent === 100 ? 'estrutura completa' : 'em construção'}</span>
        </div>
        <div class="flow">
          ${steps.map(([label, complete], index) => `
            <div class="flow-step ${complete ? 'is-complete' : ''}">${escapeHtml(label)}</div>
            ${index < steps.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
          `).join('')}
        </div>
      </section>

      <div class="grid-2 section-gap">
        <section class="panel">
          <div class="panel-header">
            <div><span class="eyebrow">Linha do tempo</span><h2>Eventos do caso</h2></div>
            <button class="button button-ghost button-small" data-go="case" type="button">Editar</button>
          </div>
          <div class="list">
            ${events.length ? events.map((event) => `
              <article class="timeline-item">
                <div class="card-topline">
                  <span class="entity-type">Evento</span>
                  <span class="muted">${formatDate(event.date)}</span>
                </div>
                <h3 class="card-title">${escapeHtml(event.title)}</h3>
                <p class="card-text">${escapeHtml(event.description)}</p>
              </article>
            `).join('') : '<div class="empty-list">Nenhum evento registrado.</div>'}
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div><span class="eyebrow">Governança</span><h2>Controles do protótipo</h2></div>
          </div>
          <div class="security-note">
            <span aria-hidden="true">!</span>
            <div><strong>Não inserir dados reais ou sensíveis.</strong><br>Este MVP salva informações apenas no armazenamento local do navegador, sem criptografia de produção, autenticação ou controle de acesso.</div>
          </div>
          <div class="list section-gap">
            <article class="timeline-item">
              <div class="card-topline"><span class="entity-type">IA</span><span class="badge badge-success">limite aplicado</span></div>
              <h3 class="card-title">Sem conclusão automática</h3>
              <p class="card-text">A interface estrutura relações e exige validação humana. Não valora dano nem define nexo por conta própria.</p>
            </article>
            <article class="timeline-item">
              <div class="card-topline"><span class="entity-type">Persistência</span><span class="badge">local</span></div>
              <h3 class="card-title">Autosave no dispositivo</h3>
              <p class="card-text">Última atualização: ${formatDateTime(caseData.updatedAt || state.updatedAt)}.</p>
            </article>
          </div>
        </section>
      </div>
    `;

    bindCommonPageEvents();
  }

  function renderCase(caseData) {
    workspace.innerHTML = `
      ${pageHeader(caseData, 'Core domain', 'Caso e objeto pericial', 'O objeto pericial determina protocolo, perguntas, exame, fotografias, escalas e critérios de conclusão.')}

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Identificação</span><h2>Dados estruturantes</h2></div></div>
          <form id="caseForm">
            <label class="field"><span>Título interno</span><input name="title" required maxlength="100" value="${escapeHtml(caseData.title)}"></label>
            <label class="field"><span>Referência</span><input name="reference" maxlength="80" value="${escapeHtml(caseData.reference)}"></label>
            <label class="field"><span>Objeto pericial</span>
              <select name="objectType">${objectTypes.map((item) => `<option ${item === caseData.objectType ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
            </label>
            <label class="field"><span>Status</span>
              <select name="status">
                ${['Em coleta', 'Em análise', 'Aguardando documentos', 'Concluído'].map((item) => `<option ${item === caseData.status ? 'selected' : ''}>${item}</option>`).join('')}
              </select>
            </label>
            <label class="field"><span>Escopo técnico</span><textarea name="scope" placeholder="Delimite o que deverá ser avaliado.">${escapeHtml(caseData.scope)}</textarea></label>

            <div class="grid-2 section-gap">
              <label class="field"><span>Iniciais da pessoa</span><input name="initials" maxlength="12" value="${escapeHtml(caseData.person.initials)}" placeholder="Não use nome real no protótipo"></label>
              <label class="field"><span>Data de nascimento</span><input name="birthDate" type="date" value="${escapeHtml(caseData.person.birthDate)}"></label>
            </div>
            <div class="form-actions"><button class="button button-primary" type="submit">Salvar caso</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Temporalidade</span><h2>Linha do tempo</h2></div></div>
          <form id="eventForm">
            <div class="grid-2">
              <label class="field"><span>Data</span><input name="date" type="date" required></label>
              <label class="field"><span>Título</span><input name="title" maxlength="90" required placeholder="Ex.: atendimento inicial"></label>
            </div>
            <label class="field"><span>Descrição factual</span><textarea name="description" required placeholder="Registre o fato sem antecipar conclusão."></textarea></label>
            <div class="form-actions"><button class="button button-ghost" type="submit">Adicionar evento</button></div>
          </form>

          <div class="list section-gap">
            ${[...caseData.events].sort((a, b) => String(a.date).localeCompare(String(b.date))).map((event) => `
              <article class="timeline-item">
                <div class="card-topline"><span class="entity-type">${formatDate(event.date)}</span><button class="button button-danger button-small" data-delete-event="${escapeHtml(event.id)}" type="button">Excluir</button></div>
                <h3 class="card-title">${escapeHtml(event.title)}</h3>
                <p class="card-text">${escapeHtml(event.description)}</p>
              </article>
            `).join('') || '<div class="empty-list">Adicione os marcos cronológicos relevantes.</div>'}
          </div>
        </section>
      </div>
    `;

    bindCommonPageEvents();

    document.querySelector('#caseForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      caseData.title = String(data.get('title')).trim();
      caseData.reference = String(data.get('reference')).trim();
      caseData.objectType = String(data.get('objectType'));
      caseData.status = String(data.get('status'));
      caseData.scope = String(data.get('scope')).trim();
      caseData.person.initials = String(data.get('initials')).trim();
      caseData.person.birthDate = String(data.get('birthDate'));
      caseData.updatedAt = nowIso();
      saveState('Caso salvo.');
      renderCase(caseData);
    });

    document.querySelector('#eventForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      caseData.events.push({
        id: createId('event'),
        date: String(data.get('date')),
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        sourceIds: []
      });
      caseData.updatedAt = nowIso();
      saveState('Evento adicionado.');
      renderCase(caseData);
    });

    document.querySelectorAll('[data-delete-event]').forEach((button) => {
      button.addEventListener('click', () => {
        caseData.events = caseData.events.filter((item) => item.id !== button.dataset.deleteEvent);
        saveState('Evento removido.');
        renderCase(caseData);
      });
    });
  }

  function renderEvidence(caseData) {
    workspace.innerHTML = `
      ${pageHeader(caseData, 'Motor documental', 'Evidências', 'Documentos, fotografias, entrevista, exame e quesitos permanecem independentes e versionáveis.')}

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Nova fonte</span><h2>Registrar evidência</h2></div></div>
          <form id="evidenceForm">
            <div class="grid-2">
              <label class="field"><span>Tipo</span><select name="type">${evidenceTypes.map((item) => `<option>${item}</option>`).join('')}</select></label>
              <label class="field"><span>Data da fonte</span><input name="date" type="date"></label>
            </div>
            <label class="field"><span>Título</span><input name="title" required maxlength="120" placeholder="Identificação curta e objetiva"></label>
            <label class="field"><span>Descrição</span><textarea name="description" required placeholder="Conteúdo relevante, origem e limitações."></textarea></label>
            <label class="field"><span>Natureza</span>
              <select name="reliability">
                <option>Primária</option><option>Secundária</option><option>Indireta</option><option>Não classificada</option>
              </select>
            </label>
            <div class="form-actions"><button class="button button-primary" type="submit">Adicionar evidência</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Inventário</span><h2>${caseData.evidence.length} fonte(s)</h2></div></div>
          <div class="list">
            ${caseData.evidence.map((item) => `
              <article class="evidence-card">
                <div class="card-topline">
                  <span class="entity-type">${escapeHtml(item.type)}</span>
                  <button class="button button-danger button-small" data-delete-evidence="${escapeHtml(item.id)}" type="button">Excluir</button>
                </div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-text">${escapeHtml(item.description)}</p>
                <div class="card-footer"><div class="meta-line"><span>${formatDate(item.date)}</span><span>${escapeHtml(item.reliability)}</span><span>ID ${escapeHtml(item.id.slice(-8))}</span></div></div>
              </article>
            `).join('') || '<div class="empty-list">Nenhuma evidência registrada.</div>'}
          </div>
        </section>
      </div>
    `;

    bindCommonPageEvents();

    document.querySelector('#evidenceForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      caseData.evidence.push({
        id: createId('evidence'),
        type: String(data.get('type')),
        title: String(data.get('title')).trim(),
        date: String(data.get('date')),
        description: String(data.get('description')).trim(),
        reliability: String(data.get('reliability')),
        createdAt: nowIso()
      });
      caseData.updatedAt = nowIso();
      saveState('Evidência registrada.');
      renderEvidence(caseData);
    });

    document.querySelectorAll('[data-delete-evidence]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.deleteEvidence;
        const linked = caseData.findings.some((item) => item.evidenceIds.includes(id)) || caseData.conclusions.some((item) => item.evidenceIds.includes(id));
        if (linked && !confirm('Esta evidência está vinculada a achados ou conclusões. Remover mesmo assim?')) return;
        caseData.evidence = caseData.evidence.filter((item) => item.id !== id);
        caseData.observations = caseData.observations.map((item) => item.sourceId === id ? { ...item, sourceId: '' } : item);
        caseData.findings = caseData.findings.map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((sourceId) => sourceId !== id) }));
        caseData.conclusions = caseData.conclusions.map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((sourceId) => sourceId !== id) }));
        saveState('Evidência removida e vínculos atualizados.');
        renderEvidence(caseData);
      });
    });
  }

  function renderObservations(caseData) {
    workspace.innerHTML = `
      ${pageHeader(caseData, 'Coleta factual', 'Observações', 'Observações descrevem o que foi visto, medido, referido ou documentado — antes da interpretação.')}

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Novo registro</span><h2>Adicionar observação</h2></div></div>
          <form id="observationForm">
            <label class="field"><span>Fonte</span>
              <select name="sourceId" required>
                <option value="">Selecione uma evidência</option>
                ${caseData.evidence.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.type)} · ${escapeHtml(item.title)}</option>`).join('')}
              </select>
              ${caseData.evidence.length ? '' : '<small class="help-text">Registre uma evidência antes de criar observações.</small>'}
            </label>
            <label class="field"><span>Título objetivo</span><input name="title" required maxlength="120" placeholder="Ex.: cicatriz hipercrômica em região cervical"></label>
            <label class="field"><span>Descrição factual</span><textarea name="text" required placeholder="Evite inferir causa ou valorar dano nesta etapa."></textarea></label>
            <div class="form-actions"><button class="button button-primary" type="submit" ${caseData.evidence.length ? '' : 'disabled'}>Adicionar observação</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Base de fatos</span><h2>${caseData.observations.length} observação(ões)</h2></div></div>
          <div class="list">
            ${caseData.observations.map((item) => {
              const source = getEvidence(caseData, item.sourceId);
              return `
                <article class="evidence-card">
                  <div class="card-topline"><span class="entity-type">Observação</span><button class="button button-danger button-small" data-delete-observation="${escapeHtml(item.id)}" type="button">Excluir</button></div>
                  <h3 class="card-title">${escapeHtml(item.title)}</h3>
                  <p class="card-text">${escapeHtml(item.text)}</p>
                  <div class="card-footer"><div class="meta-line"><span>Fonte: ${escapeHtml(source?.title || 'fonte removida')}</span><span>${formatDateTime(item.createdAt)}</span></div></div>
                </article>
              `;
            }).join('') || '<div class="empty-list">Nenhuma observação registrada.</div>'}
          </div>
        </section>
      </div>
    `;

    bindCommonPageEvents();

    document.querySelector('#observationForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      caseData.observations.push({
        id: createId('observation'),
        sourceId: String(data.get('sourceId')),
        title: String(data.get('title')).trim(),
        text: String(data.get('text')).trim(),
        createdAt: nowIso()
      });
      caseData.updatedAt = nowIso();
      saveState('Observação registrada.');
      renderObservations(caseData);
    });

    document.querySelectorAll('[data-delete-observation]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.deleteObservation;
        caseData.observations = caseData.observations.filter((item) => item.id !== id);
        caseData.findings = caseData.findings.map((item) => ({ ...item, observationIds: item.observationIds.filter((observationId) => observationId !== id) }));
        saveState('Observação removida.');
        renderObservations(caseData);
      });
    });
  }

  function renderFindings(caseData) {
    workspace.innerHTML = `
      ${pageHeader(caseData, 'Core clínico', 'Achados estruturados', 'Achados transformam observações em entidades clínicas explícitas, mantendo as fontes que os sustentam.')}

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Nova entidade</span><h2>Estruturar achado</h2></div></div>
          <form id="findingForm">
            <div class="grid-2">
              <label class="field"><span>Tipo</span><select name="type">${findingTypes.map((item) => `<option>${item}</option>`).join('')}</select></label>
              <label class="field"><span>Confiança</span><select name="confidence"><option>Alta</option><option selected>Moderada</option><option>Baixa</option><option>Indeterminada</option></select></label>
            </div>
            <label class="field"><span>Título</span><input name="title" required maxlength="120" placeholder="Ex.: cicatriz hipertrófica"></label>
            <label class="field"><span>Interpretação técnica</span><textarea name="description" required placeholder="Declare limites e condições quando necessário."></textarea></label>

            <div class="section-gap">
              <span class="fieldset-legend">Observações que sustentam o achado</span>
              <div class="check-list">
                ${caseData.observations.map((item) => `
                  <label class="check-row"><input type="checkbox" name="observationIds" value="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(truncate(item.text, 100))}</span></span></label>
                `).join('') || '<div class="empty-list">Nenhuma observação disponível.</div>'}
              </div>
            </div>

            <div class="section-gap">
              <span class="fieldset-legend">Evidências diretas</span>
              <div class="check-list">
                ${caseData.evidence.map((item) => `
                  <label class="check-row"><input type="checkbox" name="evidenceIds" value="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)} · ${formatDate(item.date)}</span></span></label>
                `).join('') || '<div class="empty-list">Nenhuma evidência disponível.</div>'}
              </div>
            </div>

            <div class="form-actions"><button class="button button-primary" type="submit">Criar achado</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Grafo clínico</span><h2>${caseData.findings.length} achado(s)</h2></div></div>
          <div class="list">
            ${caseData.findings.map((item) => `
              <article class="finding-card">
                <div class="card-topline"><span class="entity-type">${escapeHtml(item.type)}</span><button class="button button-danger button-small" data-delete-finding="${escapeHtml(item.id)}" type="button">Excluir</button></div>
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <p class="card-text">${escapeHtml(item.description)}</p>
                <div class="card-footer">
                  <div class="meta-line"><span>Confiança: ${escapeHtml(item.confidence)}</span><span>${item.evidenceIds.length} evidência(s)</span><span>${item.observationIds.length} observação(ões)</span></div>
                </div>
              </article>
            `).join('') || '<div class="empty-list">Nenhum achado estruturado.</div>'}
          </div>
        </section>
      </div>
    `;

    bindCommonPageEvents();

    document.querySelector('#findingForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const observationIds = data.getAll('observationIds').map(String);
      const evidenceIds = data.getAll('evidenceIds').map(String);
      if (!observationIds.length && !evidenceIds.length) {
        showToast('Vincule ao menos uma observação ou evidência.');
        return;
      }
      caseData.findings.push({
        id: createId('finding'),
        type: String(data.get('type')),
        title: String(data.get('title')).trim(),
        description: String(data.get('description')).trim(),
        confidence: String(data.get('confidence')),
        observationIds,
        evidenceIds,
        createdAt: nowIso()
      });
      caseData.updatedAt = nowIso();
      saveState('Achado estruturado.');
      renderFindings(caseData);
    });

    document.querySelectorAll('[data-delete-finding]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.deleteFinding;
        caseData.findings = caseData.findings.filter((item) => item.id !== id);
        caseData.conclusions = caseData.conclusions.map((item) => ({ ...item, findingIds: item.findingIds.filter((findingId) => findingId !== id) }));
        saveState('Achado removido.');
        renderFindings(caseData);
      });
    });
  }

  function renderGraph(caseData) {
    const observations = caseData.observations.slice(0, 8);
    const findings = caseData.findings.slice(0, 8);
    const conclusions = caseData.conclusions.slice(0, 6);

    workspace.innerHTML = `
      ${pageHeader(caseData, 'Medical-Legal Knowledge Graph', 'Grafo médico-legal', 'Uma representação auditável das relações entre fontes, fatos, achados e conclusões.')}

      <section class="graph-canvas" aria-label="Representação do grafo médico-legal">
        <div class="graph-layer">
          <div class="graph-column">
            <div class="graph-column-title">Evidências</div>
            ${caseData.evidence.slice(0, 8).map((item) => `<div class="graph-node"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} · ${formatDate(item.date)}</small></div>`).join('') || '<div class="graph-node"><strong>Sem evidências</strong><small>Adicione fontes documentais ou clínicas.</small></div>'}
          </div>
          <div class="graph-arrow-column">→</div>
          <div class="graph-column">
            <div class="graph-column-title">Observações</div>
            ${observations.map((item) => `<div class="graph-node"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(truncate(item.text, 70))}</small></div>`).join('') || '<div class="graph-node"><strong>Sem observações</strong><small>Registre fatos vinculados às fontes.</small></div>'}
          </div>
          <div class="graph-arrow-column">→</div>
          <div class="graph-column">
            <div class="graph-column-title">Achados estruturados</div>
            ${findings.map((item) => `<div class="graph-node node-core"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)} · confiança ${escapeHtml(item.confidence.toLowerCase())}</small></div>`).join('') || '<div class="graph-node node-core"><strong>Grafo clínico vazio</strong><small>Transforme observações em achados.</small></div>'}
          </div>
          <div class="graph-arrow-column">→</div>
          <div class="graph-column">
            <div class="graph-column-title">Conclusões humanas</div>
            ${conclusions.map((item) => `<div class="graph-node"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(truncate(item.text, 90))}</small></div>`).join('') || '<div class="graph-node"><strong>Sem conclusão</strong><small>Nenhuma conclusão sem evidência.</small></div>'}
          </div>
        </div>
      </section>

      <section class="graph-summary">
        <div class="graph-stat"><strong>${caseData.evidence.length}</strong><span>nós de evidência</span></div>
        <div class="graph-stat"><strong>${caseData.observations.length + caseData.findings.length}</strong><span>nós clínicos e factuais</span></div>
        <div class="graph-stat"><strong>${caseData.conclusions.reduce((total, item) => total + item.evidenceIds.length + item.findingIds.length, 0)}</strong><span>relações de rastreabilidade</span></div>
      </section>
    `;

    bindCommonPageEvents();
  }

  function renderReasoning(caseData) {
    workspace.innerHTML = `
      ${pageHeader(caseData, 'Motor pericial', 'Raciocínio pericial', 'O sistema organiza dimensões analíticas; o perito mantém a responsabilidade por interpretar e concluir.')}

      <div class="grid-2">
        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Análise estruturada</span><h2>Dimensões médico-legais</h2></div></div>
          <form id="reasoningForm">
            <label class="field"><span>Nexo / causalidade</span><input name="nexus" value="${escapeHtml(caseData.reasoning.nexus)}" placeholder="Ex.: compatível, concausal, indeterminado"></label>
            <label class="field"><span>Temporalidade</span><input name="temporality" value="${escapeHtml(caseData.reasoning.temporality)}" placeholder="Relação cronológica entre evento e achados"></label>
            <label class="field"><span>Consolidação</span><input name="consolidation" value="${escapeHtml(caseData.reasoning.consolidation)}" placeholder="Consolidado, não consolidado, indeterminado"></label>
            <label class="field"><span>Repercussões</span><input name="repercussions" value="${escapeHtml(caseData.reasoning.repercussions)}" placeholder="Funcional, estética, profissional, terapêutica"></label>
            <label class="field"><span>Discussão técnica</span><textarea name="notes" placeholder="Registre convergências, inconsistências, lacunas e hipóteses alternativas.">${escapeHtml(caseData.reasoning.notes)}</textarea></label>
            <div class="form-actions"><button class="button button-primary" type="submit">Salvar análise</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-header"><div><span class="eyebrow">Conclusão rastreável</span><h2>Registrar conclusão</h2></div><span class="badge badge-warning">validação humana</span></div>
          <form id="conclusionForm">
            <label class="field"><span>Título</span><input name="title" required maxlength="120" placeholder="Ex.: síntese médico-legal preliminar"></label>
            <label class="field"><span>Texto da conclusão</span><textarea name="text" required placeholder="A conclusão deve explicitar limites e grau de certeza."></textarea></label>
            <label class="field"><span>Status</span><select name="status"><option>Preliminar</option><option>Definitiva</option><option>Condicionada a documentos</option></select></label>

            <div class="section-gap">
              <span class="fieldset-legend">Evidências obrigatórias</span>
              <div class="check-list">
                ${caseData.evidence.map((item) => `<label class="check-row"><input type="checkbox" name="evidenceIds" value="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)} · ${formatDate(item.date)}</span></span></label>`).join('') || '<div class="empty-list">Não há evidências. Uma conclusão não poderá ser criada.</div>'}
              </div>
            </div>

            <div class="section-gap">
              <span class="fieldset-legend">Achados relacionados</span>
              <div class="check-list">
                ${caseData.findings.map((item) => `<label class="check-row"><input type="checkbox" name="findingIds" value="${escapeHtml(item.id)}"><span><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.type)} · confiança ${escapeHtml(item.confidence.toLowerCase())}</span></span></label>`).join('') || '<div class="empty-list">Nenhum achado disponível.</div>'}
              </div>
            </div>

            <div class="form-actions"><button class="button button-primary" type="submit" ${caseData.evidence.length ? '' : 'disabled'}>Registrar conclusão</button></div>
          </form>
        </section>
      </div>

      <section class="panel section-gap">
        <div class="panel-header"><div><span class="eyebrow">Histórico</span><h2>Conclusões registradas</h2></div></div>
        <div class="list">
          ${caseData.conclusions.map((item) => `
            <article class="conclusion-card">
              <div class="card-topline"><span class="entity-type">${escapeHtml(item.status)}</span><button class="button button-danger button-small" data-delete-conclusion="${escapeHtml(item.id)}" type="button">Excluir</button></div>
              <h3 class="card-title">${escapeHtml(item.title)}</h3>
              <p class="card-text">${escapeHtml(item.text)}</p>
              <div class="card-footer"><div class="meta-line"><span>${item.evidenceIds.length} evidência(s)</span><span>${item.findingIds.length} achado(s)</span><span>${formatDateTime(item.createdAt)}</span></div></div>
            </article>
          `).join('') || '<div class="empty-list">Nenhuma conclusão registrada.</div>'}
        </div>
      </section>
    `;

    bindCommonPageEvents();

    document.querySelector('#reasoningForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      caseData.reasoning = {
        nexus: String(data.get('nexus')).trim(),
        temporality: String(data.get('temporality')).trim(),
        consolidation: String(data.get('consolidation')).trim(),
        repercussions: String(data.get('repercussions')).trim(),
        notes: String(data.get('notes')).trim()
      };
      caseData.updatedAt = nowIso();
      saveState('Análise salva.');
    });

    document.querySelector('#conclusionForm').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const evidenceIds = data.getAll('evidenceIds').map(String);
      const findingIds = data.getAll('findingIds').map(String);
      if (!evidenceIds.length) {
        showToast('Nenhuma conclusão sem evidência: selecione ao menos uma fonte.');
        return;
      }
      caseData.conclusions.push({
        id: createId('conclusion'),
        title: String(data.get('title')).trim(),
        text: String(data.get('text')).trim(),
        status: String(data.get('status')),
        evidenceIds,
        findingIds,
        createdAt: nowIso()
      });
      caseData.updatedAt = nowIso();
      saveState('Conclusão registrada com rastreabilidade.');
      renderReasoning(caseData);
    });

    document.querySelectorAll('[data-delete-conclusion]').forEach((button) => {
      button.addEventListener('click', () => {
        caseData.conclusions = caseData.conclusions.filter((item) => item.id !== button.dataset.deleteConclusion);
        saveState('Conclusão removida.');
        renderReasoning(caseData);
      });
    });
  }

  function renderTraceability(caseData) {
    const rows = [];
    caseData.conclusions.forEach((conclusion) => {
      const linkedFindings = conclusion.findingIds.map((id) => getFinding(caseData, id)).filter(Boolean);
      const directEvidence = conclusion.evidenceIds.map((id) => getEvidence(caseData, id)).filter(Boolean);

      if (linkedFindings.length) {
        linkedFindings.forEach((finding) => {
          const evidence = [...new Set([...directEvidence, ...finding.evidenceIds.map((id) => getEvidence(caseData, id)).filter(Boolean)])];
          if (evidence.length) {
            evidence.forEach((source) => rows.push({ source, finding, conclusion }));
          } else {
            rows.push({ source: null, finding, conclusion });
          }
        });
      } else {
        directEvidence.forEach((source) => rows.push({ source, finding: null, conclusion }));
      }
    });

    workspace.innerHTML = `
      ${pageHeader(caseData, 'Motor de evidências', 'Rastreabilidade', 'Cada conclusão deve apontar para o conjunto de evidências, observações e achados que a sustenta.')}

      <section class="panel">
        <div class="panel-header">
          <div><span class="eyebrow">Matriz de suporte</span><h2>Fonte → achado → conclusão</h2><p>${rows.length} relação(ões) explicitada(s).</p></div>
          <span class="badge ${caseData.conclusions.every((item) => item.evidenceIds.length) ? 'badge-success' : 'badge-warning'}">${caseData.conclusions.every((item) => item.evidenceIds.length) ? 'sem conclusão órfã' : 'revisão necessária'}</span>
        </div>

        <div class="trace-table">
          ${rows.map(({ source, finding, conclusion }) => `
            <div class="trace-row">
              <div class="trace-cell"><span class="trace-chip">evidência</span><strong>${escapeHtml(source?.title || 'fonte não vinculada')}</strong><span>${escapeHtml(source?.type || '—')}</span></div>
              <div class="trace-arrow">→</div>
              <div class="trace-cell"><span class="trace-chip">achado</span><strong>${escapeHtml(finding?.title || 'vínculo direto')}</strong><span>${escapeHtml(finding?.type || 'evidência direta')}</span></div>
              <div class="trace-arrow">→</div>
              <div class="trace-cell"><span class="trace-chip">conclusão</span><strong>${escapeHtml(conclusion.title)}</strong><span>${escapeHtml(conclusion.status)}</span></div>
            </div>
          `).join('') || '<div class="empty-list">Crie uma conclusão com evidências para visualizar a matriz de rastreabilidade.</div>'}
        </div>
      </section>

      <section class="panel section-gap">
        <div class="panel-header"><div><span class="eyebrow">Auditoria</span><h2>Verificações automáticas</h2></div></div>
        <div class="grid-3">
          ${auditChecks(caseData).map((check) => `
            <article class="timeline-item">
              <div class="card-topline"><span class="entity-type">${check.pass ? 'Conforme' : 'Atenção'}</span><span class="badge ${check.pass ? 'badge-success' : 'badge-warning'}">${check.pass ? '✓' : '!'}</span></div>
              <h3 class="card-title">${escapeHtml(check.title)}</h3>
              <p class="card-text">${escapeHtml(check.description)}</p>
            </article>
          `).join('')}
        </div>
      </section>
    `;

    bindCommonPageEvents();
  }

  function auditChecks(caseData) {
    return [
      {
        pass: caseData.conclusions.every((item) => item.evidenceIds.length > 0),
        title: 'Conclusões com evidência',
        description: 'Nenhuma conclusão deve existir sem fonte documental, clínica ou fotográfica.'
      },
      {
        pass: caseData.findings.every((item) => item.evidenceIds.length > 0 || item.observationIds.length > 0),
        title: 'Achados sustentados',
        description: 'Todo achado precisa apontar para observações ou evidências identificáveis.'
      },
      {
        pass: caseData.events.length > 1,
        title: 'Temporalidade mínima',
        description: 'A linha do tempo deve permitir comparar evento, assistência e avaliação atual.'
      },
      {
        pass: Boolean(caseData.scope),
        title: 'Objeto delimitado',
        description: 'O escopo evita extrapolações e define o limite técnico da análise.'
      },
      {
        pass: caseData.evidence.some((item) => item.type === 'Exame clínico'),
        title: 'Exame clínico presente',
        description: 'O exame atual é uma fonte própria e não deve ser confundido com relato ou documento.'
      },
      {
        pass: Boolean(caseData.reasoning.notes),
        title: 'Discussão explícita',
        description: 'Convergências, lacunas, alternativas e limitações devem permanecer registradas.'
      }
    ];
  }


  function fieldValue(value) { return escapeHtml(value || ''); }

  function renderScope(caseData) {
    const d = caseData.scopeDefinition;
    workspace.innerHTML = `${pageHeader(caseData,'Delimitação','Objeto e limites da perícia','A análise e o laudo permanecem restritos ao que foi determinado pelo juízo.')}
    <div class="grid-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">Determinação judicial</span><h2>Objeto literal</h2></div></div>
    <form id="scopeForm">
      <label class="field"><span>Texto literal da decisão ou nomeação</span><textarea name="orderText">${fieldValue(d.orderText)}</textarea></label>
      <label class="field"><span>Objeto pericial delimitado</span><textarea name="literalObject">${fieldValue(d.literalObject)}</textarea></label>
      <label class="field"><span>Perguntas técnicas centrais</span><textarea name="technicalQuestions">${fieldValue(d.technicalQuestions)}</textarea></label>
      <label class="field"><span>Inclui</span><textarea name="includes">${fieldValue(d.includes)}</textarea></label>
      <label class="field"><span>Exclui / não concluir</span><textarea name="excludes">${fieldValue(d.excludes)}</textarea></label>
      <div class="form-actions"><button class="button button-primary">Salvar delimitação</button></div>
    </form></section>
    <section class="panel"><div class="panel-header"><div><span class="eyebrow">Dados processuais</span><h2>Controle do encargo</h2></div></div>
    <form id="processForm"><label class="field"><span>Vara / juízo</span><input name="court" value="${fieldValue(caseData.process.court)}"></label>
    <label class="field"><span>Magistrado</span><input name="judge" value="${fieldValue(caseData.process.judge)}"></label>
    <label class="field"><span>Partes</span><textarea name="parties">${fieldValue(caseData.process.parties)}</textarea></label>
    <div class="grid-2"><label class="field"><span>Data da nomeação</span><input type="date" name="appointmentDate" value="${fieldValue(caseData.process.appointmentDate)}"></label><label class="field"><span>Prazo</span><input name="deadline" value="${fieldValue(caseData.process.deadline)}"></label></div>
    <label class="field"><span>Honorários</span><input name="fees" value="${fieldValue(caseData.process.fees)}"></label>
    <label class="check-row"><input type="checkbox" name="legalAid" ${caseData.process.legalAid?'checked':''}><span><strong>Assistência judiciária gratuita</strong></span></label>
    <div class="form-actions"><button class="button button-primary">Salvar dados processuais</button></div></form></section></div>`;
    bindCommonPageEvents();
    document.querySelector('#scopeForm').onsubmit=e=>{e.preventDefault();Object.assign(d,Object.fromEntries(new FormData(e.currentTarget)));caseData.scope=d.literalObject;saveState('Delimitação salva.');renderScope(caseData)};
    document.querySelector('#processForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);['court','judge','parties','appointmentDate','deadline','fees'].forEach(k=>caseData.process[k]=String(f.get(k)||''));caseData.process.legalAid=f.get('legalAid')==='on';saveState('Dados processuais salvos.');renderScope(caseData)};
  }

  function renderTimeline(caseData){
    const events=[...caseData.events].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    workspace.innerHTML=`${pageHeader(caseData,'Cronologia','Linha do tempo médico-legal','Eventos devem permanecer factuais e vinculáveis às fontes.')}
    <div class="grid-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">Novo marco</span><h2>Adicionar evento</h2></div></div><form id="timelineForm"><label class="field"><span>Data</span><input name="date" type="date" required></label><label class="field"><span>Título</span><input name="title" required></label><label class="field"><span>Descrição factual</span><textarea name="description" required></textarea></label><div class="form-actions"><button class="button button-primary">Adicionar</button></div></form></section>
    <section class="panel"><div class="panel-header"><div><span class="eyebrow">Sequência</span><h2>${events.length} evento(s)</h2></div></div><div class="list">${events.map(e=>`<article class="timeline-item"><div class="card-topline"><span class="entity-type">${formatDate(e.date)}</span><button class="button button-danger button-small" data-del-timeline="${e.id}">Excluir</button></div><h3 class="card-title">${escapeHtml(e.title)}</h3><p class="card-text">${escapeHtml(e.description)}</p></article>`).join('')||'<div class="empty-list">Nenhum evento.</div>'}</div></section></div>`;
    bindCommonPageEvents();document.querySelector('#timelineForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.currentTarget);caseData.events.push({id:createId('event'),date:String(f.get('date')),title:String(f.get('title')),description:String(f.get('description')),sourceIds:[]});saveState('Evento adicionado.');renderTimeline(caseData)};document.querySelectorAll('[data-del-timeline]').forEach(b=>b.onclick=()=>{caseData.events=caseData.events.filter(e=>e.id!==b.dataset.delTimeline);saveState('Evento removido.');renderTimeline(caseData)});
  }

  function renderExam(caseData){const x=caseData.exam;workspace.innerHTML=`${pageHeader(caseData,'Exame pericial','Entrevista, exame e documentação fotográfica','Separe relato, observação e interpretação.')}
  <section class="panel"><form id="examForm"><div class="grid-2"><label class="field"><span>Relato do periciando</span><textarea name="interview">${fieldValue(x.interview)}</textarea></label><label class="field"><span>Exame geral</span><textarea name="general">${fieldValue(x.general)}</textarea></label><label class="field"><span>Localização anatômica</span><textarea name="location">${fieldValue(x.location)}</textarea></label><label class="field"><span>Dimensões e extensão</span><textarea name="dimensions">${fieldValue(x.dimensions)}</textarea></label><label class="field"><span>Morfologia</span><textarea name="morphology">${fieldValue(x.morphology)}</textarea></label><label class="field"><span>Componente dinâmico</span><textarea name="dynamic">${fieldValue(x.dynamic)}</textarea></label><label class="field"><span>Estado anterior</span><textarea name="previousState">${fieldValue(x.previousState)}</textarea></label><label class="field"><span>Reparabilidade e prognóstico</span><textarea name="repairability">${fieldValue(x.repairability)}</textarea></label><label class="field"><span>Fotografias padronizadas</span><textarea name="photos">${fieldValue(x.photos)}</textarea></label><label class="field"><span>Limitações do exame</span><textarea name="limitations">${fieldValue(x.limitations)}</textarea></label></div><div class="form-actions"><button class="button button-primary">Salvar exame</button></div></form></section>`;bindCommonPageEvents();document.querySelector('#examForm').onsubmit=e=>{e.preventDefault();Object.assign(x,Object.fromEntries(new FormData(e.currentTarget)));saveState('Exame salvo.');renderExam(caseData)};}

  function renderAesthetic(caseData){
    const a=caseData.aipe,A=window.MLKSAIPE;const cat=A.categories.find(c=>c.id===a.category);
    const q1=A.q1.map((q,n)=>`<div class="question-block"><h3>${n+1}. ${q.label}</h3><div class="option-list">${q.options.map((o,i)=>`<label class="option"><input type="radio" name="aipe_${q.key}" value="${i}" ${Number(a.q1[q.key])===i?'checked':''}>${o}</label>`).join('')}</div></div>`).join('');
    const rows=A.categories.map(c=>{const m=A.compatibility(a,c);return `<tr><td><strong>${c.label}</strong><br>${c.range.join('–')}</td><td>${m.matches}/${m.total}</td><td><div class="mini-bar"><span style="width:${m.ratio*100}%"></span></div></td></tr>`}).join('');
    const impact=cat&&A.impact[cat.id]?A.impact[cat.id].map(([l,p])=>`<label class="option"><input type="radio" name="impactLevel" value="${l}" data-points="${p}" ${a.impactLevel===l?'checked':''}><strong>${l}</strong> · ${p} pontos</label>`).join(''):'<div class="empty-list">Escolha a categoria primeiro.</div>';
    const contexts=A.contexts.map(([k,l])=>`<div class="context-row"><strong>${l}</strong><div class="inline-actions">${[['none','Não se percebe'],['perceived','Percebe-se'],['clear','Percebe-se claramente'],['na','Não aplicável']].map(([v,t])=>`<label class="trace-chip"><input type="radio" name="ctx_${k}" value="${v}" ${a.contexts[k]===v?'checked':''}>${t}</label>`).join('')}</div></div>`).join('');
    workspace.innerHTML=`${pageHeader(caseData,'Método específico','Dano estético · AIPE Brasil','Aplicação integrada ao caso, sem converter automaticamente respostas discordantes.')}
    <section class="panel"><div class="panel-header"><div><span class="eyebrow">Pré-requisitos</span><h2>Elegibilidade</h2></div></div><div class="check-list">${[['damage','Dano demonstrado'],['nexus','Nexo estabelecido'],['consolidated','Consolidação médico-legal'],['permanent','Caráter permanente'],['visible','Alteração perceptível']].map(([k,l])=>`<label class="check-row"><input type="checkbox" data-elig="${k}" ${a.eligibility[k]?'checked':''}><span><strong>${l}</strong></span></label>`).join('')}</div></section>
    <section class="panel section-gap"><div class="panel-header"><div><span class="eyebrow">Quadro 1</span><h2>Impressão e impacto</h2></div></div>${q1}</section>
    <section class="panel section-gap"><div class="panel-header"><div><span class="eyebrow">Quadro 2</span><h2>Categoria</h2></div></div><div class="security-note"><span>!</span><div>A compatibilidade é apoio visual, não escore validado. A categoria exige decisão e fundamentação do perito.</div></div><div class="table-scroll"><table><thead><tr><th>Categoria</th><th>Coincidências</th><th>Compatibilidade visual</th></tr></thead><tbody>${rows}</tbody></table></div><label class="field"><span>Categoria adotada</span><select id="aipeCategory"><option value="">Selecione</option>${A.categories.map(c=>`<option value="${c.id}" ${a.category===c.id?'selected':''}>${c.label} · ${c.range.join('–')}</option>`).join('')}</select></label><label class="field"><span>Fundamentação</span><textarea id="aipeRationale">${fieldValue(a.categoryRationale)}</textarea></label></section>
    <section class="panel section-gap"><div class="panel-header"><div><span class="eyebrow">Quadro 3</span><h2>Nível dentro da categoria</h2></div></div><div class="option-list">${impact}</div><label class="field"><span>Pontuação inicial</span><input id="initialScore" type="number" min="0" max="50" value="${fieldValue(a.initialScore)}"></label></section>
    <section class="panel section-gap"><div class="panel-header"><div><span class="eyebrow">Quadro 4</span><h2>Critérios complementares</h2></div></div>${contexts}<label class="field"><span>Decisão complementar</span><select id="adjustment"><option value="decrease" ${a.adjustment==='decrease'?'selected':''}>Diminuir</option><option value="maintain" ${a.adjustment==='maintain'?'selected':''}>Manter</option><option value="increase" ${a.adjustment==='increase'?'selected':''}>Aumentar</option></select></label><label class="field"><span>Fundamentação do ajuste</span><textarea id="adjustmentRationale">${fieldValue(a.adjustmentRationale)}</textarea></label><label class="field"><span>Pontuação final</span><input id="finalAipeScore" type="number" min="0" max="50" value="${fieldValue(a.finalScore)}"></label><div class="form-actions"><button id="saveAipe" class="button button-primary">Salvar avaliação estética</button></div></section>`;
    bindCommonPageEvents();document.querySelectorAll('[data-elig]').forEach(el=>el.onchange=()=>a.eligibility[el.dataset.elig]=el.checked);document.querySelectorAll('[name^="aipe_"]').forEach(el=>el.onchange=()=>{a.q1[el.name.replace('aipe_','')]=Number(el.value);saveState();renderAesthetic(caseData)});document.querySelector('#aipeCategory').onchange=e=>{a.category=e.target.value;a.impactLevel='';a.initialScore='';renderAesthetic(caseData)};document.querySelectorAll('[name="impactLevel"]').forEach(el=>el.onchange=()=>{a.impactLevel=el.value;const nums=el.dataset.points.match(/\d+/g).map(Number);a.initialScore=nums[0];document.querySelector('#initialScore').value=nums[0]});document.querySelectorAll('[name^="ctx_"]').forEach(el=>el.onchange=()=>a.contexts[el.name.replace('ctx_','')]=el.value);document.querySelector('#saveAipe').onclick=()=>{a.categoryRationale=document.querySelector('#aipeRationale').value;a.initialScore=document.querySelector('#initialScore').value;a.adjustment=document.querySelector('#adjustment').value;a.adjustmentRationale=document.querySelector('#adjustmentRationale').value;a.finalScore=document.querySelector('#finalAipeScore').value;saveState('AIPE salvo.');renderAesthetic(caseData)};
  }

  function renderQuestions(caseData){const Q=window.MLKSQuesitos;workspace.innerHTML=`${pageHeader(caseData,'Quesitos','Perguntas das partes e do juízo','Cada resposta deve respeitar objeto, competência e base probatória.')}
  <div class="grid-2"><section class="panel"><div class="panel-header"><div><span class="eyebrow">Novo quesito</span><h2>Registrar</h2></div></div><form id="questionForm"><label class="field"><span>Origem</span><select name="source"><option>Juízo</option><option>Autor</option><option>Réu</option><option>Perito</option></select></label><label class="field"><span>Texto</span><textarea name="text" required></textarea></label><label class="field"><span>Classificação</span><select name="classification">${Q.classifications.map(x=>`<option>${x}</option>`).join('')}</select></label><label class="field"><span>Resposta</span><textarea name="answer"></textarea></label><label class="field"><span>Fundamentos / IDs vinculados</span><textarea name="basis"></textarea></label><div class="form-actions"><button class="button button-primary">Adicionar quesito</button></div></form></section><section class="panel"><div class="panel-header"><div><span class="eyebrow">Inventário</span><h2>${caseData.questions.length} quesito(s)</h2></div></div><div class="list">${caseData.questions.map((q,i)=>`<article class="conclusion-card"><div class="card-topline"><span class="entity-type">${escapeHtml(q.source)} · ${i+1}</span><button class="button button-danger button-small" data-del-q="${q.id}">Excluir</button></div><h3 class="card-title">${escapeHtml(q.text)}</h3><p class="card-text">${escapeHtml(q.answer||'Sem resposta.')}</p><div class="card-footer"><span class="badge">${escapeHtml(q.classification)}</span></div></article>`).join('')||'<div class="empty-list">Nenhum quesito.</div>'}</div></section></div>`;bindCommonPageEvents();document.querySelector('#questionForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));caseData.questions.push({id:createId('question'),...f,status:'Em elaboração',createdAt:nowIso()});saveState('Quesito adicionado.');renderQuestions(caseData)};document.querySelectorAll('[data-del-q]').forEach(b=>b.onclick=()=>{caseData.questions=caseData.questions.filter(q=>q.id!==b.dataset.delQ);saveState('Quesito removido.');renderQuestions(caseData)});}

  function renderReport(caseData){const r=caseData.report;const draft=window.MLKSReportBuilder.build(caseData);workspace.innerHTML=`${pageHeader(caseData,'Montador','Laudo médico-pericial','O texto é compilado a partir do caso e permanece integralmente editável.')}
  <div class="grid-2"><section class="panel"><form id="reportForm"><label class="field"><span>Metodologia</span><textarea name="methodology">${fieldValue(r.methodology)}</textarea></label><label class="field"><span>Histórico</span><textarea name="history">${fieldValue(r.history)}</textarea></label><label class="field"><span>Discussão</span><textarea name="discussion">${fieldValue(r.discussion)}</textarea></label><label class="field"><span>Conclusão</span><textarea name="conclusion">${fieldValue(r.conclusion)}</textarea></label><label class="field"><span>Referências</span><textarea name="references">${fieldValue(r.references)}</textarea></label><div class="form-actions"><button class="button button-primary">Salvar seções</button></div></form></section><section class="panel"><div class="panel-header"><div><span class="eyebrow">Prévia</span><h2>Documento compilado</h2></div><button id="copyReport" class="button button-ghost button-small">Copiar</button></div><pre class="report-preview">${escapeHtml(draft)}</pre></section></div>`;bindCommonPageEvents();document.querySelector('#reportForm').onsubmit=e=>{e.preventDefault();Object.assign(r,Object.fromEntries(new FormData(e.currentTarget)));r.version=(r.version||0)+1;saveState('Laudo salvo.');renderReport(caseData)};document.querySelector('#copyReport').onclick=()=>navigator.clipboard.writeText(window.MLKSReportBuilder.build(caseData)).then(()=>showToast('Laudo copiado.'));}

  function renderValidation(caseData){const checks=[['Objeto literal definido',Boolean(caseData.scopeDefinition.literalObject)],['Há evidências',caseData.evidence.length>0],['Exame registrado',Boolean(caseData.exam.general||caseData.exam.morphology)],['Raciocínio registrado',Object.values(caseData.reasoning).some(Boolean)],['AIPE fundamentado',!caseData.aipe.category||Boolean(caseData.aipe.categoryRationale)],['Todos os quesitos respondidos',caseData.questions.every(q=>Boolean(q.answer))],['Conclusão do laudo elaborada',Boolean(caseData.report.conclusion)],['Conclusões rastreáveis',caseData.conclusions.every(c=>c.evidenceIds?.length)]];workspace.innerHTML=`${pageHeader(caseData,'Revisão final','Validação de escopo e coerência','Checklist anterior à exportação e assinatura.')}
  <section class="panel"><div class="check-list">${checks.map(([l,p])=>`<div class="check-row"><span>${p?'✓':'○'}</span><span><strong>${l}</strong><small>${p?'atendido':'pendente'}</small></span></div>`).join('')}</div></section><section class="panel section-gap"><div class="panel-header"><div><span class="eyebrow">Alertas de competência</span><h2>Revisão humana obrigatória</h2></div></div><div class="security-note"><span>!</span><div>Confirme que o laudo não fixa indenização, não decide culpa, não responde matéria jurídica e não ultrapassa o objeto delimitado.</div></div></section>`;bindCommonPageEvents();}

  function bindCommonPageEvents() {
    const switcher = document.querySelector('#caseSwitcher');
    switcher?.addEventListener('change', () => {
      state.currentCaseId = switcher.value;
      saveState();
      render();
    });

    document.querySelectorAll('[data-go]').forEach((button) => {
      button.addEventListener('click', () => setCurrentView(button.dataset.go));
    });
  }

  function render() {
    const caseData = getCurrentCase();
    if (!caseData) {
      renderEmpty();
      return;
    }

    const renderers = {
      overview: renderOverview,
      case: renderCase,
      evidence: renderEvidence,
      observations: renderObservations,
      findings: renderFindings,
      graph: renderGraph,
      reasoning: renderReasoning,
      scope: renderScope,
      timeline: renderTimeline,
      exam: renderExam,
      aesthetic: renderAesthetic,
      questions: renderQuestions,
      report: renderReport,
      validation: renderValidation,
      traceability: renderTraceability
    };

    (renderers[currentView] || renderOverview)(caseData);
  }

  function openNewCaseDialog() {
    newCaseForm.reset();
    dialog.showModal();
    requestAnimationFrame(() => newCaseForm.elements.title.focus());
  }

  function exportData() {
    const caseData = getCurrentCase();
    if (!caseData) {
      showToast('Não há caso para exportar.');
      return;
    }
    const payload = {
      schema: 'https://joyceradis.github.io/MLKS/data/mlks.schema.json',
      exportedAt: nowIso(),
      application: 'MLKS Prototype',
      case: caseData
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mlks-${caseData.reference || caseData.id}.json`.replaceAll(' ', '-').toLowerCase();
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('Caso exportado em JSON.');
  }

  navigation.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (button) setCurrentView(button.dataset.view);
  });

  document.querySelector('#newCaseButton').addEventListener('click', openNewCaseDialog);
  document.querySelector('#exportButton').addEventListener('click', exportData);

  newCaseForm.addEventListener('submit', (event) => {
    const submitterValue = event.submitter?.value;
    if (submitterValue === 'cancel') return;
    event.preventDefault();
    const data = new FormData(newCaseForm);
    if (!newCaseForm.reportValidity()) return;
    const newCase = caseTemplate({
      title: String(data.get('title')).trim(),
      reference: String(data.get('reference')).trim(),
      objectType: String(data.get('objectType'))
    });
    state.cases.push(newCase);
    state.currentCaseId = newCase.id;
    saveState('Caso criado.');
    dialog.close();
    setCurrentView('case');
  });

  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
  window.addEventListener('hashchange', () => {
    const next = location.hash.replace('#/', '');
    if (next) setCurrentView(next);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('MLKS: service worker indisponível.', error));
    });
  }

  updateConnectionStatus();
  setCurrentView(currentView);
})();
