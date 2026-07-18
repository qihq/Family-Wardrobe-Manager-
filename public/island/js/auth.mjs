import { ApiError } from './api.mjs';

export function safeNextPath(value) {
  if (!value) return '/admin';
  try {
    const base = new URL('http://wardrobe.local');
    if (typeof value !== 'string' || value.startsWith('//') || !value.startsWith('/')) return '/admin';
    const target = new URL(value, base);
    if (target.origin !== base.origin || !['/admin', '/view'].includes(target.pathname)) return '/admin';
    return target.pathname + target.search + target.hash;
  } catch {
    return '/admin';
  }
}

export function loginPath(next = '/admin') {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}

export function initAuth({ store, api, notify }) {
  async function check() {
    try {
      const result = await api.getAuth();
      store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: Boolean(result.isAdmin) } }));
      if (location.pathname === '/admin' && !result.isAdmin) location.replace(loginPath('/admin' + location.search));
    } catch (error) {
      store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
      notify(error.message, 'error');
    }
  }

  async function logout() {
    await api.logout().catch(() => {});
    store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
    location.assign('/view');
  }

  function handleUnauthorized(error) {
    if (!(error instanceof ApiError) || error.status !== 401) return false;
    store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
    location.assign(loginPath(location.pathname + location.search));
    return true;
  }

  return { check, logout, handleUnauthorized, openLogin: () => location.assign(loginPath('/admin')) };
}
