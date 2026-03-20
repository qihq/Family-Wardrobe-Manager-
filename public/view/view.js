'use strict';

const U = window.WardrobeUtils;

// ─── 图标常量 ─────────────────────────────────────────────────────
const SEASON_ICONS = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️', '四季': '🌈' };
const STATUS_ICONS = { '在用': '✅', '闲置': '📦', '已淘汰': '🗑️' };

// ─── 多选筛选状态 ─────────────────────────────────────────────────
let allMembers     = [];
let allClothes     = [];
let selMembers     = [];   // 选中的人员（多选）
let selTypes       = [];   // 选中的类型
let selSeasons     = [];   // 选中的季节
let selStatuses    = [];   // 选中的状态
let selFav         = false;

// Sheet 临时状态
let sheetMembers   = [];
let sheetTypes     = [];
let sheetSeasons   = [];
let sheetStatuses  = [];
let sheetFav       = false;

// ─── 工具：多选 toggle ────────────────────────────────────────────
function toggleSel(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);
}

// ─── 初始化 ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadMembers();
  renderMemberTabs();
  renderTypePills();
  renderSeasonPills();
  renderStatusPills();
  initFavPill();
  initResetBtns();
  initFilterSheet();
  initDetailModal();
  await loadAndRender();
});

// ─── 人员 Tab（多选）─────────────────────────────────────────────
async function loadMembers() {
  try { allMembers = await U.apiFetch('/api/members'); } catch { allMembers = []; }
}

function renderMemberTabs() {
  const allOption = { name: '全部', value: '' };
  const tabs = [allOption, ...allMembers.map(m => ({ name: m.name, value: m.name }))];

  // 桌面/平板：顶部 navbar 内，多选（「全部」互斥，点了「全部」清空其他；点其他自动取消「全部」效果）
  const topBar = document.getElementById('member-tabs-top');
  if (topBar) {
    topBar.innerHTML = tabs.map(t => {
      const isAllActive = t.value === '' && selMembers.length === 0;
      const isMemberActive = t.value !== '' && selMembers.includes(t.value);
      const active = isAllActive || isMemberActive;
      const label = t.value === '' ? '👕 全部' : `👦 ${t.name}`;
      return `<button class="view-member-tab${active ? ' active' : ''}"
        data-member="${U.escHtml(t.value)}" style="white-space:nowrap">${label}</button>`;
    }).join('');
    topBar.querySelectorAll('.view-member-tab').forEach(btn =>
      btn.addEventListener('click', () => selectMemberTab(btn.dataset.member)));
  }

  // 手机：底部 bottom nav，多选
  const bottomBar = document.getElementById('member-tab-bar');
  if (bottomBar) {
    bottomBar.innerHTML = tabs.map(t => {
      const isAllActive = t.value === '' && selMembers.length === 0;
      const isMemberActive = t.value !== '' && selMembers.includes(t.value);
      const active = isAllActive || isMemberActive;
      const label = t.value === '' ? '全部' : t.name;
      const icon  = t.value === '' ? '👕' : '👦';
      return `<button class="view-nav-btn${active ? ' active' : ''}" data-member="${U.escHtml(t.value)}">
        <span class="nav-icon">${icon}</span><span>${U.escHtml(label)}</span>
      </button>`;
    }).join('');
    bottomBar.querySelectorAll('.view-nav-btn').forEach(btn =>
      btn.addEventListener('click', () => selectMemberTab(btn.dataset.member)));
  }
}

function selectMemberTab(value) {
  if (value === '') {
    // 点「全部」→ 清空所有选中
    selMembers.length = 0;
  } else {
    toggleSel(selMembers, value);
  }
  renderMemberTabs();        // 同步高亮
  updateViewResetBtns();
  loadAndRender();
}

