const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Deterministic simulation frames let the full quest run without waiting for long walks.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = () => {}; });
    await page.goto(process.env.GAME_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.evaluate(() => { localStorage.removeItem(foxSaveKey); foxRescued = false; startGame(); });
    assert.match(await page.locator('#storyText').textContent(), /不用打败怪物/);
    await page.evaluate(() => { attack(); interactStory(); });
    assert.equal(await page.evaluate(() => foxRescued), false, 'cannot rescue fox remotely');
    const pursuit = await page.evaluate(() => {
      const enemy = level.enemies[0];
      player.x = enemy.x - 200; moveEnemies();
      const detected = enemy.alerted;
      player.x = enemy.x + 1200;
      const before = enemy.x; moveEnemies();
      return { detected, chasingOutside: enemy.x > before, alive: level.enemies.every(e => e.alive) };
    });
    assert.deepEqual(pursuit, { detected: true, chasingOutside: true, alive: true });
    await page.evaluate(() => { player.x = level.chest.x - 70; player.y = floorY - player.height; player.facing = 1; player.attackTimer = 0; attack(); updateStory(); updateCamera(); draw(); });
    assert.equal(await page.evaluate(() => level.story.state), 'victory');
    assert.equal(await page.evaluate(() => level.enemies.every(e => e.alive)), true, 'win without killing any monster');
    assert.equal(await page.evaluate(() => localStorage.getItem(foxSaveKey)), 'yes');
    await page.evaluate(() => update());
    assert.equal(await page.evaluate(() => gameState), 'menu');
    assert.match(await page.locator('#resultLabel').textContent(), /第 1 关胜利/);
    await page.reload();
    assert.match(await page.locator('#startButton').textContent(), /小狐狸引导/);
    await page.locator('#startButton').click();
    assert.equal(await page.evaluate(() => level.story.state), 'tutorial');
    const training = await page.evaluate(() => {
      const x = level.enemies[0].x, hp = player.hearts;
      for (let i = 0; i < 30; i++) update();
      hurtPlayer(100);
      return { frozen: level.enemies[0].x === x, safe: player.hearts === hp };
    });
    assert.deepEqual(training, { frozen: true, safe: true });
    assert.match(await page.locator('#storyText').textContent(), /跳跃/);
    await page.keyboard.down('Space');
    await page.evaluate(() => update());
    await page.keyboard.up('Space');
    assert.equal(await page.evaluate(() => level.story.jump && player.vy < 0), true);
    await page.keyboard.down('j');
    await page.evaluate(() => update());
    await page.keyboard.up('j');
    assert.equal(await page.evaluate(() => level.story.attack), true);
    assert.equal(await page.evaluate(() => level.story.state), 'done');
    await page.locator('#storyInteract').click();
    assert.equal(await page.evaluate(() => gameState), 'menu');
    await page.locator('#startButton').click();
    assert.equal(await page.evaluate(() => level.story.state), 'help');
    await page.evaluate(() => { player.x = 420; player.y = floorY - player.height; updateStory(); });
    await page.locator('#storyInteract').click();
    assert.equal(await page.evaluate(() => level.story.state), 'guide');
    await page.evaluate(() => {
      for (let i = 0; i < 500 && level.story.state === 'guide'; i++) { player.x = level.story.crabX - 60; updateStory(); }
    });
    assert.equal(await page.evaluate(() => level.enemies.length), 3);
    assert.equal(await page.evaluate(() => level.story.state), 'battle');
    await page.evaluate(() => { for (let i = 0; i < 400; i++) updateStory(); });
    assert.equal(await page.evaluate(() => level.story.net), 1, 'crabs wait until sharks are attacked');
    await page.evaluate(() => {
      const shark = level.enemies[0]; player.x = shark.x - player.width; player.y = shark.y - 18; player.facing = 1; player.attackTimer = 0; attack(); updateStory();
      cameraX = 1150; draw();
    });
    assert.equal(await page.evaluate(() => level.story.attacked), true);
    await page.locator('#game').screenshot({ path: path.resolve(__dirname, '../quest-whale-preview.png') });
    const beforePause = await page.evaluate(() => level.story.net);
    await page.locator('#backpackButton').click();
    await page.evaluate(() => { for (let i = 0; i < 90; i++) update(); interactStory(); });
    assert.equal(await page.evaluate(() => level.story.net), beforePause);
    await page.locator('#closeBackpackButton').click();
    await page.evaluate(() => { for (let i = 0; i < 360; i++) updateStory(); });
    assert.equal(await page.evaluate(() => level.story.net), 0);
    const hpBefore = await page.evaluate(() => level.enemies.reduce((sum, e) => sum + e.hp, 0));
    await page.evaluate(() => { for (let i = 0; i < 240; i++) updateStory(); });
    const hpAfter = await page.evaluate(() => level.enemies.reduce((sum, e) => sum + e.hp, 0));
    assert.ok(hpAfter < hpBefore, 'freed whale actually damages sharks');
    await page.evaluate(() => { for (const e of level.enemies) if (e.alive) damageEnemy(e, e.hp); updateStory(); player.x = level.story.whaleX + 90; player.y = level.story.whaleY; updateStory(); });
    assert.equal(await page.evaluate(() => level.story.state), 'thanks');
    await page.locator('#storyInteract').click();
    assert.match(await page.locator('#storyText').textContent(), /藏着宝物/);
    await page.locator('#storyInteract').click();
    await page.evaluate(() => { for (let i = 0; i < 1200 && level.story.state === 'ride'; i++) updateStory(); });
    assert.equal(await page.evaluate(() => level.story.state), 'cave');
    await page.evaluate(() => { player.x = level.story.shipX + 165; player.y = floorY - 100; updateStory(); cameraX = level.story.shipX - 440; draw(); });
    await page.locator('#game').screenshot({ path: path.resolve(__dirname, '../quest-cave-preview.png') });
    await page.locator('#storyInteract').click();
    assert.equal(await page.evaluate(() => level.story.state), 'inside');
    assert.equal(await page.evaluate(() => storyPrompt()), null, 'cannot open ship chest remotely');
    const beforeLoot = await page.evaluate(() => [inventory.dragonEgg, inventory.beef]);
    await page.evaluate(() => { player.x = level.chest.x - 70; player.y = floorY - player.height; updateStory(); cameraX = 940; draw(); });
    await page.locator('#game').screenshot({ path: path.resolve(__dirname, '../quest-ship-preview.png') });
    await page.locator('#storyInteract').click();
    assert.deepEqual(await page.evaluate(() => [inventory.dragonEgg, inventory.beef]), beforeLoot.map(n => n + 1));
    assert.equal(await page.evaluate(() => gameState), 'menu');
    assert.match(await page.locator('#menuText').textContent(), /龙蛋 ×1、牛排 ×1/);
    await page.evaluate(() => interactStory());
    await page.locator('#startButton').click();
    assert.equal(await page.evaluate(() => level.theme.id), 'desert');
    assert.deepEqual(await page.evaluate(() => [inventory.dragonEgg, inventory.beef]), beforeLoot.map(n => n + 1));
    for (const number of [3, 4, 5]) {
      await page.evaluate(n => {
        currentLevel = n; startGame(); player.x = level.chest.x; player.y = level.chest.y;
        handleChest(); update();
      }, number);
      assert.equal(await page.evaluate(() => gameState), 'menu', `world ${number} returns to menu`);
      assert.equal(await page.evaluate(() => currentLevel), number + 1);
      assert.match(await page.locator('#resultLabel').textContent(), new RegExp(`第 ${number} 关胜利`));
    }
    await page.reload();
    await page.evaluate(() => { currentLevel = 1; startGame(); });
    assert.equal(await page.evaluate(() => level.story.saved), true);
    assert.equal(await page.evaluate(() => storyOwnsChest()), false, 'replay restores original chest');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { currentLevel = 2; startGame(); player.x = 420; updateStory(); draw(); });
    const layout = await page.evaluate(() => {
      const text = storyText.getBoundingClientRect(), button = storyInteract.getBoundingClientRect(), hud = storyHud.getBoundingClientRect();
      return { noOverlap: text.right <= button.left, fits: button.right <= hud.right, textFits: storyText.scrollWidth <= storyText.clientWidth };
    });
    assert.deepEqual(layout, { noOverlap: true, fits: true, textFits: true });
    await page.locator('.stage-wrap').screenshot({ path: path.resolve(__dirname, '../quest-mobile-preview.png') });
    assert.deepEqual(errors, []);
    const live = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    live.on('pageerror', error => errors.push(error.message));
    await live.goto(process.env.GAME_URL || pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await live.evaluate(() => {
      foxRescued = false; startGame();
      player.x = level.chest.x - 70; player.y = floorY - player.height; player.facing = 1; attack();
    });
    await live.waitForFunction(() => gameState === 'menu');
    await live.locator('#startButton').click();
    await live.keyboard.down('Space');
    await live.waitForFunction(() => level.story.jump);
    await live.keyboard.up('Space');
    await live.keyboard.down('j');
    await live.waitForFunction(() => level.story.attack);
    await live.keyboard.up('j');
    await live.waitForFunction(() => level.story.clock > 20);
    assert.equal(await live.evaluate(() => gameState), 'playing');
    assert.deepEqual(errors, []);
    console.log('PASS: tutorial, rescue, persistence, guide, combat, net, whale assist, pause, cave, ship, exact-once loot, next level, mobile layout; no browser errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
