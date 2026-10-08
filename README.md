# Bridge the Gap Arena — Sudden Death & Tournament Controller

Classroom robotics tournament controller and drag race / gap traversal flight dashboard.

## Modular Architecture
The application is structured into decoupled components:
- **`index.html`**: Clean semantic layout, native HTML5 `<dialog>` modals, and viewport controls.
- **`css/styles.css`**: Standard design tokens, 6 complete theme presets, projector mode styling, and keyframe animations.
- **`js/audio.js`** (`Arena.Audio`): Live soundpack synthesizer supporting:
  - *Cyber Synth* (default futuristic arena lasers & sweep risers)
  - *8-Bit Retro* (arcade square-wave chiptunes)
  - *Stadium Energy* (high-energy brass fanfare & arena horns)
  - *Clean Chimes* (gentle acoustic bells)
- **`js/overlays.js`** (`Arena.Overlays`): Visual effects engine:
  - Dual-cannon confetti celebrations
  - Structural failure screen shake
  - Apex record golden strobe flash
  - Sudden death flashing hazard beacons
  - Competition completion CSV save prompt modal
- **`js/state.js`** (`Arena.State`): Competition ledger, calculation engine, localStorage persistence, theme state, and CSV export/import.
- **`js/ui.js`** (`Arena.UI`): DOM rendering, queue cards, matrix tables, leaderboard clash analytics, dialog openers, and hotkeys.
- **`js/app.js`** (`Arena.App`): Application bootstrap and coordination.

## 6 Visual Themes
Change themes on-the-fly inside the **Settings (⚙️)** dialog:
1. 🌉 **Cyber Arena** (Default): High-voltage neon cyan, electric amber, dark telemetry grid.
2. 🕹️ **Retro Arcade CRT**: Phosphor green & amber glow with subtle CRT scanline textures.
3. 🌆 **Synthwave Sunset**: Neon magenta & ultraviolet with sunset horizons.
4. 🚧 **Industrial Pit Crew**: Safety caution yellow & orange with hazard warning striping.
5. 🏎️ **Formula Motorsport**: Racing crimson red & carbon fiber with checkered flag accents.
6. ☀️ **Classroom Daylight**: High-contrast crisp light mode (slate & white) engineered for washed-out classroom projectors in brightly lit rooms.

*Optional*: Toggle **"Auto-Sync Soundpack to Theme"** to automatically pair visual themes with companion audio (e.g., Retro CRT → 8-Bit Retro soundpack).

## Key Features
- **Auto-Advance Engine**: Automatically queues and progresses rounds as attempts are marked.
- **Sudden Death Mode**: High-stakes sole-survivor frontier rounds with dynamic banners and siren beacons.
- **Automatic Competition Completion Prompt**: Instantly prompts the teacher/referee to download finalized standings and attempt logs as CSV once a round or flight finishes.
- **Projector Mode**: Fullscreen optimized display for gymnasiums, projectors, and classroom smartboards.
- **Live Soundpacks**: 4 selectable browser-synthesized audio themes with volume and mute control.
- **CSV Data Hub**: Live import/export compatible with grading spreadsheets and competition logs.
- **Quick Roster Loader**: Paste rosters per block or period directly into the queue.
- **Hotkeys**:
  - `1`: Mark current active bot **Pass / Clear**
  - `2`: Mark current active bot **Fail**
  - `Space`: **Advance Gap**
  - `Esc`: Dismiss open modal / pause auto-advance timer

## GitHub Pages Deployment

This project is a zero-dependency static web application ready for GitHub Pages:

### Method 1: GitHub Actions (Configured)
1. Push this repository to GitHub on branch `main`.
2. Go to **Settings > Pages** in your GitHub repository.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) will automatically publish your site on push.

### Method 2: Deploy from Branch (Classic)
1. Go to **Settings > Pages** in your GitHub repository.
2. Under **Build and deployment > Source**, select **Deploy from a branch**.
3. Choose branch `main` and folder `/ (root)`.
4. Click **Save**.
