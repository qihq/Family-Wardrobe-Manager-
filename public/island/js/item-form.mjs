import { CLOTHING_TYPES, SEASONS, STATUSES } from './constants.mjs';

export function validateItem(values) {
  const errors = {};
  if (!values.member) errors.member = '请选择家庭成员';
  if (!values.clothingType) errors.clothingType = '请选择衣物类型';
  return errors;
}

export function buildItemFormData(values, blobs = {}) {
  const formData = new FormData();
  const normalized = {
    ...values,
    seasons: JSON.stringify(values.seasons || []),
    favorite: values.favorite ? 'true' : 'false'
  };
  ['member', 'clothingType', 'name', 'size', 'color', 'brand', 'status', 'notes', 'seasons', 'favorite']
    .forEach(key => formData.append(key, normalized[key] ?? ''));
  if (blobs.display) formData.append('photo', blobs.display, 'photo.jpg');
  if (blobs.thumb) formData.append('thumb', blobs.thumb, 'thumb.jpg');
  return formData;
}

export function nextMobileStep(step, values) {
  if (step === 1 && !values.clothingType) return 1;
  return Math.min(step + 1, 2);
}

function formMarkup() {
  return `<header class="section-heading"><div><p class="section-kicker">管理衣橱</p><h1 id="item-form-title">新增衣物</h1><p class="section-summary">拍照归档，让每件衣物都有位置。</p></div></header>
    <form id="item-form" class="item-form island-panel" novalidate>
      <div class="mobile-stepper" aria-label="新增衣物步骤"><span data-step-dot="0">照片</span><span data-step-dot="1">分类</span><span data-step-dot="2">详情</span></div>
      <section class="form-photo mobile-step" data-step-panel="0">
        <label class="upload-zone" for="item-photo"><img src="/public/island/assets/icons/icon-camera.svg" alt=""><strong>拍照或选择图片</strong><span>自动生成展示图和缩略图</span><input id="item-photo" type="file" accept="image/*" capture="environment"></label>
        <div id="item-preview" class="item-preview"></div><p id="compress-status" role="status"></p>
      </section>
      <section class="form-fields mobile-step" data-step-panel="1">
        <fieldset><legend>衣物类型 <span aria-hidden="true">*</span></legend><div class="type-choice">${CLOTHING_TYPES.map(type => `<label class="choice-tile"><input type="radio" name="clothingType" value="${type}"><span>${type}</span></label>`).join('')}</div><p class="field-error" data-error="clothingType"></p></fieldset>
        <fieldset><legend>适穿季节</legend><div class="choice-row">${SEASONS.map(season => `<label class="check-pill"><input type="checkbox" name="seasons" value="${season}"><span>${season}</span></label>`).join('')}</div></fieldset>
      </section>
      <section class="form-fields mobile-step" data-step-panel="2">
        <div class="field-grid"><label>家庭成员 *<select class="island-field" name="member" required></select><span class="field-error" data-error="member"></span></label><label>衣物名称<input class="island-field" name="name"></label><label>尺码<input class="island-field" name="size"></label><label>颜色<input class="island-field" name="color"></label><label>品牌<input class="island-field" name="brand"></label><label>状态<select class="island-field" name="status">${STATUSES.map(status => `<option>${status}</option>`).join('')}</select></label></div>
        <label>备注<textarea class="island-field" name="notes" rows="4"></textarea></label><label class="check-pill favorite-choice"><input type="checkbox" name="favorite"><span>标记为收藏</span></label>
      </section>
      <div class="form-actions"><button class="island-button step-back" type="button">上一步</button><button class="island-button step-next" type="button">下一步</button><button class="island-button island-button--primary form-submit" type="submit">保存衣物</button></div>
    </form>`;
}

