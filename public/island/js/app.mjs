import { getNavItems } from './constants.mjs';
import { parseRoute, createNavigator, isAllowedSection } from './router.mjs';
import { initialState, createStore } from './state.mjs';
import { api } from './api.mjs';
import { createOverlay } from './overlay.mjs';
import { initAuth } from './auth.mjs';
import { initWardrobe } from './wardrobe.mjs';
import { createItemFormController } from './item-form.mjs';
import { initMembers } from './members.mjs';
import { initStats } from './stats.mjs';
import { toClassicPath } from './preference.mjs';

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
  onNavigate: (route, { resetScroll }) => {
    store.setState(state => ({ ...state, route }));
    if (resetScroll) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      document.getElementById('main-view').focus({ preventScroll: true });
    }
  }
});

const auth = initAuth({ store, api, loginOverlay: overlays['login-dialog'], navigate, notify });
async function reloadAll() {
  const members = await api.getMembers();
  store.setState(state => ({ ...state, members }));
  await wardrobe.loadClothes();
}

function confirmAction(message) {
  return new Promise(resolve => {
    const overlay = overlays['confirm-dialog'];
    const dialog = document.getElementById('confirm-dialog');
    dialog.querySelector('#confirm-message').textContent = message;
    const accept = dialog.querySelector('.confirm-accept');
    const cancel = dialog.querySelector('.confirm-cancel');
    const finish = value => { accept.onclick = null; cancel.onclick = null; overlay.close(); resolve(value); };
    accept.onclick = () => finish(true); cancel.onclick = () => finish(false); overlay.open();
  });
}

let itemForm;
const wardrobe = initWardrobe({
  root: document.getElementById('wardrobe-view'), store, api, overlays, navigate, notify,
  handleUnauthorized: auth.handleUnauthorized,
  onEdit: item => { itemForm.open(item); navigate({ section: 'add' }); },
  confirmDelete: async item => {
    if (!await confirmAction(`确定删除「${item.name || item.clothingType}」吗？图片也会一并删除。`)) return;
    try { await api.deleteClothes(item.id); overlays['detail-dialog'].close(); notify('衣物已删除', 'success'); await wardrobe.loadClothes(); }
    catch (error) { if (!auth.handleUnauthorized(error)) notify(error.message, 'error'); }
  }
});
itemForm = createItemFormController({
  root: document.getElementById('add-view'), store, api, notify, handleUnauthorized: auth.handleUnauthorized,
  onSaved: async () => { navigate({ section: 'wardrobe' }); await wardrobe.loadClothes(); }
});
initMembers({ root: document.getElementById('members-view'), store, api, notify, handleUnauthorized: auth.handleUnauthorized, reloadAll, confirm: confirmAction });
initStats({ root: document.getElementById('stats-view'), store, api, navigate, onSelect: () => wardrobe.loadClothes() });

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
document.querySelectorAll('.switch-classic').forEach(button => button.addEventListener('click', () => { localStorage.setItem('wardrobe_ui_v1', 'classic'); location.assign(toClassicPath(new URL(location.href))); }));
document.querySelectorAll('.dialog-close').forEach(button => button.addEventListener('click', () => overlays[button.closest('.overlay').id].close()));
window.addEventListener('popstate', () => {
  store.setState(state => ({ ...state, route: parseRoute(location.search) }));
  wardrobe.loadClothes();
});

render(store.getState());
Promise.all([auth.check(), api.getMembers().then(members => store.setState(state => ({ ...state, members })))])
  .then(() => wardrobe.loadClothes())
  .catch(error => notify(error.message, 'error'));

export { store, api, navigate, overlays, auth, notify };
