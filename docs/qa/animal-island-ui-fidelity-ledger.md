# Animal Island UI Fidelity Ledger

Reference: `guokaigdg/animal-island-ui` at commit
`1d61a384ca395552afe34930aef78549374d9f9e`, including its demo/readme image,
design tokens, component styles, fonts, and vendored assets.

Rendered evidence was captured with the Codex in-app browser at 1440x900,
834x1112, and 390x844. Screenshots are in `docs/qa/screenshots/` and were
inspected with `view_image` in the same QA pass as the reference image.

| Mismatch or checkpoint | Reference evidence | Render evidence | Fix or result |
|---|---|---|---|
| Palette | `#f8f8f0`, `#19c8b9`, `#794f27`, `#f5c31c` extracted tokens | Cream page/surfaces, teal selection, brown type, yellow focus | Matches extracted values; no temperature shift |
| Typography | Local Nunito 500/700/900 and Noto Sans SC 400/500/700 | Computed headings/controls use the local font stack | All nine WOFF2 files vendored and loaded locally |
| Shape/elevation | 16/18/24 px radii and brown-neutral shadows | Sidebar selection, toolbar, cards, dialogs, upload zone | Tokens reused consistently; raised buttons retain press offset |
| Icons | Filled, colorful Animal Island icon assets | Leaf brand, shopping/camera/map/miles navigation, design/variant utilities | System emoji removed from Island UI; semantic source icons used |
| Tablet overflow | Reference demo keeps navigation inside the shell | 834 px first render measured 863 px scroll width | Root cause was unconstrained icon image; fixed to 24x24, final overflow count 0 |
| Mobile bottom navigation | Compact horizontal destination bar | First render measured 257 px high and covered form actions | Root cause was inherited grid layout; `.mobile-nav .nav-list` now flex, final height 72 px |
| Hidden controls | Reference components hide inactive states completely | Login/logout and mobile step actions initially appeared together | Added `[hidden]{display:none!important}`; final visible-hidden count 0 at all viewports |
| Section navigation | Each destination starts at its own visible content | Mobile sticky header covered a section after switching at a scrolled position | Section change now scrolls to top and focuses `main` without extra scroll |
| Photo/content hierarchy | Reference uses large stable media moments | Cards reserve 4:5 media and details prioritize the full image | Verified with 12 disposable representative items; real NAS photos will occupy these frames |
| Responsive structure | Approved desktop sidebar, tablet top rail, mobile header/bottom rail | 1440: sidebar; 834: top rail; 390: header plus 72 px bottom rail | No horizontal overflow or fixed-navigation overlap after repairs |
| Motion/accessibility | Reference uses restrained press/drawer motion | Focus rings, raised press feedback, overlay focus trap/Escape | Reduced-motion rule reduces all nonessential animation to `.01ms` |
| Above-the-fold copy | Approved: 家庭衣橱, 我的收藏, count, search, member/type shortcuts, 更多筛选 | Render contains exactly those functional strings | No decorative badge, invented hero copy, or marketing wrapper added |

## Interaction Evidence

- Visitor filtering, search, URL state, back/forward, More Filters, and shared detail were exercised.
- Failed and successful login were exercised; admin navigation appears only after server session confirmation.
- Mobile add steps were exercised from photo to classification to details.
- Classic-to-Island and Island-to-classic switching retained query context.
- Console error/warning log was empty after the final desktop/tablet/mobile pass.

## Intentional Deviations

- No Nintendo character, logo, screenshot, or trademark asset is used.
- Disposable QA data uses licensed UI icons as stand-in media. Production cards use the household's actual wardrobe photos.
- The reference repository is a component library rather than a wardrobe screen; the approved information architecture determines navigation and content density while the extracted system determines visual treatment.
