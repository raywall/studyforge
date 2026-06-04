// =============================================
// Exam engine — training & learning modes
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;

  const attemptId = Utils.getParam('id');
  if (!attemptId) { window.location.href = 'dashboard.html'; return; }

  // ── State ─────────────────────────────────────────────
  const state = {
    attempt:    null,
    questions:  [],
    answers:    {},   // { questionId: [optionIndex] }
    flagged:    new Set(),
    current:    0,
    mode:       'training',
    reviewMode: false,
    timeLeft:   0,
    timerHandle:null,
    autoSaveHandle: null,
    dirty:      false,
  };

  // ── Boot ──────────────────────────────────────────────
  try {
    const res = await API.attempts.get(attemptId);
    state.attempt   = res.attempt;
    state.questions = res.questions;
    state.mode      = res.attempt.mode;
    state.answers   = normalizeAnswers(res.attempt.answers || {});
    state.flagged   = new Set(res.attempt.flaggedQuestions || []);
    state.current    = clampIndex(res.attempt.currentQuestionIndex || 0, state.questions.length);
    state.timeLeft  = res.attempt.timeRemainingSeconds ?? (res.attempt.timeLimitSeconds || 0);
    state.reviewMode = state.mode === 'training' && allQuestionsComplete();

    if (res.attempt.status !== 'in_progress') {
      window.location.href = `results.html?id=${attemptId}`;
      return;
    }
  } catch (e) {
    alert('Erro ao carregar o simulado: ' + (e.message || e));
    window.location.href = 'dashboard.html';
    return;
  }

  renderLayout();
  if (state.mode === 'training' && state.timeLeft > 0) startTimer();
  startAutoSave();
  renderQuestion(state.current);
  updateNavigator();

  // Warn before leaving
  window.addEventListener('beforeunload', (e) => {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });
  window.addEventListener('pagehide', () => saveProgress(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveProgress(true);
  });

  // ── Layout ────────────────────────────────────────────
  function renderLayout() {
    const sim = state.attempt.simulation || {};
    document.title = sim.title || 'Simulado — StudyForge';
    setEl('exam-title', sim.title || 'Simulado');
    setEl('exam-mode-badge', state.mode === 'training' ? '🏋️ Modo Treino' : '📖 Modo Aprendizado');
    document.getElementById('exam-mode-badge')?.classList.add(state.mode);
    if (state.mode === 'learning' || !state.timeLeft) {
      document.getElementById('timer-wrap')?.classList.add('hidden');
    }
    // Back button
    document.getElementById('btn-back')?.addEventListener('click', () => {
      Utils.confirm('Sair do simulado', 'Seu progresso será salvo. Deseja sair?', () => {
        saveProgress().then(() => { window.location.href = 'simulation.html?usid=' + state.attempt.userSimulationId; });
      });
    });
    // Submit button
    document.getElementById('btn-submit')?.addEventListener('click', () => confirmSubmit());
  }

  // ── Question rendering ────────────────────────────────
  function renderQuestion(idx) {
    const q = state.questions[idx];
    if (!q) return;
    state.current = idx;

    // Animate transition
    const card = document.getElementById('question-card');
    if (card) { card.style.opacity = '0'; card.style.transform = 'translateY(8px)'; }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (card) { card.style.transition = 'all 250ms ease'; card.style.opacity = '1'; card.style.transform = 'translateY(0)'; }
      });
    });

    // Number / progress
    setEl('q-number',    `Questão <span>${idx + 1}</span> de ${state.questions.length}`);
    setEl('q-category',  q.category ? `<span class="badge badge-muted">${q.category}</span>` : '');
    setEl('q-text',      q.text);

    // Flag button
    const btnFlag = document.getElementById('btn-flag');
    if (btnFlag) {
      const flagged = state.flagged.has(q.questionId);
      btnFlag.className = `btn-flag ${flagged ? 'flagged' : ''}`;
      btnFlag.innerHTML = `<span>${flagged ? '🚩' : '⚑'}</span><span>${flagged ? 'Marcada' : 'Marcar'}</span>`;
      btnFlag.onclick = () => toggleFlag(q.questionId);
    }

    // Options
    renderOptions(q, idx);

    // Progress bar
    const filled = ((idx + 1) / state.questions.length) * 100;
    const bar = document.getElementById('exam-progress-fill');
    if (bar) bar.style.width = `${filled}%`;

    // Navigation buttons
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    if (btnPrev) { btnPrev.disabled = idx === 0; btnPrev.onclick = () => renderQuestion(idx - 1); }
    if (btnNext) {
      const isLast = idx === state.questions.length - 1;
      if (state.mode === 'training' && isLast && !state.reviewMode) {
        btnNext.textContent = 'Revisar';
        btnNext.className = 'btn btn-primary';
        btnNext.onclick = () => enterReviewMode(q);
      } else {
        btnNext.textContent = isLast ? 'Finalizar' : 'Próxima →';
        btnNext.className = `btn ${isLast ? 'btn-success' : 'btn-primary'}`;
        btnNext.onclick = isLast ? () => confirmSubmit() : () => goNext(idx);
      }
    }

    // In learning mode, if already answered show feedback immediately
    if (state.mode === 'learning' && isComplete(q)) {
      showLearningFeedback(q, state.answers[q.questionId]);
    }

    updateNavigator();
    updateSubmitState();
  }

  function renderOptions(q, idx) {
    const list = document.getElementById('options-list');
    if (!list) return;
    document.getElementById('explanation-box')?.remove();
    const answered = selectedAnswers(q.questionId);
    const letters  = ['A', 'B', 'C', 'D', 'E'];
    const required = requiredAnswers(q);
    const isAnswered = answered.length > 0;
    const complete = answered.length === required;
    const multi = required > 1;
    const showFeedback = state.mode === 'learning' && complete;

    list.innerHTML = q.options.map((opt, i) => {
      let cls = '';
      if (isAnswered) {
        if (showFeedback) {
          if (correctAnswers(q).includes(i))  cls = 'correct';
          else if (answered.includes(i))      cls = 'wrong';
        } else {
          if (answered.includes(i))           cls = 'selected';
        }
      }
      const locked = state.mode === 'learning' && complete;
      return `<div class="option-item ${cls} ${locked ? 'disabled' : ''}"
                   data-index="${i}">
        <span class="option-letter">${letters[i]}</span>
        <span class="option-text">${opt}</span>
        <span class="option-check">${cls === 'correct' ? '✓' : cls === 'wrong' ? '✗' : ''}</span>
      </div>`;
    }).join('');

    const hint = document.createElement('div');
    hint.className = 'answer-hint';
    hint.textContent = multi
      ? `Selecione ${required} alternativas. ${answered.length}/${required} selecionada(s).`
      : 'Selecione uma alternativa.';
    list.prepend(hint);

    if (!(state.mode === 'learning' && complete)) {
      list.querySelectorAll('.option-item').forEach(el => {
        el.addEventListener('click', () => selectOption(idx, parseInt(el.dataset.index)));
      });
    }
  }

  // Expose to inline onclick
  window.selectOption = function(qIdx, optIdx) {
    const q = state.questions[qIdx];
    if (!q) return;
    if (state.mode === 'learning' && isComplete(q)) return;

    const current = selectedAnswers(q.questionId);
    const required = requiredAnswers(q);
    const exists = current.includes(optIdx);
    let next;
    if (required === 1) {
      next = [optIdx];
    } else if (exists) {
      next = current.filter(i => i !== optIdx);
    } else if (current.length >= required) {
      Utils.toast(`Esta questão permite selecionar apenas ${required} alternativas.`, 'warning');
      return;
    } else {
      next = [...current, optIdx].sort((a, b) => a - b);
    }
    if (next.length) state.answers[q.questionId] = next;
    else delete state.answers[q.questionId];
    state.dirty = true;
    updateNavigator();

    if (state.mode === 'learning' && next.length === required) {
      renderOptions(q, qIdx);
      showLearningFeedback(q, next);
    } else {
      renderOptions(q, qIdx);
    }
    updateSubmitState();
  };

  function showLearningFeedback(q, chosen) {
    chosen = Array.isArray(chosen) ? chosen : [chosen];
    const correct = correctAnswers(q);
    const opts = document.querySelectorAll('.option-item');
    opts.forEach((el, i) => {
      el.classList.add('disabled');
      if (correct.includes(i)) { el.classList.add('correct'); el.querySelector('.option-check').textContent = '✓'; }
      if (chosen.includes(i) && !correct.includes(i)) { el.classList.add('wrong'); el.querySelector('.option-check').textContent = '✗'; }
    });

    // Show explanation
    let expl = document.getElementById('explanation-box');
    if (!expl) {
      expl = document.createElement('div');
      expl.id = 'explanation-box';
      expl.className = 'explanation-box';
      document.getElementById('options-list')?.after(expl);
    }
    expl.innerHTML = `
      <div class="explanation-title">💡 Explicação</div>
      ${Utils.renderMarkdown(q.explanation || 'A opção correta é ' + answerLetters(correct).join(', ') + '.')}`;
    expl.style.display = 'block';
  }

  // ── Flag ──────────────────────────────────────────────
  function toggleFlag(qId) {
    if (state.flagged.has(qId)) state.flagged.delete(qId);
    else                        state.flagged.add(qId);
    state.dirty = true;
    renderQuestion(state.current);
  }

  // ── Navigator ─────────────────────────────────────────
  function updateNavigator() {
    const grid = document.getElementById('navigator-grid');
    if (!grid) return;
    grid.innerHTML = state.questions.map((q, i) => {
      let cls = '';
      if (i === state.current) {
        cls = 'current';
      } else if (state.mode === 'learning' && isComplete(q)) {
        cls = sameAnswerSet(selectedAnswers(q.questionId), correctAnswers(q)) ? 'correct' : 'wrong';
      } else if (state.flagged.has(q.questionId)) {
        cls = 'flagged';
      } else if (isComplete(q)) {
        cls = 'answered';
      }
      const disabled = state.mode === 'training' && !state.reviewMode;
      return `<button class="nav-btn ${cls}" ${disabled ? 'disabled' : ''} onclick="renderQuestion(${i})" title="Questão ${i+1}">${i+1}</button>`;
    }).join('');

    // Summary
    const answered = state.questions.filter(q => isComplete(q)).length;
    const total    = state.questions.length;
    const flagged  = state.flagged.size;
    setEl('summary-answered', `${answered} / ${total}`);
    setEl('summary-flagged',  flagged);
    setEl('summary-unanswered', total - answered);
  }
  window.renderQuestion = (idx) => renderQuestion(idx);

  function goNext(idx) {
    const q = state.questions[idx];
    const missing = missingAnswers(q);
    if (missing > 0 && selectedAnswers(q.questionId).length > 0) {
      Utils.confirm(
        'Resposta incompleta',
        `Esta questão pede ${requiredAnswers(q)} resposta(s), mas falta(m) ${missing}. Deseja continuar e revisar depois?`,
        () => renderQuestion(idx + 1)
      );
      return;
    }
    renderQuestion(idx + 1);
  }

  function enterReviewMode(q) {
    const missing = missingAnswers(q);
    if (missing > 0) {
      Utils.toast(`Falta(m) ${missing} resposta(s) nesta questão antes de entrar na revisão.`, 'warning');
      return;
    }
    state.reviewMode = true;
    state.dirty = true;
    Utils.toast('Modo de revisão liberado. Você pode navegar pelas questões antes de finalizar.', 'success');
    renderQuestion(state.current);
  }

  // ── Timer ─────────────────────────────────────────────
  function startTimer() {
    updateTimerDisplay();
    state.timerHandle = setInterval(() => {
      state.timeLeft--;
      state.dirty = true;
      updateTimerDisplay();
      if (state.timeLeft <= 0) {
        clearInterval(state.timerHandle);
        Utils.toast('Tempo esgotado! Submetendo simulado…', 'warning');
        submitAttempt();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const el = document.getElementById('timer-display');
    if (!el) return;
    el.textContent = Utils.formatTime(state.timeLeft);
    const wrap = document.getElementById('timer-wrap');
    if (!wrap) return;
    if (state.timeLeft <= 120) wrap.className = 'exam-timer danger';
    else if (state.timeLeft <= 300) wrap.className = 'exam-timer warning';
    else wrap.className = 'exam-timer';
  }

  // ── Auto-save ─────────────────────────────────────────
  function startAutoSave() {
    state.autoSaveHandle = setInterval(() => {
      if (state.dirty) saveProgress();
    }, Config.AUTO_SAVE_INTERVAL_MS);
  }

  async function saveProgress(sync = false) {
    try {
      const payload = {
        answers: state.answers,
        flaggedQuestions: [...state.flagged],
        timeRemainingSeconds: state.timeLeft,
        currentQuestionIndex: state.current,
      };
      if (sync) {
        const token = Auth.getToken();
        if (token) {
          fetch(`${Config.API_BASE_URL}/attempts/${attemptId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {});
        }
      } else {
        await API.attempts.save(attemptId, payload);
      }
      state.dirty = false;
    } catch (e) { /* silent */ }
  }

  // ── Submit ────────────────────────────────────────────
  function confirmSubmit() {
    if (state.mode === 'training' && !state.reviewMode) {
      Utils.toast('Responda a última questão e entre no modo de revisão antes de finalizar.', 'warning');
      return;
    }
    const answered   = state.questions.filter(q => isComplete(q)).length;
    const total      = state.questions.length;
    const unanswered = total - answered;
    const flagged    = state.flagged.size;

    const message = unanswered > 0
      ? `Você tem ${unanswered} questão(ões) sem resposta${flagged > 0 ? ` e ${flagged} marcada(s)` : ''}. Deseja finalizar mesmo assim?`
      : `Todas as questões foram respondidas. Pronto para finalizar?`;

    Utils.confirm('Finalizar Simulado', message, submitAttempt, unanswered > 0);
  }

  async function submitAttempt() {
    clearInterval(state.timerHandle);
    clearInterval(state.autoSaveHandle);
    try {
      await saveProgress();
      await API.attempts.submit(attemptId);
      window.location.href = `results.html?id=${attemptId}`;
    } catch (e) {
      Utils.toast('Erro ao finalizar: ' + (e.message || e), 'error');
    }
  }

  // ── Helpers ───────────────────────────────────────────
  function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function normalizeAnswers(answers) {
    const normalized = {};
    Object.entries(answers || {}).forEach(([qid, value]) => {
      if (Array.isArray(value)) normalized[qid] = value.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
      else if (value !== undefined && value !== null && Number.isFinite(Number(value))) normalized[qid] = [Number(value)];
    });
    return normalized;
  }

  function selectedAnswers(qid) {
    return Array.isArray(state.answers[qid]) ? state.answers[qid] : [];
  }

  function correctAnswers(q) {
    if (Array.isArray(q.correctOptionIndexes) && q.correctOptionIndexes.length) return q.correctOptionIndexes;
    if (Number.isFinite(Number(q.correctOptionIndex))) return [Number(q.correctOptionIndex)];
    return [];
  }

  function requiredAnswers(q) {
    return q.requiredAnswers || correctAnswers(q).length || 1;
  }

  function missingAnswers(q) {
    return Math.max(0, requiredAnswers(q) - selectedAnswers(q.questionId).length);
  }

  function isComplete(q) {
    return missingAnswers(q) === 0;
  }

  function allQuestionsComplete() {
    return state.questions.length > 0 && state.questions.every(q => isComplete(q));
  }

  function sameAnswerSet(a, b) {
    a = [...new Set((a || []).map(Number).filter(Number.isFinite))].sort((x, y) => x - y);
    b = [...new Set((b || []).map(Number).filter(Number.isFinite))].sort((x, y) => x - y);
    return a.length === b.length && a.every((value, idx) => value === b[idx]);
  }

  function clampIndex(value, total) {
    const idx = Number(value);
    if (!Number.isFinite(idx) || idx < 0 || total <= 0) return 0;
    return Math.min(idx, total - 1);
  }

  function answerLetters(indexes) {
    const letters = ['A','B','C','D','E','F'];
    return indexes.map(i => letters[i] || String(i + 1));
  }

  function updateSubmitState() {
    const btn = document.getElementById('btn-submit');
    if (!btn) return;
    btn.disabled = state.mode === 'training' && !state.reviewMode;
  }
})();
