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

export function initStats({ root, store, navigate }) {
  root.innerHTML = `<header class="section-heading"><div><p class="section-kicker">衣橱概览</p><h1>统计</h1><p class="section-summary">点击数字，返回衣橱查看对应衣物。</p></div></header><div id="stats-grid" class="stats-grid"></div>`;
  const grid = root.querySelector('#stats-grid');
  function render(state) {
    grid.innerHTML = deriveStats(state.clothes, state.members).map(stat => `<button class="stat-tile island-panel" type="button" data-stat="${escapeHtml(stat.key)}" aria-label="${escapeHtml(stat.label)}：${stat.count} 件"><strong>${stat.count}</strong><span>${escapeHtml(stat.label)}</span></button>`).join('');
  }
  grid.addEventListener('click', event => {
    const button = event.target.closest('[data-stat]'); if (!button) return;
    const stat = deriveStats(store.getState().clothes, store.getState().members).find(item => item.key === button.dataset.stat);
    if (stat) navigate(statsFilter(stat));
  });
  const unsubscribe = store.subscribe(render); render(store.getState());
  return { destroy: unsubscribe };
}
