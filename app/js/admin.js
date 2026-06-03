// =============================================
// Admin content management
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();
  await Components.initLayout();
  if (Auth.getUser()?.role !== 'admin') {
    Components.hidePageLoader();
    Utils.toast('Acesso administrativo necessário.', 'error');
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    return;
  }

  const state = { simulations: [], questions: [] };
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
  aiForm?.elements.simulationId?.addEventListener('change', syncAIFormFromSimulation);

  async function loadAll() {
    try {
      const sims = await API.admin.simulations.list();
      state.simulations = sims.simulations || [];
      renderSimulationOptions();
      renderSimulations();
      await loadQuestions();
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
    if (!state.simulations.length) {
      el.innerHTML = empty('Nenhum simulado cadastrado.');
      return;
    }
    el.innerHTML = state.simulations.map(sim => `
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

  function renderQuestions() {
    const el = document.getElementById('questions-admin-list');
    if (!el) return;
    if (!state.questions.length) {
      el.innerHTML = empty('Nenhuma questão encontrada.');
      return;
    }
    const bySim = new Map(state.simulations.map(s => [s.simulationId, s.title]));
    el.innerHTML = state.questions.map(q => `
      <div class="admin-row">
        <div>
          <div class="admin-row-title">${esc(Utils.truncate(q.text, 120))}</div>
          <div class="admin-row-meta">
            <span>${esc(bySim.get(q.simulationId) || q.simulationId)}</span>
            <span>${esc(q.category || 'Sem tópico')}</span>
            <span>${esc(q.difficulty || 'medium')}</span>
            <span>Resposta(s) ${esc(correctIndexesLabel(q))}</span>
          </div>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-secondary btn-sm" data-edit-question="${esc(q.questionId)}">Editar</button>
          <button class="btn btn-danger btn-sm" data-delete-question="${esc(q.questionId)}">Remover</button>
        </div>
      </div>`).join('');
    el.querySelectorAll('[data-edit-question]').forEach(btn => btn.addEventListener('click', () => editQuestion(btn.dataset.editQuestion)));
    el.querySelectorAll('[data-delete-question]').forEach(btn => btn.addEventListener('click', () => deleteQuestion(btn.dataset.deleteQuestion)));
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  }

  function empty(text) {
    return `<div class="empty-state" style="padding:var(--space-8)"><h3>${esc(text)}</h3></div>`;
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
