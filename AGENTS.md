# Repository Guidelines

## Project Structure & Module Organization

This repository is a static personal website served from the repository root. Entry pages live at `index.html` and `404.html`. Feature pages are under `src/page/`, shared page fragments under `src/html/`, JavaScript under `src/js/`, and styles under `src/css/`. Static assets are in `res/`, grouped by `fonts/`, `icon/`, and `img/`. Site metadata and PWA files live at the root: `manifest.json`, `sw.js`, `robots.txt`, `sitemap.xml`, and `filelist.json`.

## Build, Test, and Development Commands

There is no package manager or build step. Edit HTML, CSS, and JS directly.

- `python3 -m http.server 8000`: serve the site locally from the repo root.
- `open http://localhost:8000`: view the local site in a browser.
- `git status`: confirm changed files before committing.

Avoid opening files through `file://` when testing service worker behavior; use the local server instead.

## Coding Style & Naming Conventions

Match the existing plain HTML/CSS/JavaScript style. Use 4-space indentation in HTML and CSS, keep scripts dependency-free, and prefer simple browser APIs over new tooling. Existing JavaScript mixes `var`, function declarations, and classes; keep changes consistent with nearby code rather than doing broad style rewrites. Use descriptive names for page-specific files, such as `BunnyGame.html`, `BunnyGame.js`, and `BunnyGame.css`, and keep matching feature assets in `res/img/` or `res/icon/`.

## Testing Guidelines

No automated test framework is configured. For each change, run the local server and manually verify the affected pages in a desktop browser. Check the console for errors, confirm links and double-click window actions still work, and test responsive behavior when editing layout. If you change `sw.js`, `manifest.json`, or cached assets, test in a fresh/incognito session or clear site data to avoid stale cache results.

## Commit & Pull Request Guidelines

Recent commits use short, imperative summaries, for example `Update index.html`, `fix url`, or Chinese summaries such as `更新 sitemap.xml，添加多个页面链接`. Keep commit subjects concise and focused on the visible change. Pull requests should include a short description, list touched pages or features, note manual browser checks performed, and include screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Do not commit secrets, private keys, or analytics credentials. Keep external links intentional and update `sitemap.xml` when adding public pages. When adding new static assets, prefer compressed formats and verify relative paths from the page that consumes them.
