# G Launcher website

The download page for G Launcher, hosted free by **GitHub Pages**:
**https://guyka2212.github.io/games-launcher-g-website/**

It's a plain static site with no build step:

| File | What it is |
|---|---|
| `index.html` | The page: download button, features, live store, install steps, help |
| `style.css` | Black and yellow look, matching the launcher |
| `app.js` | Loads the **live store** from [guyka2212/games-launcher-g-apps](https://github.com/guyka2212/games-launcher-g-apps), and the version and size of the newest installer |
| `assets/` | Logo and the launcher screenshot |

## Where the installer lives

`GLauncherSetup.exe` is **not** stored in these files. Each version is a **GitHub Release** of this repo, and every Download button points at:

```
https://github.com/guyka2212/games-launcher-g-website/releases/latest/download/GLauncherSetup.exe
```

That link always gives the newest release, and the version and size next to the button update themselves. **Releasing a new version doesn't require changing the website at all.**

## Releasing a new version of the launcher

In the launcher project (`games-launcher-g`):

1. Raise `VERSION` in `g_launcher.py`.
2. Run `build.bat`.
3. Run `release.bat`. It uploads `dist\GLauncherSetup.exe` as release `v<VERSION>` here.

People who run the new setup get updated in place, and their games and settings are kept.

## Changing the page

Edit the files, then push:

```bash
git add .
git commit -m "Update website"
git push
```

GitHub Pages republishes in about a minute.

## Preview on this PC

```bash
python -m http.server 8765
```

Then open http://localhost:8765.
