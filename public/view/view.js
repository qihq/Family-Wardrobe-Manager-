'use strict';

const U = window.WardrobeUtils;

const SEASON_ICONS = { '春': '🌸', '夏': '☀️', '秋': '🍂', '冬': '❄️', '四季': '🌈' };
const STATUS_ICONS = { '在用': '✅', '闲置': '📦', '已淘汰': '🗑️' };

let allMembers  = [];
let allClothes  = [];   // 当前筛选后的衣物列表（含已淘汰，view 端自行过滤）
let statsClothes = [];  // 统计用全量数据（不过滤已淘汰）

// ─── 多选筛选状态 ─────────────────────────────────────────────────
let selMembers  = [];
let selTypes    = [];
let selSeasons  = [];
let selStatuses = [];
let selFav      = false;
let searchKw    = '';   // 搜索关键词

// 手机 Sheet 临时状态
let sheetMembers  = [];
let sheetTypes    = [];
let sheetSeasons  = [];
let sheetStatuses = [];
let sheetFav      = false;
let sheetKw       = '';

// ─── 统计 Tab 状态 ────────────────────────────────────────────────
let showStats = false;

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
  initSearch();
  initFilterSheet();
  initDetailModal();
  initStatDetail();
  await loadAndRender();
});

/* ════════════════════════════════════════════════════════════════
   人员 Tab（含统计 Tab）
   ════════════════════════════════════════════════════════════════ */
async function loadMembers() {
  try { allMembers = await U.apiFetch('/api/members'); } catch { allMembers = []; }
}

function renderMemberTabs() {
  const tabs = [
    { name: '全部', value: '' },
    ...allMembers.map(m => ({ name: m.name, value: m.name }))
  ];

  // 桌面顶部 Tab
  const topBar = document.getElementById('member-tabs-top');
  if (topBar) {
    topBar.innerHTML = [
      ...tabs.map(t => {
        const isActive = t.value === ''
          ? (!showStats && selMembers.length === 0)
          : (!showStats && selMembers.includes(t.value));
        return `<button class="view-member-tab${isActive ? ' active' : ''}"
          data-member="${U.escHtml(t.value)}" style="white-space:nowrap;flex-shrink:0">
          ${t.value === '' ? '👕 全部' : `👦 ${U.escHtml(t.name)}`}
        </button>`;
      }),
      // 统计 Tab
      `<button class="view-member-tab${showStats ? ' active' : ''}"
        data-stats="true" style="white-space:nowrap;flex-shrink:0">📊 统计</button>`
    ].join('');

    topBar.querySelectorAll('[data-member]').forEach(btn =>
      btn.addEventListener('click', () => clickMemberTab(btn.dataset.member)));
    topBar.querySelector('[data-stats]')?.addEventListener('click', () => clickStatsTab());
  }

  // 手机底部 Tab
  const bottomBar = document.getElementById('member-tab-bar');
  if (bottomBar) {
    bottomBar.innerHTML = [
      ...tabs.map(t => {
        const isActive = t.value === ''
          ? (!showStats && selMembers.length === 0)
          : (!showStats && selMembers.includes(t.value));
        return `<button class="view-nav-btn${isActive ? ' active' : ''}"
          data-member="${U.escHtml(t.value)}">
          <span class="nav-icon">${t.value === '' ? '👕' : '👦'}</span>
          <span>${U.escHtml(t.name)}</span>
        </button>`;
      }),
      // 统计 Tab
      `<button class="view-nav-btn${showStats ? ' active' : ''}" data-stats="true">
        <span class="nav-icon">📊</span><span>统计</span>
      </button>`
    ].join('');

    bottomBar.querySelectorAll('[data-member]').forEach(btn =>
      btn.addEventListener('click', () => clickMemberTab(btn.dataset.member)));
    bottomBar.querySelector('[data-stats]')?.addEventListener('click', () => clickStatsTab());
  }
}

function clickMemberTab(value) {
  showStats = false;
  if (value === '') {
    selMembers.length = 0;
  } else {
    toggleSel(selMembers, value);
  }
  toggleStatsPanel(false);
  renderMemberTabs();
  updateResetBtns();
  loadAndRender();
}

