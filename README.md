# Shift-checker

A tiny, free, installable PWA that tells you whether a given date is an
**office day** or a **home-office day**, based on an alternating Mon/Wed/Fri
↔ Tue/Thu rhythm, and flags Polish public holidays. Bilingual EN/PL.

No backend, no database, no hosting cost: it's a static site on GitHub
Pages, and your settings (language + reference Monday) are stored in **your
own Google Drive** (in the hidden `appDataFolder`, invisible in your normal
Drive view, only this app can read/write it).

---

## 1. Google Cloud setup (one-time, free)

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   create a new project (e.g. `shift-checker`).
2. **APIs & Services → Library** → enable **Google Drive API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External**.
   - App name: `Shift-checker`, add your own email as support/developer contact.
   - Scopes: add `.../auth/drive.appdata`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - **Test users**: add your own Google account (and anyone else who should log in).
   - Leave the app in **Testing** status — for personal/small-group use you do
     **not** need Google's app-verification review. Testing mode supports up
     to 100 test users and tokens don't expire weekly like the old limit.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized JavaScript origins, add all that apply:
     - `https://cloudplay.at`
     - `https://henryai-stack.github.io`
     - `http://localhost:8080` (for local testing)
   - No redirect URI needed (this app uses the token flow, not a redirect).
5. Copy the generated **Client ID** into `js/config.js`:
   ```js
   GOOGLE_CLIENT_ID: "XXXXXXXXXX.apps.googleusercontent.com",
   ```

---

## 2. GitHub repo & Pages

1. Create a new **public** repo `shift-checker` under `HenryAI-stack`.
2. Push this folder's contents to the repo root (`index.html` must sit at
   the repo root or in the Pages-published folder).
3. **Settings → Pages** → deploy from `main` branch, `/ (root)`.
4. It will publish at `https://henryai-stack.github.io/shift-checker/`.

### Hooking it into cloudplay.at

Same pattern as your other tools: add one more exact-match redirect rule in
redirect.pizza pointing your chosen path (e.g. `cloudplay.at/shift-checker`)
to `https://henryai-stack.github.io/shift-checker/`, and add a module card
to the `cloudplay.at` hub `index.html`.

If you serve it under `cloudplay.at`, make sure `https://cloudplay.at` (and
the exact path if it's not the domain root) is in the Authorized JavaScript
origins list from step 1.4 above.

---

## 3. Local testing

Any static file server works, e.g.:

```bash
cd shift-checker
python3 -m http.server 8080
```

Open `http://localhost:8080`. Google sign-in works on `localhost` without
extra config as long as it's in the authorized origins list.

---

## How the logic works

- You set **one reference Monday** that was/is an office Monday. That week:
  Mon/Wed/Fri = office, Tue/Thu = home.
- Every following week the pattern flips, and so on — computed from the
  number of whole weeks between the checked date and your reference Monday
  (even = same pattern, odd = flipped), so it works for any date, past or
  future, without storing a big table.
- Weekends are shown as "weekend" (no shift assigned).
- Polish public holidays (fixed dates + Easter-based movable feasts:
  Easter Sunday/Monday, Pentecost, Corpus Christi, computed with the
  Anonymous Gregorian algorithm) override the day and are shown as
  "holiday" instead of office/home.
- Settings live in your Google Drive `appDataFolder` so they follow your
  Google account across devices; a local cache is kept for instant reloads.

## Notes / things you may want to adjust

- Icons are a single SVG (`icons/icon.svg`); for best iOS home-screen
  results you may want to also generate PNG variants (e.g. via
  [realfavicongenerator.net](https://realfavicongenerator.net)) and add
  `apple-touch-icon` PNG links in `index.html`.
- The office/home pattern is hard-coded as Mon/Wed/Fri vs Tue/Thu. If you
  ever need a different weekly split, that's the `OFFICE_DAYS_PATTERN_A`
  array in `js/schedule.js`.
