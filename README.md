# Lucid

**A moment of clarity.** One beautiful quote at a time — swipe up for the next.

A zero-dependency, zero-build, installable PWA. Dark glass + aurora, auto-fitting typography, native share cards, offline support. Everything is a static file, so GitHub Pages hosts it for free, forever.

---

## Run it locally

No build step. No `npm install`. Just serve the folder:

```bash
cd lucid-quotes
python3 -m http.server 5173
# or: npx serve -l 5173 .
```

Open <http://localhost:5173>.

> Opening `index.html` by double-clicking works too, but the service worker (offline mode) and the share sheet need a real `http://` origin — so use one of the commands above.

**Test the mobile UI:** open DevTools → toggle device toolbar (⌘⇧M / Ctrl+Shift+M) → pick iPhone SE (the smallest thing you need to survive).

---

## Ship it to GitHub Pages

**1. Create the repo and push:**

```bash
cd lucid-quotes
git init
git add .
git commit -m "Lucid v1"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/lucid-quotes.git
git push -u origin main
```

**2. Turn Pages on (one time only):**

Repo → **Settings** → **Pages** → under *Build and deployment*, set **Source: GitHub Actions**. That's it.

**3. Wait ~40 seconds.** The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`. Your site lands at:

```
https://YOUR-USERNAME.github.io/lucid-quotes/
```

All paths in the app are relative (`./app.js`), so it works under a subpath without any config.

**4. Install it on your phone.** Open that URL in Safari or Chrome → Share → **Add to Home Screen**. It launches fullscreen, no browser chrome, and works offline.

---

## Editing from your phone

### Option A — Add quotes (30 seconds, no code)

Everything you'd want to change day-to-day lives in **`quotes.js`**.

1. Open the **GitHub app** (iOS/Android) or `github.com` in your phone browser.
2. Go to your repo → tap **`quotes.js`**.
3. Tap the **✏️ pencil** (in the app: the *Edit* icon top-right).
4. Add a line:
   ```js
   { t: "Your new quote goes here.", a: "Author Name", c: "stoic" },
   ```
5. **Commit changes** → the Action runs → your live site updates in about 40 seconds.

Valid categories: `inspiration`, `stoic`, `humor`, `wisdom`, `creativity`, `grit`.

The workflow runs `node --check quotes.js` first, so if you fumble a comma the deploy fails loudly instead of shipping a blank screen.

### Option B — Real code changes (Codespaces, from a phone browser)

The repo ships with a `.devcontainer`, so you get a full VS Code + live preview in the browser:

1. On your repo page tap **Code** → **Codespaces** → **Create codespace on main**.
2. It boots, installs nothing, and auto-serves the site on port **5173** with a live preview pane.
3. Edit `styles.css` / `app.js`, refresh the preview, commit from the Source Control tab.

Codespaces gives you 60 free core-hours/month on a personal account — far more than you'll use tweaking a quote app on a train.

---

## What's in the box

| File | What it does |
|---|---|
| `index.html` | Markup + PWA meta. Never needs touching. |
| `styles.css` | The whole design system. Tokens at the top (`:root`). |
| `app.js` | Deck logic, swipe gestures, favorites, canvas share cards. |
| **`quotes.js`** | **The quote library — the file you'll actually edit.** |
| `sw.js` | Service worker (offline). CI bumps its cache version for you. |
| `manifest.webmanifest` | Makes it installable as a real app. |
| `.github/workflows/deploy.yml` | Validates + deploys on every push. |
| `.devcontainer/` | Codespaces config for phone-based dev. |

---

## Features

- **Swipe up** for a new quote, **swipe down** to go back through your history. Haptic feedback on supported phones.
- **Double-tap** the card to save it.
- **Categories** — six moods, each with its own accent colour that re-tints the whole aurora.
- **Quote of the Day** — deterministic per calendar date. Same quote all day, everywhere.
- **Save** — favorites persist locally on the device (`localStorage`), reviewable in the Saved drawer.
- **Share** — renders a 1080×1350 PNG card on a `<canvas>` and hands it to the native share sheet. Falls back to a download on desktop.
- **Copy** — plain text to the clipboard.
- **Keyboard:** `↑`/`space` next · `↓` back · `S` save · `C` copy · `Esc` close drawer.
- **Always fits.** The quote's font size is binary-searched at render time against the actual available box, so nothing ever overflows or scrolls — on a 320px iPhone SE, a foldable, or a tablet.

## Making it yours

Open `styles.css` and change the tokens in `:root`:

```css
--bg:     #08080b;   /* base surface */
--a1:     #7c5cff;   /* violet  — aurora + default accent */
--a2:     #22d3ee;   /* cyan    */
--a3:     #f472b6;   /* rose    */
--a4:     #fbbf24;   /* amber   */
--r-lg:   28px;      /* card roundness */
```

Category accents live at the top of `app.js` in the `CATEGORIES` array.
Swap the serif in `index.html` (the Google Fonts link) and in `styles.css` (`.quote { font-family }`) to change the whole personality — try `Instrument Serif`, `Newsreader`, or `Playfair Display`.

---

MIT licensed. Quotes are short, widely-circulated attributions used for commentary and inspiration.
