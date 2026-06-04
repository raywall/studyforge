// =============================================
// Utility helpers
// =============================================

const Utils = {
  // Format seconds to mm:ss or hh:mm:ss
  formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  },

  // Format duration in human-readable
  formatDuration(seconds) {
    if (!seconds) return '—';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ${seconds%60}s`;
    const h = Math.floor(seconds/3600);
    const m = Math.floor((seconds%3600)/60);
    return `${h}h ${m}m`;
  },

  // Relative time (e.g. "2 hours ago")
  timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff/1000);
    if (s < 60)    return 'agora há pouco';
    if (s < 3600)  return `${Math.floor(s/60)} min atrás`;
    if (s < 86400) return `${Math.floor(s/3600)}h atrás`;
    if (s < 604800)return `${Math.floor(s/86400)}d atrás`;
    return new Date(dateStr).toLocaleDateString('pt-BR');
  },

  // Format date
  formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  },

  // Format datetime
  formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  },

  // Score color class
  scoreClass(pct) {
    if (pct >= 80) return 'high';
    if (pct >= 60) return 'medium';
    return 'low';
  },

  // Score color text class
  scoreTextClass(pct) {
    if (pct >= 80) return 'score-high';
    if (pct >= 60) return 'score-medium';
    return 'score-low';
  },

  // Debounce
  debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  // Get query param
  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  // Set query params and navigate
  navigate(path, params = {}) {
    const url = new URL(path, window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/'));
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
    window.location.href = url.toString();
  },

  // Get base path for GitHub Pages
  basePath() {
    const parts = window.location.pathname.split('/');
    // For GitHub Pages: /repo-name/page.html
    return parts.length > 2 ? '/' + parts[1] + '/' : '/';
  },

  // Generate initials from name
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
  },

  // Truncate text
  truncate(str, len = 100) {
    if (!str || str.length <= len) return str;
    return str.slice(0, len) + '…';
  },

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[ch]);
  },

  renderMarkdown(markdown) {
    const text = String(markdown || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';

    const renderInline = value => {
      let html = Utils.escapeHtml(value);
      html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" referrerpolicy="no-referrer">');
      html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
      html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return html;
    };

    const blocks = [];
    let paragraph = [];
    let list = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      blocks.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!list.length) return;
      blocks.push(`<ul>${list.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`);
      list = [];
    };

    text.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length + 2;
        blocks.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        return;
      }
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        flushParagraph();
        list.push(bullet[1]);
        return;
      }
      flushList();
      paragraph.push(trimmed);
    });
    flushParagraph();
    flushList();
    return `<div class="markdown-content">${blocks.join('')}</div>`;
  },

  // Level label
  levelLabel(level) {
    const labels = { practitioner: 'Practitioner', foundational: 'Foundational', associate: 'Associate', professional: 'Professional', specialty: 'Specialty', beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' };
    return labels[level] || level;
  },

  // Level badge class
  levelBadgeClass(level) {
    const map = { practitioner: 'badge-info', foundational: 'badge-info', associate: 'badge-success', professional: 'badge-warning', specialty: 'badge-primary', beginner: 'badge-info', intermediate: 'badge-success', advanced: 'badge-warning' };
    return map[level] || 'badge-muted';
  },

  // Subject icon
  subjectIcon(subject) {
    const s = (subject || '').toLowerCase();
    for (const [key, icon] of Object.entries(Config.SUBJECT_ICONS)) {
      if (s.includes(key)) return icon;
    }
    return Config.SUBJECT_ICONS.default;
  },

  // Subject color class
  subjectColorClass(subject) {
    const s = (subject || '').toLowerCase();
    for (const [key, cls] of Object.entries(Config.SUBJECT_COLORS)) {
      if (s.includes(key)) return cls;
    }
    return 'default';
  },

  // Toast notification
  toast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type === 'error' ? 'error' : type === 'success' ? 'success' : 'info'}`;
    toast.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Open modal
  openModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
  },

  // Close modal
  closeModal(id) {
    const el = document.getElementById(id);
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  },

  // Confirm dialog (uses modal)
  confirm(title, message, onConfirm, danger = false) {
    let modal = document.getElementById('confirm-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'confirm-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `<div class="modal">
        <h3 class="modal-title" id="confirm-title"></h3>
        <p id="confirm-message" style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-6)"></p>
        <div class="flex gap-3 justify-center">
          <button class="btn btn-secondary" onclick="Utils.closeModal('confirm-modal')">Cancelar</button>
          <button class="btn btn-primary" id="confirm-ok">Confirmar</button>
        </div></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) Utils.closeModal('confirm-modal'); });
    }
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    const okBtn = document.getElementById('confirm-ok');
    okBtn.className = `btn ${danger ? 'btn-danger' : 'btn-primary'}`;
    okBtn.onclick = () => { Utils.closeModal('confirm-modal'); onConfirm(); };
    Utils.openModal('confirm-modal');
  },

  // Loading overlay
  setLoading(selector, loading, text = 'Carregando...') {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    if (loading) {
      el.dataset.originalText = el.innerHTML;
      el.disabled = true;
      el.innerHTML = `<span class="spinner"></span><span>${text}</span>`;
    } else {
      el.innerHTML = el.dataset.originalText || el.innerHTML;
      el.disabled = false;
    }
  },
};
