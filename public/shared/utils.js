'use strict';

/* ═══════════════════════════════════════════════════════════════
   衣橱管理系统 · 公共工具函数
   ═══════════════════════════════════════════════════════════════ */

const CLOTHING_TYPES = [
  { key: '上衣', icon: '👕' },
  { key: '裤子', icon: '👖' },
  { key: '鞋子', icon: '👟' },
  { key: '外套', icon: '🧥' },
  { key: '内衣', icon: '🩱' },
  { key: '内裤', icon: '🩲' },
  { key: '其他', icon: '📦' }
];

const SEASONS     = ['春', '夏', '秋', '冬', '四季'];
const STATUS_LIST = ['在用', '闲置', '已淘汰'];
const STATUS_BADGE_CLASS = {
  '在用':   'badge-success',
  '闲置':   'badge-warning',
  '已淘汰': 'badge-danger'
};

/* ─── 季节匹配（四季 = 全季）──────────────────────────────────── */
function matchSeason(itemSeasons, querySeason) {
  if (!querySeason) return true;
  if (!itemSeasons || itemSeasons.length === 0) return false;
  if (itemSeasons.includes('四季')) return true;
  return itemSeasons.includes(querySeason);
}

/* ═══════════════════════════════════════════════════════════════
   优化一：Canvas 图片压缩
   ═══════════════════════════════════════════════════════════════ */

/**
 * 压缩图片
 * @param {File|Blob} file       原始图片文件
 * @param {number}    maxEdge   长边最大像素（超过则等比缩放，不超过不放大）
 * @param {number}    quality   JPEG 质量 0~1
 * @returns {Promise<Blob>}     压缩后的 JPEG Blob
 */
function compressImage(file, maxEdge, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // 等比缩放，长边不超过 maxEdge，不放大
      if (width > maxEdge || height > maxEdge) {
        if (width >= height) {
          height = Math.round(height * maxEdge / width);
          width  = maxEdge;
        } else {
          width  = Math.round(width * maxEdge / height);
          height = maxEdge;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('canvas toBlob failed')),
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片加载失败')); };
    img.src = url;
  });
}

/**
 * 将原始 File 同时压缩为展示图和缩略图
 * @param {File} file
 * @returns {Promise<{display: Blob, thumb: Blob}>}
 */
async function compressBoth(file) {
  const [display, thumb] = await Promise.all([
    compressImage(file, 1200, 0.85),
    compressImage(file, 400,  0.80)
  ]);
  return { display, thumb };
}

/* ─── API ────────────────────────────────────────────────────── */
async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `请求失败 (${res.status})`);
  return data;
}

async function apiUpload(url, formData, method = 'POST') {
  const res = await fetch(url, { method, body: formData });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `上传失败 (${res.status})`);
  return data;
}

/* ─── Toast ──────────────────────────────────────────────────── */
function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

/* ─── Modal ──────────────────────────────────────────────────── */
function openModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) { el.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
}
function bindOverlayClose(overlayId) {
  const el = document.getElementById(overlayId);
  if (!el) return;
  el.addEventListener('click', e => { if (e.target === el) closeModal(overlayId); });
}

/* ─── 渲染工具 ───────────────────────────────────────────────── */
function getTypeIcon(key) {
  const t = CLOTHING_TYPES.find(t => t.key === key);
  return t ? t.icon : '📦';
}
function renderStatusBadge(status) {
  const cls = STATUS_BADGE_CLASS[status] || 'badge-neutral';
  return `<span class="badge ${cls}">${escHtml(status)}</span>`;
}
function renderSeasonBadge(seasons) {
  if (!seasons || !seasons.length) return '';
  return `<span class="badge badge-season">${seasons.join(' ')}</span>`;
}
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * 渲染缩略图 img 或占位符
 * 优先用 thumbPath，fallback photoPath，旧数据兼容
 */
function renderThumb(item, cls = 'table-thumb') {
  const src = item.thumbPath || item.photoPath;
  if (src)
    return `<img src="${escHtml(src)}" class="${cls}" alt="${escHtml(item.name)}" loading="lazy">`;
  return `<div class="${cls === 'table-thumb' ? 'table-thumb-placeholder' : 'clothes-card-img-placeholder'}">${getTypeIcon(item.clothingType)}</div>`;
}

