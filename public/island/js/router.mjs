const FILTER_KEYS = ['member', 'type', 'season', 'status'];
const ADMIN_SECTIONS = new Set(['add', 'members', 'stats']);
const SECTIONS = new Set(['wardrobe', ...ADMIN_SECTIONS]);

const splitValues = value => value ? value.split(',').map(item => item.trim()).filter(Boolean) : [];

export function parseRoute(search = '') {
  const params = new URLSearchParams(search);
  const section = SECTIONS.has(params.get('section')) ? params.get('section') : 'wardrobe';
  const filters = {
    q: params.get('q') || '',
    member: splitValues(params.get('member')),
    type: splitValues(params.get('type')),
    season: splitValues(params.get('season')),
    status: splitValues(params.get('status')),
    favorite: params.get('favorite') === 'true'
  };
  return {
    section,
    filters,
    sort: {
      field: params.get('sort') || 'createdAt',
      direction: params.get('direction') === 'asc' ? 'asc' : 'desc'
    }
  };
}

export function serializeRoute(route) {
  const params = new URLSearchParams();
  if (route.section && route.section !== 'wardrobe') params.set('section', route.section);
  if (route.filters?.q) params.set('q', route.filters.q);
  FILTER_KEYS.forEach(key => {
    if (route.filters?.[key]?.length) params.set(key, route.filters[key].join(','));
  });
  if (route.filters?.favorite) params.set('favorite', 'true');
  if (route.sort?.field && route.sort.field !== 'createdAt') params.set('sort', route.sort.field);
  if (route.sort?.direction === 'asc') params.set('direction', 'asc');
  return params.toString();
}

export function isAllowedSection(section, isAdmin) {
  return SECTIONS.has(section) && (isAdmin || !ADMIN_SECTIONS.has(section));
}

export function createNavigator({ getRoute, onNavigate }) {
  return function navigate(patch = {}, { replace = false } = {}) {
    const current = getRoute();
    const next = {
      ...current,
      ...patch,
      filters: { ...current.filters, ...(patch.filters || {}) },
      sort: { ...current.sort, ...(patch.sort || {}) }
    };
    const query = serializeRoute(next);
    history[replace ? 'replaceState' : 'pushState']({}, '', location.pathname + (query ? `?${query}` : ''));
    onNavigate(next);
    return next;
  };
}
