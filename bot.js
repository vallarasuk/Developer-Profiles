const puppeteer = require("puppeteer");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

const PORTFOLIOS_PATH = path.join(__dirname, "data/portfolios.json");
const PREVIEWS_DIR = path.join(__dirname, "previews");
const README_PATH = path.join(__dirname, "README.md");

const GIF_WIDTH = 480;
const GIF_HEIGHT = 360;

async function recordGif(url, filename) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

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
      height: 800,
    },
    aspectRatio: "16:10",
  });

  console.log(`Recording ${url}...`);
  await recorder.start(mp4Path);

  // Smooth scroll - finite loop
  page
    .evaluate(async () => {
      const distance = 40;
      const delay = 100;
      for (let i = 0; i < 100; i++) {
        window.scrollBy(0, distance);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    })
    .catch(() => {});

  console.log("Recording for 5 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 5000));

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

  const content = `# 🚀 The Visual Dev Showcase

A curated gallery of stunning developer portfolios with live scrolling previews.

## ✨ Featured Portfolios

| Developer | Preview | Portfolio URL |
| :--- | :---: | :--- |
${tableRows}

---
*Generated with ❤️ by The Visual Dev Bot*
`;

  await fs.writeFile(README_PATH, content);
  console.log("README.md updated!");
}

async function main() {
  await fs.ensureDir(PREVIEWS_DIR);
  if (!(await fs.pathExists(PORTFOLIOS_PATH))) return;
  const portfolios = await fs.readJson(PORTFOLIOS_PATH);

  for (const p of portfolios) {
    const filename = p.name.toLowerCase().replace(/\s+/g, "_");
    const gifPath = path.join(PREVIEWS_DIR, `${filename}.gif`);
    if (!(await fs.pathExists(gifPath))) {
      console.log(`Generating preview for ${p.name}...`);
      await recordGif(p.url, filename);
    }
  }
  await updateReadme(portfolios);
}

main().catch(console.error);
