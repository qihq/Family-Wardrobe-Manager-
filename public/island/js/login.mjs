import { api } from './api.mjs';
import { safeNextPath } from './auth.mjs';

const form = document.getElementById('standalone-login-form');
const password = document.getElementById('login-password');
const error = document.getElementById('login-error');
const submit = form.querySelector('button[type="submit"]');
const next = safeNextPath(new URLSearchParams(location.search).get('next'));

api.getAuth().then(result => {
  if (result.isAdmin) location.replace(next);
}).catch(() => {});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!password.value) {
    error.textContent = '请输入管理密码';
    password.focus();
    return;
  }
  error.textContent = '';
  submit.disabled = true;
  submit.textContent = '正在进入…';
  try {
    await api.login(password.value);
    location.replace(next);
  } catch (reason) {
    error.textContent = reason.message;
    password.select();
    submit.disabled = false;
    submit.textContent = '进入管理模式';
  }
});