function clickStatsTab() {
  showStats = true;
  toggleStatsPanel(true);
  renderMemberTabs();
  loadStatsData();
}

function toggleStatsPanel(open) {
  const resultsSection = document.getElementById('results-section');
  const filterBar      = document.getElementById('view-filter-bar');
  const mobileBar      = document.getElementById('mobile-filter-bar');
  const statsPanel     = document.getElementById('view-stats-panel');

  if (open) {
    if (resultsSection) resultsSection.style.display = 'none';
    if (filterBar)      filterBar.style.display      = 'none';
    if (mobileBar)      mobileBar.style.display      = 'none';
    if (statsPanel)     statsPanel.classList.add('open');
  } else {
    if (resultsSection) resultsSection.style.display = '';
    if (filterBar)      filterBar.style.display      = '';
    if (mobileBar)      mobileBar.style.display      = '';
    if (statsPanel)     statsPanel.classList.remove('open');
    document.getElementById('view-stat-detail-panel')?.classList.remove('open');
  }
}

/* ════════════════════════════════════════════════════════════════
   统计概览
   ════════════════════════════════════════════════════════════════ */
async function loadStatsData() {
  const grid = document.getElementById('view-stat-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-overlay"><div class="spinner"></div>加载中…</div>';

  try {
    // 全量数据，不带任何筛选参数
    statsClothes = await U.apiFetch('/api/clothes');
    renderStats();
  } catch (e) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">加载失败：${U.escHtml(e.message)}</div></div>`;
  }
}

function renderStats() {
  const grid = document.getElementById('view-stat-grid');
  if (!grid) return;

  const list    = statsClothes;
  const total   = list.length;
  const inUse   = list.filter(c => c.status === '在用').length;
  const idle    = list.filter(c => c.status === '闲置').length;
  const retired = list.filter(c => c.status === '已淘汰').length;
  const favCnt  = list.filter(c => c.favorite === true).length;

  const byMember = {};
  list.forEach(c => { byMember[c.member] = (byMember[c.member] || 0) + 1; });

  const byType = {};
  U.CLOTHING_TYPES.forEach(t => { byType[t.key] = 0; });
  list.forEach(c => { byType[c.clothingType] = (byType[c.clothingType] || 0) + 1; });

  const bySeason = Object.fromEntries(U.SEASONS.map(s => [s, 0]));
  list.forEach(c => (c.seasons || []).forEach(s => { if (bySeason[s] !== undefined) bySeason[s]++; }));

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

function initStatDetail() {
  document.getElementById('view-stat-detail-close')?.addEventListener('click', () =>
    document.getElementById('view-stat-detail-panel')?.classList.remove('open'));
}

function showStatDetail(card) {
  const panel     = document.getElementById('view-stat-detail-panel');
  const titleEl   = document.getElementById('view-stat-detail-title-text');
  const detailGrid = document.getElementById('view-stat-detail-grid');
  if (!panel || !titleEl || !detailGrid) return;

  titleEl.textContent = `${card.label}（${card.num} 件）`;
  panel.classList.add('open');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 从全量数据本地过滤，不重新请求
  const f = card.filter;
  let list = [...statsClothes];
  if (f.member)   list = list.filter(c => c.member === f.member);
  if (f.type)     list = list.filter(c => c.clothingType === f.type);
  if (f.status)   list = list.filter(c => c.status === f.status);
  if (f.season)   list = list.filter(c => U.matchSeason(c.seasons, f.season));
  if (f.favorite) list = list.filter(c => c.favorite === true);

  if (!list.length) {
    detailGrid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👕</div><div class="empty-state-text">暂无衣物</div></div>';
    return;
  }

  detailGrid.innerHTML = list.map(item => U.renderClothesCard(item, true)).join('');
  detailGrid.querySelectorAll('.clothes-card').forEach(card => {
    card.addEventListener('click', () => {
      const item = list.find(c => c.id === card.dataset.id);
      if (item) openDetailModal(item);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
   筛选胶囊
   ════════════════════════════════════════════════════════════════ */

function renderTypePills() {
  const row = document.getElementById('type-filter-row');
  if (!row) return;

  const resetBtn   = document.getElementById('view-reset-btn-top');
  const divider    = row.querySelector('.filter-divider');
  const srchDiv    = document.getElementById('type-search-divider');
  const srchInput  = document.getElementById('view-search-desktop');
  row.innerHTML = '';
  if (resetBtn)  row.appendChild(resetBtn);
  if (divider)   row.appendChild(divider);

  U.CLOTHING_TYPES.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (selTypes.includes(t.key) ? ' active' : '');
    btn.dataset.type = t.key;
    btn.textContent = t.icon + ' ' + t.key;
    btn.style.flexShrink = '0';
    btn.addEventListener('click', () => {
      toggleSel(selTypes, t.key);
      btn.classList.toggle('active', selTypes.includes(t.key));
      updateResetBtns();
      loadAndRender();
    });
    row.appendChild(btn);
  });

  if (srchDiv)   row.appendChild(srchDiv);
  if (srchInput) row.appendChild(srchInput);
}

function renderSeasonPills() {
  const row = document.getElementById('season-status-row');
  if (!row) return;
  const divider    = document.getElementById('season-status-divider');
  const favDivider = document.getElementById('fav-divider');

  row.querySelectorAll('[data-season]').forEach(el => el.remove());

  U.SEASONS.forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (selSeasons.includes(s) ? ' active' : '');
    btn.dataset.season = s;
    btn.textContent = SEASON_ICONS[s] + ' ' + s;
    btn.style.flexShrink = '0';
    btn.addEventListener('click', () => {
      toggleSel(selSeasons, s);
      btn.classList.toggle('active', selSeasons.includes(s));
      updateResetBtns();
      loadAndRender();
    });
    row.insertBefore(btn, divider);
  });

  renderStatusPills();
}

function renderStatusPills() {
  const row = document.getElementById('season-status-row');
  if (!row) return;
  const favDivider = document.getElementById('fav-divider');

  row.querySelectorAll('[data-status]').forEach(el => el.remove());

  ['在用', '闲置', '已淘汰'].forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'filter-pill' + (selStatuses.includes(s) ? ' active' : '');
    btn.dataset.status = s;
    btn.textContent = STATUS_ICONS[s] + ' ' + s;
    btn.style.flexShrink = '0';
    btn.addEventListener('click', () => {
      toggleSel(selStatuses, s);
      btn.classList.toggle('active', selStatuses.includes(s));
      updateResetBtns();
      loadAndRender();
    });
    row.insertBefore(btn, favDivider);
  });
}

