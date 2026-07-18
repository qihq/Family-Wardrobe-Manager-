import { escapeHtml } from './render.mjs';

export function initMembers({ root, store, api, notify, handleUnauthorized, reloadAll, confirm }) {
  root.innerHTML = `<header class="section-heading"><div><p class="section-kicker">家庭档案</p><h1>家庭成员</h1><p class="section-summary">统一管理衣物所属成员。</p></div></header><div class="members-layout"><form id="member-form" class="member-add island-panel"><label for="member-name">新增成员</label><div><input id="member-name" class="island-field" name="name" required><button class="island-button island-button--primary" type="submit">添加</button></div><p class="field-error" role="alert"></p></form><div id="member-list" class="member-list"></div></div>`;
  const list = root.querySelector('#member-list');
  function render(state) {
    list.innerHTML = state.members.map(member => `<article class="member-row island-panel" data-member-id="${escapeHtml(member.id)}"><div><strong>${escapeHtml(member.name)}</strong><span>${state.clothes.filter(item => item.member === member.name).length} 件衣物</span></div><div><button class="island-button" type="button" data-action="rename">重命名</button><button class="island-button danger-button" type="button" data-action="delete">删除</button></div></article>`).join('');
  }
  root.querySelector('#member-form').addEventListener('submit', async event => {
    event.preventDefault(); const input = event.currentTarget.elements.name; const name = input.value.trim();
    const error = event.currentTarget.querySelector('.field-error'); error.textContent = '';
    if (!name) return error.textContent = '请输入成员姓名';
    if (store.getState().members.some(member => member.name === name)) return error.textContent = '该成员已存在';
    try { await api.createMember(name); input.value = ''; await reloadAll(); notify('成员已添加', 'success'); }
    catch (apiError) { if (!handleUnauthorized(apiError)) error.textContent = apiError.message; }
  });
  list.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]'); if (!button) return;
    const member = store.getState().members.find(item => item.id === button.closest('[data-member-id]').dataset.memberId); if (!member) return;
    try {
      if (button.dataset.action === 'rename') {
        const name = prompt('新的成员姓名', member.name)?.trim();
        if (!name || name === member.name) return;
        if (store.getState().members.some(item => item.name === name)) return notify('该成员已存在', 'error');
        await api.updateMember(member.id, name); notify('成员名称已更新', 'success');
      } else {
        if (!await confirm(`确定删除「${member.name}」吗？`)) return;
        await api.deleteMember(member.id); notify('成员已删除', 'success');
      }
      await reloadAll();
    } catch (error) { if (!handleUnauthorized(error)) notify(error.message, 'error'); }
  });
  const unsubscribe = store.subscribe(render); render(store.getState());
  return { destroy: unsubscribe };
}