/**
 * 衣物卡片（列表/网格）— 缩略图优先
 * showFavStar: 是否显示收藏角标
 */
function renderClothesCard(item, showFavStar = true) {
  // 卡片用缩略图，fallback 原图
  const cardSrc = item.thumbPath || item.photoPath;
  const imgHtml = cardSrc
    ? `<img src="${escHtml(cardSrc)}" class="clothes-card-img" alt="${escHtml(item.name)}" loading="lazy">`
    : `<div class="clothes-card-img-placeholder">${getTypeIcon(item.clothingType)}</div>`;

  const favStar = showFavStar && item.favorite
    ? `<div class="favorite-star">⭐</div>` : '';

  const sizeBadge = item.size
    ? `<div><span class="size-badge">${escHtml(item.size)}</span></div>` : '';

  const seasonHtml = item.seasons && item.seasons.length
    ? `<span class="badge badge-season" style="font-size:0.68rem">${item.seasons.join(' ')}</span>` : '';

  return `
    <div class="clothes-card" data-id="${escHtml(item.id)}">
      ${imgHtml}
      ${favStar}
      <div class="clothes-card-body">
        <div class="clothes-card-name">${escHtml(item.name || item.clothingType)}</div>
        ${sizeBadge}
        <div class="clothes-card-meta">
          <span>${escHtml(item.clothingType)}</span>
          ${item.color ? `<span>· ${escHtml(item.color)}</span>` : ''}
          ${seasonHtml}
        </div>
      </div>
    </div>`;
}

/**
 * 详情面板内容（admin + view 共用）
 * 详情用原图 photoPath，fallback thumbPath
 */
function renderDetailContent(item, { showActions = false } = {}) {
  // 详情用原图
  const detailSrc = item.photoPath || item.thumbPath;
  const photoHtml = detailSrc
    ? `<img src="${escHtml(detailSrc)}" alt="${escHtml(item.name || item.clothingType)}">`
    : `<div class="detail-photo-placeholder">${getTypeIcon(item.clothingType)}</div>`;

  const seasonHtml = item.seasons && item.seasons.length
    ? item.seasons.map(s => `<span class="badge badge-season">${escHtml(s)}</span>`).join(' ')
    : '—';

  const sizeHtml = item.size
    ? `<span class="size-badge-lg">${escHtml(item.size)}</span>`
    : '<span style="color:var(--text-hint)">—</span>';

  const fields = [
    { label: '适用人员', value: item.member },
    { label: '衣物类型', value: getTypeIcon(item.clothingType) + ' ' + item.clothingType },
    { label: '尺码',     html:  sizeHtml },
    { label: '颜色',     value: item.color || '—' },
    { label: '品牌',     value: item.brand || '—' },
    { label: '状态',     html:  renderStatusBadge(item.status) },
    { label: '适穿季节', html:  seasonHtml },
    { label: '收藏',     html:  item.favorite ? '⭐ 已收藏' : '—' },
    { label: '录入日期', value: formatDate(item.createdAt) }
  ];

  const fieldsHtml = `<div class="detail-fields">
    ${fields.map(f => `
      <div class="detail-field">
        <label>${escHtml(f.label)}</label>
        <span>${f.html || escHtml(f.value)}</span>
      </div>`).join('')}
  </div>`;

  const notesHtml = item.notes
    ? `<div class="detail-notes">备注：${escHtml(item.notes)}</div>` : '';

  const actionsHtml = showActions ? `
    <div class="admin-detail-actions">
      <button class="btn btn-outline" id="detail-edit-btn">✏️ 编辑</button>
      <button class="btn btn-danger"  id="detail-delete-btn">🗑️ 删除</button>
    </div>` : '';

  return { photoHtml, fieldsHtml, notesHtml, actionsHtml };
}

