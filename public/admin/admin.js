'use strict';

const U = window.WardrobeUtils;

// ─── 登录态持久化 ─────────────────────────────────────────────────
const LS_KEY = 'wardrobe_admin_logged_in';
(async () => {
  if (localStorage.getItem(LS_KEY) === '1') {
    try {
      const d = await U.apiFetch('/api/auth/check');
      if (!d.isAdmin) { localStorage.removeItem(LS_KEY); window.location.href = '/admin/login'; }
    } catch { localStorage.removeItem(LS_KEY); window.location.href = '/admin/login'; }
  } else {
    try {
      const d = await U.apiFetch('/api/auth/check');
      if (!d.isAdmin) window.location.href = '/admin/login';
      else localStorage.setItem(LS_KEY, '1');
    } catch { window.location.href = '/admin/login'; }
  }
})();

// ─── 全局状态 ─────────────────────────────────────────────────────
let allClothes      = [];
let allMembers      = [];
let editingId       = null;
let deletingId      = null;
let adminDetailId   = null;
let currentStep     = 0;

let addBlobs    = { display: null, thumb: null };
let addBlobsMob = { display: null, thumb: null };
let editBlobs   = { display: null, thumb: null };

let addSelectedType    = '';
let addSelectedTypeMob = '';
let editSelectedType   = '';

// ─── 多选筛选状态（数组）────────────────────────────────────────
// 桌面端直接维护这些数组，手机 Sheet 用临时副本
let filterMembers  = [];  // 选中的人员
let filterTypes    = [];  // 选中的类型
let filterSeasons  = [];  // 选中的季节
let filterStatuses = [];  // 选中的状态

// 手机 Sheet 临时状态
let sheetMembers  = [];
let sheetTypes    = [];
let sheetSeasons  = [];
let sheetStatuses = [];

// ─── 排序状态 ─────────────────────────────────────────────────────
let sortField = '';
let sortDir   = '';

// ─── 季节 checkbox 工具 ───────────────────────────────────────────
function getCheckedSeasons(groupId) {
  const g = document.getElementById(groupId);
  if (!g) return [];
  return Array.from(g.querySelectorAll('.season-checkbox:checked')).map(cb => cb.value);
}
function setCheckedSeasons(groupId, seasons = []) {
  const g = document.getElementById(groupId);
  if (!g) return;
  g.querySelectorAll('.season-checkbox').forEach(cb => { cb.checked = seasons.includes(cb.value); });
}

// ─── 初始化 ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadMembers();
  await loadClothes();
  initNav();
  initDesktopFilterPills();
  initAddPanel();
  initEditModal();
  initDeleteModal();
  initAdminDetailModal();
  initAdminFilterSheet();
  initMobileSteps();
  initTableSort();
  initMobileSort();
  initLogout();
  initStatDetail();
});

// ─── 导航 ─────────────────────────────────────────────────────────
const PANEL_LABELS = {
  'panel-clothes': '衣物管理', 'panel-add': '新增衣物',
  'panel-members': '人员管理', 'panel-stats': '统计概览'
};
function initNav() {
  document.querySelectorAll('[data-panel]').forEach(el =>
    el.addEventListener('click', () => switchPanel(el.dataset.panel)));
  document.getElementById('goto-add-btn')?.addEventListener('click', () => switchPanel('panel-add'));
  document.getElementById('mobile-add-btn')?.addEventListener('click', () => { closeDrawer(); switchPanel('panel-add'); });
}
function switchPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === id));
  document.querySelectorAll('[data-panel]').forEach(n => n.classList.toggle('active', n.dataset.panel === id));
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = PANEL_LABELS[id] || '';
  if (id === 'panel-stats')   renderStats();
  if (id === 'panel-members') renderMembers();
  if (id === 'panel-add')     resetMobileStep(0);
  closeDrawer();
}

// ─── 抽屉菜单 ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('drawer-overlay');
  document.getElementById('hamburger-btn')?.addEventListener('click', openDrawer);
  document.getElementById('drawer-close-btn')?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeDrawer(); });
  document.getElementById('drawer-logout-btn')?.addEventListener('click', doLogout);
});
function openDrawer()  { document.getElementById('drawer-overlay')?.classList.add('open'); document.getElementById('drawer')?.classList.add('open'); document.body.style.overflow = 'hidden'; }
function closeDrawer() { document.getElementById('drawer-overlay')?.classList.remove('open'); document.getElementById('drawer')?.classList.remove('open'); document.body.style.overflow = ''; }