// ─── 类型胶囊（多选）─────────────────────────────────────────────
function renderTypePills() {
  const row = document.getElementById('type-filter-row'); if (!row) return;
  // 保留最左侧的重置按钮和分隔线，追加类型胶囊
  const existingBtns = row.querySelectorAll('.filter-pill');
  existingBtns.forEach(b => b.remove());

  U.CLOTHING_TYPES.forEach(t => {
    const label = `${t.icon} ${t.key}`;
    const btn = document.createElement('button');
    btn.className = `filter-pill${selTypes.includes(t.key) ? ' active' : ''}`;
    btn.dataset.key = t.key;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      toggleSel(selTypes, t.key);
      btn.classList.toggle('active', selTypes.includes(t.key));
      updateViewResetBtns();
      loadAndRender();
    });
    row.appendChild(btn);
  });
}

// ─── 季节胶囊（多选）─────────────────────────────────────────────
function renderSeasonPills() {
  const row = document.getElementById('season-status-row'); if (!row) return;
  // 清除旧的季节胶囊（保留分隔线和状态胶囊和收藏胶囊）
  row.querySelectorAll('.season-pill').forEach(b => b.remove());

  const divider = document.getElementById('season-status-divider');
  U.SEASONS.forEach(s => {
    const label = `${SEASON_ICONS[s]} ${s}`;
    const btn = document.createElement('button');
    btn.className = `filter-pill season-pill${selSeasons.includes(s) ? ' active' : ''}`;
    btn.dataset.key = s;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      toggleSel(selSeasons, s);
      btn.classList.toggle('active', selSeasons.includes(s));
      updateViewResetBtns();
      loadAndRender();
    });
    row.insertBefore(btn, divider);
  });
}

// ─── 状态胶囊（多选）─────────────────────────────────────────────
function renderStatusPills() {
  const row = document.getElementById('season-status-row'); if (!row) return;
  row.querySelectorAll('.status-pill').forEach(b => b.remove());

  const favDivider = document.getElementById('fav-divider');
  ['在用', '闲置', '已淘汰'].forEach(s => {
    const label = `${STATUS_ICONS[s]} ${s}`;
    const btn = document.createElement('button');
    btn.className = `filter-pill status-pill${selStatuses.includes(s) ? ' active' : ''}`;
    btn.dataset.key = s;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      toggleSel(selStatuses, s);
      btn.classList.toggle('active', selStatuses.includes(s));
      updateViewResetBtns();
      loadAndRender();
    });
    row.insertBefore(btn, favDivider);
  });
}

// ─── 收藏胶囊 ─────────────────────────────────────────────────────
function initFavPill() {
  ['fav-pill-desktop'].forEach(id => {
    const btn = document.getElementById(id); if (!btn) return;
    btn.addEventListener('click', () => {
      selFav = !selFav;
      btn.classList.toggle('active', selFav);
      updateViewResetBtns();
      loadAndRender();
    });
  });
}

// ─── 重置按钮 ─────────────────────────────────────────────────────
function initResetBtns() {
  ['view-reset-btn-top', 'view-reset-btn-mobile'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', resetAllFilters);
  });
}

function resetAllFilters() {
  selMembers.length  = 0;
  selTypes.length    = 0;
  selSeasons.length  = 0;
  selStatuses.length = 0;
  selFav = false;
  // 同步胶囊视觉
  document.querySelectorAll('#type-filter-row .filter-pill').forEach(b =>
    b.classList.remove('active'));
  document.querySelectorAll('.season-pill,.status-pill').forEach(b =>
    b.classList.remove('active'));
  const favBtn = document.getElementById('fav-pill-desktop');
  if (favBtn) favBtn.classList.remove('active');
  renderMemberTabs();
  updateViewResetBtns();
  loadAndRender();
}

function updateViewResetBtns() {
  const hasActive = selMembers.length || selTypes.length ||
                    selSeasons.length || selStatuses.length || selFav;
  ['view-reset-btn-top', 'view-reset-btn-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('has-active', !!hasActive);
  });
  updateActiveTags();
}

