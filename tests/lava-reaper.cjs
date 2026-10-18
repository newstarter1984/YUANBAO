const assert = require("node:assert/strict");
const playwrightPath = process.env.YUANBAO_NODE_MODULES
  ? `${process.env.YUANBAO_NODE_MODULES}/playwright`
  : "playwright";
const { chromium } = require(playwrightPath);

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      window.cancelAnimationFrame = () => {};
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:8765/?lava-reaper-test=1");
    await page.waitForFunction(() => lavaReaperImage.complete && lavaReaperImage.naturalWidth > 0);
    const result = await page.evaluate(() => {
      currentLevel = 6;
      startGame();
      const reapers = level.enemies.filter(enemy => enemy.kind === "lavaReaper");
      draw();
      const pixels = lavaReaperBuffer.getContext("2d").getImageData(0, 0, 100, 110).data;
      let visible = 0;
      let backdrop = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] > 0) visible += 1;
        const r = pixels[index], g = pixels[index + 1], b = pixels[index + 2];
        if (pixels[index + 3] > 0 && ((Math.abs(r - 72) <= 3 && Math.abs(g - 68) <= 3 && Math.abs(b - 86) <= 3) || (Math.abs(r - 91) <= 3 && Math.abs(g - 87) <= 3 && Math.abs(b - 104) <= 3))) backdrop += 1;
      }
      const before = reapers[0].x;
      player.x = reapers[0].x - 120;
      moveEnemies();
      return { theme: level.theme.id, count: reapers.length, allAlive: reapers.every(enemy => enemy.alive), visible, backdrop, moved: reapers[0].x !== before };
    });
    assert.equal(result.theme, "lava");
    assert.equal(result.count, 3);
    assert.equal(result.allAlive, true);
    assert.ok(result.visible > 300);
    assert.equal(result.backdrop, 0);
    assert.equal(result.moved, true);
    assert.deepEqual(errors, []);
    console.log("PASS: animated lava reapers spawn, render without the showcase background, and pursue the player.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
