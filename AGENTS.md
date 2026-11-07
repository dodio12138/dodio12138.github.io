# Repository Guidelines

## Project Structure & Module Organization

This repository is a static personal website served from the repository root. Entry pages live at `index.html` and `404.html`. Feature pages are under `src/page/`, JavaScript under `src/js/`, and styles under `src/css/`. Static assets are in `res/`, grouped by `fonts/`, `icon/`, and `img/`. Site metadata and PWA files live at the root: `manifest.json`, `sw.js`, `robots.txt`, `sitemap.xml`, and `projects.json` (the hand-maintained My Projects list). Generated app data lives in `data/` (see Automation below).

The home page (`index.html`) is a Windows 95-style desktop built from these layers, loaded in this order:

| Layer | CSS | JS |
|---|---|---|
| Design tokens, fonts, reset, shared bevels | `base.css` | — |
| Desktop shell: taskbar, clock, shared actions/helpers | `index.css` | `main.js` |
| Popup menus, menu bars, right-click menus | `menu.css` | `menu.js` |
| Window manager: create/focus/min/max/close, drag, snap, window/taskbar menus, dialogs | `windows.css` | `window.js` |
| Desktop icons: selection, rubber-band select, right-click, Arrange Icons, Properties | `index.css` | `desktop.js` |
| Desktop pet: Godzilla the lionhead bunny peeking up in the bottom-right corner (sprite `res/img/desk-bunny.png`, made from her photo) | `index.css` | `deskbunny.js` |
| Apps that open inside windows | `instagram.css`, `browser.css`, `apps.css` | `projects.js`, `notepad.js`, `meterminal.js`, `instagram.js`, `browser.js`, `github.js`, `itch.js`, `bilibili.js` |
| Start menu | `startmenu.css` | `startmenu.js` |
| Taskbar clock and Date/Time Properties | `apps.css` | `clock.js` |

Pages in `src/page/` and `404.html` are standalone mini pages with their own CSS/JS; they do not load the desktop layers.

## Build, Test, and Development Commands

There is no package manager or build step. Edit HTML, CSS, and JS directly.

- `python3 -m http.server 8000`: serve the site locally from the repo root.
- `open http://localhost:8000`: view the local site in a browser.
- `git status`: confirm changed files before committing.

Avoid opening files through `file://` when testing service worker behavior; use the local server instead.

## Coding Style & Naming Conventions

Keep everything plain HTML/CSS/JavaScript, dependency-free, with 4-space indentation (spaces, not tabs) in every file. Use descriptive names for page-specific files, such as `BunnyGame.html`, `BunnyGame.js`, and `BunnyGame.css`, and keep matching feature assets in `res/img/` or `res/icon/`.

### CSS rules

