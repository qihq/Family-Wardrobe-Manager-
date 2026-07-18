# Animal Island UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a new default Animal Island-inspired wardrobe UI alongside the unchanged classic UI, with one responsive application for browsing and authenticated management.

**Architecture:** Keep Express, JSON storage, photo storage, and existing API contracts. Serve a native ES-module application from `public/island/`; canonical routes serve it, while `/classic/*` routes retain existing files. Pure frontend modules use Node's test runner, and server tests use temporary data and photo directories.

**Tech Stack:** Node.js 18, Express 4, native HTML/CSS/JavaScript ES modules, `node:test`, Browser/IAB or Playwright, Docker/NAS without a frontend build step.

## Global Constraints

- Preserve API contracts, JSON schemas, sessions, image compression, Docker, and NAS compatibility.
- Do not add React, a bundler, a database, a required network font, or a frontend build command.
- Never overwrite NAS `data/`, `photos/`, or deployed `config.json`.
- First visit uses Island UI; `wardrobe_ui_v1` stores `island` or `classic`.
- Keep `/view`, `/admin`, `/admin/login`; classic aliases are `/classic/view`, `/classic/admin`, `/classic/admin/login`.
- Breakpoints: mobile below 768 px, tablet 768-1023 px, desktop 1024 px and wider.
- New UI has no system emoji. Copied assets retain `guokaigdg/animal-island-ui` attribution and CC BY-NC 4.0 terms for non-commercial use.
- Do not copy Nintendo trademarks, characters, logos, or screenshots.
- Run mutations only against disposable test data, never workspace or NAS data.

## File Structure

- `server.js`: app factory, path overrides, canonical/classic routes, normal CLI start.
- `test/helpers/server-fixture.js`: temporary data/photo server and cookie-aware requester.
- `test/server-api.test.js`, `test/server-routes.test.js`: API and route regression.
- `test/island-routing.test.js`, `island-state.test.js`, `island-render.test.js`, `island-assets.test.js`: frontend module tests.
- `public/island/index.html`: semantic shell and overlays.
- `public/island/styles/{tokens,base,app,responsive}.css`: tokens, primitives, features, viewports.
- `public/island/js/{constants,preference,router,state,api,render,overlay,auth,wardrobe,item-form,members,stats,app}.mjs`: focused modules.
- `public/island/assets/{fonts,icons,dividers}/`: licensed local assets.
- `scripts/vendor-animal-island-assets.ps1`: pinned reproducible asset download.
- `THIRD_PARTY_NOTICES.md`: source, license, modifications, inventory.
- `public/shared/ui-preference.js`: classic/new switch helper.
- Classic files receive only route/switch compatibility edits.
- `docs/deployment-program-files.md`, `docs/qa/animal-island-ui-fidelity-ledger.md`: deployment and QA evidence.

---

### Task 1: Isolate the Server and Lock Existing API Behavior

**Files:**
- Modify: `server.js:10`
- Modify: `server.js:106`
- Modify: `server.js:331`
- Modify: `package.json`
- Create: `package-lock.json`
- Create: `test/helpers/server-fixture.js`
- Create: `test/server-api.test.js`

**Interfaces:**
- Produces `createWardrobeApp(options): Express.Application`; options accept `config`, `dataDir`, `photoBaseDir`, `logger`.
- Produces `startServerFixture(t, seed): Promise<{baseUrl,request,paths}>`; `request` retains a session cookie.
- Preserves all `/api/*` contracts and `node server.js` startup.

- [ ] **Step 1: Write the failing regression test**

Seed two members/clothes and assert visitor filters, unauthorized mutation,
login, create, favorite, edit, delete, member rename cascade, and occupied
member delete rejection. The clothing lifecycle test starts with:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { startServerFixture } = require('./helpers/server-fixture');

