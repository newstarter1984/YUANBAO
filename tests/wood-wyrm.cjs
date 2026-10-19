const assert = require("node:assert/strict");
const playwrightPath = process.env.YUANBAO_NODE_MODULES ? `${process.env.YUANBAO_NODE_MODULES}/playwright` : "playwright";
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = () => {}; });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:8765/?wood-wyrm-test=1");
    await page.waitForFunction(() => woodWyrmImage.complete && woodWyrmImage.naturalWidth > 0);
    const result = await page.evaluate(() => {
      currentLevel = 2;
      startGame();
      const wyrms = level.enemies.filter(enemy => enemy.kind === "woodWyrm");
      draw();
      const pixels = woodWyrmBuffer.getContext("2d").getImageData(0, 0, 175, 160).data;
      let visible = 0, backdrop = 0;
      const backdropColors = [[55, 53, 64], [47, 47, 46], [65, 62, 73], [91, 87, 104], [72, 68, 86]];
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] > 0) visible += 1;
        if (pixels[index + 3] > 0 && backdropColors.some(([r, g, b]) => Math.abs(pixels[index] - r) <= 3 && Math.abs(pixels[index + 1] - g) <= 3 && Math.abs(pixels[index + 2] - b) <= 3)) backdrop += 1;
      }
      const before = wyrms[0].x;
      player.x = wyrms[0].x - 130;
      moveEnemies();
      return { theme: level.theme.id, count: wyrms.length, visible, backdrop, moved: wyrms[0].x !== before };
    });
    assert.equal(result.theme, "gravel");
    assert.equal(result.count, 3);
    assert.ok(result.visible > 500);
    assert.equal(result.backdrop, 0);
    assert.equal(result.moved, true);
    assert.deepEqual(errors, []);
    console.log("PASS: animated wood wyrms spawn in the grassland, render cleanly, and pursue the player.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
