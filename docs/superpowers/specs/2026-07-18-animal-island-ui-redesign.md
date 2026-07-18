# Animal Island UI Redesign

## Goal

Refactor Wardrobe Manager into a unified, responsive application inspired by
`guokaigdg/animal-island-ui`, while preserving the current UI as a complete
fallback. The redesign must keep the existing Express API, JSON data, photo
storage, authentication, Docker image, and NAS deployment model compatible.

The application is for personal, non-commercial use. Reused and adapted
Animal Island UI assets must retain attribution and the CC BY-NC 4.0 notice.

## Current System

- Backend: Node.js and Express.
- Frontend: static HTML, CSS, and JavaScript without a build step.
- Storage: `data/wardrobe.json`, `data/members.json`, and the configured photo
  directory.
- Existing surfaces: read-only `/view`, authenticated `/admin`, and
  `/admin/login`.
- Deployment: Docker or direct Node.js execution on a Synology NAS.

The current UI duplicates clothing lists, filtering, detail presentation, and
navigation across read-only and administrative surfaces. The admin navigation
is separately represented by a desktop sidebar, a mobile drawer, and a mobile
bottom bar. Statistics also render another clothing list instead of routing
back to a filtered wardrobe.

## Constraints

- Do not introduce React, a bundler, a database, or a required network font.
- Do not migrate or rewrite existing wardrobe or member data.
- Do not change existing API request or response contracts unless a backward-
  compatible addition is demonstrably required.
- Do not automatically deploy to the NAS.
- A later NAS deployment must preserve `data/`, `photos/`, and the deployed
  `config.json`.
- Keep the existing classic UI operational. Changes to it are limited to the
  new-UI switch and any narrowly required shared compatibility fixes.
- Do not copy Nintendo trademarks, characters, or branding.

## Chosen Architecture

Use two independently renderable interfaces over one backend.

### New UI

Place the new application under `public/island/`. It uses native HTML, CSS,
and JavaScript and consumes the existing API and session. Organize it into
focused modules for application state, routing, API access, shared rendering,
wardrobe browsing, item editing, member management, statistics, and UI
overlays. Use browser-native ES modules and keep the application entry point as
composition glue rather than a monolithic script.

Shared nonvisual behavior such as API calls, escaping, image compression,
FormData construction, and formatting should reuse or be extracted from
`public/shared/utils.js` where doing so does not regress the classic UI.

### Classic UI

Retain the current read-only, login, and admin files. Add a clearly labelled
"体验新 UI" control to their appropriate navigation or account area. The
classic interface continues to use the same backend and data without adopting
the new layout.

### UI Preference

- Preference key: one versioned `localStorage` key owned by this application.
- First visit: use the new UI.
- Explicit switch: remember the selected UI in that browser.
- Preference affects presentation only; it must not alter authentication,
  data, filters stored in URLs, or uploaded files.
- Each switch carries the user's current public/admin context to the matching
  interface.

## Routes and Compatibility

The existing public URLs remain valid:

- `/view` opens the wardrobe browsing context.
- `/admin` opens the authenticated management context, or login if no valid
  session exists.
- `/admin/login` remains a valid legacy bookmark and login entry.

The canonical new UI routes are the existing URLs. Add explicit classic
aliases at `/classic/view`, `/classic/admin`, and `/classic/admin/login` that
serve the retained files. On `/view`, `/admin`, or `/admin/login`, a small
pre-render preference bootstrap redirects to the matching classic alias only
when the stored preference is classic. Explicit `?ui=island` or `?ui=classic`
navigation updates the preference and wins over the stored value for that
navigation. Classic aliases never redirect merely because classic is stored,
which prevents loops. Authentication requirements remain identical on the
classic admin aliases.

New UI state is URL-addressable. Use the `section` query parameter for the
active primary section and existing API-compatible query parameter names for
meaningful wardrobe filters. Refresh, back/forward navigation, and shared
bookmarks restore the expected state.
Temporary modal and form-draft state does not need to be shareable.

