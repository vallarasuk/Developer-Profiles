const puppeteer = require("puppeteer");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

const PORTFOLIOS_PATH = path.join(__dirname, "data/portfolios.json");
const PREVIEWS_DIR = path.join(__dirname, "previews");
const README_PATH = path.join(__dirname, "README.md");

const GIF_WIDTH = 640;
const GIF_HEIGHT = 360;

async function closeModals(page) {
  console.log("Attempting to clear modals...");
  try {
    // Press Escape as a first broad attempt
    await page.keyboard.press("Escape");
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Common selectors for close buttons/icons and consent buttons
    const closeSelectors = [
      '[aria-label*="close" i]',
      '[class*="close" i]',
      '[id*="close" i]',
      ".modal-close",
      ".close-button",
      ".close-icon",
      // Text-based selectors (handled via evaluate for better reliability)
      "button",
      'a[role="button"]',
    ];

    const closeTextPatterns = [
      /close/i,
      /got it/i,
      /accept/i,
      /dismiss/i,
      /agree/i,
      /allow/i,
      /ok/i,
      /consent/i,
      /i agree/i,
      /accept all/i,
    ];

    await page.evaluate(
      (selectors, patterns) => {
        const isVisible = (el) => {
          const style = window.getComputedStyle(el);
          return (
            style &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            el.offsetWidth > 0
          );
        };

        const tryClick = (el) => {
          if (isVisible(el)) {
            el.click();
            return true;
          }
          return false;
        };

        // Try selectors
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (isVisible(el)) {
              // If it's a generic button/a, check text
              if (
                el.tagName === "BUTTON" ||
                el.getAttribute("role") === "button"
              ) {
                const text = el.innerText || el.textContent;
                if (
                  patterns.some((p) => new RegExp(p.source, p.flags).test(text))
                ) {
                  el.click();
                }
              } else {
                el.click();
              }
            }
          }
        }
      },
      closeSelectors,
      closeTextPatterns.map((p) => ({ source: p.source, flags: p.flags })),
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch (e) {
    console.warn("Modal clearing warning:", e.message);
  }
}

async function startPersistentModalObserver(page) {
  console.log("Starting persistent modal observer...");
  try {
    await page.evaluate(() => {
      const closeSelectors = [
        '[aria-label*="close" i]',
        '[class*="close" i]',
        '[id*="close" i]',
        ".modal-close",
        ".close-button",
        ".close-icon",
      ];
      const closeTextPatterns = [
        /close/i,
        /got it/i,
        /accept/i,
        /dismiss/i,
        /agree/i,
        /allow/i,
        /ok/i,
        /consent/i,
        /i agree/i,
        /accept all/i,
      ];

      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        return (
          style &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          el.offsetWidth > 0
        );
      };

      const checkAndClose = () => {
        // Try simple selectors
        for (const selector of closeSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            if (isVisible(el)) el.click();
          }
        }
        // Try text-based buttons
        const buttons = document.querySelectorAll(
          'button, a[role="button"], span[role="button"]',
        );
        for (const btn of buttons) {
          if (isVisible(btn)) {
            const text = btn.innerText || btn.textContent;
            if (closeTextPatterns.some((p) => p.test(text))) {
              btn.click();
            }
          }
        }
      };

      // Run every 2 seconds
      window._modalObserverInterval = setInterval(checkAndClose, 2000);
      // Also run on mutations
      window._modalObserver = new MutationObserver(checkAndClose);
      window._modalObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  } catch (e) {
    console.warn("Failed to start modal observer:", e.message);
  }
}

async function recordGif(url, filename) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  // Use 1280x720 for native 16:9 aspect ratio
  await page.setViewport({ width: 1280, height: 720 });

  console.log(`Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 90000 });
  } catch (e) {
    console.warn(
      `Navigation warning for ${url}: ${e.message}. Trying to proceed anyway...`,
    );
  }

  console.log("Waiting for site to stabilize...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const mp4Path = path.join(PREVIEWS_DIR, `${filename}.mp4`);
  const gifPath = path.join(PREVIEWS_DIR, `${filename}.gif`);

  const recorder = new PuppeteerScreenRecorder(page, {
    followNewTab: true,
    fps: 25,
    ffmpeg_Path: null,
    videoFrame: {
      width: 1280,
      height: 720,
    },
    aspectRatio: "16:9",
  });

  console.log(`Starting recording ${url}...`);
  await recorder.start(mp4Path);

  // Try to close any initial modals
  await closeModals(page);
  // Start persistent observer for modals that appear later
  await startPersistentModalObserver(page);

  // Smooth scroll - finite loop for 15 seconds to ensure coverage
  page
    .evaluate(async () => {
      const distance = 30;
      const delay = 100;
      for (let i = 0; i < 150; i++) {
        window.scrollBy(0, distance);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    })
    .catch(() => {});

  console.log("Recording for 12 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 12000));

  try {
    await recorder.stop();
  } catch (e) {
    console.warn("Recorder stop warning:", e.message);
  }

  await browser.close();

  console.log(`Converting ${filename}.mp4 to GIF...`);
  try {
    execSync(
      `ffmpeg -y -i "${mp4Path}" -vf "fps=10,scale=${GIF_WIDTH}:${GIF_HEIGHT}:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${gifPath}"`,
    );
    console.log(`GIF saved: ${gifPath}`);
  } catch (error) {
    console.error(`FFmpeg error: ${error.message}`);
  } finally {
    if (await fs.pathExists(mp4Path)) {
      await fs.remove(mp4Path);
    }
  }
}

async function updateReadme(portfolios) {
  portfolios.sort((a, b) => a.name.localeCompare(b.name));

  let tableRows = portfolios
    .map((p) => {
      const filename = p.name.toLowerCase().replace(/\s+/g, "_");
      const gifLink = `previews/${filename}.gif`;
      const portfolioUrl = p.url.replace(/^https?:\/\/(www\.)?/, "");
      return `| **${p.name}** | ![${p.name} Preview](${gifLink}) | [${portfolioUrl}](${p.url}) |`;
    })
    .join("\n");

  const content = `# Visual Dev Showcase

A curated collection of developer portfolios with live scrolling previews.

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

| Developer | Preview | Portfolio URL |
| :--- | :---: | :--- |
${tableRows}
`;

  await fs.writeFile(README_PATH, content);
  console.log("Successfully updated README.md");
}

async function main() {
  await fs.ensureDir(PREVIEWS_DIR);
  if (!(await fs.pathExists(PORTFOLIOS_PATH))) {
    console.error("Missing data/portfolios.json");
    return;
  }
  const portfolios = await fs.readJson(PORTFOLIOS_PATH);

  for (const p of portfolios) {
    const filename = p.name.toLowerCase().replace(/\s+/g, "_");
    const gifPath = path.join(PREVIEWS_DIR, `${filename}.gif`);
    if (!(await fs.pathExists(gifPath))) {
      console.log(`Processing entry: ${p.name}`);
      await recordGif(p.url, filename);
    }
  }
  await updateReadme(portfolios);
}

main().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
