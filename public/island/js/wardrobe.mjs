import { CLOTHING_TYPES, SEASONS, STATUSES } from './constants.mjs';
import { escapeHtml, renderActiveFilters, renderClothesCard, renderCollectionState, renderItemDetail } from './render.mjs';

export function renderMemberShortcuts(members, selectedMembers) {
  return members.map(member => `<button class="island-pill${selectedMembers.includes(member.name) ? ' is-selected' : ''}" type="button" data-shortcut="member" data-value="${escapeHtml(member.name)}">${escapeHtml(member.name)}</button>`).join('');
}

export function filterDrawerSelection(filters) {
  return { season: new Set(filters.season || []), status: new Set(filters.status || []), favorite: Boolean(filters.favorite) };
}

export function initWardrobe({ root, store, api, overlays, navigate, notify, handleUnauthorized, onEdit, confirmDelete }) {
  let controller;
  let searchTimer;
  const filterDrawer = overlays['filter-drawer'];
  const detailOverlay = overlays['detail-dialog'];

  root.innerHTML = `<header class="section-heading"><div><p class="section-kicker">我的收藏</p><h1>家庭衣橱</h1><img class="heading-divider" src="/public/island/assets/dividers/divider-line-brown.svg" alt=""><p id="wardrobe-count" class="section-summary"></p></div><button class="island-button island-button--primary admin-add" type="button" data-go-add hidden><img src="/public/island/assets/icons/icon-camera.svg" alt="">新增衣物</button></header>
    <section class="wardrobe-explorer island-panel" aria-label="搜索和筛选衣橱">
      <div class="explorer-main">
        <label class="search-box" for="wardrobe-search"><img src="/public/island/assets/icons/icon-shopping.svg" alt=""><span class="sr-only">搜索衣物</span><input id="wardrobe-search" class="island-field" type="search" enterkeyhint="search" autocomplete="off" placeholder="搜索名称、品牌、颜色…"></label>
        <button id="more-filters" class="island-button filter-trigger" type="button"><img src="/public/island/assets/icons/icon-variant.svg" alt=""><span>筛选</span><strong id="filter-count" class="filter-count" hidden>0</strong></button>
      </div>
      <div class="filter-summary"><span id="filter-summary-label">显示全部衣物</span><button class="clear-filters" type="button" data-clear-filters hidden>清除全部</button></div>
      <div id="active-filters" class="active-filters"></div>
    </section>
    <div id="wardrobe-results"></div>`;

  document.getElementById('filter-content').innerHTML = `<div class="filter-groups">
    <fieldset><legend>家庭成员</legend><div id="filter-members"></div></fieldset>
    <fieldset><legend>衣物类型</legend><div id="filter-types">${CLOTHING_TYPES.map(value => `<label class="check-pill"><input type="checkbox" name="type" value="${value}"><span>${value}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>适穿季节</legend><div>${SEASONS.map(value => `<label class="check-pill"><input type="checkbox" name="season" value="${value}"><span>${value}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>使用状态</legend><div>${STATUSES.map(value => `<label class="check-pill"><input type="checkbox" name="status" value="${value}"><span>${value}</span></label>`).join('')}</div></fieldset>
    <label class="check-pill favorite-filter"><input type="checkbox" name="favorite" value="true"><span>只看收藏</span></label>
    <div class="drawer-actions"><button class="island-button" type="button" data-filter-reset>全部重置</button><button class="island-button island-button--primary" type="button" data-filter-apply>应用筛选</button></div></div>`;

  function renderFilterMembers(state) {
    document.getElementById('filter-members').innerHTML = state.members.map(member => `<label class="check-pill"><input type="checkbox" name="member" value="${escapeHtml(member.name)}"><span>${escapeHtml(member.name)}</span></label>`).join('');
  }

  function renderList(state) {
    const results = document.getElementById('wardrobe-results');
    document.querySelector('[data-go-add]').hidden = !state.auth.isAdmin;
    document.getElementById('wardrobe-count').textContent = state.loading.clothes ? '正在查找衣物…' : `共 ${state.clothes.length} 件衣物`;
    document.getElementById('active-filters').innerHTML = renderActiveFilters(state.route.filters);
    const activeCount = ['member', 'type', 'season', 'status'].reduce((count, key) => count + state.route.filters[key].length, 0) + Number(Boolean(state.route.filters.q)) + Number(state.route.filters.favorite);
    const count = document.getElementById('filter-count');
    count.textContent = String(activeCount);
    count.hidden = activeCount === 0;
    document.getElementById('filter-summary-label').textContent = activeCount ? `已启用 ${activeCount} 个搜索或筛选条件` : '显示全部衣物';
    document.querySelector('[data-clear-filters]').hidden = activeCount === 0;
    const search = document.getElementById('wardrobe-search');
    if (document.activeElement !== search) search.value = state.route.filters.q;
    if (state.loading.clothes) results.innerHTML = renderCollectionState('loading', '正在整理衣橱…');
    else if (!state.clothes.length) results.innerHTML = renderCollectionState(Object.values(state.route.filters).some(value => Array.isArray(value) ? value.length : Boolean(value)) ? 'filtered-empty' : 'empty', '没有找到符合条件的衣物');
    else results.innerHTML = `<div class="wardrobe-grid">${state.clothes.map(item => renderClothesCard(item, { isAdmin: state.auth.isAdmin })).join('')}</div>`;
    results.querySelectorAll('img[data-fallback]').forEach(image => image.addEventListener('error', () => { image.src = image.dataset.fallback; image.removeAttribute('data-fallback'); }));
  }

  async function loadClothes(filters = store.getState().route.filters) {
    controller?.abort();
    controller = new AbortController();
    const version = store.getState().requestVersion + 1;
    store.setState(state => ({ ...state, requestVersion: version, loading: { ...state.loading, clothes: true } }));
    try {
      const clothes = await api.getClothes(filters, controller.signal);
      if (store.getState().requestVersion !== version) return;
      store.setState(state => ({ ...state, clothes, loading: { ...state.loading, clothes: false } }));
    } catch (error) {
      if (error.name === 'AbortError' || store.getState().requestVersion !== version) return;
      if (handleUnauthorized(error)) return;
      store.setState(state => ({ ...state, clothes: [], loading: { ...state.loading, clothes: false } }));
      document.getElementById('wardrobe-results').innerHTML = renderCollectionState('error', error.message);
    }
  }

  root.addEventListener('click', async event => {
    if (event.target.closest('[data-go-add]')) return navigate({ section: 'add' });
    if (event.target.closest('[data-clear-filters]')) {
      navigate({ filters: { q: '', member: [], type: [], season: [], status: [], favorite: false } });
      document.getElementById('wardrobe-search').value = '';
      return loadClothes();
    }
    const filter = event.target.closest('[data-filter-key]');
    if (filter) {
      const key = filter.dataset.filterKey;
      const value = filter.dataset.filterValue;
      const next = key === 'q' ? '' : key === 'favorite' ? false : store.getState().route.filters[key].filter(item => item !== value);
      navigate({ filters: { [key]: next } });
      return loadClothes();
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'retry') return loadClothes();
    const item = store.getState().clothes.find(candidate => candidate.id === action.dataset.id);
    if (!item) return;
    if (action.dataset.action === 'detail') {
      store.setState(state => ({ ...state, selectedItemId: item.id }));
      document.getElementById('detail-content').innerHTML = renderItemDetail(item, { isAdmin: store.getState().auth.isAdmin });
      return detailOverlay.open(action);
    }
    if (action.dataset.action === 'favorite') {
      try { await api.toggleFavorite(item.id); await loadClothes(); notify(item.favorite ? '已取消收藏' : '已加入收藏', 'success'); }
      catch (error) { if (!handleUnauthorized(error)) notify(error.message, 'error'); }
    }
  });

  document.getElementById('detail-content').addEventListener('click', event => {
    const action = event.target.closest('[data-action]');
    const item = store.getState().clothes.find(candidate => candidate.id === action?.dataset.id);
    if (!item) return;
    if (action.dataset.action === 'edit') { detailOverlay.close(); onEdit(item); }
    if (action.dataset.action === 'delete') confirmDelete(item);
  });
  document.getElementById('wardrobe-search').addEventListener('input', event => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { navigate({ filters: { q: event.target.value.trim() } }, { replace: true }); loadClothes(); }, 250);
  });
  document.getElementById('more-filters').addEventListener('click', event => {
    const filters = store.getState().route.filters;
    const selected = filterDrawerSelection(filters);
    const content = document.getElementById('filter-content');
    renderFilterMembers(store.getState());
    content.querySelectorAll('input[name="member"]').forEach(input => { input.checked = filters.member.includes(input.value); });
    content.querySelectorAll('input[name="type"]').forEach(input => { input.checked = filters.type.includes(input.value); });
    content.querySelectorAll('input[name="season"]').forEach(input => { input.checked = selected.season.has(input.value); });
    content.querySelectorAll('input[name="status"]').forEach(input => { input.checked = selected.status.has(input.value); });
    content.querySelector('input[name="favorite"]').checked = selected.favorite;
    filterDrawer.open(event.currentTarget);
  });
  document.querySelector('[data-filter-apply]').addEventListener('click', () => {
    const content = document.getElementById('filter-content');
    const values = name => Array.from(content.querySelectorAll(`input[name="${name}"]:checked`)).map(input => input.value);
    navigate({ filters: { member: values('member'), type: values('type'), season: values('season'), status: values('status'), favorite: Boolean(content.querySelector('input[name="favorite"]:checked')) } });
    filterDrawer.close(); loadClothes();
  });
  document.querySelector('[data-filter-reset]').addEventListener('click', () => {
    document.querySelectorAll('#filter-content input').forEach(input => { input.checked = false; });
    navigate({ filters: { q: '', member: [], type: [], season: [], status: [], favorite: false } });
    document.getElementById('wardrobe-search').value = ''; filterDrawer.close(); loadClothes();
  });

  const unsubscribe = store.subscribe(state => {
    if (state.route.section === 'wardrobe') renderList(state);
  });
  renderList(store.getState());
  return { loadClothes, destroy() { unsubscribe(); controller?.abort(); clearTimeout(searchTimer); } };
}