## Information Architecture

### Wardrobe

Wardrobe is the default section and replaces the separate read-only and admin
lists. All visitors can browse, search, filter, and open item details.
Authenticated administrators see favorite, edit, and delete actions in the
same cards and detail surface.

The primary filtering surface contains:

- search;
- member shortcuts;
- common clothing types;
- a "更多筛选" control.

Season, status, favorites, and less common conditions live in the expanded
filter drawer or sheet. Active filters remain visible as removable summaries,
and one reset action clears all active conditions.

### Add Item

Visible only to authenticated administrators. Desktop and tablet use a photo
and form two-column composition. Mobile retains a camera-first, three-step
flow: photo, classification, and item details. Submission shows progress,
prevents duplicate saves, and preserves the existing client-side display and
thumbnail compression behavior.

### Members

Visible only to authenticated administrators. It supports creating, renaming,
and deleting members using the existing API rules. Destructive actions require
confirmation and expose server errors without discarding the user's context.

### Statistics

Visible only to authenticated administrators. Statistics summarize total,
status, favorites, member, type, and season counts. Activating a statistic
navigates to Wardrobe with its corresponding filter instead of rendering a
second clothing list.

### Authentication and Account

Visitors see a management login action. Administrators see an account menu
containing logout and UI switching. Authentication is checked against the
server session; `localStorage` is not treated as proof of authorization.
Expired sessions remove administrative actions and offer a recoverable login
path.

### Item Detail

Browsing and management share one detail surface. Photo and metadata remain
the focus. Administrative actions are grouped in the footer/action area and
are never shown to visitors.

## Navigation by Viewport

### Desktop: 1024 px and wider

- Fixed Animal Island-style sidebar and a main workspace.
- Responsive 3-5 column wardrobe grid within a 1440 px maximum
  content width.
- Compact filter controls near the list header.
- Persistent administrator add action when authorized.

### Tablet: 768-1023 px

- Compact top bar with icon navigation.
- Responsive 2-3 column wardrobe grid.
- Secondary filters open from the right.
- Add form starts as two columns and stacks when the available pane becomes
  too narrow.

### Mobile: below 768 px

- Single-column wardrobe feed.
- Compact title bar and bottom navigation.
- Four destinations are Wardrobe, Add, Members, and Statistics; unauthorized
  destinations are not rendered. Add receives the strongest visual emphasis.
- Filters and details use bottom sheets.
- Interactive targets are at least 44 by 44 CSS pixels.
- Content accounts for safe-area insets and never sits behind bottom
  navigation.

## Visual System

Use a medium-intensity Animal Island treatment that is recognizable but does
not compromise wardrobe browsing.

### Color and Type

- Cream page background rather than true white.
- Teal primary actions and selection.
- Brown primary text.
- Yellow emphasis.
- Soft pink, green, and neutral semantic states.
- Nunito for Latin text and Noto Sans SC for Chinese, with local font files and
  system fallbacks.

### Shape and Surfaces

- Soft 16-24 px radii, pill controls, cream panels, and restrained raised
  button shadows.
- Dashed surfaces for upload and selected utility moments.
- Licensed wave/divider treatments used sparingly between major regions.
- Clothing photography remains the main visual element. Decorative scenery
  is confined to edges, titles, empty states, and separators and must never
  cover item photography or primary controls.

### Iconography and Assets

- Replace operating-system emoji in the new UI.
- Copy semantically matching icons and supporting visual assets from the
  referenced repository into a dedicated local asset directory.
- The reference repository has a limited generic icon set. Do not force an
  unrelated icon onto a wardrobe action. When no semantic icon exists, build
  the control from licensed repository shapes/textures plus CSS, or use clear
  text, while preserving the same visual language.
- Track every copied or adapted asset in an attribution notice that names the
  source repository, links to it where practical, identifies modifications,
  and includes CC BY-NC 4.0.