- **Tokens first.** Colors, fonts, cursors and z-index layers are defined once as custom properties in `src/css/base.css` (`--ButtonFace`, `--font-ui`, `--cursor-pointer`, `--z-menu`, …). Desktop CSS must use these variables instead of raw values; add a new token rather than repeating a literal in two places.
- **Reuse the bevels.** Win95 3D edges are `box-shadow` tokens in `base.css`: `--bevel-raised` (buttons), `--bevel-pressed`, `--bevel-window` (window/menu frames), `--bevel-sunken` (content/fields), `--bevel-shallow` (tray, status areas); `--etch-h` / `--etch-v` for divider lines and `--dither` for the checked/active pattern. Use `box-shadow: var(--bevel-…)` with `border: none` instead of hand-writing `border-color` quadruples.
- **One owner per selector.** Global element rules (`html`, `body`, `*`, `a`) live only in `base.css`. Component styles are scoped by a class prefix matching the feature (`.task-…`, `.start-menu-…`, `.instagram-…`).
- **Asset paths** in CSS are relative to the CSS file (`../../res/...`). Never use extra `../` segments that only work because the site is served at the domain root.
- **No inline styles from JS** for static looks; add a class in CSS. JS may set inline styles only for dynamic geometry (position, size, z-index).
- **Fonts:** UI text uses `--font-ui` (W95FA for Latin, then `Fusion Pixel ZH` for Chinese), monospace uses `--font-mono`. `res/fonts/fusion-pixel-zh.woff2` is Fusion Pixel Font 12px (SIL OFL, licence in `res/fonts/fusion-pixel-license/`) subset to GB2312 plus the site's Chinese; Chinese glyphs are crisp at 14px font size (`size-adjust`). If new content shows a rare character that falls back to a system font, regenerate the subset from the original release with fontTools.
- **Avatars** use `pixelAvatar(src, size, inset)` from `main.js`: a hard-edged pixel circle with a 1px gray-black outline, drawn 1:1 on a canvas (no CSS rounding or scaling).
- **Icons are pixel art shown at exactly 1:1.** Every icon has a native-size file and is displayed at that size: `res/icon/32/` for desktop, Start menu and dialog icons, `res/icon/16/` for title bars, taskbar, menus and links, `res/icon/20/` for browser toolbar buttons. Reference them with `icon16(name)` / `icon32(name)` in JS. Never scale an icon in CSS (no 48px→32px or 32px→16px); if a size is missing, draw or generate a native one, snapping colors to the icon's own palette so it stays crisp. New pixel icons follow the Win98 look: black outline, 1px highlight top-left, 1px shadow bottom-right, no anti-aliasing, muted colors (saturation about 70%) and Win98 256-color style ordered dithering (4×4 Bayer to the 216-color web-safe cube) for mid-tones and gradients; Win98 system grays, black and white stay solid.
- Avoid `!important`; it is acceptable only inside a media query that must beat geometry JS wrote inline.
- Z-index layers: windows use small increasing numbers from the window manager, `--z-taskbar` < `--z-menu` < `--z-overlay`.

### JavaScript rules

- Use `const`/`let`, never implicit globals, never string arguments to `setTimeout`/`setInterval`. Do not name variables `window` or `document`.
- Each file exposes a small set of named globals (desktop apps are functions like `instagramwin()`); everything else stays inside a function or IIFE.
- **Shared helpers live in `main.js`**: `asset(path)` for desktop asset URLs, `loadProjects()` (cached `projects.json` fetch), `projectKind()` / `projectIcon()` (type and icon from a project's URL), `openUrl(url)`, `openExternal(url)`, `isMobile`, and the `DesktopActions` registry. Desktop icons and Start menu items both trigger apps through `DesktopActions` via `data-action` / `data-href` attributes — do not add inline `onclick`/`ondblclick` handlers in HTML or JS.
- **All links open in Levy Browser.** Navigate with `openUrl(url)`, never `window.open` or `target="_blank"`; plain `<a href>` inside `#windows` is routed there automatically. `openExternal(url)` (a real new tab) is reserved for sites that refuse to be framed: the browser's fallback page and explicit menu items such as "Open on GitHub" or "Open in New Tab". To let another site of yours display inside the browser, add its host to `EMBEDDABLE_HOSTS` in `browser.js`. URLs that belong to a desktop app (MeTerminal, GitHub, itch.io, Bilibili) are listed in `URL_APPS` in `main.js`; `openUrl` and the browser open that app's window instead, passing the URL so the app can select the matching item.
- Desktop icons open on double-click on desktop and on single tap on mobile.
- **Menus** (right-click, menu bars, drop-down lists) always go through `menu.js`: `openPopupMenu(items, x, y)` and `createMenuBar(menus)`. Items are `'-'` or `{ label: '&Open', action, shortcut, disabled, checked, bold, icon, items }`; build them in a function at open time so disabled/checked state is current. Right-click handlers call `openPopupMenu` from a `contextmenu` listener; the browser's own context menu is suppressed globally except in text inputs.
- Dialog windows use `.dialog-wincontent` > `.dialog-panel` + `.dialog-buttons` with `.btn` / `.btn-default` push buttons.
- For questions and prompts use `messageBox({ title, message, icon, buttons })` and `inputDialog({ title, label, value })` from `window.js` (both return Promises); never `alert`/`confirm`/`prompt`. A window can set `win.beforeClose` (return `false` to stay open, e.g. to ask about unsaved changes); `closeWindow(win, true)` skips it.
- Notepad's built-in files are listed in `NOTEPAD_BUILTIN` (`notepad.js`) and live in `res/text/` (`AboutMe.md` uses light Markdown: headings, bold/italic, links, lists, quotes, `---`; `.md` files open in Notepad's Preview, which renders only that subset; a file can hold several languages separated by `<!-- lang:en -->` / `<!-- lang:zh -->` lines, and Preview then shows one language with a Translate button, defaulting to English); visitors' saved files stay in their own browser's `localStorage`.
- Register `document`/`window` level listeners once at load, never per window or per click; use event delegation for lists.
- Put data into the DOM with `textContent` / `createElement`. Use `innerHTML` only for static templates, and pass any data through `escapeHtml()`.
- Windows are always created with `createWindow(id, width, height, title, icon)` and appended with `openWindow(windowElement)`; app content goes into `.wincontent`. Change a title later with `setWindowTitle(windowElement, title)`.
- Comments may be Chinese or English; keep them short and explain *why*.

