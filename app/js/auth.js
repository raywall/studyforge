// =============================================
// Auth state management
// =============================================

const Auth = (() => {
  // Use sessionStorage by default; switch to localStorage for "remember me"
  let _store = sessionStorage;

  function getToken()  { return localStorage.getItem(Config.TOKEN_KEY) || sessionStorage.getItem(Config.TOKEN_KEY); }
  function setToken(t, remember = false) {
    const s = remember ? localStorage : sessionStorage;
    s.setItem(Config.TOKEN_KEY, t);
  }
  function removeToken() {
    localStorage.removeItem(Config.TOKEN_KEY);
    sessionStorage.removeItem(Config.TOKEN_KEY);
  }

  function getUser() {
    const raw = localStorage.getItem(Config.USER_KEY) || sessionStorage.getItem(Config.USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function setUser(user, remember = false) {
    const s = remember ? localStorage : sessionStorage;
    s.setItem(Config.USER_KEY, JSON.stringify(user));
  }
  function removeUser() {
    localStorage.removeItem(Config.USER_KEY);
    sessionStorage.removeItem(Config.USER_KEY);
  }

  function isLoggedIn() { return !!getToken(); }

  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = 'dashboard.html';
    }
  }

  async function login(email, password, remember = false) {
    const res = await API.auth.login({ email, password });
    setToken(res.token, remember);
    setUser(res.user, remember);
    return res;
  }

  async function register(data, remember = false) {
    const res = await API.auth.register(data);
    return res;
  }

  async function verifyEmail(email, code, remember = false) {
    const res = await API.auth.verifyEmail({ email, code });
    setToken(res.token, remember);
    setUser(res.user, remember);
    return res;
  }

  async function forgotPassword(email) {
    return API.auth.forgotPassword({ email });
  }

  async function resetPassword(email, code, newPassword) {
    return API.auth.resetPassword({ email, code, newPassword });
  }

  async function changePassword(currentPassword, newPassword) {
    return API.auth.changePassword({ currentPassword, newPassword });
  }

  function logout() {
    removeToken();
    removeUser();
    window.location.href = 'index.html';
  }

  // Decode JWT payload (no verification — just for display)
  function decodePayload(token) {
    try {
      const b64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(atob(b64));
    } catch { return null; }
  }

  function isTokenExpired() {
    const token = getToken();
    if (!token) return true;
    const payload = decodePayload(token);
    if (!payload || !payload.exp) return false;
    return Date.now() / 1000 > payload.exp - 60; // 60s buffer
  }

  return { getToken, setToken, removeToken, getUser, setUser, removeUser, isLoggedIn, requireAuth, redirectIfLoggedIn, login, register, verifyEmail, forgotPassword, resetPassword, changePassword, logout, decodePayload, isTokenExpired };
})();
