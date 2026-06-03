// =============================================
// API client — thin fetch wrapper
// =============================================

const API = (() => {
  async function request(method, path, body = null, opts = {}) {
    const token = Auth.getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const init = { method, headers, ...opts };
    if (body !== null) init.body = JSON.stringify(body);

    let res;
    try {
      res = await fetch(`${Config.API_BASE_URL}${path}`, init);
    } catch (err) {
      throw { status: 0, message: 'Erro de conexão. Verifique sua internet.' };
    }

    // Refresh token if present
    const newToken = res.headers.get('X-New-Token');
    if (newToken) Auth.setToken(newToken);

    if (res.status === 204) return null;

    let data;
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok) {
      if (res.status === 401) {
        Auth.logout();
        return;
      }
      throw { status: res.status, message: data.message || data.error || 'Erro inesperado' };
    }

    return data;
  }

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    patch:  (path, body)   => request('PATCH',  path, body),
    delete: (path)         => request('DELETE', path),

    // Auth endpoints
    auth: {
      login:    (data) => request('POST', '/auth/login',    data),
      register: (data) => request('POST', '/auth/register', data),
      verifyEmail:    (data) => request('POST', '/auth/verify-email', data),
      forgotPassword: (data) => request('POST', '/auth/forgot-password', data),
      resetPassword:  (data) => request('POST', '/auth/reset-password', data),
      changePassword: (data) => request('POST', '/auth/change-password', data),
      logout:   ()     => request('POST', '/auth/logout'),
      refresh:  ()     => request('POST', '/auth/refresh'),
      me:       ()     => request('GET',  '/auth/me'),
    },

    // Simulation catalog
    simulations: {
      list:     ()        => request('GET',  '/simulations'),
      get:      (id)      => request('GET',  `/simulations/${id}`),
      generate: (id)      => request('POST', `/simulations/${id}/generate`),
    },

    // User's simulation instances
    userSimulations: {
      list:    ()   => request('GET', '/user-simulations'),
      get:     (id) => request('GET', `/user-simulations/${id}`),
      stats:   (id) => request('GET', `/user-simulations/${id}/stats`),
    },

    // Attempts
    attempts: {
      create:   (data)   => request('POST',  '/attempts',            data),
      get:      (id)     => request('GET',   `/attempts/${id}`),
      save:     (id, data)=> request('PUT',  `/attempts/${id}`,      data),
      submit:   (id)     => request('POST',  `/attempts/${id}/submit`),
      review:   (id)     => request('GET',   `/attempts/${id}/review`),
      list:     (userSimId) => request('GET', `/user-simulations/${userSimId}/attempts`),
    },

    admin: {
      simulations: {
        list:   () => request('GET', '/admin/simulations'),
        save:   (data) => data.simulationId
          ? request('PUT', `/admin/simulations/${data.simulationId}`, data)
          : request('POST', '/admin/simulations', data),
        delete: (id) => request('DELETE', `/admin/simulations/${id}`),
      },
      questions: {
        list:   (simulationId = '') => request('GET', `/admin/questions${simulationId ? `?simulationId=${encodeURIComponent(simulationId)}` : ''}`),
        save:   (data) => data.questionId
          ? request('PUT', `/admin/questions/${data.questionId}`, data)
          : request('POST', '/admin/questions', data),
        delete: (id) => request('DELETE', `/admin/questions/${id}`),
      },
    },
  };
})();
