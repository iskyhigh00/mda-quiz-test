# Project Context — MDAs Casino

You are helping develop **MDAs Casino**, a PWA for Casino Dreams Temuco (Chile). This is a slot machine catalog + identification quiz app.

## Quick facts
- **Repo**: `iskyhigh00/mda-quiz-test` on GitHub
- **Dev branch**: `claude/photoat-function-refactor-JxZrt`
- **Deploy**: GitHub Pages (auto-deploys `main` branch)
- **Backend**: Supabase (PostgreSQL + Storage bucket `machine-photos`)
- **Stack**: Vanilla HTML/CSS/JS — NO frameworks, NO build step
- **Language**: Spanish UI, Spanish codebase comments

## File map
```
index.html          — full SPA in one file
style.css           — all styles, CSS custom properties for themes
sw.js               — service worker (cache shell + separate image cache)
manifest.json       — PWA manifest
js/config.js        — SUPABASE_URL, SUPABASE_KEY, helper functions
js/api.js           — API helpers: sbGet/sbPost/sbPatch/sbDelete, uploadPhoto
js/storage.js       — globals: MACHINES[], playerName, adminUnlocked, etc.
js/ui.js            — goTo(), openModal(), setSyncBadge(), initApp()
js/catalog.js       — catalog grid, auto-slideshow, lightbox, swipe
js/quiz.js          — quiz engine, sudden death, scoring
js/ranking.js       — leaderboard, winners history
js/admin.js         — admin UI, COLOR_PALETTES (10 themes), stats
js/main.js          — app bootstrap + SW registration
```

## Key globals
```js
MACHINES[]          — loaded from Supabase, shape: {id, name, photo_url, photo_urls[]}
playerName          — current player (localStorage)
adminUnlocked       — boolean, unlocked by hourly code
galleryPhotos[]     — photos in active lightbox [{url, uploaded_by, uploaded_at}]
galleryIdx          — current index in lightbox
lbMachineId         — machine ID in active lightbox
maxPtsConfig        — {5: 1000, 10: 1200, 20: 1300} (configurable from admin)
```

## Supabase tables
- `machines`: `id, name, sort_order, photo_url(string), photo_urls(jsonb [{url,uploaded_by,uploaded_at}])`
- `scores`: `id, name, pts, accuracy, total, timer_sec, season, completed, created_at`
- `winners_history`: `id, player_name, pts, rank, season_ref, reset_date, period_label, prize`
- `machine_notes`: `id, machine_id, author, note, created_at`
- `settings`: `key, value` — keys: `max_pts_5`, `max_pts_10`, `max_pts_20`, `prize`

## Helper functions (js/api.js or config.js)
```js
photoUrl(p)         // extract URL string from photo entry (string or object)
photoBy(p)          // extract uploaded_by
photoAt(p)          // extract uploaded_at ISO string
getImgUrl(url)      // build full Supabase Storage URL
makePhotoEntry(url, author)  // → {url, uploaded_by, uploaded_at}
uploadPhoto(file, filename)  // upload to Storage → Promise<url>
sbGet(path)         // fetch from Supabase REST → array
sbPost(path, body)  // POST (insert)
sbPatch(path, body) // PATCH (update)
sbDelete(path)      // DELETE
```

## CSS theme system
10 palettes in `COLOR_PALETTES` (js/admin.js). Active palette sets CSS vars on `:root`:
`--bg, --surface, --card, --accent, --accent2, --gold, --green, --red, --text, --muted, --border`

**Critical rule**: `--accent` is used as button background with `color: #fff` — must have ≥4.5:1 contrast ratio with white.

Gradient buttons use: `linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent2) 55%, #000))`

## Quiz scoring
- Points per question: starts at 5, decreases 1pt every 400ms
- No penalty for wrong answers
- Sudden death triggers when: score ≥ maxPtsConfig[n] OR score ≥ leaderboard top score (only if players exist)
- Sudden death: one extra question, max 5 points

## Service Worker
- Shell cache: `mda-v3`
- Image cache: `mda-images-v1` (cache-first, saved on first fetch)
- Auto-reload: `controllerchange` event + `hadController` guard (no reload on first install)

## Lightbox swipe
Real-time finger-following swipe in `initLbSwipe()`:
- `touchmove`: translates `#lb-img`, shows adjacent image (`_lbSideImg`) offset by container width
- `touchend`: snaps to next/prev at 28% threshold, or springs back
- Container `.lb-img` has `overflow: hidden`

## What's been done (complete list)
1. Sudden death: 5pts/question, 1pt/400ms decay, no penalty
2. Fix: SD no longer fires for first player
3. PWA: maskable PNG icon for Chrome install
4. Quiz chips show max achievable score per mode
5. Visual redesign: Inter font, muted palette, no harsh orange
6. Auto-slideshow on catalog cards (translateX animation)
7. 10 color palettes in admin dropdown
8. Palette contrast fixes: Ónix, Esmeralda, Ámbar, Neón, Índigo, Titanio
9. Real-time lightbox swipe with adjacent photo preview
10. Premium transitions: view fade-in, button/card :active scale
11. Image caching via separate SW image cache
12. SW auto-reload on update (controllerchange)

## Pending / future ideas
- Show photo upload date in lightbox (`photoAt()` exists but not displayed)
- Swipe resistance at gallery boundaries (first/last photo)
- Push notifications
- Light mode palettes

## How to work on this
1. Edit files directly (no build step needed)
2. Commit to `claude/photoat-function-refactor-JxZrt`
3. Create PR to `main` → GitHub Pages auto-deploys
4. For SW updates: bump `CACHE` version in sw.js

## Admin access
Clave houraria generated by `getClaveHora()` in `js/config.js` — check that function for the logic.
