// =============================================
// Dashboard page
// =============================================

(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();
  await Components.initLayout();

  const [simulations, userSimulations] = await Promise.allSettled([
    API.simulations.list(),
    API.userSimulations.list(),
  ]);

  const sims   = simulations.status   === 'fulfilled' ? simulations.value?.simulations   || [] : [];
  const userSims= userSimulations.status=== 'fulfilled' ? userSimulations.value?.userSimulations || [] : [];

  Components.updateCatalogNav(sims);
  renderStats(userSims);
  renderCatalog(sims);
  renderMySims(userSims);
  initFilters(sims);
  Components.hidePageLoader();

  // ── Stats cards ──────────────────────────────────────
  function renderStats(us) {
    const totalAttempts = us.reduce((acc, s) => acc + (s.attemptsCount || 0), 0);
    const scores  = us.filter(s => s.bestScore != null).map(s => s.bestScore);
    const bestAvg = scores.length ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
    const passed  = us.filter(s => (s.bestScore || 0) >= Config.DEFAULT_PASS_SCORE).length;

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('stat-simulations', us.length);
    set('stat-attempts',    totalAttempts);
    set('stat-avg-score',   scores.length ? `${bestAvg}%` : '—');
    set('stat-passed',      passed);
  }

  // ── Catalog ───────────────────────────────────────────
  function renderCatalog(list) {
    const grid = document.getElementById('simulations-grid');
    if (!grid) return;
    if (!list.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📋</div>
        <h3>Nenhum simulado disponível</h3>
        <p>Em breve novos simulados serão adicionados.</p>
      </div>`;
      return;
    }
    grid.innerHTML = list.map(Components.renderSimCard).join('');
  }

  // ── My Simulations ────────────────────────────────────
  function renderMySims(list) {
    const container = document.getElementById('my-simulations-list');
    if (!container) return;
    if (!list.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-state-icon">🚀</div>
        <h3>Nenhum simulado iniciado</h3>
        <p>Escolha um simulado acima e gere sua primeira tentativa.</p>
      </div>`;
      return;
    }
    // Sort by most recent
    const sorted = [...list].sort((a,b) => new Date(b.generatedAt) - new Date(a.generatedAt));
    container.innerHTML = sorted.slice(0, 6).map(Components.renderMySimItem).join('');
  }

  // ── Filters ───────────────────────────────────────────
  function initFilters(list) {
    const bar = document.getElementById('catalog-filters');
    const search = document.querySelector('.filter-search input');
    const params = new URLSearchParams(window.location.search);
    const selected = new Set();
    let query    = '';
    const subjects = [...new Set(list.map(s => (s.subject || '').toLowerCase()).filter(Boolean))].sort();
    const levels = [...new Set(list.map(s => (s.level || '').toLowerCase()).filter(Boolean))].sort();

    if (bar) {
      const chips = [
        { filter: 'all', label: 'Todos' },
        ...subjects.map(subject => ({ filter: subject, label: `${Utils.subjectIcon(subject)} ${subject.toUpperCase()}` })),
        ...levels.map(level => ({ filter: level, label: Utils.levelLabel(level) })),
      ];
      bar.insertAdjacentHTML('afterbegin', chips.map(chip => `
        <button class="filter-chip${chip.filter === 'all' ? ' active' : ''}" data-filter="${chip.filter}">${chip.label}</button>
      `).join(''));
    }
    const chips  = document.querySelectorAll('.filter-chip[data-filter]');
    const initialFilters = (params.get('filters') || params.get('filter') || '')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(v => v && v !== 'all');
    initialFilters.forEach(filter => selected.add(filter));

    function apply() {
      const grid = document.getElementById('simulations-grid');
      if (!grid) return;
      let filtered = list;
      if (selected.size) {
        const selectedSubjects = [...selected].filter(filter => subjects.includes(filter));
        const selectedLevels = [...selected].filter(filter => levels.includes(filter));
        filtered = filtered.filter(sim => {
          const subject = (sim.subject || '').toLowerCase();
          const level = (sim.level || '').toLowerCase();
          const subjectMatch = !selectedSubjects.length || selectedSubjects.some(filter => subject.includes(filter));
          const levelMatch = !selectedLevels.length || selectedLevels.includes(level);
          return subjectMatch && levelMatch;
        });
      }
      if (query) filtered = filtered.filter(s => (s.title+s.description+s.subject).toLowerCase().includes(query.toLowerCase()));
      updateChipState();
      updateURL();
      renderCatalog(filtered);
    }

    function updateChipState() {
      chips.forEach(chip => {
        const filter = chip.dataset.filter;
        chip.classList.toggle('active', filter === 'all' ? selected.size === 0 : selected.has(filter));
      });
    }

    function updateURL() {
      const url = new URL(window.location.href);
      url.searchParams.delete('filter');
      if (selected.size) url.searchParams.set('filters', [...selected].join(','));
      else url.searchParams.delete('filters');
      window.history.replaceState({}, '', url);
    }

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter;
        if (filter === 'all') {
          selected.clear();
        } else if (selected.has(filter)) {
          selected.delete(filter);
        } else {
          selected.add(filter);
        }
        apply();
      });
    });

    if (search) search.addEventListener('input', Utils.debounce(e => { query = e.target.value; apply(); }, 300));
    apply();
  }
})();