export function createItemFormController({ root, store, api, onSaved, notify, handleUnauthorized }) {
  root.innerHTML = formMarkup();
  const form = root.querySelector('#item-form');
  const fileInput = form.querySelector('#item-photo');
  const preview = form.querySelector('#item-preview');
  const compressStatus = form.querySelector('#compress-status');
  let editingItem = null;
  let blobs = { display: null, thumb: null };
  let previewUrl = null;
  let step = 0;
  let busy = false;

  function values() {
    const data = new FormData(form);
    return {
      member: data.get('member') || '', clothingType: data.get('clothingType') || '',
      name: data.get('name') || '', size: data.get('size') || '', color: data.get('color') || '',
      brand: data.get('brand') || '', status: data.get('status') || '在用', notes: data.get('notes') || '',
      seasons: data.getAll('seasons'), favorite: data.get('favorite') === 'on'
    };
  }

  function showStep(next) {
    step = Math.max(0, Math.min(2, next));
    form.querySelectorAll('[data-step-panel]').forEach(panel => panel.classList.toggle('is-current', Number(panel.dataset.stepPanel) === step));
    form.querySelectorAll('[data-step-dot]').forEach(dot => dot.classList.toggle('is-current', Number(dot.dataset.stepDot) === step));
    form.querySelector('.step-back').hidden = step === 0;
    form.querySelector('.step-next').hidden = step === 2;
    form.querySelector('.form-submit').hidden = step !== 2;
  }

  function populateMembers() {
    const select = form.elements.member;
    const current = select.value;
    select.innerHTML = '<option value="">请选择</option>' + store.getState().members.map(member => `<option value="${member.name}">${member.name}</option>`).join('');
    select.value = current;
  }

  function setFormValue(name, value) {
    const elements = form.querySelectorAll(`[name="${name}"]`);
    elements.forEach(element => {
      if (element.type === 'radio') element.checked = element.value === value;
      else if (element.type === 'checkbox') element.checked = Array.isArray(value) ? value.includes(element.value) : Boolean(value);
      else element.value = value ?? '';
    });
  }

  function reset(item = null) {
    form.reset(); editingItem = item; blobs = { display: null, thumb: null };
    if (previewUrl) URL.revokeObjectURL(previewUrl); previewUrl = null;
    preview.innerHTML = ''; compressStatus.textContent = '';
    populateMembers();
    document.getElementById('item-form-title').textContent = item ? '编辑衣物' : '新增衣物';
    form.querySelector('.form-submit').textContent = item ? '保存修改' : '保存衣物';
    if (item) {
      ['member','clothingType','name','size','color','brand','status','notes','seasons','favorite'].forEach(key => setFormValue(key, item[key]));
      const image = item.photoPath || item.thumbPath;
      if (image) preview.innerHTML = `<img src="${image}" alt="当前衣物图片">`;
    }
    showStep(0);
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { notify('请选择图片文件', 'error'); fileInput.value = ''; return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file); preview.innerHTML = `<img src="${previewUrl}" alt="待上传衣物预览">`;
    compressStatus.textContent = '正在优化图片…'; busy = true;
    try { blobs = await window.WardrobeUtils.compressBoth(file); }
    catch { blobs = { display: file, thumb: file }; notify('图片优化失败，将使用原图', 'error'); }
    finally { busy = false; compressStatus.textContent = ''; }
  });
  form.querySelector('.step-back').addEventListener('click', () => showStep(step - 1));
  form.querySelector('.step-next').addEventListener('click', () => {
    const next = nextMobileStep(step, values());
    if (next === step) { form.querySelector('[data-error="clothingType"]').textContent = '请选择衣物类型'; return; }
    showStep(next);
  });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (busy) return notify('请等待图片优化完成', 'error');
    const formValues = values(); const errors = validateItem(formValues);
    form.querySelectorAll('[data-error]').forEach(element => { element.textContent = errors[element.dataset.error] || ''; });
    if (Object.keys(errors).length) { if (errors.clothingType) showStep(1); return; }
    const submit = form.querySelector('.form-submit'); submit.disabled = true; submit.textContent = '保存中…';
    try {
      const saved = editingItem ? await api.updateClothes(editingItem.id, buildItemFormData(formValues, blobs)) : await api.createClothes(buildItemFormData(formValues, blobs));
      notify(editingItem ? '修改已保存' : '衣物已保存', 'success'); reset(); await onSaved(saved);
    } catch (error) { if (!handleUnauthorized(error)) notify(error.message, 'error'); }
    finally { submit.disabled = false; submit.textContent = editingItem ? '保存修改' : '保存衣物'; }
  });
  store.subscribe(populateMembers);
  reset();
  return { open(item = null) { reset(item); }, reset, submit: () => form.requestSubmit(), destroy() { if (previewUrl) URL.revokeObjectURL(previewUrl); } };
}