// ─── 人员 ─────────────────────────────────────────────────────────
async function loadMembers() {
  allMembers = await U.apiFetch('/api/members');
  populateMemberSelects();
}
function populateMemberSelects() {
  const opts = '<option value="">请选择</option>' +
    allMembers.map(m => `<option value="${U.escHtml(m.name)}">${U.escHtml(m.name)}</option>`).join('');
  ['add-member', 'add-member-mobile'].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = opts; });
  const es = document.getElementById('edit-member');
  if (es) es.innerHTML = allMembers.map(m => `<option value="${U.escHtml(m.name)}">${U.escHtml(m.name)}</option>`).join('');
  // 重新渲染桌面筛选胶囊（人员数据可能变化）
  renderDesktopPillGroup('filter-member-pills', allMembers.map(m => ({ key: m.name, label: '👦 ' + m.name })), filterMembers, v => {
    toggleFilter(filterMembers, v); updateDesktopResetBtn(); loadClothes();
  });
}
function renderMembers() {
  const list = document.getElementById('member-list'); if (!list) return;
  if (!allMembers.length) { list.innerHTML = '<span style="color:var(--text-hint)">暂无人员</span>'; return; }
  list.innerHTML = allMembers.map(m => `
    <div class="member-tag">
      <span>${U.escHtml(m.name)}</span>
      <div class="member-tag-actions">
        <button class="member-tag-btn edit" data-action="rename" data-id="${U.escHtml(m.id)}" data-name="${U.escHtml(m.name)}">✏️</button>
        <button class="member-tag-btn" data-action="delete" data-id="${U.escHtml(m.id)}" data-name="${U.escHtml(m.name)}">🗑️</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.action === 'rename') renameMember(btn.dataset.id, btn.dataset.name);
    else deleteMember(btn.dataset.id, btn.dataset.name);
  }));
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('add-member-btn')?.addEventListener('click', addMember);
  document.getElementById('new-member-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addMember(); });
});
async function addMember() {
  const input = document.getElementById('new-member-input');
  const name = input.value.trim(); if (!name) return;
  try { await U.apiFetch('/api/members', { method: 'POST', body: JSON.stringify({ name }) }); input.value = ''; await loadMembers(); renderMembers(); U.showToast('人员已添加', 'success'); }
  catch (e) { U.showToast(e.message, 'error'); }
}
async function renameMember(id, oldName) {
  const newName = prompt(`重命名「${oldName}」为：`, oldName);
  if (!newName || newName.trim() === oldName) return;
  try { await U.apiFetch(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify({ name: newName.trim() }) }); await loadMembers(); renderMembers(); await loadClothes(); U.showToast('已重命名', 'success'); }
  catch (e) { U.showToast(e.message, 'error'); }
}
async function deleteMember(id, name) {
  if (!confirm(`确定删除人员「${name}」？`)) return;
  try { await U.apiFetch(`/api/members/${id}`, { method: 'DELETE' }); await loadMembers(); renderMembers(); U.showToast('人员已删除', 'success'); }
  catch (e) { U.showToast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════════
// 桌面端多选筛选胶囊
// ═══════════════════════════════════════════════════════════════════

/**
 * 通用：切换数组中某个值（多选 toggle）
 */
function toggleFilter(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
}

/**
 * 渲染一组筛选胶囊（多选）
 * @param containerId 容器 id
 * @param options     选项字符串数组
 * @param activeArr   当前激活的值数组（引用）
 * @param onClick     点击某个值时的回调(value)
 */
/**
 * @param keyExtractor 可选，从显示文本提取 key（用于带图标的选项）
 *   不传时 key === 显示文本
 */
function renderDesktopPillGroup(containerId, options, activeArr, onClick, keyExtractor) {
  const wrap = document.getElementById(containerId);
  if (!wrap) return;
  const getKey = keyExtractor || (v => v);
  wrap.innerHTML = options.map(opt => {
    const key = getKey(opt);
    return `<button class="filter-pill${activeArr.includes(key) ? ' active' : ''}"
      data-value="${U.escHtml(opt)}" data-key="${U.escHtml(key)}">${U.escHtml(opt)}</button>`;
  }).join('');
  wrap.querySelectorAll('.filter-pill').forEach(pill =>
    pill.addEventListener('click', () => {
      onClick(pill.dataset.value);
      // 同步激活状态（用 key 比对）
      pill.classList.toggle('active', activeArr.includes(pill.dataset.key));
    })
  );
}

/**
 * 初始化桌面筛选胶囊（全部四组 + 重置按钮 + 搜索框）
 */
function initDesktopFilterPills() {
  // 人员
  renderDesktopPillGroup('filter-member-pills', allMembers.map(m => '👦 ' + m.name), filterMembers,
    v => { toggleFilter(filterMembers, v.replace(/^👦\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^👦\s/, '')
  );

  // 类型
  renderDesktopPillGroup('filter-type-pills',
    U.CLOTHING_TYPES.map(t => t.icon + ' ' + t.key),
    filterTypes,
    v => {
      // 去掉 emoji 前缀，只存 key
      const key = v.replace(/^.+\s/, '');
      toggleFilter(filterTypes, key);
      // 更新 activeArr 用于视觉（这里 activeArr 存的是 key，但显示的是带 emoji 的）
      updateDesktopTypePills();
      updateDesktopResetBtn();
      loadClothes();
    }
  );

  // 季节（带图标）
  const SEASON_ICONS = {'春':'🌸','夏':'☀️','秋':'🍂','冬':'❄️','四季':'🌈'};
  renderDesktopPillGroup('filter-season-pills',
    U.SEASONS.map(s => SEASON_ICONS[s] + ' ' + s), filterSeasons,
    v => { toggleFilter(filterSeasons, v.replace(/^.+\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^.+\s/, '')
  );

  // 状态（带图标）
  const STATUS_ICONS = {'在用':'✅','闲置':'📦','已淘汰':'🗑️'};
  renderDesktopPillGroup('filter-status-pills',
    ['在用','闲置','已淘汰'].map(s => STATUS_ICONS[s] + ' ' + s), filterStatuses,
    v => { toggleFilter(filterStatuses, v.replace(/^.+\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^.+\s/, '')
  );

  // 搜索
  let timer;
  document.getElementById('search-input')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(loadClothes, 350);
  });
  document.getElementById('search-input-mobile')?.addEventListener('input', () => {
    clearTimeout(timer); timer = setTimeout(loadClothes, 350);
  });

  // 收藏
  document.getElementById('filter-fav')?.addEventListener('change', loadClothes);

  // 重置按钮
  document.getElementById('desktop-filter-reset-btn')?.addEventListener('click', () => {
    filterMembers.length  = 0;
    filterTypes.length    = 0;
    filterSeasons.length  = 0;
    filterStatuses.length = 0;
    const fav = document.getElementById('filter-fav'); if (fav) fav.checked = false;
    const si  = document.getElementById('search-input'); if (si) si.value = '';
    reRenderAllDesktopPills();
    updateDesktopResetBtn();
    loadClothes();
  });
}

// 类型胶囊需要特殊处理（显示 emoji + key，但 active 比对 key）
function updateDesktopTypePills() {
  const wrap = document.getElementById('filter-type-pills');
  if (!wrap) return;
  wrap.querySelectorAll('.filter-pill').forEach(pill => {
    const key = pill.dataset.key || pill.dataset.value.replace(/^.+\s/, '');
    pill.classList.toggle('active', filterTypes.includes(key));
  });
}

// 重新渲染所有桌面胶囊（重置后同步视觉）
function reRenderAllDesktopPills() {
  const _SEASON_ICONS = {'春':'🌸','夏':'☀️','秋':'🍂','冬':'❄️','四季':'🌈'};
  const _STATUS_ICONS = {'在用':'✅','闲置':'📦','已淘汰':'🗑️'};

  renderDesktopPillGroup('filter-member-pills', allMembers.map(m => '👦 ' + m.name), filterMembers,
    v => { toggleFilter(filterMembers, v.replace(/^👦\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^👦\s/, '')
  );
  renderDesktopPillGroup('filter-type-pills',
    U.CLOTHING_TYPES.map(t => t.icon + ' ' + t.key), filterTypes,
    v => { const key = v.replace(/^.+\s/, ''); toggleFilter(filterTypes, key); updateDesktopTypePills(); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^.+\s/, '')
  );
  updateDesktopTypePills();
  renderDesktopPillGroup('filter-season-pills',
    U.SEASONS.map(s => _SEASON_ICONS[s] + ' ' + s), filterSeasons,
    v => { toggleFilter(filterSeasons, v.replace(/^.+\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^.+\s/, '')
  );
  renderDesktopPillGroup('filter-status-pills',
    ['在用','闲置','已淘汰'].map(s => _STATUS_ICONS[s] + ' ' + s), filterStatuses,
    v => { toggleFilter(filterStatuses, v.replace(/^.+\s/, '')); updateDesktopResetBtn(); loadClothes(); },
    v => v.replace(/^.+\s/, '')
  );
}

// 更新重置按钮高亮状态
function updateDesktopResetBtn() {
  const btn = document.getElementById('desktop-filter-reset-btn');
  if (!btn) return;
  const hasActive = filterMembers.length || filterTypes.length ||
                    filterSeasons.length || filterStatuses.length ||
                    document.getElementById('filter-fav')?.checked;
  btn.classList.toggle('has-active', !!hasActive);
}

// ─── 构建 URL 筛选参数（多值逗号分隔）────────────────────────────
function buildFilterParams() {
  const params = new URLSearchParams();
  if (filterMembers.length)  params.set('member', filterMembers.join(','));
  if (filterTypes.length)    params.set('type',   filterTypes.join(','));
  if (filterSeasons.length)  params.set('season', filterSeasons.join(','));
  if (filterStatuses.length) params.set('status', filterStatuses.join(','));
  if (document.getElementById('filter-fav')?.checked) params.set('favorite', 'true');
  const q = document.getElementById('search-input')?.value ||
            document.getElementById('search-input-mobile')?.value || '';
  if (q) params.set('q', q);
  return params;
}

// ─── 衣物列表 ─────────────────────────────────────────────────────
async function loadClothes() {
  const params = buildFilterParams();

  const tbody = document.getElementById('clothes-tbody');
  const mList = document.getElementById('mobile-clothes-list');
  if (tbody) tbody.innerHTML = '<tr><td colspan="12"><div class="loading-overlay"><div class="spinner"></div>加载中…</div></td></tr>';
  if (mList) mList.innerHTML = '<div class="loading-overlay"><div class="spinner"></div>加载中…</div>';

  try {
    allClothes = await U.apiFetch('/api/clothes?' + params.toString());
    applySortAndRender();
  } catch (e) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:var(--danger);padding:24px">${U.escHtml(e.message)}</td></tr>`;
  }
}

