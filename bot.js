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
  console.log("Attempting to clear modals (v2.0)...");
  try {
    // 1. Press Escape
    await page.keyboard.press("Escape");
    await new Promise((resolve) => setTimeout(resolve, 500));

    await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        return (
          style &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          el.offsetWidth > 0 &&
          parseFloat(style.opacity) > 0.1
        );
      };

      const closePatterns = [
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
        /dismiss/i,
        /decline/i,
        /reject/i,
        /skip/i,
      ];

      const closeSelectors = [
        '[aria-label*="close" i]',
        '[class*="close" i]',
        '[id*="close" i]',
        ".modal-close",
        ".close-button",
        ".close-icon",
        "button.absolute.top-2.right-2",
        "button.absolute.top-4.right-4",
        '[class*="absolute"][class*="top-"][class*="right-"]',
        '[class*="fixed"][class*="top-"][class*="right-"]',
      ];

      // helper to find potential 'X' icons in SVGs
      const isXIcon = (svg) => {
        const paths = svg.querySelectorAll("path");
        for (const p of paths) {
          const d = p.getAttribute("d") || "";
          // look for common X path markers like M...L... (linear moves)
          if (d.length > 10 && (d.includes("L") || d.includes("C")))
            return true;
        }
        return false;
      };

      // 2. Clear known close selectors
      for (const selector of closeSelectors) {
        document.querySelectorAll(selector).forEach((el) => {
          if (isVisible(el)) el.click();
        });
      }

      // 3. Clear text-based buttons
      document
        .querySelectorAll('button, a[role="button"], span[role="button"]')
        .forEach((btn) => {
          if (isVisible(btn)) {
            const text = (
              btn.innerText ||
              btn.textContent ||
              btn.getAttribute("aria-label") ||
              ""
            ).trim();
            if (closePatterns.some((p) => p.test(text))) {
              btn.click();
            } else if (
              btn.querySelector("svg") &&
              isXIcon(btn.querySelector("svg"))
            ) {
              btn.click();
            }
          }
        });

      // 4. Force clear scroll locks
      document.body.style.overflow = "auto";
      document.documentElement.style.overflow = "auto";
      document.body.style.setProperty("overflow", "auto", "important");
      document.documentElement.style.setProperty(
        "overflow",
        "auto",
        "important",
      );

      // 5. Click high z-index backdrops if they are large and dark
      document.querySelectorAll("*").forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          style.position === "fixed" &&
          parseInt(style.zIndex) > 100 &&
          isVisible(el)
        ) {
          // if it covers most of the screen, it might be a backdrop
          if (
            el.offsetWidth > window.innerWidth * 0.8 &&
            el.offsetHeight > window.innerHeight * 0.8
          ) {
            // clicking backdrop often closes modals
            el.click();
          }
        }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 800));
  } catch (e) {
    console.warn("Modal clearing warning:", e.message);
  }
}

async function startPersistentModalObserver(page) {
  console.log("Starting persistent modal observer (v2.0)...");
  try {
    await page.evaluate(() => {
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
        const closePatterns = [
          /close/i,
          /got it/i,
          /accept/i,
          /dismiss/i,
          /agree/i,
          /allow/i,
          /ok/i,
          /i agree/i,
          /accept all/i,
        ];

        // click common close buttons
        document
          .querySelectorAll(
            '[aria-label*="close" i], .modal-close, .close-button, button.absolute.top-2.right-2',
          )
          .forEach((el) => {
            if (isVisible(el)) el.click();
          });

        // click text buttons
        document.querySelectorAll('button, a[role="button"]').forEach((btn) => {
          if (isVisible(btn)) {
            const text = (btn.innerText || btn.textContent || "").trim();
            if (closePatterns.some((p) => p.test(text))) btn.click();
          }
        });

        // ensure scroll is never locked
        if (window.getComputedStyle(document.body).overflow === "hidden") {
          document.body.style.setProperty("overflow", "auto", "important");
        }
      };

      window._modalObserverInterval = setInterval(checkAndClose, 3000);
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

## 🚀 Quick Links

- [**About the Owner**](ABOUT_OWNER.md) - Learn more about the creator.
- [**Contributing**](CONTRIBUTING.md) - How to add your own portfolio.
- [**License**](LICENSE) - Project licensing information.

## 🛠️ How it Works

This project uses a custom bot to visit portfolios, close modals automatically, and record a high-quality scrolling GIF. The gallery is updated automatically via GitHub Actions.

## 🤝 Connect with Me

[![LinkedIn Badge](https://img.shields.io/badge/LinkedIn-vallarasuk-blue?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.vallarasuk.com)

## 🌟 Portfolios

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
