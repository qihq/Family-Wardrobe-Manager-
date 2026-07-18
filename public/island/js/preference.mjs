export const UI_PREFERENCE_KEY = 'wardrobe_ui_v1';

const CLASSIC = new Map([
  ['/view', '/classic/view'],
  ['/admin', '/classic/admin'],
  ['/admin/login', '/classic/admin/login']
]);
const ISLAND = new Map(Array.from(CLASSIC, ([island, classic]) => [classic, island]));

export const normalizeUi = value => value === 'classic' ? 'classic' : 'island';

function mappedUrl(url, pathname) {
  const next = new URL(url);
  next.pathname = pathname;
  next.searchParams.delete('ui');
  return next.pathname + next.search + next.hash;
}

export const toClassicPath = url => mappedUrl(url, CLASSIC.get(url.pathname) || '/classic/view');
export const toIslandPath = url => mappedUrl(url, ISLAND.get(url.pathname) || '/view');

export function resolveUiTarget({ url, storedPreference }) {
  const explicit = url.searchParams.get('ui');
  const preference = explicit === 'classic' || explicit === 'island'
    ? explicit
    : normalizeUi(storedPreference);
  if (preference === 'classic' && CLASSIC.has(url.pathname)) return toClassicPath(url);
  if (preference === 'island' && ISLAND.has(url.pathname)) return toIslandPath(url);
  return null;
}
