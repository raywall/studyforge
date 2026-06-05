// =============================================
// Admin content management
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();
  await Components.initLayout();
  if (!Auth.isAdmin()) {
    Components.hidePageLoader();
    Utils.toast('Acesso administrativo necessário.', 'error');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    return;
  }

  const state = { simulations: [], questions: [], users: [], simulationFilters: new Set(), simulationQuery: '' };
  const simForm = document.getElementById('simulation-form');
  const qForm = document.getElementById('question-form');
  const aiForm = document.getElementById('ai-question-form');

  bindTabs();
  bindForms();
  await loadAll();
  Components.hidePageLoader();

  document.getElementById('btn-refresh')?.addEventListener('click', loadAll);
  document.getElementById('btn-reset-forms')?.addEventListener('click', resetForms);
  document.getElementById('question-filter')?.addEventListener('change', loadQuestions);
  document.getElementById('question-search')?.addEventListener('input', renderQuestions);
  document.getElementById('simulation-search')?.addEventListener('input', Utils.debounce(e => {
    state.simulationQuery = e.target.value;
    renderSimulations();
  }, 200));
  document.getElementById('user-filter')?.addEventListener('input', renderUsers);
  aiForm?.elements.simulationId?.addEventListener('change', syncAIFormFromSimulation);
  bindAIModal();
  bindMarkdownEditor();

  async function loadAll() {
    try {
      const sims = await API.admin.simulations.list();
      state.simulations = sims.simulations || [];
      renderSimulationOptions();
      renderSimulationFilters();
      renderSimulations();
      await loadQuestions();
      await loadUsers();
    } catch (e) {
      Utils.toast(e.message || 'Erro ao carregar administração', 'error');
    }
  }

  async function loadQuestions() {
    const filter = document.getElementById('question-filter')?.value || '';
    try {
      const res = await API.admin.questions.list(filter);
      state.questions = res.questions || [];
      renderQuestions();
    } catch (e) {
      Utils.toast(e.message || 'Erro ao carregar questões', 'error');
    }
  }

  async function loadUsers() {
    try {
      const res = await API.admin.users.list();
      state.users = res.users || [];
      renderUsers();
    } catch (e) {
      Utils.toast(e.message || 'Erro ao carregar usuários', 'error');
    }
  }

  function bindTabs() {
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('[data-panel]').forEach(p => p.classList.add('hidden'));
        btn.classList.add('active');
        document.querySelector(`[data-panel="${btn.dataset.tab}"]`)?.classList.remove('hidden');
      });
    });
  }

  function bindForms() {
    simForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = simForm.querySelector('button[type="submit"]');
      Utils.setLoading(btn, true, 'Salvando...');
      try {
        await API.admin.simulations.save(readSimulationForm());
        Utils.toast('Simulado salvo.', 'success');
        resetSimulationForm();
        await loadAll();
      } catch (err) {
        Utils.toast(err.message || 'Erro ao salvar simulado', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });

    qForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = qForm.querySelector('button[type="submit"]');
      Utils.setLoading(btn, true, 'Salvando...');
      try {
        await API.admin.questions.save(readQuestionForm());
        Utils.toast('Questão salva.', 'success');
        resetQuestionForm();
        await loadQuestions();
      } catch (err) {
        Utils.toast(err.message || 'Erro ao salvar questão', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });

    aiForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = aiForm.querySelector('button[type="submit"]');
      Utils.setLoading(btn, true, 'Gerando...');
      try {
        const res = await API.admin.questions.generateAI(readAIQuestionForm());
        fillQuestionForm(res.question || {});
        Utils.toast('Rascunho gerado. Revise e salve a questão.', 'success');
        closeAIModal();
        document.querySelector('[data-tab="questions"]')?.click();
        qForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        Utils.toast(err.message || 'Erro ao gerar questão com IA', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    });
  }

  function readSimulationForm() {
    const fd = new FormData(simForm);
    return {
      simulationId: fd.get('simulationId') || '',
      title: fd.get('title').trim(),
      description: fd.get('description').trim(),
      subject: fd.get('subject').trim().toLowerCase(),
      level: fd.get('level').trim().toLowerCase(),
      questionCount: Number(fd.get('questionCount') || 0),
      timeLimitMinutes: Number(fd.get('timeLimitMinutes') || 0),
      passingScore: Number(fd.get('passingScore') || 72),
      categories: parseCategories(fd.get('categories')),
      tags: parseList(fd.get('tags')),
      active: fd.get('active') === 'on',
      isFree: fd.get('isFree') === 'on',
    };
  }

  function readQuestionForm() {
    const fd = new FormData(qForm);
    const correctOptionIndexes = parseCorrectIndexes(fd.get('correctOptionIndexes'));
    return {
      questionId: fd.get('questionId') || '',
      simulationId: fd.get('simulationId'),
      text: fd.get('text').trim(),
      options: String(fd.get('options')).split('\n').map(s => s.trim()).filter(Boolean),
      correctOptionIndex: correctOptionIndexes[0] || 0,
      correctOptionIndexes,
      requiredAnswers: correctOptionIndexes.length,
      explanation: fd.get('explanation').trim(),
      category: fd.get('category').trim(),
      difficulty: fd.get('difficulty'),
      tags: parseList(fd.get('tags')),
    };
  }

  function readAIQuestionForm() {
    const fd = new FormData(aiForm);
    return {
      simulationId: fd.get('simulationId') || '',
      subject: fd.get('subject').trim().toLowerCase(),
      level: fd.get('level').trim().toLowerCase(),
      category: fd.get('category').trim(),
      difficulty: fd.get('difficulty'),
      context: fd.get('context').trim(),
    };
  }

  function parseCategories(value) {
    const categories = {};
    String(value || '').split('\n').forEach(line => {
      const idx = line.lastIndexOf(':');
      if (idx <= 0) return;
      const name = line.slice(0, idx).trim();
      const pct = Number(line.slice(idx + 1).trim());
      if (name && Number.isFinite(pct)) categories[name] = pct;
    });
    return categories;
  }

  function categoriesToText(categories = {}) {
    return Object.entries(categories).map(([k, v]) => `${k}:${v}`).join('\n');
  }

  function parseList(value) {
    return String(value || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  function parseCorrectIndexes(value) {
    return [...new Set(String(value || '1')
      .split(',')
      .map(s => Number(s.trim()) - 1)
      .filter(n => Number.isInteger(n) && n >= 0))]
      .sort((a, b) => a - b);
  }

  function correctIndexesLabel(q) {
    const indexes = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length
      ? q.correctOptionIndexes
      : [q.correctOptionIndex || 0];
    return indexes.map(i => Number(i) + 1).join(', ');
  }

  function renderSimulationOptions() {
    const opts = state.simulations
      .sort((a, b) => a.title.localeCompare(b.title))
      .map(s => `<option value="${esc(s.simulationId)}">${esc(s.title)}</option>`)
      .join('');
    const qSelect = qForm?.elements.simulationId;
    if (qSelect) qSelect.innerHTML = opts || '<option value="">Cadastre um simulado primeiro</option>';
    const aiSelect = aiForm?.elements.simulationId;
    if (aiSelect) {
      aiSelect.innerHTML = opts || '<option value="">Cadastre um simulado primeiro</option>';
      syncAIFormFromSimulation();
    }
    const filter = document.getElementById('question-filter');
    if (filter) filter.innerHTML = `<option value="">Todos os simulados</option>${opts}`;
  }

  function renderSimulationFilters() {
    const bar = document.getElementById('admin-simulation-filters');
    if (!bar || bar.dataset.ready === 'true') return;
    const search = bar.querySelector('.filter-search');
    const subjects = [...new Set(state.simulations.map(s => (s.subject || '').toLowerCase()).filter(Boolean))].sort();
    const levels = [...new Set(state.simulations.map(s => (s.level || '').toLowerCase()).filter(Boolean))].sort();
    const chips = [
      { filter: 'all', label: 'Todos' },
      ...subjects.map(subject => ({ filter: subject, label: `${Utils.subjectIcon(subject)} ${subject.toUpperCase()}` })),
      ...levels.map(level => ({ filter: level, label: Utils.levelLabel(level) })),
      { filter: 'active', label: 'Ativos' },
      { filter: 'inactive', label: 'Inativos' },
    ];
    search?.insertAdjacentHTML('beforebegin', chips.map(chip => `
      <button class="filter-chip${chip.filter === 'all' ? ' active' : ''}" data-sim-filter="${esc(chip.filter)}">${chip.label}</button>
    `).join(''));
    bar.querySelectorAll('[data-sim-filter]').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.simFilter;
        if (filter === 'all') {
          state.simulationFilters.clear();
        } else if (state.simulationFilters.has(filter)) {
          state.simulationFilters.delete(filter);
        } else {
          state.simulationFilters.add(filter);
        }
        renderSimulations();
      });
    });
    bar.dataset.ready = 'true';
  }

  function syncAIFormFromSimulation() {
    if (!aiForm) return;
    const sim = state.simulations.find(s => s.simulationId === aiForm.elements.simulationId.value);
    if (!sim) return;
    aiForm.elements.subject.value = sim.subject || '';
    aiForm.elements.level.value = sim.level || '';
  }

  function renderSimulations() {
    const el = document.getElementById('simulations-admin-list');
    if (!el) return;
    const filtered = filteredSimulations();
    updateSimulationFilterChips();
    if (!filtered.length) {
      el.innerHTML = empty('Nenhum simulado cadastrado.');
      return;
    }
    el.innerHTML = filtered.map(sim => `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${esc(sim.title)}</div>
          <div class="admin-row-meta">
            <span>${esc(sim.subject)}</span>
            <span>${esc(Utils.levelLabel(sim.level))}</span>
            <span>${sim.questionCount} questões</span>
            <span>${sim.timeLimitMinutes || 0} min</span>
            <span>${sim.active ? 'Ativo' : 'Inativo'}</span>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-secondary btn-sm" data-edit-sim="${esc(sim.simulationId)}">Editar</button>
          <button class="btn btn-danger btn-sm" data-delete-sim="${esc(sim.simulationId)}">Remover</button>
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-edit-sim]').forEach(btn => btn.addEventListener('click', () => editSimulation(btn.dataset.editSim)));
    el.querySelectorAll('[data-delete-sim]').forEach(btn => btn.addEventListener('click', () => deleteSimulation(btn.dataset.deleteSim)));
  }

  function filteredSimulations() {
    const subjects = new Set(state.simulations.map(s => (s.subject || '').toLowerCase()).filter(Boolean));
    const levels = new Set(state.simulations.map(s => (s.level || '').toLowerCase()).filter(Boolean));
    const selectedSubjects = [...state.simulationFilters].filter(filter => subjects.has(filter));
    const selectedLevels = [...state.simulationFilters].filter(filter => levels.has(filter));
    const statusFilters = [...state.simulationFilters].filter(filter => filter === 'active' || filter === 'inactive');
    const term = normalizeSearch(state.simulationQuery || '');
    return state.simulations
      .filter(sim => {
        const subject = (sim.subject || '').toLowerCase();
        const level = (sim.level || '').toLowerCase();
        const subjectMatch = !selectedSubjects.length || selectedSubjects.some(filter => subject.includes(filter));
        const levelMatch = !selectedLevels.length || selectedLevels.includes(level);
        const statusMatch = !statusFilters.length || statusFilters.some(filter => filter === 'active' ? sim.active : !sim.active);
        const termMatch = !term || [sim.title, sim.description, sim.subject, sim.level, sim.tags?.join(' ')].some(value => normalizeSearch(value).includes(term));
        return subjectMatch && levelMatch && statusMatch && termMatch;
      })
      .sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  }

  function updateSimulationFilterChips() {
    document.querySelectorAll('[data-sim-filter]').forEach(chip => {
      const filter = chip.dataset.simFilter;
      chip.classList.toggle('active', filter === 'all' ? state.simulationFilters.size === 0 : state.simulationFilters.has(filter));
    });
  }

  function renderQuestions() {
    const el = document.getElementById('questions-admin-list');
    if (!el) return;
    const term = normalizeSearch(document.getElementById('question-search')?.value || '');
    const selectedId = qForm?.elements.questionId?.value || '';
    const bySim = new Map(state.simulations.map(s => [s.simulationId, s.title]));
    const questions = state.questions
      .filter(q => !term || questionMatchesTerm(q, term, bySim))
      .sort((a, b) => String(a.category || '').localeCompare(String(b.category || '')) || String(a.text || '').localeCompare(String(b.text || '')));
    if (!questions.length) {
      el.innerHTML = emptyTable(term ? 'Nenhuma questão encontrada com esse filtro.' : 'Nenhuma questão encontrada.');
      return;
    }
    el.innerHTML = questions.map(q => `
      <tr class="${q.questionId === selectedId ? 'selected' : ''}">
        <td>
          <button class="admin-table-question" type="button" data-edit-question="${esc(q.questionId)}">
            ${esc(Utils.truncate(q.text, 150))}
          </button>
        </td>
        <td>${esc(bySim.get(q.simulationId) || q.simulationId || 'Sem simulado')}</td>
        <td>${esc(q.category || 'Sem tópico')}</td>
        <td>${esc(difficultyLabel(q.difficulty))}</td>
        <td>${esc(correctIndexesLabel(q))}</td>
        <td>
          <div class="admin-table-actions">
            <button class="btn btn-secondary btn-sm" data-edit-question="${esc(q.questionId)}">Editar</button>
            <button class="btn btn-danger btn-sm" data-delete-question="${esc(q.questionId)}">Remover</button>
          </div>
        </td>
      </tr>`).join('');
    el.querySelectorAll('[data-edit-question]').forEach(btn => btn.addEventListener('click', () => editQuestion(btn.dataset.editQuestion)));
    el.querySelectorAll('[data-delete-question]').forEach(btn => btn.addEventListener('click', () => deleteQuestion(btn.dataset.deleteQuestion)));
  }

  function renderUsers() {
    const el = document.getElementById('users-admin-list');
    if (!el) return;
    const term = String(document.getElementById('user-filter')?.value || '').trim().toLowerCase();
    const users = state.users
      .filter(user => !term || [
        user.name,
        user.email,
        user.city,
        user.state,
        user.country,
        user.profession,
        user.education,
        user.jobTitle,
        user.company,
        user.phone,
      ].some(value => String(value || '').toLowerCase().includes(term)))
      .sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
    if (!users.length) {
      el.innerHTML = empty(term ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.');
      return;
    }
    el.innerHTML = users.map(user => `
      <div class="admin-row admin-user-row">
        <div>
          <div class="admin-row-title">${esc(user.name || user.email)}</div>
          <div class="admin-row-meta">
            <span>${esc(user.email)}</span>
            <span>${esc(user.role === 'admin' ? 'Administrador' : 'Estudante')}</span>
            <span>${user.emailVerified ? 'E-mail verificado' : 'Pendente de ativação'}</span>
            <span>${esc([user.city, user.state, user.country].filter(Boolean).join(' / ') || 'Local não informado')}</span>
          </div>
          <dl class="admin-user-details hidden" id="user-details-${esc(user.userId)}">
            ${userDetail('Nome', user.name)}
            ${userDetail('Nome completo', [user.firstName, user.lastName].filter(Boolean).join(' '))}
            ${userDetail('E-mail', user.email)}
            ${userDetail('Telefone', user.phone)}
            ${userDetail('Nascimento', formatDate(user.birthDate))}
            ${userDetail('Cidade', user.city)}
            ${userDetail('Estado', user.state)}
            ${userDetail('País', user.country)}
            ${userDetail('Profissão', user.profession)}
            ${userDetail('Formação', user.education)}
            ${userDetail('Cargo', user.jobTitle)}
            ${userDetail('Empresa', user.company)}
            ${userDetail('Perfil', user.role === 'admin' ? 'Administrador' : 'Estudante')}
            ${userDetail('Ativação', user.emailVerified ? 'E-mail verificado' : 'Pendente de ativação')}
            ${userDetail('Cadastro', formatDateTime(user.createdAt))}
            ${userDetail('Último login', formatDateTime(user.lastLoginAt) || 'Ainda não acessou')}
            ${userDetail('ID', user.userId)}
          </dl>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-secondary btn-sm" data-toggle-user="${esc(user.userId)}">Ver dados</button>
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-toggle-user]').forEach(btn => {
      btn.addEventListener('click', () => {
        const details = document.getElementById(`user-details-${btn.dataset.toggleUser}`);
        const isHidden = details?.classList.toggle('hidden');
        btn.textContent = isHidden ? 'Ver dados' : 'Ocultar';
      });
    });
  }

  function editSimulation(id) {
    const sim = state.simulations.find(s => s.simulationId === id);
    if (!sim) return;
    simForm.elements.simulationId.value = sim.simulationId || '';
    simForm.elements.title.value = sim.title || '';
    simForm.elements.description.value = sim.description || '';
    simForm.elements.subject.value = sim.subject || '';
    simForm.elements.level.value = sim.level || '';
    simForm.elements.questionCount.value = sim.questionCount || 1;
    simForm.elements.timeLimitMinutes.value = sim.timeLimitMinutes || 0;
    simForm.elements.passingScore.value = sim.passingScore || 72;
    simForm.elements.categories.value = categoriesToText(sim.categories);
    simForm.elements.tags.value = (sim.tags || []).join(', ');
    simForm.elements.active.checked = !!sim.active;
    simForm.elements.isFree.checked = !!sim.isFree;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function editQuestion(id) {
    const q = state.questions.find(item => item.questionId === id);
    if (!q) return;
    fillQuestionForm(q);
    document.querySelector('[data-tab="questions"]')?.click();
    qForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function fillQuestionForm(q) {
    qForm.elements.questionId.value = q.questionId || '';
    qForm.elements.simulationId.value = q.simulationId || '';
    qForm.elements.text.value = q.text || '';
    qForm.elements.options.value = (q.options || []).join('\n');
    qForm.elements.correctOptionIndexes.value = correctIndexesLabel(q);
    qForm.elements.explanation.value = q.explanation || '';
    qForm.elements.category.value = q.category || '';
    qForm.elements.difficulty.value = q.difficulty || 'medium';
    qForm.elements.tags.value = (q.tags || []).join(', ');
    setMarkdownTab('edit');
    updateMarkdownTools();
    renderQuestions();
  }

  function deleteSimulation(id) {
    Utils.confirm('Remover simulado', 'O cadastro do simulado será removido. As tentativas já registradas permanecem armazenadas.', async () => {
      try {
        await API.admin.simulations.delete(id);
        Utils.toast('Simulado removido.', 'success');
        await loadAll();
      } catch (e) {
        Utils.toast(e.message || 'Erro ao remover simulado', 'error');
      }
    }, true);
  }

  function deleteQuestion(id) {
    Utils.confirm('Remover questão', 'Esta questão não entrará em novos simulados gerados.', async () => {
      try {
        await API.admin.questions.delete(id);
        Utils.toast('Questão removida.', 'success');
        await loadQuestions();
      } catch (e) {
        Utils.toast(e.message || 'Erro ao remover questão', 'error');
      }
    }, true);
  }

  function resetForms() {
    resetSimulationForm();
    resetQuestionForm();
  }

  function resetSimulationForm() {
    simForm.reset();
    simForm.elements.simulationId.value = '';
    simForm.elements.questionCount.value = 10;
    simForm.elements.timeLimitMinutes.value = 0;
    simForm.elements.passingScore.value = 72;
    simForm.elements.active.checked = true;
    simForm.elements.isFree.checked = true;
  }

  function resetQuestionForm() {
    qForm.reset();
    qForm.elements.questionId.value = '';
    qForm.elements.correctOptionIndexes.value = '1';
    qForm.elements.difficulty.value = 'medium';
    setMarkdownTab('edit');
    updateMarkdownTools();
    renderQuestions();
  }

  function empty(text) {
    return `<div class="empty-state" style="padding:var(--space-8)"><h3>${esc(text)}</h3></div>`;
  }

  function emptyTable(text) {
    return `<tr><td colspan="6"><div class="empty-state admin-table-empty"><h3>${esc(text)}</h3></div></td></tr>`;
  }

  function bindAIModal() {
    document.getElementById('btn-open-ai')?.addEventListener('click', openAIModal);
    document.getElementById('btn-close-ai')?.addEventListener('click', closeAIModal);
    document.getElementById('btn-cancel-ai')?.addEventListener('click', closeAIModal);
    document.getElementById('ai-question-modal')?.addEventListener('click', e => {
      if (e.target?.id === 'ai-question-modal') closeAIModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAIModal();
    });
  }

  function openAIModal() {
    document.getElementById('ai-question-modal')?.classList.add('open');
    syncAIFormFromSimulation();
    setTimeout(() => aiForm?.elements.context?.focus(), 0);
  }

  function closeAIModal() {
    document.getElementById('ai-question-modal')?.classList.remove('open');
  }

  function bindMarkdownEditor() {
    document.querySelectorAll('[data-markdown-tab]').forEach(btn => {
      btn.addEventListener('click', () => setMarkdownTab(btn.dataset.markdownTab));
    });
    const input = qForm?.elements.explanation;
    input?.addEventListener('keydown', e => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const start = input.selectionStart;
      const end = input.selectionEnd;
      input.value = `${input.value.slice(0, start)}\t${input.value.slice(end)}`;
      input.selectionStart = input.selectionEnd = start + 1;
      updateMarkdownTools();
    });
    input?.addEventListener('input', updateMarkdownTools);
    updateMarkdownTools();
  }

  function setMarkdownTab(tab) {
    const active = tab === 'preview' ? 'preview' : 'edit';
    const input = qForm?.elements.explanation;
    const preview = document.getElementById('explanation-preview');
    document.querySelectorAll('[data-markdown-tab]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.markdownTab === active);
    });
    input?.classList.toggle('hidden', active !== 'edit');
    preview?.classList.toggle('hidden', active !== 'preview');
    updateMarkdownTools();
  }

  function updateMarkdownTools() {
    updateMarkdownPreview();
    updateMarkdownLint();
  }

  function updateMarkdownPreview() {
    const preview = document.getElementById('explanation-preview');
    const value = qForm?.elements.explanation?.value || '';
    if (!preview) return;
    preview.innerHTML = value.trim()
      ? Utils.renderMarkdown(value)
      : '<p class="markdown-empty">A visualização aparecerá aqui.</p>';
    if (!preview.classList.contains('hidden')) Utils.renderMermaid(preview);
  }

  function updateMarkdownLint() {
    const lint = document.getElementById('explanation-lint');
    if (!lint) return;
    const warnings = lintMarkdown(qForm?.elements.explanation?.value || '');
    lint.innerHTML = warnings.length
      ? warnings.map(w => `<span>${esc(w)}</span>`).join('')
      : '<span class="ok">Markdown sem alertas.</span>';
  }

  function lintMarkdown(value) {
    const warnings = [];
    if (!String(value || '').trim()) return ['A explicação está vazia.'];
    if (/!\[\s*\]\(/.test(value)) warnings.push('Adicione texto alternativo nas imagens.');
    if (/!?\[[^\]]+\]\((?!https:\/\/|mailto:|#)[^)]+\)/i.test(value)) warnings.push('Prefira links e imagens com HTTPS.');
    if ((value.match(/\[/g) || []).length !== (value.match(/\]/g) || []).length) warnings.push('Há colchetes sem fechamento.');
    if ((value.match(/\(/g) || []).length !== (value.match(/\)/g) || []).length) warnings.push('Há parênteses sem fechamento.');
    return warnings;
  }

  function questionMatchesTerm(q, term, bySim) {
    return [
      q.text,
      q.category,
      q.difficulty,
      q.tags?.join(' '),
      q.options?.join(' '),
      correctIndexesLabel(q),
      bySim.get(q.simulationId),
      q.simulationId,
    ].some(value => normalizeSearch(value).includes(term));
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function difficultyLabel(value) {
    return ({ easy: 'Básica', medium: 'Média', hard: 'Avançada' })[value] || value || 'Média';
  }

  function userDetail(label, value) {
    const text = String(value || '').trim();
    if (!text) return '';
    return `<div><dt>${esc(label)}</dt><dd>${esc(text)}</dd></div>`;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('pt-BR');
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[ch]);
  }
})();