// ─── 手机已选标签 ─────────────────────────────────────────────────
function updateActiveTags() {
  const wrap = document.getElementById('active-filter-tags'); if (!wrap) return;
  const tags = [
    ...selMembers.map(v  => ({ label: '👦 ' + v,               clear: () => { toggleSel(selMembers,  v); } })),
    ...selTypes.map(v    => ({ label: U.getTypeIcon(v) + ' ' + v, clear: () => { toggleSel(selTypes,   v); } })),
    ...selSeasons.map(v  => ({ label: SEASON_ICONS[v]  + ' ' + v, clear: () => { toggleSel(selSeasons, v); } })),
    ...selStatuses.map(v => ({ label: STATUS_ICONS[v]  + ' ' + v, clear: () => { toggleSel(selStatuses,v); } })),
    ...(selFav ? [{ label: '⭐ 收藏', clear: () => { selFav = false; } }] : [])
  ];
  wrap.innerHTML = tags.map((t, i) => `
    <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
      background:var(--primary);color:#fff;border-radius:var(--radius-full);
      font-size:0.78rem;font-weight:600;white-space:nowrap">
      ${U.escHtml(t.label)}
      <button data-tag-idx="${i}" style="background:none;border:none;color:#fff;
        cursor:pointer;font-size:0.78rem;padding:0">✕</button>
    </span>`).join('');
  wrap.querySelectorAll('[data-tag-idx]').forEach(btn =>
    btn.addEventListener('click', () => {
      tags[parseInt(btn.dataset.tagIdx)].clear();
      renderMemberTabs();
      renderTypePills();
      renderSeasonPills();
      renderStatusPills();
      updateViewResetBtns();
      loadAndRender();
    })
  );
}

// ─── 手机筛选 Bottom Sheet（多选版）──────────────────────────────
function initFilterSheet() {
  const overlay  = document.getElementById('filter-sheet-overlay');
  const sheet    = document.getElementById('filter-sheet');
  const openBtn  = document.getElementById('open-filter-sheet-btn');
  const closeBtn = document.getElementById('close-filter-sheet-btn');
  const resetBtn = document.getElementById('filter-sheet-reset-btn');
  const applyBtn = document.getElementById('filter-sheet-apply-btn');
  if (!overlay || !sheet) return;

  function openSheet() {
    sheetMembers  = [...selMembers];
    sheetTypes    = [...selTypes];
    sheetSeasons  = [...selSeasons];
    sheetStatuses = [...selStatuses];
    sheetFav      = selFav;
    renderSheetAll();
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
    sheetSeasons.length = 0; sheetStatuses.length = 0; sheetFav = false;
    renderSheetAll();
  });

  applyBtn?.addEventListener('click', () => {
    selMembers.length  = 0; selMembers.push(...sheetMembers);
    selTypes.length    = 0; selTypes.push(...sheetTypes);
    selSeasons.length  = 0; selSeasons.push(...sheetSeasons);
    selStatuses.length = 0; selStatuses.push(...sheetStatuses);
    selFav = sheetFav;
    renderMemberTabs();
    renderTypePills();
    renderSeasonPills();
    renderStatusPills();
    const favBtn = document.getElementById('fav-pill-desktop');
    if (favBtn) favBtn.classList.toggle('active', selFav);
    updateViewResetBtns();
    closeSheet();
    loadAndRender();
  });
}

function renderSheetAll() {
  renderViewSheetGroup('sheet-member-pills',
    allMembers.map(m => ({ label: '👦 ' + m.name, key: m.name })), sheetMembers);
  renderViewSheetGroup('sheet-type-pills',
    U.CLOTHING_TYPES.map(t => ({ label: t.icon + ' ' + t.key, key: t.key })), sheetTypes);
  renderViewSheetGroup('sheet-season-pills',
    U.SEASONS.map(s => ({ label: SEASON_ICONS[s] + ' ' + s, key: s })), sheetSeasons);
  renderViewSheetGroup('sheet-status-pills',
    ['在用','闲置','已淘汰'].map(s => ({ label: STATUS_ICONS[s] + ' ' + s, key: s })), sheetStatuses);

  // 收藏胶囊
  const favPill = document.getElementById('sheet-fav-pill');
  if (favPill) {
    favPill.classList.toggle('active', sheetFav);
    favPill.onclick = () => {
      sheetFav = !sheetFav;
      favPill.classList.toggle('active', sheetFav);
    };
  }
}

