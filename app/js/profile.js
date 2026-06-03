(async () => {
  if (!Auth.requireAuth()) return;
  Components.showPageLoader();
  await Components.initLayout();

  try {
    const res = await API.auth.me();
    const user = res.user;
    Auth.setUser(user, !!localStorage.getItem(Config.TOKEN_KEY));
    renderProfile(user);
  } catch (e) {
    Utils.toast(e.message || 'Erro ao carregar perfil', 'error');
  } finally {
    Components.hidePageLoader();
  }

  document.getElementById('change-password-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    Utils.setLoading(btn, true, 'Salvando...');
    try {
      await Auth.changePassword(form.elements.currentPassword.value, form.elements.newPassword.value);
      form.reset();
      Utils.toast('Senha alterada com sucesso.', 'success');
    } catch (err) {
      Utils.toast(err.message || 'Erro ao alterar senha', 'error');
    } finally {
      Utils.setLoading(btn, false);
    }
  });

  function renderProfile(user) {
    const el = document.getElementById('profile-info');
    if (!el) return;
    const rows = [
      ['Nome', user.name],
      ['E-mail', user.email],
      ['Perfil', user.role === 'admin' ? 'Administrador' : 'Estudante'],
      ['Status', user.emailVerified ? 'E-mail verificado' : 'Pendente de ativação'],
      ['Cidade/Estado/País', [user.city, user.state, user.country].filter(Boolean).join(' / ')],
      ['Profissão', user.profession],
      ['Formação', user.education],
      ['Cargo', user.jobTitle],
      ['Empresa', user.company],
      ['Telefone', user.phone],
      ['Nascimento', user.birthDate],
    ];
    el.innerHTML = `<div style="display:grid;gap:var(--space-3)">
      ${rows.map(([label, value]) => `<div>
        <div class="form-hint">${esc(label)}</div>
        <div>${esc(value || '—')}</div>
      </div>`).join('')}
    </div>`;
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