### HTML rules

- Every page has `lang`, `<meta charset>`, `<meta name="viewport">`, and a meaningful `<title>`.
- Images get an `alt` (empty `alt=""` for decorative icons). Interactive desktop items carry `data-action` or `data-href`.

### When adding or removing files

- Add new desktop CSS/JS to `index.html` in layer order and to `CACHE_FILES` in `sw.js`, then bump `CACHE_VERSION`. Replacing an image or font under the same filename needs no bump: the service worker serves the cached copy and refreshes it in the background.
- Add new public pages to `sitemap.xml`.

## Automation

`.github/workflows/update-data.yml` runs `scripts/update-data.mjs` every day (and on demand from the Actions tab). The script fetches GitHub repositories, itch.io games and Bilibili videos for the accounts in its `ACCOUNTS` constant, plus Instagram posts when the `INSTAGRAM_TOKEN` secret is set (setup: `scripts/INSTAGRAM_SETUP.md`). It writes `data/github.json`, `data/itch.json`, `data/bilibili.json` and `data/instagram.json`, downloads Instagram images to `res/img/instagram/ig-<id>.jpg` (latest 12 only; stale `ig-*.jpg` files are deleted), and appends any new GitHub Pages project sites to `sitemap.xml`. The workflow commits only when something changed and then asks GitHub Pages to rebuild.

- Do not edit `data/*.json` by hand; change the script instead and run `node scripts/update-data.mjs` locally (Node 20+, no dependencies).
- The script identifies itself honestly, makes one request per source per run, and keeps the previous data when a source refuses or fails. Never add tricks to get around a site's bot protection.
- Play counts, stars and similar numbers alone only trigger a rewrite once a week; new videos, games or repositories are written immediately.
- Apps read the files with `loadData(name)` from `main.js`. The Instagram window falls back to the built-in `INSTAGRAM_POSTS` when `data/instagram.json` does not exist.
- itch.io blocks page requests from GitHub's runners, so the workflow needs the `ITCH_API_KEY` secret (official API `https://api.itch.io/profile/games`, setup: `scripts/ITCH_SETUP.md`); without it the script parses the profile page, which only works locally.
- Secrets: `INSTAGRAM_TOKEN` (Instagram long-lived token, refreshed every run) and optional `GH_PAT` (fine-grained token with this repo's "Secrets: Read and write", used to save the refreshed token). Never print or commit tokens; all Instagram requests go through `instagramGet`, which strips the token from error messages.
- GitHub disables scheduled workflows after 60 days without repository activity; re-enable it from the Actions tab if that happens.

## Testing Guidelines

No automated test framework is configured. For each change, run the local server and manually verify the affected pages in a desktop browser. Check the console for errors, confirm links and double-click window actions still work, and test responsive behavior when editing layout. If you change `sw.js`, `manifest.json`, or cached assets, test in a fresh/incognito session or clear site data to avoid stale cache results.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries, for example `Update index.html`, `fix url`, or Chinese summaries such as `更新 sitemap.xml，添加多个页面链接`. Keep commit subjects concise and focused on the visible change. Pull requests should include a short description, list touched pages or features, note manual browser checks performed, and include screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets, private keys, or analytics credentials. Keep external links intentional and update `sitemap.xml` when adding public pages. When adding new static assets, prefer compressed formats and verify relative paths from the page that consumes them.
