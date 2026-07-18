let installPrompt = null;
const installButtons = Array.from(document.querySelectorAll('[data-install-app]'));

function updateInstallButtons({ available = false, installed = false } = {}) {
  installButtons.forEach(button => {
    button.disabled = !available;
    button.querySelector('span').textContent = installed ? '已安装应用' : available ? '安装应用' : '安装暂不可用';
    if (installed) button.hidden = true;
  });
}

updateInstallButtons({ installed: matchMedia('(display-mode: standalone)').matches });

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  updateInstallButtons({ available: true });
});

installButtons.forEach(button => button.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  updateInstallButtons();
}));

window.addEventListener('appinstalled', () => updateInstallButtons({ installed: true }));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {}));
}
