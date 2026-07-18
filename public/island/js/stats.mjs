import { CLOTHING_TYPES, SEASONS, STATUSES } from './constants.mjs';
import { escapeHtml } from './render.mjs';

export function deriveStats(clothes, members) {
  const stats = [
    { key: 'total', label: '衣物总数', count: clothes.length, filter: {} },
    { key: 'favorite', label: '收藏', count: clothes.filter(item => item.favorite).length, filter: { favorite: true } }
  ];
  STATUSES.forEach(value => stats.push({ key: `status:${value}`, label: value, count: clothes.filter(item => item.status === value).length, filter: { status: [value] } }));
  members.forEach(member => stats.push({ key: `member:${member.name}`, label: member.name, count: clothes.filter(item => item.member === member.name).length, filter: { member: [member.name] } }));
  CLOTHING_TYPES.forEach(value => stats.push({ key: `type:${value}`, label: value, count: clothes.filter(item => item.clothingType === value).length, filter: { type: [value] } }));
  SEASONS.forEach(value => stats.push({ key: `season:${value}`, label: `${value}季`, count: clothes.filter(item => item.seasons?.includes(value)).length, filter: { season: [value] } }));
  return stats;
}

export function statsFilter(stat) {
  return {
    section: 'wardrobe',
    filters: { q: '', member: [], type: [], season: [], status: [], favorite: false, ...stat.filter }
  };
}

export function initStats({ root, store, api, navigate, onSelect }) {
  root.innerHTML = `<header class="section-heading"><div><p class="section-kicker">衣橱概览</p><h1>统计</h1><p class="section-summary">点击数字，返回衣橱查看对应衣物。</p></div></header><div id="stats-grid" class="stats-grid"></div>`;
  const grid = root.querySelector('#stats-grid');
  let allClothes = [];
  let loading = false;
  let wasVisible = false;
  function render(state) {
    grid.innerHTML = deriveStats(allClothes, state.members).map(stat => `<button class="stat-tile island-panel" type="button" data-stat="${escapeHtml(stat.key)}" aria-label="${escapeHtml(stat.label)}：${stat.count} 件"><strong>${stat.count}</strong><span>${escapeHtml(stat.label)}</span></button>`).join('');
  }
  async function loadAll(state) {
    if (loading || state.route.section !== 'stats') return;
    loading = true;
    try { allClothes = await api.getClothes({}); render(store.getState()); }
    finally { loading = false; }
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-stat]'); if (!button) return;
    const stat = deriveStats(allClothes, store.getState().members).find(item => item.key === button.dataset.stat);
    if (stat) { navigate(statsFilter(stat)); onSelect(); }
  });
  const unsubscribe = store.subscribe(state => {
    render(state);
    const isVisible = state.route.section === 'stats';
    if (isVisible && !wasVisible) loadAll(state);
    wasVisible = isVisible;
  });
  render(store.getState());
  if (store.getState().route.section === 'stats') { wasVisible = true; loadAll(store.getState()); }
  return { destroy: unsubscribe };
}
