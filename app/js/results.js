// =============================================
// Results page
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();

  const attemptId = Utils.getParam('id');
  if (!attemptId) { window.location.href = 'dashboard.html'; return; }

  let attempt, review, allAttempts = [];
  try {
    [attempt, review] = await Promise.all([
      API.attempts.get(attemptId),
      API.attempts.review(attemptId),
    ]);
    allAttempts = (await API.attempts.list(attempt.attempt.userSimulationId)).attempts || [];
  } catch (e) {
    Utils.toast(e.message || 'Erro ao carregar', 'error');
    Components.hidePageLoader();
    return;
  }

  Components.hidePageLoader();
  await Components.initLayout();
  render();

  function render() {
    const a   = attempt.attempt;
    const sim = a.simulation || {};
    const pct = a.score ?? 0;
    const pass = pct >= (sim.passingScore || Config.DEFAULT_PASS_SCORE);
    const correct  = a.correctCount   || 0;
    const wrong    = a.wrongCount     || 0;
    const skipped  = a.skippedCount   || 0;
    const total    = attempt.questions?.length || a.totalQuestions || 0;
    const timeSpent= a.timeSpentSeconds;

    document.title = `Resultado — ${sim.title || 'Simulado'}`;

    // Hero
    setEl('results-circle',    Components.renderScoreCircle(pct, pass));
    setEl('results-sim-title', sim.title || 'Simulado');
    setEl('result-mode',       a.mode === 'training' ? '🏋️ Modo Treino' : '📖 Modo Aprendizado');
    setEl('result-date',       Utils.formatDateTime(a.startTime));

    // Stat chips
    setEl('stat-correct',  correct);
    setEl('stat-wrong',    wrong);
    setEl('stat-skipped',  skipped);
    setEl('stat-time',     Utils.formatDuration(timeSpent));

    // Animate circle
    setTimeout(() => {
      const circle = document.querySelector('.score-circle-fill');
      if (circle) circle.style.strokeDashoffset = circle.dataset.offset;
    }, 200);

    // Category breakdown
    renderCategories(review.categoryBreakdown);

    // Attempts history
    renderHistory(allAttempts, a.attemptId);

    // Review questions
    if (a.mode !== 'learning') renderReview(review.questions || []);
    else document.getElementById('review-section')?.remove();

    // Actions
    document.getElementById('btn-retry')?.addEventListener('click', () => {
      Utils.openModal('mode-modal');
    });
    document.getElementById('btn-back')?.addEventListener('click', () => {
      window.location.href = `simulation.html?usid=${a.userSimulationId}`;
    });
    document.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', async () => {
        Utils.closeModal('mode-modal');
        try {
          const res = await API.attempts.create({ userSimulationId: a.userSimulationId, mode: btn.dataset.mode });
          window.location.href = `exam.html?id=${res.attempt.attemptId}`;
        } catch (e) { Utils.toast(e.message || 'Erro', 'error'); }
      });
    });
    document.querySelectorAll('[data-close-modal]').forEach(b => {
      b.addEventListener('click', () => Utils.closeModal(b.dataset.closeModal));
    });
  }

  function renderCategories(breakdown) {
    const el = document.getElementById('category-breakdown');
    if (!el || !breakdown?.length) { el?.closest('.card')?.remove(); return; }
    el.innerHTML = breakdown.map(c => {
      const cls = Utils.scoreClass(c.score);
      return `
      <div class="category-row">
        <div class="category-row-header">
          <span class="category-name">${c.category}</span>
          <span class="category-score ${cls}">${c.score}% (${c.correct}/${c.total})</span>
        </div>
        <div class="category-bar"><div class="category-bar-fill ${cls}" style="width:${c.score}%"></div></div>
      </div>`;
    }).join('');
  }

  function renderHistory(attempts, currentId) {
    const el = document.getElementById('attempts-history');
    if (!el || !attempts.length) return;
    const sorted = [...attempts].sort((a,b) => b.score - a.score);
    const bestId = sorted[0]?.attemptId;
    el.innerHTML = `<table class="attempts-table">
      <thead><tr><th>Posição</th><th>Data</th><th>Nota</th><th>Corretas</th><th>Tempo</th><th></th></tr></thead>
      <tbody>
        ${sorted.map((a, i) => `
          <tr class="${a.attemptId===currentId ? 'best-row' : ''}" style="${a.attemptId===currentId ? 'font-weight:600' : ''}">
            <td>${i===0 ? '🏆' : i+1}${a.attemptId===bestId ? ' <span class="badge badge-success" style="font-size:10px">Melhor</span>':''}</td>
            <td>${Utils.formatDateTime(a.startTime)}</td>
            <td class="${Utils.scoreTextClass(a.score)}">${a.score??'—'}%</td>
            <td>${a.correctCount??'—'}/${a.totalQuestions??'—'}</td>
            <td>${Utils.formatDuration(a.timeSpentSeconds)}</td>
            <td>${a.attemptId===currentId ? '<span class="badge badge-primary">Atual</span>' : `<a href="results.html?id=${a.attemptId}" class="btn btn-ghost btn-sm">Ver</a>`}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
  }

  function renderReview(questions) {
    const el = document.getElementById('review-list');
    if (!el) return;
    if (!questions.length) { el.innerHTML = '<p class="text-muted" style="text-align:center;padding:var(--space-4)">Sem dados de revisão.</p>'; return; }
    const letters = ['A','B','C','D','E'];
    el.innerHTML = questions.map((q, i) => {
      const correctAnswers = Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length
        ? q.correctOptionIndexes
        : [q.correctOptionIndex];
      const userAnswers = Array.isArray(q.userAnswer)
        ? q.userAnswer
        : (q.userAnswer === undefined || q.userAnswer === null ? [] : [q.userAnswer]);
      const result = userAnswers.length === 0 ? 'skipped' : sameSet(userAnswers, correctAnswers) ? 'correct' : 'wrong';
      const icons  = { correct: '✓', wrong: '✗', skipped: '—' };
      return `
      <div class="review-item ${result}">
        <div class="review-item-header" onclick="this.parentElement.classList.toggle('open')">
          <span class="review-item-number">${icons[result]}</span>
          <span class="review-item-text">${i+1}. ${q.text?.substring(0,80)}${q.text?.length>80?'…':''}</span>
          <span class="review-item-icon">▾</span>
        </div>
        <div class="review-item-body">
          <p style="font-size:var(--text-sm);margin-bottom:var(--space-3);color:var(--text-secondary)">${q.text}</p>
          <div class="review-options">
            ${q.options.map((opt, oi) => {
              let cls = '';
              if (correctAnswers.includes(oi))                              cls = 'correct-answer';
              else if (userAnswers.includes(oi) && result === 'wrong')      cls = 'user-wrong';
              return `<div class="review-option ${cls}">
                <span class="review-option-letter">${letters[oi]}</span>
                <span>${opt}</span>
                ${cls === 'correct-answer' ? ' <span style="margin-left:auto;color:var(--color-success)">✓ Correta</span>' : ''}
                ${cls === 'user-wrong'     ? ' <span style="margin-left:auto;color:var(--color-danger)">✗ Sua resposta</span>' : ''}
              </div>`;
            }).join('')}
          </div>
          ${q.explanation ? `<div class="explanation-box"><div class="explanation-title">💡 Explicação</div>${q.explanation}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function sameSet(a, b) {
    const left = [...a].map(Number).sort((x, y) => x - y);
    const right = [...b].map(Number).sort((x, y) => x - y);
    return left.length === right.length && left.every((value, idx) => value === right[idx]);
  }
})();