function initFavPill() {
  const btn = document.getElementById('fav-pill-desktop');
  if (btn) {
    btn.addEventListener('click', () => {
      selFav = !selFav;
      btn.classList.toggle('active', selFav);
      updateResetBtns();
      loadAndRender();
    });
  }
}

/* ════════════════════════════════════════════════════════════════
   搜索框
   ════════════════════════════════════════════════════════════════ */
function initSearch() {
  let timer;
  const desktopInput = document.getElementById('view-search-desktop');
  if (desktopInput) {
    desktopInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        searchKw = desktopInput.value.trim();
        updateResetBtns();
        renderFilteredGrid();
      }, 350);
    });
  }
  // 手机搜索框的防抖在 Sheet apply 时同步，不需要即时触发
}

/* ════════════════════════════════════════════════════════════════
   重置
   ════════════════════════════════════════════════════════════════ */
function initResetBtns() {
  ['view-reset-btn-top', 'view-reset-btn-mobile'].forEach(id =>
    document.getElementById(id)?.addEventListener('click', resetAllFilters));
}

function resetAllFilters() {
  selMembers.length  = 0;
  selTypes.length    = 0;
  selSeasons.length  = 0;
  selStatuses.length = 0;
  selFav = false;
  searchKw = '';
  const si = document.getElementById('view-search-desktop');
  if (si) si.value = '';
  document.getElementById('fav-pill-desktop')?.classList.remove('active');
  renderMemberTabs();
  renderTypePills();
  renderSeasonPills();
  updateResetBtns();
  loadAndRender();
}

function updateResetBtns() {
  const hasActive = selMembers.length || selTypes.length ||
                    selSeasons.length || selStatuses.length || selFav || searchKw;
  ['view-reset-btn-top', 'view-reset-btn-mobile'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('has-active', !!hasActive);
  });
  updateActiveFilterTags();
}