// ─── 排序 ─────────────────────────────────────────────────────────
const SORT_FIELDS = {
  name:         item => item.name         || '',
  clothingType: item => item.clothingType || '',
  member:       item => item.member       || '',
  size:         item => item.size         || '',
  color:        item => item.color        || '',
  brand:        item => item.brand        || '',
  seasons:      item => (item.seasons || []).join(''),
  status:       item => item.status       || '',
  favorite:     item => item.favorite ? 1 : 0,
  createdAt:    item => item.createdAt    || ''
};
function getSortedClothes() {
  if (!sortField || !sortDir) return [...allClothes];
  const getter = SORT_FIELDS[sortField] || (() => '');
  return [...allClothes].sort((a, b) => {
    const va = getter(a), vb = getter(b);
    const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'zh-CN');
    return sortDir === 'asc' ? cmp : -cmp;
  });
}
function applySortAndRender() {
  const sorted = getSortedClothes();
  renderClothesTable(sorted);
  renderMobileList(sorted);
  updateSortUI();
}

function initTableSort() {
  document.querySelectorAll('.sortable-th').forEach(th =>
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (sortField !== field) { sortField = field; sortDir = 'asc'; }
      else if (sortDir === 'asc')  sortDir = 'desc';
      else { sortField = ''; sortDir = ''; }
      applySortAndRender();
    })
  );
}
function updateSortUI() {
  document.querySelectorAll('.sortable-th').forEach(th => {
    const field = th.dataset.sort;
    th.classList.remove('sort-asc', 'sort-desc');
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '⇅';
    if (field === sortField) {
      th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      if (icon) icon.textContent = sortDir === 'asc' ? '↑' : '↓';
    }
  });
  document.querySelectorAll('.sort-pill').forEach(pill => {
    const field = pill.dataset.sort;
    pill.classList.remove('active-asc', 'active-desc');
    const icon = pill.querySelector('.pill-sort-icon');
    if (icon) icon.textContent = '';
    if (field === sortField) {
      pill.classList.add(sortDir === 'asc' ? 'active-asc' : 'active-desc');
      if (icon) icon.textContent = sortDir === 'asc' ? ' ↑' : ' ↓';
    }
  });
}