function renderViewSheetGroup(containerId, options, activeArr) {
  const wrap = document.getElementById(containerId); if (!wrap) return;
  wrap.innerHTML = options.map(o =>
    `<button class="filter-sheet-pill${activeArr.includes(o.key) ? ' active' : ''}"
      data-key="${U.escHtml(o.key)}">${U.escHtml(o.label)}</button>`).join('');
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

// ─── 构建筛选参数 ─────────────────────────────────────────────────
function buildViewParams() {
  const params = new URLSearchParams();
  if (selMembers.length)  params.set('member', selMembers.join(','));
  if (selTypes.length)    params.set('type',   selTypes.join(','));
  if (selSeasons.length)  params.set('season', selSeasons.join(','));
  if (selStatuses.length) params.set('status', selStatuses.join(','));
  if (selFav)             params.set('favorite', 'true');
  return params;
}

// ─── 加载 & 渲染 ──────────────────────────────────────────────────
async function loadAndRender() {
  const wrap = document.getElementById('clothes-grid-wrap');
  wrap.innerHTML = '<div class="loading-overlay"><div class="spinner"></div>加载中…</div>';
  document.getElementById('result-count').textContent = '';

  try {
    allClothes = await U.apiFetch('/api/clothes?' + buildViewParams().toString());
    // 只读端不显示已淘汰（客户端过滤）
    const visible = allClothes.filter(c => c.status !== '已淘汰');
    renderGrid(visible);
    document.getElementById('result-count').textContent =
      visible.length > 0 ? `共 ${visible.length} 件` : '';
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">加载失败：${U.escHtml(e.message)}</div>
    </div>`;
  }
}

function renderGrid(list) {
  const wrap = document.getElementById('clothes-grid-wrap');
  if (!list.length) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">👕</div>
      <div class="empty-state-text">暂时没有找到衣物 👕<br>
        <span style="font-size:0.85rem;color:var(--text-hint)">换个筛选条件试试？</span>
      </div>
    </div>`;
    return;
  }
  const grid = document.createElement('div');
  grid.className = 'clothes-grid';
  grid.innerHTML = list.map(item => U.renderClothesCard(item, true)).join('');
  wrap.innerHTML = '';
  wrap.appendChild(grid);

  grid.querySelectorAll('.clothes-card').forEach(card => {
    const mask = document.createElement('div');
    mask.className = 'clothes-card-hover-mask';
    mask.innerHTML = '<span>查看详情</span>';
    card.appendChild(mask);
    card.addEventListener('click', () => {
      const item = list.find(c => c.id === card.dataset.id);
      if (item) openDetailModal(item);
    });
  });
}

// ─── 详情弹窗 ─────────────────────────────────────────────────────
function initDetailModal() {
  document.getElementById('detail-modal-close')?.addEventListener('click', () => U.closeModal('detail-modal-overlay'));
  document.getElementById('detail-close-btn')?.addEventListener('click',  () => U.closeModal('detail-modal-overlay'));
  document.getElementById('detail-modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal-overlay'))
      U.closeModal('detail-modal-overlay');
  });
}

function openDetailModal(item) {
  document.getElementById('detail-modal-title').textContent =
    item.name || (U.getTypeIcon(item.clothingType) + ' ' + item.clothingType);
  const { photoHtml, fieldsHtml, notesHtml } = U.renderDetailContent(item, { showActions: false });
  document.getElementById('detail-photo-wrap').innerHTML = photoHtml;
  document.getElementById('detail-fields-wrap').innerHTML = fieldsHtml + notesHtml;
  U.openModal('detail-modal-overlay');
}
