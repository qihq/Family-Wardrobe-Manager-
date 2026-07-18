import { getNavItems } from './constants.mjs';
import { parseRoute, createNavigator, isAllowedSection } from './router.mjs';
import { initialState, createStore } from './state.mjs';
import { api } from './api.mjs';
import { createOverlay } from './overlay.mjs';
import { initAuth } from './auth.mjs';
import { initWardrobe } from './wardrobe.mjs';

const store = createStore({ ...initialState, route: parseRoute(location.search) });
const overlays = Object.fromEntries(['login-dialog', 'filter-drawer', 'detail-dialog', 'confirm-dialog'].map(id => [id, createOverlay(document.getElementById(id))]));

function notify(message, type = 'status') {
  const toast = document.createElement('div');
  toast.className = `toast${type === 'error' ? ' toast--error' : ''}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.textContent = message;
  document.getElementById('toast-region').append(toast);
  setTimeout(() => toast.remove(), 3000);
}

const navigate = createNavigator({
  getRoute: () => store.getState().route,
  onNavigate: route => store.setState(state => ({ ...state, route }))
});

const auth = initAuth({ store, api, loginOverlay: overlays['login-dialog'], navigate, notify });
const wardrobe = initWardrobe({
  root: document.getElementById('wardrobe-view'), store, api, overlays, navigate, notify,
  handleUnauthorized: auth.handleUnauthorized,
  onEdit: () => notify('编辑功能正在载入', 'status'),
  confirmDelete: () => notify('删除功能正在载入', 'status')
});

function renderNavigation(state) {
  const items = getNavItems(state.auth.isAdmin);
  const html = items.map(item => `<button class="nav-button" type="button" data-nav="${item.section}"${state.route.section === item.section ? ' aria-current="page"' : ''}><img src="${item.icon}" alt=""><span>${item.label}</span></button>`).join('');
  ['sidebar-nav', 'tablet-nav', 'mobile-nav'].forEach(id => {
    const root = document.getElementById(id);
    root.innerHTML = `<div class="nav-list">${html}</div>`;
    root.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => navigate({ section: button.dataset.nav })));
  });
}

function render(state) {
  let section = state.route.section;
  if (!isAllowedSection(section, state.auth.isAdmin)) section = 'wardrobe';
  document.querySelectorAll('.app-view').forEach(view => { view.hidden = view.dataset.section !== section; });
  document.querySelectorAll('.account-login').forEach(button => { button.hidden = state.auth.isAdmin; });
  document.querySelectorAll('.account-logout').forEach(button => { button.hidden = !state.auth.isAdmin; });
  document.getElementById('mobile-title').textContent = getNavItems(true).find(item => item.section === section)?.label || '衣橱';
  renderNavigation({ ...state, route: { ...state.route, section } });
  document.getElementById('main-view').setAttribute('aria-busy', state.auth.status === 'checking' ? 'true' : 'false');
}

store.subscribe(render);
document.querySelectorAll('.account-login').forEach(button => button.addEventListener('click', () => auth.openLogin(button)));
document.querySelectorAll('.account-logout').forEach(button => button.addEventListener('click', auth.logout));
document.querySelectorAll('.switch-classic').forEach(button => button.addEventListener('click', () => { localStorage.setItem('wardrobe_ui_v1', 'classic'); location.assign('/classic/view' + location.search); }));
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => overlays[button.closest('.overlay').id].close()));
window.addEventListener('popstate', () => store.setState(state => ({ ...state, route: parseRoute(location.search) })));

render(store.getState());
Promise.all([auth.check(), api.getMembers().then(members => store.setState(state => ({ ...state, members })))])
  .then(() => wardrobe.loadClothes())
  .catch(error => notify(error.message, 'error'));

export { store, api, navigate, overlays, auth, notify };
