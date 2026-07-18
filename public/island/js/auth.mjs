import { ApiError } from './api.mjs';

export function initAuth({ store, api, loginOverlay, navigate, notify }) {
  const form = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');

  async function check() {
    try {
      const result = await api.getAuth();
      store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: Boolean(result.isAdmin) } }));
    } catch (error) {
      store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
      notify(error.message, 'error');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = new FormData(form).get('password');
    loginError.textContent = '';
    try {
      await api.login(password);
      store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: true } }));
      form.reset();
      loginOverlay.close();
      notify('已进入管理模式', 'success');
    } catch (error) {
      loginError.textContent = error.message;
    }
  });

  async function logout() {
    await api.logout().catch(() => {});
    store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
    navigate({ section: 'wardrobe' }, { replace: true });
    notify('已退出管理模式', 'status');
  }

  function handleUnauthorized(error) {
    if (!(error instanceof ApiError) || error.status !== 401) return false;
    store.setState(state => ({ ...state, auth: { status: 'ready', isAdmin: false } }));
    navigate({ section: 'wardrobe' }, { replace: true });
    loginOverlay.open();
    return true;
  }

  return { check, logout, handleUnauthorized, openLogin: trigger => loginOverlay.open(trigger) };
}
