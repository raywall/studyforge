// =============================================
// Simulation detail page
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();
  await Components.initLayout();

  // Support both catalog sim (?id=) and user sim instance (?usid=)
  const simId  = Utils.getParam('id');
  const usId   = Utils.getParam('usid');

  if (!simId && !usId) { window.location.href = 'dashboard.html'; return; }

  let sim, userSim, attempts = [], stats = null;

  try {
    if (usId) {
      [userSim, stats] = await Promise.all([
        API.userSimulations.get(usId),
        API.userSimulations.stats(usId),
      ]);
      attempts = (await API.attempts.list(usId)).attempts || [];
      sim = userSim.simulation;
    } else {
      sim = await API.simulations.get(simId);
      // Check if user already has generated versions and keep the most recent by default.
      const allUserSims = (await API.userSimulations.list()).userSimulations || [];
      userSim = allUserSims
        .filter(u => u.simulationId === simId)
        .sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt))[0] || null;
      if (userSim) {
        [stats, attempts] = await Promise.all([
          API.userSimulations.stats(userSim.userSimulationId),
          API.attempts.list(userSim.userSimulationId).then(r => r.attempts || []),
        ]);
      }
    }
  } catch (e) {
    Utils.toast(e.message || 'Erro ao carregar', 'error');
  }

  Components.hidePageLoader();
  renderPage();

  // ── Render ────────────────────────────────────────────
  function renderPage() {
    if (!sim) { document.body.innerHTML = '<div class="empty-state"><h3>Simulado não encontrado</h3></div>'; return; }

    const icon = Utils.subjectIcon(sim.subject);
    const colorCls = Utils.subjectColorClass(sim.subject);
    const time = sim.timeLimitMinutes ? `${sim.timeLimitMinutes} minutos` : 'Sem limite';
    const bestScore = stats?.bestScore;
    const avgScore  = stats?.averageScore;
    const passScore = sim.passingScore || Config.DEFAULT_PASS_SCORE;
    const passed = bestScore != null && bestScore >= passScore;

    // Breadcrumb
    const crumb = document.getElementById('page-breadcrumb');
    if (crumb) crumb.textContent = sim.title;

    // Banner
    const banner = document.getElementById('sim-banner');
    if (banner) banner.className = `sim-detail-banner sim-card-banner ${colorCls}`;

    // Header info
    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };
    setEl('sim-icon',  icon);
    setEl('sim-title', sim.title);
    setEl('sim-desc',  sim.description || '');
    setEl('sim-level', `<span class="badge ${Utils.levelBadgeClass(sim.level)}">${Utils.levelLabel(sim.level)}</span>`);
    setEl('sim-subject', sim.subject || '');
    setEl('sim-questions', sim.questionCount);
    setEl('sim-time',     time);
    setEl('sim-pass',     `${passScore}%`);

    // Tags
    const tagsEl = document.getElementById('sim-tags');
    if (tagsEl && sim.tags?.length) tagsEl.innerHTML = sim.tags.map(t => `<span class="tag">${t}</span>`).join('');

    // Category distribution
    renderCategories();

    // My stats
    renderMyStats(bestScore, avgScore, passed);

    // Attempts history
    renderAttempts();

    // CTA buttons
    initActions();
  }

  function renderCategories() {
    const el = document.getElementById('categories-list');
    if (!el || !sim.categories) return;
    const entries = Object.entries(sim.categories);
    if (!entries.length) { el.closest('.card')?.remove(); return; }
    el.innerHTML = entries.map(([cat, pct]) => `
      <div class="category-row">
        <div class="category-row-header">
          <span class="category-name">${cat}</span>
          <span class="category-score" style="color:var(--text-secondary)">${pct}%</span>
        </div>
        <div class="category-bar"><div class="category-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--color-primary),var(--color-secondary))"></div></div>
      </div>`).join('');
  }

  function renderMyStats(best, avg, passed) {
    const el = document.getElementById('my-stats');
    if (!el) return;
    if (best == null) {
      el.innerHTML = `<div class="empty-state" style="padding:var(--space-8)">
        <div class="empty-state-icon">📊</div>
        <h3>Sem tentativas ainda</h3>
        <p>Gere e realize o simulado para ver seu desempenho.</p>
      </div>`;
      return;
    }
    el.innerHTML = `
      <div class="results-stats" style="grid-template-columns:repeat(3,1fr)">
        <div class="result-stat">
          <div class="result-stat-value ${Utils.scoreTextClass(best)}">${best}%</div>
          <div class="result-stat-label">Melhor nota</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value">${avg}%</div>
          <div class="result-stat-label">Média</div>
        </div>
        <div class="result-stat">
          <div class="result-stat-value">${attempts.length}</div>
          <div class="result-stat-label">Tentativas</div>
        </div>
      </div>
      <div class="mt-4" style="text-align:center">
        <span class="badge ${passed ? 'badge-success' : 'badge-danger'}" style="font-size:var(--text-sm);padding:var(--space-2) var(--space-4)">
          ${passed ? '✓ Aprovado' : '✕ Não aprovado ainda'}
        </span>
      </div>`;
  }

  function renderAttempts() {
    const el = document.getElementById('attempts-list');
    if (!el) return;
    if (!attempts.length) {
      el.innerHTML = '<p style="color:var(--text-muted);font-size:var(--text-sm);text-align:center;padding:var(--space-4)">Nenhuma tentativa ainda.</p>';
      return;
    }
    const sorted = [...attempts].sort((a,b) => new Date(b.startTime) - new Date(a.startTime));
    el.innerHTML = `
      <table class="attempts-table">
        <thead><tr>
          <th>#</th><th>Data</th><th>Modo</th><th>Nota</th><th>Tempo</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${sorted.map((a, i) => {
            const pct    = a.score ?? '—';
            const scoreCls = a.score != null ? Utils.scoreTextClass(a.score) : '';
            const mode   = a.mode === 'training' ? '🏋️ Treino' : '📖 Aprendizado';
            const status = a.status === 'completed' ? '<span class="badge badge-success">Concluído</span>' :
                           a.status === 'abandoned'  ? '<span class="badge badge-danger">Desistiu</span>' :
                           '<span class="badge badge-warning">Em andamento</span>';
            return `<tr ${i === 0 && a.score != null ? 'class="best-row"' : ''}>
              <td class="attempt-rank">${sorted.length - i}</td>
              <td>${Utils.formatDateTime(a.startTime)}</td>
              <td>${mode}</td>
              <td class="${scoreCls}" style="font-weight:600">${pct !== '—' ? pct + '%' : pct}</td>
              <td>${Utils.formatDuration(a.timeSpentSeconds)}</td>
              <td>${status}</td>
              <td><a href="results.html?id=${a.attemptId}" class="btn btn-ghost btn-sm">Ver →</a></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  // ── Actions ───────────────────────────────────────────
  function initActions() {
    const btnGenerate = document.getElementById('btn-generate');
    const btnStart    = document.getElementById('btn-start');
    const btnRetry    = document.getElementById('btn-retry');
    const modeModal   = document.getElementById('mode-modal');

    // Keep generation available so the user can create a fresh randomized version.
    btnGenerate?.classList.remove('hidden');

    if (!userSim) {
      btnStart?.classList.add('hidden');
      btnRetry?.classList.add('hidden');
    } else {
      // Check if there's an in-progress attempt
      const inProgress = attempts.find(a => a.status === 'in_progress');
      if (inProgress) {
        const btnContinue = document.getElementById('btn-continue');
        btnContinue?.classList.remove('hidden');
        btnContinue?.addEventListener('click', () => {
          window.location.href = `exam.html?id=${inProgress.attemptId}`;
        });
      }
      if (attempts.length === 0) btnStart?.classList.remove('hidden');
      else                       btnRetry?.classList.remove('hidden');
    }

    btnGenerate?.addEventListener('click', async () => {
      Utils.setLoading(btnGenerate, true, 'Gerando...');
      try {
        const res = await API.simulations.generate(simId);
        Utils.toast('Nova versão do simulado gerada. Escolha o modo para começar.', 'success');
        userSim = res.userSimulation;
        btnStart?.classList.remove('hidden');
        Utils.openModal('mode-modal');
      } catch (e) {
        Utils.toast(e.message || 'Erro ao gerar', 'error');
      } finally {
        Utils.setLoading(btnGenerate, false);
      }
    });

    [btnStart, btnRetry].forEach(btn => {
      btn?.addEventListener('click', () => Utils.openModal('mode-modal'));
    });

    // Mode selection
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const mode = btn.dataset.mode;
        Utils.closeModal('mode-modal');
        await startAttempt(mode);
      });
    });

    // Close modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => Utils.closeModal(btn.dataset.closeModal));
    });
  }

  async function startAttempt(mode) {
    try {
      const res = await API.attempts.create({
        userSimulationId: userSim.userSimulationId,
        mode,
      });
      window.location.href = `exam.html?id=${res.attempt.attemptId}`;
    } catch (e) {
      Utils.toast(e.message || 'Erro ao iniciar', 'error');
    }
  }
})();