const MOBILE_SORT_FIELDS = [
  { key: 'name', label: '名称' }, { key: 'clothingType', label: '类型' },
  { key: 'member', label: '使用人' }, { key: 'size', label: '尺寸' },
  { key: 'status', label: '状态' }, { key: 'createdAt', label: '日期' }
];
function initMobileSort() {
  const bar = document.getElementById('mobile-sort-bar'); if (!bar) return;
  bar.innerHTML = MOBILE_SORT_FIELDS.map(f =>
    `<button class="sort-pill" data-sort="${f.key}">${f.label}<span class="pill-sort-icon"></span></button>`).join('');
  bar.querySelectorAll('.sort-pill').forEach(pill =>
    pill.addEventListener('click', () => {
      const field = pill.dataset.sort;
      if (sortField !== field) { sortField = field; sortDir = 'asc'; }
      else if (sortDir === 'asc')  sortDir = 'desc';
      else { sortField = ''; sortDir = ''; }
      applySortAndRender();
    })
  );
}

// ─── 桌面表格渲染 ─────────────────────────────────────────────────
function renderClothesTable(list) {
  list = list || getSortedClothes();
  const tbody = document.getElementById('clothes-tbody'); if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="empty-state-icon">👕</div><div class="empty-state-text">暂无衣物记录</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(item => `
    <tr class="clothes-row" data-id="${U.escHtml(item.id)}" style="cursor:pointer">
      <td>${U.renderThumb(item)}</td>
      <td>${U.escHtml(item.name || '—')}</td>
      <td>${U.getTypeIcon(item.clothingType)} ${U.escHtml(item.clothingType)}</td>
      <td>${U.escHtml(item.member)}</td>
      <td>${U.escHtml(item.size  || '—')}</td>
      <td>${U.escHtml(item.color || '—')}</td>
      <td>${U.escHtml(item.brand || '—')}</td>
      <td>${item.seasons?.length ? item.seasons.map(s => `<span class="badge badge-season" style="margin-right:2px">${U.escHtml(s)}</span>`).join('') : '—'}</td>
      <td>${U.renderStatusBadge(item.status)}</td>
      <td><button class="btn-favorite" data-action="toggle-fav" data-id="${U.escHtml(item.id)}">${item.favorite ? '⭐' : '☆'}</button></td>
      <td>${U.formatDate(item.createdAt)}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${U.escHtml(item.id)}">编辑</button>
          <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:none"
            data-action="delete" data-id="${U.escHtml(item.id)}" data-name="${U.escHtml(item.name || item.clothingType)}">删除</button>
        </div>
      </td>
    </tr>`).join('');
  bindListActions(tbody);
}

