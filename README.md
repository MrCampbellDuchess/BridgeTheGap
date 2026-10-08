# Bridge the Gap Arena — Sudden Death & Tournament Controller

Classroom robotics tournament controller and drag race / gap traversal flight dashboard.

## Features
- **Auto-Advance Engine**: Automatically queues and progresses rounds as attempts are marked.
- **Sudden Death Mode**: High-stakes sole-survivor frontier rounds with dynamic banners.
- **Projector Mode**: Fullscreen optimized display for gymnasiums, projectors, and classroom smartboards.
- **Synthesized Audio Engine**: Browser-synthesized Web Audio FX for passes, fails, advances, alerts, and crowning ceremonies.
- **CSV Data Hub**: Live import/export compatible with grading spreadsheets and competition logs.
- **Quick Roster Loader**: Paste rosters per block or period directly into the queue.
- **Hotkeys**:
  - `1`: Mark current active bot **Pass / Clear**
  - `2`: Mark current active bot **Fail**
  - `Space`: **Advance Gap**
  - `Esc`: Pause timer / dismiss modal

## GitHub Pages Deployment

This project is a zero-dependency static web application and is ready for GitHub Pages:

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
