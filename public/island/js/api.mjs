export class ApiError extends Error {
  constructor(message, status, payload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

async function request(url, options = {}) {
  const headers = new Headers(options.headers || {});
  let body = options.body;
  if (options.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(options.json);
  }
  const response = await fetch(url, { ...options, headers, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(payload.message || `请求失败 (${response.status})`, response.status, payload);
  return payload;
}

function filtersToQuery(filters = {}) {
  const params = new URLSearchParams();
  ['member', 'type', 'season', 'status'].forEach(key => {
    if (filters[key]?.length) params.set(key, filters[key].join(','));
  });
  if (filters.q) params.set('q', filters.q);
  if (filters.favorite) params.set('favorite', 'true');
  return params.toString();
}

export const api = {
  getAuth: () => request('/api/auth/check'),
  login: password => request('/api/login', { method: 'POST', json: { password } }),
  logout: () => request('/api/logout', { method: 'POST' }),
  getMembers: () => request('/api/members'),
  createMember: name => request('/api/members', { method: 'POST', json: { name } }),
  updateMember: (id, name) => request(`/api/members/${id}`, { method: 'PUT', json: { name } }),
  deleteMember: id => request(`/api/members/${id}`, { method: 'DELETE' }),
  getClothes(filters, signal) {
    const query = filtersToQuery(filters);
    return request('/api/clothes' + (query ? `?${query}` : ''), { signal });
  },
  createClothes: formData => request('/api/clothes', { method: 'POST', body: formData }),
  updateClothes: (id, formData) => request(`/api/clothes/${id}`, { method: 'PUT', body: formData }),
  toggleFavorite: id => request(`/api/clothes/${id}/favorite`, { method: 'PATCH' }),
  deleteClothes: id => request(`/api/clothes/${id}`, { method: 'DELETE' })
};