/* ─── 季节 checkbox 组 ───────────────────────────────────────── */
function renderSeasonBtns(containerId, selected = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = SEASONS.map(s => `
    <label class="season-checkbox-label">
      <input type="checkbox" class="season-checkbox" value="${s}"${selected.includes(s) ? ' checked' : ''}> ${s}
    </label>`).join('');
}
function getSelectedSeasons(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('.season-checkbox:checked')).map(cb => cb.value);
}
function setSelectedSeasons(containerId, seasons = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.querySelectorAll('.season-checkbox').forEach(cb => {
    cb.checked = seasons.includes(cb.value);
  });
}

/* ═══════════════════════════════════════════════════════════════
   优化一：带压缩的上传区初始化
   替换原 initUploadArea，压缩完成后回调返回 {display, thumb}
   ═══════════════════════════════════════════════════════════════ */

/**
 * 初始化上传区（含图片压缩）
 * onFile(file)        — 原始 File 选中时立即预览
 * onCompressed(blobs) — 压缩完成回调 blobs: {display, thumb} | null
 * processingEl        — 压缩中提示元素（可选）
 */
function initUploadArea(areaEl, inputEl, previewEl, onFile, onCompressed, processingEl) {
  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    // 立即显示原图预览
    const reader = new FileReader();
    reader.onload = e => {
      previewEl.innerHTML = `
        <div class="upload-preview">
          <img src="${e.target.result}" alt="预览">
          <button class="upload-preview-clear" title="移除">✕</button>
        </div>`;
      previewEl.querySelector('.upload-preview-clear').addEventListener('click', () => {
        previewEl.innerHTML = '';
        inputEl.value = '';
        if (onFile)       onFile(null);
        if (onCompressed) onCompressed(null);
      });
    };
    reader.readAsDataURL(file);
    if (onFile) onFile(file);

    // 开始压缩
    if (processingEl) {
      processingEl.innerHTML = `<div class="upload-processing"><div class="spinner"></div>正在优化图片…</div>`;
    }

    compressBoth(file).then(blobs => {
      if (processingEl) processingEl.innerHTML = '';
      if (onCompressed) onCompressed(blobs);
    }).catch(err => {
      console.warn('图片压缩失败，使用原图:', err);
      if (processingEl) processingEl.innerHTML = '';
      // 压缩失败 fallback 原图
      if (onCompressed) onCompressed({ display: file, thumb: file });
    });
  }

  inputEl.addEventListener('change', () => {
    if (inputEl.files[0]) handleFile(inputEl.files[0]);
  });
  areaEl.addEventListener('dragover',  e => { e.preventDefault(); areaEl.classList.add('dragover'); });
  areaEl.addEventListener('dragleave', () => areaEl.classList.remove('dragover'));
  areaEl.addEventListener('drop', e => {
    e.preventDefault(); areaEl.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      try { const dt = new DataTransfer(); dt.items.add(file); inputEl.files = dt.files; } catch {}
      handleFile(file);
    }
  });
}

/* ─── FormData 构建（支持 display + thumb 双 Blob）─────────────── */
/**
 * @param {object} fields        文字字段
 * @param {Blob|null}   displayBlob  展示图 Blob
 * @param {Blob|null}   thumbBlob    缩略图 Blob
 */
function buildClothesFormData(fields, displayBlob, thumbBlob) {
  const fd = new FormData();
  const order = ['member','clothingType','name','size','color','brand','status','notes','seasons','favorite'];
  order.forEach(k => { if (fields[k] !== undefined) fd.append(k, fields[k]); });
  if (displayBlob) fd.append('photo', displayBlob, 'photo.jpg');
  if (thumbBlob)   fd.append('thumb', thumbBlob,   'thumb.jpg');
  return fd;
}

/* ─── 全局导出 ───────────────────────────────────────────────── */
window.WardrobeUtils = {
  CLOTHING_TYPES, SEASONS, STATUS_LIST, STATUS_BADGE_CLASS,
  matchSeason,
  compressImage, compressBoth,
  apiFetch, apiUpload, showToast,
  openModal, closeModal, bindOverlayClose,
  getTypeIcon, renderStatusBadge, renderSeasonBadge,
  renderClothesCard, renderDetailContent, renderThumb,
  escHtml, formatDate,
  initUploadArea, buildClothesFormData,
  renderSeasonBtns, getSelectedSeasons, setSelectedSeasons
};
