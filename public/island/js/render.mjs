import { ASSETS } from './constants.mjs';

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

export function renderClothesCard(item, { isAdmin = false } = {}) {
  const name = item.name || item.clothingType || '未命名衣物';
  const image = item.thumbPath || item.photoPath;
  const media = image
    ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy" data-fallback="${ASSETS.empty}">`
    : `<img src="${ASSETS.empty}" alt="${escapeHtml(name)}" class="wardrobe-card__fallback">`;
  const favorite = isAdmin
    ? `<button class="card-favorite" type="button" data-action="favorite" data-id="${escapeHtml(item.id)}" aria-label="${item.favorite ? '取消收藏' : '添加收藏'}：${escapeHtml(name)}"><span aria-hidden="true">${item.favorite ? '★' : '☆'}</span></button>`
    : '';
  return `<article class="wardrobe-card" data-id="${escapeHtml(item.id)}">
    <button class="wardrobe-card__detail" type="button" data-action="detail" data-id="${escapeHtml(item.id)}" aria-label="查看衣物：${escapeHtml(name)}">
      <span class="wardrobe-card__media">${media}</span>
      <span class="wardrobe-card__body">
        <strong>${escapeHtml(name)}</strong>
        <span class="wardrobe-card__meta">${escapeHtml(item.member || '未分配')} · ${escapeHtml(item.clothingType || '其他')}</span>
        <span class="wardrobe-card__tags"><span class="status-dot status-dot--${escapeHtml(item.status || '在用')}"></span>${escapeHtml(item.status || '在用')}${item.seasons?.length ? ` · ${item.seasons.map(escapeHtml).join(' / ')}` : ''}</span>
      </span>
    </button>${favorite}
  </article>`;
}

export function renderItemDetail(item, { isAdmin = false } = {}) {
  const name = item.name || item.clothingType || '未命名衣物';
  const image = item.photoPath || item.thumbPath || ASSETS.empty;
  const fields = [
    ['家庭成员', item.member], ['衣物类型', item.clothingType], ['尺码', item.size],
    ['颜色', item.color], ['品牌', item.brand], ['状态', item.status],
    ['适穿季节', item.seasons?.join(' / ')], ['备注', item.notes]
  ].filter(([, value]) => value);
  const actions = isAdmin ? `<div class="detail-actions">
    <button class="island-button" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">编辑衣物</button>
    <button class="island-button danger-button" type="button" data-action="delete" data-id="${escapeHtml(item.id)}">删除衣物</button>
  </div>` : '';
  return `<div class="detail-layout"><div class="detail-photo"><img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" data-fallback="${ASSETS.empty}"></div><div class="detail-copy"><p class="section-kicker">衣物详情</p><h2 id="detail-title">${escapeHtml(name)}</h2><dl>${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join('')}</dl>${actions}</div></div>`;
}

export function renderActiveFilters(filters) {
  const parts = [];
  if (filters.q) parts.push(['q', filters.q, `清除搜索：${filters.q}`]);
  const labels = { member: '人员', type: '类型', season: '季节', status: '状态' };
  Object.entries(labels).forEach(([key, label]) => (filters[key] || []).forEach(value => parts.push([key, value, `移除${label}筛选：${value}`])));
  if (filters.favorite) parts.push(['favorite', 'true', '移除收藏筛选']);
  return parts.map(([key, value, label]) => `<button class="active-filter" type="button" data-filter-key="${key}" data-filter-value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}">${escapeHtml(key === 'q' ? `搜索：${value}` : value)}<span aria-hidden="true">×</span></button>`).join('');
}

export function renderCollectionState(kind, message) {
  const role = kind === 'error' ? ' role="alert"' : ' role="status"';
  return `<div class="collection-state" data-state="${escapeHtml(kind)}"${role}><img src="${ASSETS.empty}" alt=""><p>${escapeHtml(message)}</p>${kind === 'error' ? '<button class="island-button" type="button" data-action="retry">重新加载</button>' : ''}</div>`;
}
