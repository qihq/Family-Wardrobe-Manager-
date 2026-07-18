'use strict';

(function initUiPreference(global) {
  const KEY = 'wardrobe_ui_v1';
  const ISLAND_PATHS = {
    '/classic/view': '/view',
    '/classic/admin': '/admin',
    '/classic/admin/login': '/admin/login'
  };

  function switchTo(ui) {
    const preference = ui === 'classic' ? 'classic' : 'island';
    localStorage.setItem(KEY, preference);
    const url = new URL(global.location.href);
    if (preference === 'island') url.pathname = ISLAND_PATHS[url.pathname] || '/view';
    url.searchParams.delete('ui');
    global.location.assign(url.pathname + url.search + url.hash);
  }

  global.WardrobeUiPreference = { switchTo };
})(window);