- Do not use Nintendo logos, character art, or imply Nintendo endorsement.

### Motion

Limit motion to button press feedback, drawers/sheets, filter state changes,
and light card entry. Disable or reduce nonessential motion under
`prefers-reduced-motion`.

## Interaction and State

- One application state model owns auth state, current section, filters,
  sorting, loading, and selected item.
- URL state is the source for shareable section/filter state; controls update
  it without full page reloads.
- Filter and sort changes cancel or supersede stale list responses so older
  responses cannot overwrite newer selections.
- Mutations refresh the affected item/list/statistics while preserving the
  current section and valid filters.
- Overlays trap focus, close with Escape, restore focus to their trigger, and
  expose appropriate labels and roles.
- All forms use visible labels, inline validation, disabled submitting states,
  and recoverable error messages.
- Delete confirmations name the affected item or member.
- Missing and failed images use a licensed, semantically suitable fallback and
  preserve layout dimensions.

## Error and Empty States

- API failures present a concise message and retry action where retry is safe.
- Authentication expiry distinguishes login-required errors from general
  failures.
- Empty wardrobe, empty filter result, empty statistics group, missing image,
  and upload failure each receive a dedicated state.
- A failed mutation does not optimistically remove or corrupt the displayed
  item.
- Upload errors retain entered metadata and allow the user to retry.

## Accessibility

- Use semantic links, buttons, headings, forms, lists, and navigation regions.
- Provide visible keyboard focus and meaningful accessible names for icons.
- Ensure text and controls meet WCAG AA contrast against their actual
  backgrounds.
- Support keyboard operation for navigation, filters, cards, menus, drawers,
  sheets, dialogs, and forms.
- Announce loading, toast, validation, and mutation results without relying on
  color alone.

## Testing and Acceptance

### Automated and Static Checks

- Parse/static-check all JavaScript and validate referenced local assets.
- Exercise existing API list, filter, auth, member, create, edit, favorite, and
  delete contracts against disposable test data or a temporary data directory.
- Verify route selection for first visit, stored new preference, stored classic
  preference, explicit switch, logged-out admin, and logged-in admin.
- Confirm classic UI behavior remains functional after shared utility changes.

### Browser Matrix

Verify at minimum:

- mobile: 390 x 844;
- tablet: 834 x 1112;
- desktop: 1440 x 900.

At each size, inspect Wardrobe, filters, item detail, login, and UI switching.
When authenticated, also inspect add/edit/delete, member management,
statistics-to-filter navigation, favorite toggling, and logout.

### Visual Acceptance

- No horizontal overflow, clipped content, hidden actions, or content beneath
  fixed navigation.
- Clothing photos dominate cards and details.
- Typography, palette, radii, shadows, dividers, controls, and icons are
  internally consistent with the extracted Animal Island system.
- New UI contains no system emoji or temporary stand-in icons.
- Classic UI remains visually unchanged apart from its switch control.
- Reduced-motion mode remains usable.

### Deployment Acceptance

- `npm start` and the existing Docker build continue to work without a frontend
  build command.
- All new fonts and assets are served locally.
- Prepare a deployment manifest distinguishing program files from preserved
  NAS runtime paths.
- Never overwrite NAS `data/`, `photos/`, or deployed `config.json` during a
  program update.

## Licensing Deliverables

- Add a third-party attribution file or clearly named section to an existing
  notice file.
- Include the Animal Island UI repository URL, author attribution, CC BY-NC
  4.0 license reference, non-commercial-use note, and a description of copied
  or adapted asset groups.
- Preserve the Wardrobe Manager project's MIT license for original code while
  clearly separating third-party asset terms.

## Out of Scope

- Database migration, accounts beyond the current shared admin session,
  cloud sync, PWA/offline caching, bulk editing, AI clothing recognition, and
  direct NAS deployment.
- Reimplementing the classic UI in the new component architecture.
- Copying Nintendo-owned characters, logos, or game screenshots.