// ─── 手机卡片列表渲染 ─────────────────────────────────────────────
function renderMobileList(list) {
  list = list || getSortedClothes();
  const container = document.getElementById('mobile-clothes-list'); if (!container) return;
  if (!list.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👕</div><div class="empty-state-text">暂无衣物记录</div></div>`;
    return;
  }
  container.innerHTML = list.map(item => {
    const thumbSrc = item.thumbPath || item.photoPath;
    const thumb = thumbSrc
      ? `<img src="${U.escHtml(thumbSrc)}" class="mobile-card-thumb" loading="lazy">`
      : `<div class="mobile-card-thumb-placeholder">${U.getTypeIcon(item.clothingType)}</div>`;
    return `
    <div class="mobile-clothes-card" data-id="${U.escHtml(item.id)}">
      ${thumb}
      <div class="mobile-card-info">
        <div class="mobile-card-name">${U.escHtml(item.name || item.clothingType)}</div>
        <div class="mobile-card-meta">
          <span>${U.getTypeIcon(item.clothingType)} ${U.escHtml(item.clothingType)}</span>
          ${item.size  ? `<span>· ${U.escHtml(item.size)}</span>`  : ''}
          ${item.color ? `<span>· ${U.escHtml(item.color)}</span>` : ''}
          ${item.seasons?.length ? `<span class="badge badge-season">${item.seasons.join(' ')}</span>` : ''}
        </div>
        <div style="margin-top:5px;display:flex;gap:6px;align-items:center">
          ${U.renderStatusBadge(item.status)}
          <button class="btn-favorite" data-action="toggle-fav" data-id="${U.escHtml(item.id)}">${item.favorite ? '⭐' : '☆'}</button>
        </div>
      </div>
      <div class="mobile-card-actions">
        <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${U.escHtml(item.id)}">编辑</button>
        <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:none"
          data-action="delete" data-id="${U.escHtml(item.id)}" data-name="${U.escHtml(item.name || item.clothingType)}">删除</button>
      </div>
    </div>`;
  }).join('');
  bindListActions(container);
}

function bindListActions(container) {
  container.querySelectorAll('.clothes-row,.mobile-clothes-card').forEach(row =>
    row.addEventListener('click', e => {
      if (e.target.closest('[data-action]')) return;
      const item = allClothes.find(c => c.id === row.dataset.id);
      if (item) openAdminDetailModal(item);
    })
  );
  container.querySelectorAll('[data-action]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (btn.dataset.action === 'edit')       openEditModal(btn.dataset.id);
      if (btn.dataset.action === 'delete')     openDeleteModal(btn.dataset.id, btn.dataset.name);
      if (btn.dataset.action === 'toggle-fav') toggleFavorite(btn.dataset.id);
    })
  );
}

async function toggleFavorite(id) {
  try {
    const res = await U.apiFetch(`/api/clothes/${id}/favorite`, { method: 'PATCH' });
    const item = allClothes.find(c => c.id === id);
    if (item) item.favorite = res.favorite;
    applySortAndRender();
    U.showToast(res.favorite ? '已加入收藏 ⭐' : '已取消收藏', 'success');
  } catch (e) { U.showToast(e.message, 'error'); }
}

// ═══════════════════════════════════════════════════════════════════
// 手机端 Bottom Sheet 多选筛选
// ═══════════════════════════════════════════════════════════════════
function initAdminFilterSheet() {
  const overlay  = document.getElementById('admin-filter-overlay');
  const sheet    = document.getElementById('admin-filter-sheet');
  const openBtn  = document.getElementById('open-admin-filter-btn');
  const closeBtn = document.getElementById('close-admin-filter-btn');
  const resetBtn = document.getElementById('admin-filter-reset-btn');
  const applyBtn = document.getElementById('admin-filter-apply-btn');
  if (!overlay || !sheet) return;

  function openSheet() {
    // 把当前桌面状态拷入 sheet 临时数组
    sheetMembers  = [...filterMembers];
    sheetTypes    = [...filterTypes];
    sheetSeasons  = [...filterSeasons];
    sheetStatuses = [...filterStatuses];
    renderSheetPills();
    overlay.classList.add('open'); sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeSheet() {
    overlay.classList.remove('open'); sheet.classList.remove('open');
    document.body.style.overflow = '';
  }

  openBtn?.addEventListener('click', openSheet);
  closeBtn?.addEventListener('click', closeSheet);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSheet(); });

  resetBtn?.addEventListener('click', () => {
    sheetMembers.length = 0; sheetTypes.length = 0;
    sheetSeasons.length = 0; sheetStatuses.length = 0;
    renderSheetPills();
  });

  applyBtn?.addEventListener('click', () => {
    // 把 sheet 临时状态写回全局
    filterMembers.length  = 0; filterMembers.push(...sheetMembers);
    filterTypes.length    = 0; filterTypes.push(...sheetTypes);
    filterSeasons.length  = 0; filterSeasons.push(...sheetSeasons);
    filterStatuses.length = 0; filterStatuses.push(...sheetStatuses);
    reRenderAllDesktopPills();
    updateDesktopResetBtn();
    closeSheet();
    loadClothes();
  });
}

function renderSheetPills() {
  const _SI = {'春':'🌸','夏':'☀️','秋':'🍂','冬':'❄️','四季':'🌈'};
  const _ST = {'在用':'✅','闲置':'📦','已淘汰':'🗑️'};
  renderSheetPillGroup('admin-sheet-member-pills',
    allMembers.map(m => '👦 ' + m.name), sheetMembers, true);
  renderSheetPillGroup('admin-sheet-type-pills',
    U.CLOTHING_TYPES.map(t => t.icon + ' ' + t.key), sheetTypes, true);
  renderSheetPillGroup('admin-sheet-season-pills',
    U.SEASONS.map(s => _SI[s] + ' ' + s), sheetSeasons, true);
  renderSheetPillGroup('admin-sheet-status-pills',
    ['在用','闲置','已淘汰'].map(s => _ST[s] + ' ' + s), sheetStatuses, true);
}

/**
 * 渲染 Sheet 内一组多选胶囊
 * @param stripEmoji true 时去掉 emoji 前缀存 key
 */
function renderSheetPillGroup(containerId, options, activeArr, stripEmoji = false) {
  const wrap = document.getElementById(containerId); if (!wrap) return;
  // options 支持字符串或 {key, label} 对象；stripEmoji 仅对纯字符串有效
  const normalized = options.map(o => {
    if (typeof o === 'object') return o;
    const key = stripEmoji ? o.replace(/^.+\s/, '') : o;
    return { key, label: o };
  });
  wrap.innerHTML = normalized.map(({ key, label }) =>
    `<button class="filter-sheet-pill${activeArr.includes(key) ? ' active' : ''}"
      data-key="${U.escHtml(key)}">${U.escHtml(label)}</button>`).join('');
  wrap.querySelectorAll('.filter-sheet-pill').forEach(pill =>
    pill.addEventListener('click', () => {
      const key = pill.dataset.key;
      const idx = activeArr.indexOf(key);
      if (idx === -1) activeArr.push(key);
      else activeArr.splice(idx, 1);
      pill.classList.toggle('active', activeArr.includes(key));
    })
  );
}

// ─── 桌面新增面板 ─────────────────────────────────────────────────
function initAddPanel() {
  renderTypeBtns('type-btn-group', v => { addSelectedType = v; });
  U.initUploadArea(
    document.getElementById('upload-area'),
    document.getElementById('photo-input'),
    document.getElementById('photo-preview'),
    null,
    blobs => { addBlobs = blobs || { display: null, thumb: null }; },
    document.getElementById('add-compress-status')
  );
  document.getElementById('add-submit-btn')?.addEventListener('click', submitAdd);
  document.getElementById('add-reset-btn')?.addEventListener('click', resetAddForm);
}

async function submitAdd() {
  if (!addSelectedType) { U.showToast('请选择衣物类型', 'error'); return; }
  const member = document.getElementById('add-member')?.value;
  if (!member) { U.showToast('请选择适用人员', 'error'); return; }
  await doSaveClothes({
    clothingType: addSelectedType, member,
    name:    document.getElementById('add-name')?.value.trim()  || '',
    size:    document.getElementById('add-size')?.value.trim()  || '',
    color:   document.getElementById('add-color')?.value.trim() || '',
    brand:   document.getElementById('add-brand')?.value.trim() || '',
    status:  document.getElementById('add-status')?.value || '在用',
    notes:   document.getElementById('add-notes')?.value.trim() || '',
    seasons: JSON.stringify(getCheckedSeasons('add-season-group')),
    favorite: document.getElementById('add-favorite')?.checked ? 'true' : 'false'
  }, addBlobs, 'add-submit-btn', '保存衣物', () => { resetAddForm(); switchPanel('panel-clothes'); });
}

function resetAddForm() {
  addSelectedType = ''; addBlobs = { display: null, thumb: null };
  ['add-name','add-size','add-color','add-brand','add-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const st = document.getElementById('add-status'); if (st) st.value = '在用';
  const mb = document.getElementById('add-member'); if (mb) mb.value = '';
  const pi = document.getElementById('photo-input'); if (pi) pi.value = '';
  const pp = document.getElementById('photo-preview'); if (pp) pp.innerHTML = '';
  const cs = document.getElementById('add-compress-status'); if (cs) cs.innerHTML = '';
  const fav = document.getElementById('add-favorite'); if (fav) fav.checked = false;
  setCheckedSeasons('add-season-group', []);
  document.querySelectorAll('#type-btn-group .type-btn').forEach(b => b.classList.remove('selected'));
}

// ─── 手机分步 ─────────────────────────────────────────────────────
function initMobileSteps() {
  renderTypeBtns('type-btn-group-mobile', v => { addSelectedTypeMob = v; });
  const area = document.getElementById('upload-area-mobile');
  const input = document.getElementById('photo-input-mobile');
  const preview = document.getElementById('photo-preview-mobile');
  const status  = document.getElementById('mob-compress-status');
  if (area && input && preview) {
    U.initUploadArea(area, input, preview, null,
      blobs => { addBlobsMob = blobs || { display: null, thumb: null }; }, status);
  }
  document.getElementById('step0-next-btn')?.addEventListener('click', () => goStep(1));
  document.getElementById('step1-prev-btn')?.addEventListener('click', () => goStep(0));
  document.getElementById('step1-next-btn')?.addEventListener('click', () => {
    if (!addSelectedTypeMob) { U.showToast('请先选择衣物类型', 'error'); return; }
    goStep(2);
  });
  document.getElementById('step2-prev-btn')?.addEventListener('click', () => goStep(1));
  document.getElementById('add-submit-mobile-btn')?.addEventListener('click', submitAddMobile);
}
function goStep(n) {
  currentStep = n;
  for (let i = 0; i < 3; i++) {
    document.getElementById(`step-panel-${i}`)?.classList.toggle('active', i === n);
    const dot = document.getElementById(`step-dot-${i}`);
    if (dot) { dot.classList.toggle('active', i === n); dot.classList.toggle('done', i < n); }
  }
  document.getElementById('panel-add')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function resetMobileStep(n) {
  addSelectedTypeMob = ''; addBlobsMob = { display: null, thumb: null }; currentStep = 0; goStep(n);
  ['add-name-mobile','add-size-mobile','add-color-mobile','add-brand-mobile','add-notes-mobile'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const pim = document.getElementById('photo-input-mobile'); if (pim) pim.value = '';
  const ppm = document.getElementById('photo-preview-mobile'); if (ppm) ppm.innerHTML = '';
  const cs  = document.getElementById('mob-compress-status'); if (cs) cs.innerHTML = '';
  const fav = document.getElementById('add-favorite-mobile'); if (fav) fav.checked = false;
  setCheckedSeasons('add-season-group-mobile', []);
  document.querySelectorAll('#type-btn-group-mobile .type-btn').forEach(b => b.classList.remove('selected'));
}
async function submitAddMobile() {
  if (!addSelectedTypeMob) { U.showToast('请选择衣物类型', 'error'); goStep(1); return; }
  const member = document.getElementById('add-member-mobile')?.value;
  if (!member) { U.showToast('请选择适用人员', 'error'); return; }
  await doSaveClothes({
    clothingType: addSelectedTypeMob, member,
    name:    document.getElementById('add-name-mobile')?.value.trim()  || '',
    size:    document.getElementById('add-size-mobile')?.value.trim()  || '',
    color:   document.getElementById('add-color-mobile')?.value.trim() || '',
    brand:   document.getElementById('add-brand-mobile')?.value.trim() || '',
    status:  document.getElementById('add-status-mobile')?.value || '在用',
    notes:   document.getElementById('add-notes-mobile')?.value.trim() || '',
    seasons: JSON.stringify(getCheckedSeasons('add-season-group-mobile')),
    favorite: document.getElementById('add-favorite-mobile')?.checked ? 'true' : 'false'
  }, addBlobsMob, 'add-submit-mobile-btn', '✅ 保存衣物', () => { resetMobileStep(0); switchPanel('panel-clothes'); });
}

// ─── 公共保存 ─────────────────────────────────────────────────────
async function doSaveClothes(fields, blobs, btnId, defaultLabel, onSuccess) {
  const fd  = U.buildClothesFormData(fields, blobs?.display || null, blobs?.thumb || null);
  const btn = document.getElementById(btnId);
  if (btn) { btn.disabled = true; btn.textContent = '保存中…'; }
  try {
    await U.apiUpload('/api/clothes', fd, 'POST');
    U.showToast('衣物已保存！', 'success');
    await loadClothes();
    if (onSuccess) onSuccess();
  } catch (e) { U.showToast(e.message, 'error'); }
  finally { if (btn) { btn.disabled = false; btn.textContent = defaultLabel; } }
}

// ─── 类型按钮 ─────────────────────────────────────────────────────
function renderTypeBtns(containerId, onSelect) {
  const container = document.getElementById(containerId); if (!container) return;
  container.innerHTML = U.CLOTHING_TYPES.map(t =>
    `<button type="button" class="type-btn" data-type="${U.escHtml(t.key)}">
      <span class="type-icon">${t.icon}</span><span>${t.key}</span>
    </button>`).join('');
  container.querySelectorAll('.type-btn').forEach(btn => btn.addEventListener('click', () => {
    container.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected'); onSelect(btn.dataset.type);
  }));
}
function setTypeBtnSelected(containerId, typeKey) {
  document.getElementById(containerId)?.querySelectorAll('.type-btn').forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.type === typeKey));
}

// ─── 编辑弹窗 ─────────────────────────────────────────────────────
function initEditModal() {
  renderTypeBtns('edit-type-btn-group', v => { editSelectedType = v; });
  U.initUploadArea(
    document.getElementById('edit-upload-area'),
    document.getElementById('edit-photo-input'),
    document.getElementById('edit-photo-preview'),
    null,
    blobs => { editBlobs = blobs || { display: null, thumb: null }; },
    document.getElementById('edit-compress-status')
  );
  U.bindOverlayClose('edit-modal-overlay');
  document.getElementById('edit-modal-close')?.addEventListener('click', () => U.closeModal('edit-modal-overlay'));
  document.getElementById('edit-cancel-btn')?.addEventListener('click',  () => U.closeModal('edit-modal-overlay'));
  document.getElementById('edit-save-btn')?.addEventListener('click', submitEdit);
}
function openEditModal(id) {
  const item = allClothes.find(c => c.id === id); if (!item) return;
  editingId = id; editBlobs = { display: null, thumb: null }; editSelectedType = item.clothingType;
  document.getElementById('edit-name').value  = item.name  || '';
  document.getElementById('edit-size').value  = item.size  || '';
  document.getElementById('edit-color').value = item.color || '';
  document.getElementById('edit-brand').value = item.brand || '';
  document.getElementById('edit-notes').value = item.notes || '';
  document.getElementById('edit-status').value = item.status;
  document.getElementById('edit-member').value = item.member;
  document.getElementById('edit-photo-input').value = '';
  const cs = document.getElementById('edit-compress-status'); if (cs) cs.innerHTML = '';
  const pp = document.getElementById('edit-photo-preview');
  const previewSrc = item.photoPath || item.thumbPath;
  if (pp) pp.innerHTML = previewSrc ? `<div class="upload-preview"><img src="${U.escHtml(previewSrc)}" style="max-height:120px;margin-top:8px"></div>` : '';
  const fav = document.getElementById('edit-favorite'); if (fav) fav.checked = item.favorite === true;
  setTypeBtnSelected('edit-type-btn-group', item.clothingType);
  setCheckedSeasons('edit-season-group', item.seasons || []);
  U.openModal('edit-modal-overlay');
}
async function submitEdit() {
  if (!editSelectedType) { U.showToast('请选择衣物类型', 'error'); return; }
  const member = document.getElementById('edit-member')?.value;
  if (!member) { U.showToast('请选择适用人员', 'error'); return; }
  const fields = {
    member, clothingType: editSelectedType,
    name:    document.getElementById('edit-name')?.value.trim()  || '',
    size:    document.getElementById('edit-size')?.value.trim()  || '',
    color:   document.getElementById('edit-color')?.value.trim() || '',
    brand:   document.getElementById('edit-brand')?.value.trim() || '',
    status:  document.getElementById('edit-status')?.value || '在用',
    notes:   document.getElementById('edit-notes')?.value.trim() || '',
    seasons: JSON.stringify(getCheckedSeasons('edit-season-group')),
    favorite: document.getElementById('edit-favorite')?.checked ? 'true' : 'false'
  };
  const fd  = U.buildClothesFormData(fields, editBlobs?.display || null, editBlobs?.thumb || null);
  const btn = document.getElementById('edit-save-btn');
  btn.disabled = true; btn.textContent = '保存中…';
  try {
    await U.apiUpload(`/api/clothes/${editingId}`, fd, 'PUT');
    U.showToast('修改已保存', 'success');
    U.closeModal('edit-modal-overlay');
    await loadClothes();
  } catch (e) { U.showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '保存修改'; }
}

// ─── 删除弹窗 ─────────────────────────────────────────────────────
function initDeleteModal() {
  U.bindOverlayClose('del-modal-overlay');
  document.getElementById('del-confirm-btn')?.addEventListener('click', confirmDelete);
}
function openDeleteModal(id, name) {
  deletingId = id;
  document.getElementById('del-modal-body').textContent = `确定要删除「${name || '这件衣物'}」吗？此操作不可撤销，关联图片也会一并删除。`;
  U.openModal('del-modal-overlay');
}
async function confirmDelete() {
  if (!deletingId) return;
  const btn = document.getElementById('del-confirm-btn');
  btn.disabled = true; btn.textContent = '删除中…';
  try {
    await U.apiFetch(`/api/clothes/${deletingId}`, { method: 'DELETE' });
    U.showToast('已删除', 'success');
    U.closeModal('del-modal-overlay');
    await loadClothes();
  } catch (e) { U.showToast(e.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = '确认删除'; deletingId = null; }
}

// ─── Admin 详情弹窗 ───────────────────────────────────────────────
function initAdminDetailModal() {
  U.bindOverlayClose('admin-detail-modal-overlay');
  document.getElementById('admin-detail-close')?.addEventListener('click',  () => U.closeModal('admin-detail-modal-overlay'));
  document.getElementById('admin-detail-close2')?.addEventListener('click', () => U.closeModal('admin-detail-modal-overlay'));
  document.getElementById('admin-detail-edit-btn')?.addEventListener('click', () => {
    U.closeModal('admin-detail-modal-overlay');
    if (adminDetailId) openEditModal(adminDetailId);
  });
  document.getElementById('admin-detail-delete-btn')?.addEventListener('click', () => {
    const item = allClothes.find(c => c.id === adminDetailId);
    U.closeModal('admin-detail-modal-overlay');
    if (item) openDeleteModal(item.id, item.name || item.clothingType);
  });
}
function openAdminDetailModal(item) {
  adminDetailId = item.id;
  document.getElementById('admin-detail-title').textContent = item.name || (U.getTypeIcon(item.clothingType) + ' ' + item.clothingType);
  const { photoHtml, fieldsHtml, notesHtml } = U.renderDetailContent(item, { showActions: false });
  document.getElementById('admin-detail-photo').innerHTML  = photoHtml;
  document.getElementById('admin-detail-fields').innerHTML = fieldsHtml + notesHtml;
  U.openModal('admin-detail-modal-overlay');
}

// ─── 统计概览 ─────────────────────────────────────────────────────
function initStatDetail() {
  document.getElementById('stat-detail-close')?.addEventListener('click', () =>
    document.getElementById('stat-detail-panel')?.classList.remove('open'));
}
function renderStats() {
  const grid = document.getElementById('stat-grid'); if (!grid) return;
  const total   = allClothes.length;
  const inUse   = allClothes.filter(c => c.status === '在用').length;
  const idle    = allClothes.filter(c => c.status === '闲置').length;
  const retired = allClothes.filter(c => c.status === '已淘汰').length;
  const favCnt  = allClothes.filter(c => c.favorite === true).length;
  const byMember = {};
  allClothes.forEach(c => { byMember[c.member] = (byMember[c.member] || 0) + 1; });
  const byType = {};
  U.CLOTHING_TYPES.forEach(t => { byType[t.key] = 0; });
  allClothes.forEach(c => { byType[c.clothingType] = (byType[c.clothingType] || 0) + 1; });
  const bySeason = Object.fromEntries(U.SEASONS.map(s => [s, 0]));
  allClothes.forEach(c => (c.seasons || []).forEach(s => { if (bySeason[s] !== undefined) bySeason[s]++; }));

  const cards = [
    { num: total,   label: '衣物总数', filter: {} },
    { num: inUse,   label: '在用',     filter: { status: '在用' } },
    { num: idle,    label: '闲置',     filter: { status: '闲置' } },
    { num: retired, label: '已淘汰',   filter: { status: '已淘汰' } },
    { num: favCnt,  label: '⭐ 收藏',  filter: { favorite: 'true' } },
    ...allMembers.map(m => ({ num: byMember[m.name] || 0, label: m.name, filter: { member: m.name } })),
    ...U.CLOTHING_TYPES.map(t => ({ num: byType[t.key] || 0, label: t.icon + ' ' + t.key, filter: { type: t.key } })),
    ...U.SEASONS.map(s => ({ num: bySeason[s] || 0, label: s, filter: { season: s } }))
  ];

  grid.innerHTML = cards.map((c, i) => `
    <div class="stat-card clickable" data-stat-idx="${i}">
      <div class="stat-num">${c.num}</div>
      <div class="stat-label">${U.escHtml(c.label)}</div>
    </div>`).join('');
  grid.querySelectorAll('.stat-card').forEach(card =>
    card.addEventListener('click', () => showStatDetail(cards[parseInt(card.dataset.statIdx)])));
}
async function showStatDetail(card) {
  const panel     = document.getElementById('stat-detail-panel');
  const titleEl   = document.getElementById('stat-detail-title-text');
  const detailGrid = document.getElementById('stat-detail-grid');
  if (!panel || !titleEl || !detailGrid) return;
  titleEl.textContent = `${card.label}（${card.num} 件）`;
  detailGrid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div>加载中…</div>';
  panel.classList.add('open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const params = new URLSearchParams();
    const f = card.filter;
    if (f.member)   params.set('member',   f.member);
    if (f.type)     params.set('type',     f.type);
    if (f.status)   params.set('status',   f.status);
    if (f.season)   params.set('season',   f.season);
    if (f.favorite) params.set('favorite', f.favorite);
    const list = await U.apiFetch('/api/clothes?' + params.toString());
    if (!list.length) {
      detailGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👕</div><div class="empty-state-text">暂无衣物</div></div>';
      return;
    }
    detailGrid.innerHTML = list.map(item => U.renderClothesCard(item, true)).join('');
    detailGrid.querySelectorAll('.clothes-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = list.find(c => c.id === card.dataset.id);
        if (item) openAdminDetailModal(item);
      });
    });
  } catch (e) {
    detailGrid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">${U.escHtml(e.message)}</div></div>`;
  }
}

// ─── 退出 ─────────────────────────────────────────────────────────
async function doLogout() {
  localStorage.removeItem(LS_KEY);
  await U.apiFetch('/api/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/admin/login';
}
function initLogout() {
  ['sidenav-logout-btn','topbar-logout-btn','drawer-logout-btn'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', doLogout));
}
