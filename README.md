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

Valid categories: `inspiration`, `stoic`, `wisdom`, `grit`, `creativity`, `humor`, `power`, `time`, `love`, `doubt`, `solitude`.

A quote can sit in several at once — `c: ["stoic", "time"]` — so tagging is additive, not a
zero-sum split. A plain string still works for single-category quotes.

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

## Versioning

The version shows next to the **Lucid** wordmark in the app, so you can tell on your phone
whether a deploy actually landed. It lives in exactly one place:

```js
// app.js, near the top
const VERSION = '1.5.0';
```

Bump it on every change, and add a line below.

## Changelog

**v1.5.0** — 503 quotes, 118 thinkers. New **Power & Strategy** category (71 quotes, 27 thinkers):
Sun Tzu, Machiavelli, Clausewitz, Napoleon, Caesar, Lincoln, Sowell, Thiel, Lee Kuan Yew.
Public-domain additions: Plato, Aquinas, King Solomon, Jesus of Nazareth, King David, Washington,
Jefferson, Adam Smith, Marx, and the commanders. Modern additions (copyrighted, used as short
attributed quotations): Viktor Frankl, Charlie Munger, Naval Ravikant, Thomas Sowell, Friedman,
Hayek, Dalio, Thiel, Jocko Willink, David Goggins, Jordan Peterson, Sam Harris, Douglas Murray,
Bret Weinstein, Gandhi, Craig Ferguson.

**v1.4.0** — 334 quotes, 79 thinkers. Four new categories: **Time**, **Love**, **Doubt**,
**Solitude**. Quotes can now carry multiple categories (`c: ["stoic","time"]`), so Seneca on
mortality shows up under both. Sixteen new thinkers, all public domain in both the work *and*
the English: Gibran, Thoreau, Montaigne, van Gogh, Douglass, Austen, Franklin, Whitman,
Dickinson, Pascal, Cicero, Epicurus, Eliot, Woolf, Keller, Heraclitus.
**Removed all Rumi** — the famous English lines are Coleman Barks's copyrighted "versions"
(© 1995), not public-domain translations. **Removed the two Buddha quotes** — both apocryphal.

**v1.3.1** — Service-worker fixes. (a) Every GitHub Pages project you own shares one origin,
and the old cleanup deleted *every* cache on it, including other apps'. It now only deletes its
own. (b) GitHub Pages serves with `max-age=600`, so "network-first" was quietly being answered
from the browser's HTTP cache — fetches now use `cache: 'reload'`. (c) The page reloads itself
once when a new build takes over, so you see the new version instead of a stale one.

**v1.3.0** — Deepened the library to 202 quotes. 13 thinkers now have 8–13 quotes each
spanning 4–5 categories, so the thinker filter has something to chew on. Added the version chip.

**v1.2.0** — Thinker filter. A dropdown, scoped to the active category, that narrows the deck
to a single thinker. Live pool count.

**v1.1.0** — Light/dark theme toggle. Follows the OS by default; a manual pick overrides and
persists. Theme set before first paint, so no flash. Share cards follow the theme.

**v1.0.0** — Initial release. Swipe deck, six categories, quote of the day, favorites,
canvas share cards, installable offline PWA.

---

## A note on attribution

Two rules the library is built on. Please keep to them when you add quotes:

1. **Don't invent quotes, and don't force a thinker into a category they never spoke to.**
   The Stoics have no humour quotes, so they don't appear under Humor. A gap beats a fake.
2. **For translated authors, the translation carries its own copyright** even when the author
   is ancient. Rumi died in 1273, but the English everyone quotes is Coleman Barks's rendering,
   © 1995 — which is why there's no Rumi here. Prefer authors who wrote in English, or
   pre-1930 translations. As of 2026, US works published 1930 or earlier are public domain.
3. **Two names are deliberately absent.** *Martin Luther King Jr.* — his estate actively licenses
   and enforces his words, and MLK quotes are the most litigated in this space; that's a legal
   caution, not a judgment. *Adolf Hitler, Stalin, Mao, Idi Amin* — a card that pairs a line with
   a name endorses the voice, and the Share button turns that pairing into an image built to
   travel. Studying them is one thing; quoting them as wisdom is another.

---

MIT licensed.