test('visitor filters and admin completes clothing mutations', async t => {
  const fx = await startServerFixture(t, {
    members: [{ id:'m1', name:'小明' }, { id:'m2', name:'小花' }],
    clothes: [
      { id:'c1', name:'雨衣', clothingType:'外套', member:'小明', status:'在用', seasons:['春'], favorite:false, createdAt:'2026-01-02T00:00:00.000Z' },
      { id:'c2', name:'凉鞋', clothingType:'鞋子', member:'小花', status:'闲置', seasons:['夏'], favorite:true, createdAt:'2026-01-01T00:00:00.000Z' }
    ]
  });
  let response = await fx.request('/api/clothes?member=小明&type=外套');
  assert.deepEqual((await response.json()).map(item => item.id), ['c1']);
  assert.equal((await fx.request('/api/clothes/c1/favorite', { method:'PATCH' })).status, 401);
  assert.equal((await fx.request('/api/login', { method:'POST', json:{ password:'test-password' } })).status, 200);
  const form = new FormData();
  Object.entries({ member:'小明', clothingType:'上衣', name:'条纹衫', status:'在用', seasons:'["四季"]' }).forEach(([k,v]) => form.set(k,v));
  const created = await (await fx.request('/api/clothes', { method:'POST', body:form })).json();
  assert.equal((await (await fx.request(`/api/clothes/${created.id}/favorite`, { method:'PATCH' })).json()).favorite, true);
  assert.deepEqual(await (await fx.request(`/api/clothes/${created.id}`, { method:'DELETE' })).json(), { success:true });
  assert.equal(JSON.parse(fs.readFileSync(fx.paths.wardrobeFile, 'utf8')).some(item => item.id === created.id), false);
});
```

- [ ] **Step 2: Run it and verify failure**

Run: `node --test test/server-api.test.js`

Expected: FAIL with `Cannot find module './helpers/server-fixture'`.

- [ ] **Step 3: Implement factory and fixture**

Move setup, Multer, middleware, and routes inside:

```js
function createWardrobeApp(options = {}) {
  const runtimeConfig = options.config || JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
  const dataDir = path.resolve(options.dataDir || process.env.WARDROBE_DATA_DIR || path.join(__dirname,'data'));
  const photoBaseDir = path.resolve(options.photoBaseDir || process.env.WARDROBE_PHOTO_DIR || runtimeConfig.photoBaseDir || './photos');
  const logger = options.logger || console;
  const wardrobeFile = path.join(dataDir,'wardrobe.json');
  const membersFile = path.join(dataDir,'members.json');
  // Existing behavior uses these locals, then returns app.
  return app;
}
if (require.main === module) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname,'config.json'),'utf8'));
  const port = Number(process.env.PORT || config.port || 3000);
  createWardrobeApp({ config }).listen(port, () => console.log(`衣橱管理系统已启动: http://localhost:${port}`));
}
module.exports = { createWardrobeApp, parseMultiParam, matchSeasons };
```

The fixture uses `fs.mkdtempSync`, seeds both JSON files, calls `app.listen(0)`,
and cleans up in `t.after`. Its requester sets JSON content type only for
`options.json`, passes `FormData` unchanged, and captures `set-cookie`.

Set scripts to:

```json
"test": "node --test test/*.test.js",
"check": "node --check server.js && node --test test/*.test.js"
```

Generate the missing lock file without changing dependency ranges:

Run: `npm install --package-lock-only`

Expected: `package-lock.json` is created for the existing four runtime dependencies.

- [ ] **Step 4: Run tests and commit**

Run: `npm test`

Expected: API tests PASS and workspace `data/*.json` hashes are unchanged.

```powershell
git add server.js package.json package-lock.json test/helpers/server-fixture.js test/server-api.test.js
git commit -m "test: isolate wardrobe API regression coverage"
```

### Task 2: Add Canonical Island Routes and Classic Aliases

**Files:**
- Modify: `server.js:119`
- Create: `public/island/index.html`
- Create: `public/island/js/preference.mjs`
- Create: `public/shared/ui-preference.js`
- Create: `test/server-routes.test.js`
- Create: `test/island-routing.test.js`

**Interfaces:**
- Produces `UI_PREFERENCE_KEY`, `normalizeUi`, `toClassicPath`, `toIslandPath`, `resolveUiTarget`.
- Produces global `WardrobeUiPreference.switchTo(ui)` for classic pages.
- Canonical paths serve Island; classic aliases retain current auth.

- [ ] **Step 1: Write failing route/preference tests**

Assert canonical HTML has `data-ui="island"`; classic view has
`data-ui="classic"`; logged-out classic admin redirects to classic login;
logged-in classic admin succeeds. Test state retention:

```js
test('classic preference preserves filters', async () => {
  const { resolveUiTarget } = await import('../public/island/js/preference.mjs');
  assert.equal(resolveUiTarget({ url:new URL('http://x/view?member=小明'), storedPreference:'classic' }), '/classic/view?member=%E5%B0%8F%E6%98%8E');
  assert.equal(resolveUiTarget({ url:new URL('http://x/classic/view?ui=island&type=外套'), storedPreference:'classic' }), '/view?type=%E5%A4%96%E5%A5%97');
});
```

- [ ] **Step 2: Verify missing-route failure**

Run: `node --test test/server-routes.test.js test/island-routing.test.js`

Expected: FAIL because Island files/aliases do not exist.

- [ ] **Step 3: Implement exact mapping and routes**

```js
export const UI_PREFERENCE_KEY = 'wardrobe_ui_v1';
const CLASSIC = new Map([['/view','/classic/view'],['/admin','/classic/admin'],['/admin/login','/classic/admin/login']]);
const ISLAND = new Map(Array.from(CLASSIC, ([island,classic]) => [classic,island]));
export const normalizeUi = value => value === 'classic' ? 'classic' : 'island';
function mappedUrl(url, pathname) { const next=new URL(url); next.pathname=pathname; next.searchParams.delete('ui'); return next.pathname+next.search+next.hash; }
export const toClassicPath = url => mappedUrl(url, CLASSIC.get(url.pathname) || '/classic/view');
export const toIslandPath = url => mappedUrl(url, ISLAND.get(url.pathname) || '/view');
export function resolveUiTarget({ url, storedPreference }) {
  const explicit=url.searchParams.get('ui');
  const preference=explicit==='classic'||explicit==='island' ? explicit : normalizeUi(storedPreference);
  if (preference==='classic' && CLASSIC.has(url.pathname)) return toClassicPath(url);
  if (preference==='island' && ISLAND.has(url.pathname)) return toIslandPath(url);
  return null;
}
```

Canonical routes serve Island without auth redirect; Island reveals admin
features after session check. Classic admin keeps server auth. Island's head
stores explicit `ui`, calls `resolveUiTarget`, and uses `location.replace` only
for a non-null target.

- [ ] **Step 4: Test and commit**

Run: `node --test test/server-routes.test.js test/island-routing.test.js`

Expected: auth, preservation, and no-loop cases PASS.

```powershell
git add server.js public/island/index.html public/island/js/preference.mjs public/shared/ui-preference.js test/server-routes.test.js test/island-routing.test.js
git commit -m "feat: add island and classic UI routing"
```

### Task 3: Vendor Assets and Build Visual Foundations

**Files:**
- Create: `scripts/vendor-animal-island-assets.ps1`
- Create: `public/island/assets/fonts/*`
- Create: `public/island/assets/icons/*`
- Create: `public/island/assets/dividers/*`
- Create: `public/island/styles/tokens.css`
- Create: `public/island/styles/base.css`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `test/island-assets.test.js`

**Interfaces:**
- Produces local assets with no runtime network dependency.
- Produces `--island-*` tokens and `.island-button`, `.island-field`, `.island-pill`, `.island-panel`, `.island-icon-button`, `.sr-only`.

- [ ] **Step 1: Write failing inventory test**

Require nine source WOFF2 fonts; icons `icon-leaf.png`, `icon-shopping.svg`,
`icon-camera.svg`, `icon-map.svg`, `icon-miles.svg`, `icon-design.svg`,
`icon-variant.svg`; dividers `divider-line-brown.svg`, `divider-line-teal.svg`,
`divider-line-yellow.svg`, `wave-yellow.svg`. Verify nonzero files and notice
text: repository URL, `guokaigdg`, `CC BY-NC 4.0`, `non-commercial`, `modified`.

- [ ] **Step 2: Verify missing assets**

Run: `node --test test/island-assets.test.js`

Expected: FAIL listing absent assets.

- [ ] **Step 3: Implement pinned vendor script and run it**

Pin commit `1d61a384ca395552afe34930aef78549374d9f9e`. Download only the
inventory from `raw.githubusercontent.com/guokaigdg/animal-island-ui` under
`src/assets/`; create directories, reject zero bytes, print each path.

Run: `powershell -ExecutionPolicy Bypass -File scripts/vendor-animal-island-assets.ps1`

Expected: 20 asset lines, exit 0.

- [ ] **Step 4: Implement exact tokens/fonts/primitives/notices**

```css
:root {
  --island-primary:#19c8b9; --island-primary-hover:#3dd4c6; --island-primary-active:#50b9ab;
  --island-primary-soft:#e6f9f6; --island-success:#6fba2c; --island-warning:#f5c31c;
  --island-danger:#e05a5a; --island-text:#794f27; --island-muted:#9f927d;
  --island-border:#aaa69d; --island-border-light:#e8e2d6; --island-page:#f8f8f0;
  --island-surface:#f7f3df; --island-surface-alt:#f0e8d8;
  --island-radius-sm:16px; --island-radius:18px; --island-radius-lg:24px;
  --island-shadow-sm:0 2px 4px rgba(61,52,40,.06); --island-shadow:0 3px 10px rgba(61,52,40,.1);
  --island-shadow-lg:0 8px 24px rgba(61,52,40,.14); --island-normal:250ms;
  --island-ease:cubic-bezier(.4,0,.2,1);
}
```

Add Nunito 500/700/900 and Noto Sans SC 400/500/700 Latin then Chinese
subsets. Controls have 44 px targets, 2 px focus, visible labels, AA contrast,
no emoji. Notice records exact inventory, pinned commit, link, modifications,
non-commercial restriction, and no Nintendo endorsement.

- [ ] **Step 5: Verify and commit**

Run: `node --test test/island-assets.test.js`

Expected: PASS; no external asset URL in Island CSS/HTML.

```powershell
git add scripts/vendor-animal-island-assets.ps1 public/island/assets public/island/styles THIRD_PARTY_NOTICES.md test/island-assets.test.js
git commit -m "feat: vendor animal island design assets"
```

### Task 4: Implement State, Router, API, Shell, Auth, and Overlays

**Files:**
- Create: `public/island/js/constants.mjs`
- Create: `public/island/js/router.mjs`
- Create: `public/island/js/state.mjs`
- Create: `public/island/js/api.mjs`
- Create: `public/island/js/overlay.mjs`
- Create: `public/island/js/auth.mjs`
- Create: `public/island/js/app.mjs`
- Modify: `public/island/index.html`
- Create: `public/island/styles/app.css`
- Create: `public/island/styles/responsive.css`
- Create: `test/island-state.test.js`
- Create: `test/island-render.test.js`
- Extend: `test/island-routing.test.js`

**Interfaces:**
- Produces `parseRoute`, `serializeRoute`, `navigate`, `isAllowedSection`.
- Produces `createStore(initialState)` with `getState`, `setState`, `subscribe`.
- Produces auth/clothes/member API methods and `ApiError(status,payload)`.
- Produces `createOverlay(element)` with `open(trigger)`, `close`, `destroy`.
- Produces shell anchors `#sidebar-nav`, `#tablet-nav`, `#mobile-nav`, `#main-view`, `#login-dialog`, `#filter-drawer`, `#detail-dialog`, `#confirm-dialog`, `#toast-region`.

- [ ] **Step 1: Write failing module/shell tests**

Cover Unicode multi-filter round trip, visitor route guard, immutable store
notification, `ApiError.status`, shell anchors, local styles, module entry, no
inline handler/emoji, and visitor/admin navigation inventory.

```js
test('route round-trips multi filters', async () => {
  const { parseRoute, serializeRoute } = await import('../public/island/js/router.mjs');
  const route=parseRoute('?section=wardrobe&member=小明,小花&season=春&favorite=true&q=蓝色');
  assert.deepEqual(route.filters.member,['小明','小花']);
  assert.equal(parseRoute('?'+serializeRoute(route)).filters.q,'蓝色');
});
```

- [ ] **Step 2: Verify missing modules**

Run: `node --test test/island-routing.test.js test/island-state.test.js test/island-render.test.js`

Expected: FAIL on missing exports/anchors.

- [ ] **Step 3: Implement stable state/router/API**

```js
export const initialState={
  auth:{status:'checking',isAdmin:false},
  route:{section:'wardrobe',filters:{q:'',member:[],type:[],season:[],status:[],favorite:false},sort:{field:'createdAt',direction:'desc'}},
  members:[],clothes:[],loading:{clothes:false,mutation:false},selectedItemId:null,
  requestVersion:0,notice:null
};
export class ApiError extends Error {
  constructor(message,status,payload={}) { super(message); this.name='ApiError'; this.status=status; this.payload=payload; }
}
```

Set JSON content type only for JSON; preserve FormData/abort signals. URL uses
`section` plus existing filter names. Popstate restores state.

- [ ] **Step 4: Implement shell/auth/overlays**

Load tokens/base/app/responsive then `app.mjs`. Desktop sidebar 232 px and main
max 1440 px; tablet sticky 64 px top rail; mobile 60 px top and safe-area
bottom navigation. Check `/api/auth/check`; never trust classic login storage.
Visitor sees Wardrobe/login; admin sees Wardrobe/Add/Members/Stats. On 401,
remove admin UI and offer login.

Overlays trap Tab, close on Escape/backdrop, lock scroll, restore trigger focus.
Toasts use `role=status`, errors `role=alert`. Include exact breakpoint queries
and a `prefers-reduced-motion` rule setting animation/transition to `.01ms`.

- [ ] **Step 5: Test and commit**

Run: `npm test`

Expected: all tests PASS; `/view` renders visitor shell, failed login is
announced, correct password reveals admin navigation.

```powershell
git add public/island/index.html public/island/styles public/island/js test/island-routing.test.js test/island-state.test.js test/island-render.test.js
git commit -m "feat: build responsive island application shell"
```

### Task 5: Implement Wardrobe Browsing and Shared Item Details

**Files:**
- Create: `public/island/js/render.mjs`
- Create: `public/island/js/wardrobe.mjs`
- Modify: `public/island/index.html`
- Modify: `public/island/styles/app.css`
- Modify: `public/island/styles/responsive.css`
- Extend: `test/island-render.test.js`

**Interfaces:**
- Produces `renderClothesCard(item,{isAdmin})`, `renderItemDetail`, `renderActiveFilters`, `renderCollectionState`.
- Produces `initWardrobe({root,store,api,overlays,navigate})`.

- [ ] **Step 1: Write failing safe-render tests**

Assert escaped malicious text, `thumbPath || photoPath`, 4:5 media, image alt,
visitor/admin action separation, no emoji, labelled filter-removal buttons, and
dedicated loading/empty/filter-empty/error/broken-image states.

- [ ] **Step 2: Verify renderer failure**

Run: `node --test test/island-render.test.js`

Expected: FAIL on missing render exports.

- [ ] **Step 3: Implement renderers and controller**

Use `textContent` for user content where possible and one `escapeHtml` for
strings. Do not nest interactive elements. Parse URL filters, debounce search
250 ms, abort previous request, ignore stale responses, keep member/type
shortcuts visible, move season/status/favorite into More Filters, update
history, and share one detail overlay. Favorite refreshes list/detail without
clearing filters. Admin actions render only when `auth.isAdmin`.

The request replacement logic must use one controller/version pair:

```js
let controller;
async function loadClothes(filters) {
  controller?.abort();
  controller = new AbortController();
  const version = store.getState().requestVersion + 1;
  store.setState(state => ({ ...state, requestVersion:version, loading:{...state.loading,clothes:true} }));
  try {
    const clothes = await api.getClothes(filters, controller.signal);
    if (store.getState().requestVersion !== version) return;
    store.setState(state => ({ ...state, clothes, loading:{...state.loading,clothes:false} }));
  } catch (error) {
    if (error.name !== 'AbortError' && store.getState().requestVersion === version) renderLoadError(error);
  }
}
```

- [ ] **Step 4: Implement responsive list layout**

Mobile uses one column. Tablet uses `repeat(auto-fill,minmax(220px,1fr))`.
Desktop uses `repeat(auto-fill,minmax(230px,1fr))` capped at five columns in
1440 px. Photos use `aspect-ratio:4/5; object-fit:cover`; management actions
stay out of the visual card body.

- [ ] **Step 5: Test visitor flow and commit**

Run: `npm test`

Browser: search, multi-member, type, More Filters, back/forward, detail,
broken image, reset. Expected: URL/state synchronized, latest request wins,
focus returns to card, and layout stays stable.

```powershell
git add public/island/js/render.mjs public/island/js/wardrobe.mjs public/island/index.html public/island/styles/app.css public/island/styles/responsive.css test/island-render.test.js
git commit -m "feat: add island wardrobe browsing"
```

### Task 6: Implement Item Forms, Members, and Statistics

**Files:**
- Modify: `public/shared/utils.js:33`
- Create: `public/island/js/item-form.mjs`
- Create: `public/island/js/members.mjs`
- Create: `public/island/js/stats.mjs`
- Modify: `public/island/index.html`
- Modify: `public/island/styles/app.css`
- Modify: `public/island/styles/responsive.css`
- Extend: `test/island-render.test.js`

**Interfaces:**
- Produces `validateItem`, `buildItemFormData`, `nextMobileStep`, `createItemFormController`.
- Reuses `WardrobeUtils.compressBoth(file)` and preserves classic globals.
- Produces `initMembers`, `deriveStats(clothes,members)`, `statsFilter(stat)`.

- [ ] **Step 1: Write failing feature tests**

Assert member/type validation; season JSON and favorite string FormData;
photo/thumb fields; mobile step block until type; totals for status/favorite/
member/type/season; `四季` counted only as stored; statistics-to-filter mapping;
and admin-only section rendering.

- [ ] **Step 2: Verify missing exports**

Run: `node --test --test-name-pattern="item form|mobile step|statistics|member management" test/island-render.test.js`

Expected: FAIL on missing modules.

- [ ] **Step 3: Implement add/edit and mobile camera flow**

Keep `window.WardrobeUtils`; load it before Island modules and reuse
`compressBoth` instead of duplicating canvas code. Use exact FormData keys:

```js
const order=['member','clothingType','name','size','color','brand','status','notes','seasons','favorite'];
order.forEach(key => formData.append(key, values[key] ?? ''));
if (blobs.display) formData.append('photo',blobs.display,'photo.jpg');
if (blobs.thumb) formData.append('thumb',blobs.thumb,'thumb.jpg');
```

Validate image type, revoke previews, show `正在优化图片…`, fall back to the
original file, disable duplicate submission, retain values on error, and
confirm dirty-form closure. Desktop/tablet is photo/form two-column. Mobile
steps are `照片`, `分类`, `详情`; backward navigation retains state. Edit without
new image preserves paths; replacement refreshes list/detail.

- [ ] **Step 4: Implement member CRUD and navigation-only statistics**

Validate trimmed unique names. Delete confirmation names the member. Keep
occupied-delete errors inline and scroll stable; refresh clothes after rename.
Statistics render summary controls only; clicking navigates to Wardrobe with
the exact filter and never renders a duplicate list.

- [ ] **Step 5: Test admin workflows and commit**

Run: `npm test`

At 390x844: complete add with image, move backward, submit once, edit with and
without image, rename member, verify occupied delete, click each statistic.
Expected: no lost draft, duplicate record, or stale filter.

```powershell
git add public/shared/utils.js public/island/js/item-form.mjs public/island/js/members.mjs public/island/js/stats.mjs public/island/index.html public/island/styles/app.css public/island/styles/responsive.css test/island-render.test.js
git commit -m "feat: add island management workflows"
```

### Task 7: Add Classic Switching and Complete Visual/Accessibility QA

**Files:**
- Modify: `public/view/index.html:145`
- Modify: `public/admin/index.html:93`
- Modify: `public/admin/index.html:115`
- Modify: `public/admin/login.html`
- Modify: `public/admin/admin.js:11`
- Modify: `public/admin/admin.js:949`
- Modify: `public/shared/ui-preference.js`
- Modify as QA finds: `public/island/index.html`, `public/island/styles/*.css`, `public/island/js/*.mjs`
- Extend: `test/server-routes.test.js`, `test/island-routing.test.js`
- Create: `docs/qa/animal-island-ui-fidelity-ledger.md`

**Interfaces:**
- Produces visible `体验新 UI` controls on classic view/admin/login.
- Preserves classic layout, controls, API, and session.
- Produces three-viewport and accessibility evidence.

- [ ] **Step 1: Write failing classic-switch tests**

Assert every classic page has `data-ui="classic"`, loads preference helper,
has one `data-switch-ui="island"`, uses classic internal links, logs out to
classic login, and maps current filters to canonical Island routes.

- [ ] **Step 2: Make only compatibility edits and test**

Add markers/script/buttons to existing action areas. Change classic-only links
to classic aliases. Do not alter filters, tables, cards, forms, or classic CSS.
Switch writes `wardrobe_ui_v1=island` and preserves query state.

Run: `npm test`

Expected: route/preference/API tests PASS.

- [ ] **Step 3: Run static checks**

Run:

```powershell
npm run check
git diff --check
rg -n "[😀-🙏🌀-🫿]" public/island
rg -n "https?://" public/island -g "*.html" -g "*.css" -g "*.mjs"
```

Expected: tests pass; no whitespace error, emoji, or external runtime asset URL.

- [ ] **Step 4: Verify workflows at all viewports**

Use disposable data with at least 12 varied items. In Browser/IAB at 1440x900,
834x1112, and 390x844 verify first visit, filters/history, pointer/keyboard/
Escape overlays, failed/success login, add/edit/favorite/delete, member CRUD
and occupied error, stats-to-filter, logout, both UI switch directions, and
classic visitor/admin flows. Check safe areas, 44 px targets, focus order and
restoration, contrast, overflow, clipping, and fixed navigation overlap.

- [ ] **Step 5: Capture, inspect, ledger, and repair screenshots**

Capture Wardrobe, filters, detail, add, members, stats, login at all sizes and
inspect with `view_image`. Compare with reference demo/readme imagery and
tokens. Ledger columns: `Mismatch`, `Reference evidence`, `Render evidence`,
`Fix`. Cover palette, fonts, 16/18/24 radii, shadows, raised buttons, upload
surface, icon semantics/alignment, dividers, photo dominance, responsive nav,
copy/emoji, reduced motion. Repair every fixable mismatch and recapture.

- [ ] **Step 6: Commit switching and verified repairs**

```powershell
git add public/view/index.html public/admin/index.html public/admin/login.html public/admin/admin.js public/shared/ui-preference.js public/island test/server-routes.test.js test/island-routing.test.js docs/qa/animal-island-ui-fidelity-ledger.md
git commit -m "fix: verify island UI and classic fallback"
```

### Task 8: Document NAS-Safe Deployment and Final Verification

**Files:**
- Modify: `README.md`
- Create: `docs/deployment-program-files.md`
- Modify: `.gitignore`
- Verify: `Dockerfile`, `docker-compose.yml`

**Interfaces:**
- Produces explicit update/preservation manifests.
- Preserves Docker startup without a frontend build command.

- [ ] **Step 1: Document exact deployment boundary**

Include:

```text
Copy/update: server.js, package.json, public/, scripts/vendor-animal-island-assets.ps1,
THIRD_PARTY_NOTICES.md, README.md, and deployment documentation.

Never overwrite/delete: data/, photos/, config.json, wardrobe.tar, logs, PID files,
or any NAS-only backup.
```

Explain default Island UI, classic aliases, browser-local preference,
licensing, and switch-based rollback. State no automatic NAS deploy occurred.

- [ ] **Step 2: Verify local and Docker startup**

Run:

```powershell
npm ci --omit=dev
npm run check
docker build -t wardrobe-manager:island-ui-test .
docker run --rm -d --name wardrobe-island-test -p 3101:3000 wardrobe-manager:island-ui-test
docker inspect --format='{{.State.Health.Status}}' wardrobe-island-test
```

Expected: install/tests/build pass; container becomes healthy; `/view`,
`/classic/view`, `/api/members` respond. Stop only disposable container with
`docker stop wardrobe-island-test`.

- [ ] **Step 3: Perform read-only NAS preservation comparison**

Compare program paths to `\\192.168.50.179\docker\wardrobe`. Produce the
would-change list and assert it has no `data\*`, `photos\*`, or `config.json`.
Do not copy/delete. Expected: NAS wardrobe JSON and 1107 photos remain unchanged.

- [ ] **Step 4: Commit docs and perform completion audit**

Run:

```powershell
git add README.md docs/deployment-program-files.md .gitignore
git commit -m "docs: add island UI deployment guidance"
npm run check
git diff --check
git status --short
git log --oneline -10
```

Expected: final tests pass and worktree is clean. Report API/routes, three
viewports, interaction paths, licensing, screenshot inspection, fidelity
ledger, Docker result, and that NAS data was not modified.

## Spec Coverage Matrix

| Approved requirement | Implemented and verified by |
|---|---|
| Native frontend, existing Express/API/JSON/photos/Docker | Tasks 1, 4, 8 |
| New default UI plus complete classic fallback | Tasks 2, 7 |
| Existing URLs and explicit classic aliases | Tasks 2, 7 |
| Browser-local UI preference with context retention | Tasks 2, 7 |
| Unified visitor/admin wardrobe with server-verified session | Tasks 4, 5 |
| Search, shortcut filters, More Filters, URL/history state | Tasks 4, 5 |
| Shared detail plus authenticated favorite/edit/delete | Tasks 5, 6 |
| Desktop/tablet two-column and mobile three-step add flow | Task 6 |
| Member management and statistics-to-filter navigation | Task 6 |
| Animal Island tokens, fonts, icons, dividers, attribution | Task 3 |
| Loading, empty, broken-image, auth-expiry, mutation errors | Tasks 4-6 |
| Keyboard, focus, Escape, touch targets, reduced motion | Tasks 4, 7 |
| Mobile/tablet/desktop visual and interaction verification | Task 7 |
| NAS-safe deployment without modifying runtime data | Task 8 |
