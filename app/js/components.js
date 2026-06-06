// =============================================
// Dynamic component loader & shared rendering
// =============================================

const Components = (() => {
  const componentBaseUrl = new URL('../components/', document.currentScript?.src || window.location.href);

  // Load an HTML fragment and inject into selector
  async function load(selector, path) {
    const el = document.querySelector(selector);
    if (!el) return;
    try {
      const res = await fetch(new URL(path, componentBaseUrl));
      if (!res.ok) return;
      el.innerHTML = await res.text();
      // Run any inline scripts in the fragment
      el.querySelectorAll('script').forEach(s => {
        const n = document.createElement('script');
        n.textContent = s.textContent;
        document.body.appendChild(n);
      });
    } catch (e) { console.warn('Component load failed:', path, e); }
  }

  // Init common layout (header + sidebar)
  async function initLayout() {
    await Promise.all([
      load('#app-header',  'header.html'),
      load('#app-sidebar', 'sidebar.html'),
    ]);
    initHeader();
    initSidebar();
    highlightActiveNav();
    if (Auth.getToken() && API?.simulations?.list) {
      try {
        const res = await API.simulations.list();
        updateCatalogNav(res.simulations || []);
      } catch {}
    }
  }

  function initHeader() {
    Theme.applyTheme(Theme.getTheme());
    const user = Auth.getUser();

    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => Theme.toggleTheme());
    });

    // User avatar
    if (!user) return;
    const avatars = document.querySelectorAll('.user-avatar');
    avatars.forEach(a => { a.textContent = Utils.initials(user.name); a.title = user.name; });

    const userNames = document.querySelectorAll('.header-user-name');
    userNames.forEach(el => el.textContent = user.name);

    // Dropdown toggle
    const dropdown = document.querySelector('.user-dropdown');
    if (dropdown) {
      dropdown.querySelector('.user-avatar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => dropdown.classList.remove('open'));
    }

    // Logout
    document.querySelectorAll('[data-action="logout"]').forEach(el => {
      el.addEventListener('click', () => Auth.logout());
    });

    // Mobile menu — toggle the wrapper (#app-sidebar) so the CSS display:none rule applies
    const btnMenu  = document.querySelector('.btn-menu');
    const sidebarWrap = document.getElementById('app-sidebar');
    const sidebarInner = document.querySelector('.app-sidebar');
    if (btnMenu && sidebarWrap) {
      btnMenu.addEventListener('click', () => sidebarWrap.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (!sidebarWrap.contains(e.target) && !btnMenu.contains(e.target)) {
          sidebarWrap.classList.remove('open');
        }
      });
    }
  }

  function initSidebar() {
    const user = Auth.getUser();
    if (!user) return;
    const layout = document.querySelector('.app-layout');
    const collapseButton = document.querySelector('[data-sidebar-collapse]');
    const setCollapsed = collapsed => {
      layout?.classList.toggle('sidebar-collapsed', collapsed);
      if (collapseButton) {
        const label = collapsed ? 'Maximizar menu' : 'Minimizar menu';
        collapseButton.title = label;
        collapseButton.setAttribute('aria-label', label);
        collapseButton.setAttribute('aria-expanded', String(!collapsed));
      }
      localStorage.setItem('studyforge-sidebar-collapsed', collapsed ? 'true' : 'false');
    };
    setCollapsed(localStorage.getItem('studyforge-sidebar-collapsed') === 'true');
    collapseButton?.addEventListener('click', () => {
      setCollapsed(!layout?.classList.contains('sidebar-collapsed'));
    });
    const nameEl  = document.querySelector('.sidebar-user-name');
    const emailEl = document.querySelector('.sidebar-user-email');
    const avatar  = document.querySelector('.sidebar-user-avatar');
    if (nameEl)  nameEl.textContent  = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (avatar)  avatar.textContent  = Utils.initials(user.name);
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.classList.toggle('hidden', !Auth.isAdmin(user));
    });
  }

  function highlightActiveNav() {
    const page = window.location.pathname.split('/').pop() || 'dashboard.html';
    document.querySelectorAll('.sidebar-link[data-page]').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
  }

  function updateCatalogNav(simulations) {
    const nav = document.getElementById('sidebar-catalog');
    if (!nav) return;
    const subjects = [...new Set(simulations.map(sim => (sim.subject || '').trim()).filter(Boolean))].sort();
    if (!subjects.length) {
      nav.innerHTML = '<span class="sidebar-link"><span class="sidebar-link-label">Sem catálogos ativos</span></span>';
      return;
    }
    nav.innerHTML = subjects.map(subject => `
      <a href="dashboard.html?filter=${encodeURIComponent(subject.toLowerCase())}" class="sidebar-link">
        <span style="font-size:1rem">${Utils.subjectIcon(subject)}</span>
        <span class="sidebar-link-label">${subject.toUpperCase()}</span>
      </a>
    `).join('');
  }

  // Render a simulation card (catalog)
  function renderSimCard(sim) {
    const colorCls = Utils.subjectColorClass(sim.subject);
    const icon     = Utils.subjectIcon(sim.subject);
    const levelCls = Utils.levelBadgeClass(sim.level);
    const time     = sim.timeLimitMinutes ? `${sim.timeLimitMinutes}min` : '∞';
    return `
    <a href="simulation.html?id=${sim.simulationId}" class="sim-card">
      <div class="sim-card-banner ${colorCls}"></div>
      <div class="sim-card-body">
        <div class="sim-card-header">
          <span class="sim-card-icon">${icon}</span>
          <div class="sim-card-meta">
            <span class="badge ${levelCls}">${Utils.levelLabel(sim.level)}</span>
            ${sim.isFree ? '' : '<span class="badge badge-warning">PRO</span>'}
          </div>
        </div>
        <div class="sim-card-title">${sim.title}</div>
        <div class="sim-card-desc">${sim.description || ''}</div>
        <div class="sim-card-stats">
          <div class="sim-card-stat">
            <div class="sim-card-stat-value">${sim.questionCount}</div>
            <div class="sim-card-stat-label">Questões</div>
          </div>
          <div class="sim-card-stat">
            <div class="sim-card-stat-value">${time}</div>
            <div class="sim-card-stat-label">Tempo</div>
          </div>
          <div class="sim-card-stat">
            <div class="sim-card-stat-value">${sim.passingScore || Config.DEFAULT_PASS_SCORE}%</div>
            <div class="sim-card-stat-label">Aprovação</div>
          </div>
        </div>
      </div>
      <div class="sim-card-footer">
        <span class="sim-card-footer-left">
          <span>${sim.subject || 'Geral'}</span>
          ${sim.attemptsCount > 0 ? `· <span>${sim.attemptsCount} tentativa${sim.attemptsCount>1?'s':''}</span>` : ''}
        </span>
        <span class="badge badge-primary">Ver →</span>
      </div>
    </a>`;
  }

  // Render a "my simulation" row item
  function renderMySimItem(us) {
    const icon = Utils.subjectIcon(us.subject);
    const scoreCls = us.bestScore != null ? Utils.scoreTextClass(us.bestScore) : '';
    const scoreVal = us.bestScore != null ? `${us.bestScore}%` : '—';
    return `
    <a href="simulation.html?usid=${us.userSimulationId}" class="my-sim-item">
      <span class="my-sim-item-icon">${icon}</span>
      <div class="my-sim-item-info">
        <div class="my-sim-item-title">${us.title}</div>
        <div class="my-sim-item-sub">${us.attemptsCount} tentativa${us.attemptsCount!==1?'s':''} · Gerado ${Utils.timeAgo(us.generatedAt)}</div>
      </div>
      <div class="my-sim-item-score">
        <div class="my-sim-item-score-value ${scoreCls}">${scoreVal}</div>
        <div class="my-sim-item-score-label">Melhor nota</div>
      </div>
    </a>`;
  }

  // Render score circle SVG
  function renderScoreCircle(pct, pass) {
    const radius = 65;
    const circ   = 2 * Math.PI * radius;
    const offset = circ - (pct / 100) * circ;
    const cls    = pass ? 'pass' : 'fail';
    return `
    <div class="score-circle-container">
      <svg class="score-circle-svg" viewBox="0 0 160 160">
        <circle class="score-circle-bg"   cx="80" cy="80" r="${radius}"/>
        <circle class="score-circle-fill ${cls}" cx="80" cy="80" r="${radius}"
          stroke-dasharray="${circ}" stroke-dashoffset="${circ}"
          data-offset="${offset}" style="stroke-dashoffset:${offset}"/>
      </svg>
      <div class="score-circle-text">
        <span class="score-pct">${pct}%</span>
        <span class="score-word ${cls}">${pass ? 'APROVADO' : 'REPROVADO'}</span>
      </div>
    </div>`;
  }

  // Show full-page spinner
  function showPageLoader() {
    let el = document.getElementById('page-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'page-loader';
      el.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg-primary);z-index:200;';
      el.innerHTML = '<div class="spinner spinner-lg"></div>';
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
  }

  function hidePageLoader() {
    const el = document.getElementById('page-loader');
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity 300ms'; setTimeout(() => el.remove(), 300); }
  }

  return { load, initLayout, updateCatalogNav, renderSimCard, renderMySimItem, renderScoreCircle, showPageLoader, hidePageLoader };
})();
