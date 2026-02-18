# Visual Dev Showcase

A curated collection of developer portfolios with live scrolling previews. This project automatically generates scrolling GIF previews for websites listed in a JSON data file.

## How it Works

The project uses a custom automation script (`bot.js`) that:

1. Loads URLs from `data/portfolios.json`.
2. Launches a headless browser using **Puppeteer**.
3. Automatically detects and closes common modals, popups, and cookie consent banners using a persistent **MutationObserver**.
4. Records the website as it smoothly scrolls down using **Puppeteer Screen Recorder**.
5. Converts the recording to an optimized GIF using **FFmpeg**.
6. Updates this README with the latest previews.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [FFmpeg](https://ffmpeg.org/) (for GIF conversion)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/vallarasuk/Developers-Profiles.git
   cd Developers-Profiles
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Usage

To generate previews for all portfolios in `data/portfolios.json`:

```bash
node bot.js
```

The script will:

- Skip portfolios that already have a GIF in `previews/`.
- Capture and convert new previews.
- Update the `README.md` leaderboard.

## Automation

This repository uses **GitHub Actions** (`.github/workflows/update-showcase.yml`) to automatically regenerate previews whenever the `data/portfolios.json` file is updated.

## Contact & Resources

- Portfolio: [vallarasuk.com](https://vallarasuk.com)
- Blog: [dev.vallarasuk.com](https://dev.vallarasuk.com)
- Live TV: [livetv.vallarasuk.com](https://livetv.vallarasuk.com)
- VS Code Extension: [Auto Console Log](https://marketplace.visualstudio.com/items?itemName=VallarasuKanthasamy.auto-console-log-by-vallarasu-kanthasamy)
- Resources: [vallarasuk.com/resources](https://vallarasuk.com/resources)
- ATS Resume Maker: [atsresumemaker.vallarasuk.com](https://atsresumemaker.vallarasuk.com)
- Place Finder: [placefinder.vallarasuk.com](https://placefinder.vallarasuk.com)
- Books: [books.vallarasuk.com](https://books.vallarasuk.com)
- Space: [space.vallarasuk.com](https://space.vallarasuk.com)
- VS Marketplace: [VallarasuKanthasamy](https://marketplace.visualstudio.com/publishers/VallarasuKanthasamy)
- WhatsApp Group: [Join Chat](https://chat.whatsapp.com/JzCFT47gI6aE8O6mJA96V0)
- Chrome Extension (Tech Stack): [Tech Stack Checker](https://chromewebstore.google.com/detail/tech-stack-checker/lhcplmfhkmjobfnndaabeddibhimghgf?hl=en)
- Chrome Extension (Opacity): [Opacity Adjuster](https://chromewebstore.google.com/detail/opacity-adjuster/elgajofcbjicopepiodbabodkajnihog?hl=en)
- Instagram: [@vallarasuk](http://insta.vallarasuk.com/)
- LinkedIn: [linkedin.vallarasuk.com](https://linkedin.vallarasuk.com)
- GitHub: [github.vallarasuk.com](https://github.com/vallarasuk)
- Community: [squad.vallarasuk.com](http://squad.vallarasuk.com/)
- Awesome Resources: [awesome-developer-resources](https://github.com/vallarasuk/awesome-developer-resources)

## Portfolios

| Developer                |                              Preview                               | Portfolio URL                            |
| :----------------------- | :----------------------------------------------------------------: | :--------------------------------------- |
| **Vallarasu Kanthasamy** | ![Vallarasu Kanthasamy Preview](previews/vallarasu_kanthasamy.gif) | [vallarasuk.com](https://vallarasuk.com) |