function updateActiveFilterTags() {
  const wrap = document.getElementById('active-filter-tags');
  if (!wrap) return;
  const tags = [
    ...selMembers.map(v  => ({ label: '👦 ' + v,                 clear: () => { toggleSel(selMembers,  v); } })),
    ...selTypes.map(v    => ({ label: U.getTypeIcon(v) + ' ' + v, clear: () => { toggleSel(selTypes,   v); } })),
    ...selSeasons.map(v  => ({ label: SEASON_ICONS[v]  + ' ' + v, clear: () => { toggleSel(selSeasons, v); } })),
    ...selStatuses.map(v => ({ label: STATUS_ICONS[v]  + ' ' + v, clear: () => { toggleSel(selStatuses,v); } })),
    ...(selFav ? [{ label: '⭐ 收藏', clear: () => { selFav = false; document.getElementById('fav-pill-desktop')?.classList.remove('active'); } }] : []),
    ...(searchKw ? [{ label: '🔍 ' + searchKw, clear: () => { searchKw = ''; const si = document.getElementById('view-search-desktop'); if (si) si.value = ''; } }] : [])
  ];
  wrap.innerHTML = tags.map((t, i) => `
    <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;
      background:var(--primary);color:#fff;border-radius:var(--radius-full);
      font-size:0.78rem;font-weight:600;white-space:nowrap">
      ${U.escHtml(t.label)}
      <button data-tag-idx="${i}" style="background:none;border:none;color:#fff;
        cursor:pointer;font-size:0.78rem;padding:0;line-height:1">✕</button>
    </span>`).join('');
  wrap.querySelectorAll('[data-tag-idx]').forEach(btn =>
    btn.addEventListener('click', () => {
      tags[parseInt(btn.dataset.tagIdx)].clear();
      renderMemberTabs();
      renderTypePills();
      renderSeasonPills();
      updateResetBtns();
      loadAndRender();
    })
  );
}

/* ════════════════════════════════════════════════════════════════
   加载 & 渲染
   ════════════════════════════════════════════════════════════════ */

// 构建接口请求参数（筛选维度）
function buildParams() {
  const params = new URLSearchParams();
  if (selMembers.length)  params.set('member', selMembers.join(','));
  if (selTypes.length)    params.set('type',   selTypes.join(','));
  if (selSeasons.length)  params.set('season', selSeasons.join(','));
  if (selStatuses.length) params.set('status', selStatuses.join(','));
  if (selFav)             params.set('favorite', 'true');
  // 搜索关键词传给后端（后端覆盖所有文本字段）
  if (searchKw)           params.set('q', searchKw);
  return params;
}

