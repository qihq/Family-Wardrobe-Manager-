export const CLOTHING_TYPES = ['上衣', '裤子', '鞋子', '外套', '内衣', '内裤', '其他'];
export const SEASONS = ['春', '夏', '秋', '冬', '四季'];
export const STATUSES = ['在用', '闲置', '已淘汰'];

const NAV_ITEMS = [
  { section: 'wardrobe', label: '衣橱', icon: '/public/island/assets/icons/icon-shopping.svg', admin: false },
  { section: 'add', label: '新增', icon: '/public/island/assets/icons/icon-camera.svg', admin: true },
  { section: 'members', label: '家庭成员', icon: '/public/island/assets/icons/icon-map.svg', admin: true },
  { section: 'stats', label: '统计', icon: '/public/island/assets/icons/icon-miles.svg', admin: true }
];

export function getNavItems(isAdmin) {
  return NAV_ITEMS.filter(item => isAdmin || !item.admin);
}

export const ASSETS = {
  shopping: '/public/island/assets/icons/icon-shopping.svg',
  empty: '/public/island/assets/icons/icon-variant.svg',
  detail: '/public/island/assets/icons/icon-design.svg',
  divider: '/public/island/assets/dividers/divider-line-teal.svg',
  wave: '/public/island/assets/dividers/wave-yellow.svg'
};