async function loadAndRender() {
  if (showStats) return; // 统计模式不加载衣物列表

  const wrap = document.getElementById('clothes-grid-wrap');
  if (!wrap) return;
  wrap.innerHTML = '<div class="loading-overlay"><div class="spinner"></div>加载中…</div>';
  document.getElementById('result-count').textContent = '';

  try {
    allClothes = await U.apiFetch('/api/clothes?' + buildParams().toString());
    // View 端：状态筛选未选时，过滤已淘汰；若用户主动选了状态则不过滤
    const visible = selStatuses.length
      ? allClothes
      : allClothes.filter(c => c.status !== '已淘汰');
    renderGrid(visible);
    document.getElementById('result-count').textContent = visible.length > 0 ? `共 ${visible.length} 件` : '';
  } catch (e) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">⚠️</div>
      <div class="empty-state-text">加载失败：${U.escHtml(e.message)}</div>
    </div>`;
  }
}

// 仅重新渲染本地已有数据（搜索关键词变化时直接本地过滤，无需重新请求）
function renderFilteredGrid() {
  if (!allClothes.length && !searchKw) return;
  const kw = searchKw.toLowerCase();
  const filtered = allClothes.filter(c => {
    if (!kw) return true;
    return (
      (c.name         && c.name.toLowerCase().includes(kw))         ||
      (c.clothingType && c.clothingType.toLowerCase().includes(kw)) ||
      (c.member       && c.member.toLowerCase().includes(kw))       ||
      (c.size         && c.size.toLowerCase().includes(kw))         ||
      (c.color        && c.color.toLowerCase().includes(kw))        ||
      (c.brand        && c.brand.toLowerCase().includes(kw))        ||
      (c.status       && c.status.toLowerCase().includes(kw))       ||
      (c.notes        && c.notes.toLowerCase().includes(kw))
    );
  });
  const visible = selStatuses.length ? filtered : filtered.filter(c => c.status !== '已淘汰');
  renderGrid(visible);
  document.getElementById('result-count').textContent = visible.length > 0 ? `共 ${visible.length} 件` : '';
}

function renderGrid(list) {
  const wrap = document.getElementById('clothes-grid-wrap');
  if (!wrap) return;
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

/* ════════════════════════════════════════════════════════════════
   手机 Bottom Sheet（多选）
   ════════════════════════════════════════════════════════════════ */
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
    sheetKw       = searchKw;
    const msi = document.getElementById('view-search-mobile');
    if (msi) msi.value = sheetKw;
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
    sheetFav = false; sheetKw = '';
    const msi = document.getElementById('view-search-mobile');
    if (msi) msi.value = '';
    renderSheetPills();
  });

  applyBtn?.addEventListener('click', () => {
    // 同步手机搜索框关键词
    const msi = document.getElementById('view-search-mobile');
    if (msi) sheetKw = msi.value.trim();

    selMembers.length  = 0; selMembers.push(...sheetMembers);
    selTypes.length    = 0; selTypes.push(...sheetTypes);
    selSeasons.length  = 0; selSeasons.push(...sheetSeasons);
    selStatuses.length = 0; selStatuses.push(...sheetStatuses);
    selFav   = sheetFav;
    searchKw = sheetKw;

    const dsi = document.getElementById('view-search-desktop');
    if (dsi) dsi.value = searchKw;
    document.getElementById('fav-pill-desktop')?.classList.toggle('active', selFav);

    renderMemberTabs();
    renderTypePills();
    renderSeasonPills();
    updateResetBtns();
    closeSheet();
    loadAndRender();
  });
}

function renderSheetPills() {
  renderSheetGroup('sheet-member-pills',
    allMembers.map(m => ({ label: '👦 ' + m.name, key: m.name })), sheetMembers);
  renderSheetGroup('sheet-type-pills',
    U.CLOTHING_TYPES.map(t => ({ label: t.icon + ' ' + t.key, key: t.key })), sheetTypes);
  renderSheetGroup('sheet-season-pills',
    U.SEASONS.map(s => ({ label: SEASON_ICONS[s] + ' ' + s, key: s })), sheetSeasons);
  renderSheetGroup('sheet-status-pills',
    ['在用','闲置','已淘汰'].map(s => ({ label: STATUS_ICONS[s] + ' ' + s, key: s })), sheetStatuses);

  const favPill = document.getElementById('sheet-fav-pill');
  if (favPill) {
    favPill.classList.toggle('active', sheetFav);
    favPill.onclick = () => { sheetFav = !sheetFav; favPill.classList.toggle('active', sheetFav); };
  }
}

function renderSheetGroup(containerId, options, activeArr) {
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

/* ════════════════════════════════════════════════════════════════
   详情弹窗（只读，无编辑/删除）
   ════════════════════════════════════════════════════════════════ */
function initDetailModal() {
  document.getElementById('detail-modal-close')?.addEventListener('click', () => U.closeModal('detail-modal-overlay'));
  document.getElementById('detail-close-btn')?.addEventListener('click',   () => U.closeModal('detail-modal-overlay'));
  document.getElementById('detail-modal-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('detail-modal-overlay')) U.closeModal('detail-modal-overlay');
  });
}

function openDetailModal(item) {
  document.getElementById('detail-modal-title').textContent =
    item.name || (U.getTypeIcon(item.clothingType) + ' ' + item.clothingType);
  const { photoHtml, fieldsHtml, notesHtml } = U.renderDetailContent(item, { showActions: false });
  document.getElementById('detail-photo-wrap').innerHTML  = photoHtml;
  document.getElementById('detail-fields-wrap').innerHTML = fieldsHtml + notesHtml;
  U.openModal('detail-modal-overlay');
}
