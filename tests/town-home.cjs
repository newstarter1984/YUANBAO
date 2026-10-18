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
      localStorage.clear();
      window.requestAnimationFrame = () => 1;
      window.cancelAnimationFrame = () => {};
    });
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:8765/?town-home-test=1");
    await page.waitForFunction(() => townHomeInteriorImage.complete && townHomeInteriorImage.naturalWidth > 0);

    const result = await page.evaluate(() => {
      currentLevel = 1;
      gameMode = "creative";
      unlimitedCoinsMode = true;
      startGame();
      const near = x => { player.x = x - player.width / 2; player.y = floorY - player.height; };

      near(210);
      const residentPrompt = storyPrompt();
      near(1494);
      const buyPrompt = storyPrompt();
      const townPopulation = level.town.npcs.length + level.town.residents.length;
      interactStory();
      const bought = townHouseRented;

      near(level.town.entrance.x);
      const doorPrompt = storyPrompt();
      interactStory();
      const entered = { inside: level.town.inside, width: level.worldWidth, enemies: level.enemies.length };

      near(557);
      const cookPrompt = storyPrompt();
      interactStory();
      const meal = inventory.homeMeal;

      near(190);
      const bookPrompt = storyPrompt();
      interactStory();
      const book = inventory.storyBook;

      near(866);
      const chairPrompt = storyPrompt();
      interactStory();
      const sitting = player.sittingTimer;

      player.sittingTimer = 0;
      near(46);
      const sleepPrompt = storyPrompt();
      interactStory();
      const daylight = !level.town.isNight;

      near(335);
      const exitPrompt = storyPrompt();
      interactStory();
      const left = { inside: level.town.inside, width: level.worldWidth, enemies: level.enemies.length };

      near(2464); interactStory();
      near(2824); interactStory();
      near(2824); interactStory();
      const properties = { shop: townShopOwned, apartment: townApartmentOwned, rented: townApartmentRented };

      near(level.town.entrance.x); interactStory();
      near(46); interactStory();
      const income = townPropertyIncome;
      return { residentPrompt: residentPrompt.action, buyPrompt: buyPrompt.action, townPopulation, houseServants: level.town.servants.length, bought, doorPrompt: doorPrompt.action, entered, cookPrompt: cookPrompt.action, meal, bookPrompt: bookPrompt.action, book, chairPrompt: chairPrompt.action, sitting, sleepPrompt: sleepPrompt.action, daylight, exitPrompt: exitPrompt.action, left, properties, income };
    });

    assert.equal(result.residentPrompt, "townTalk");
    assert.equal(result.buyPrompt, "townBuy");
    assert.ok(result.townPopulation >= 17);
    assert.ok(result.houseServants >= 5);
    assert.equal(result.bought, true);
    assert.equal(result.doorPrompt, "enterHouse");
    assert.deepEqual(result.entered, { inside: true, width: 960, enemies: 0 });
    assert.equal(result.cookPrompt, "servantCook");
    assert.equal(result.meal, 1);
    assert.equal(result.bookPrompt, "findBook");
    assert.equal(result.book, 1);
    assert.equal(result.chairPrompt, "sitChair");
    assert.ok(result.sitting > 0);
    assert.equal(result.sleepPrompt, "sleep");
    assert.equal(result.daylight, true);
    assert.equal(result.exitPrompt, "leaveHouse");
    assert.equal(result.left.inside, false);
    assert.ok(result.left.width > 960 && result.left.enemies > 0);
    assert.deepEqual(result.properties, { shop: true, apartment: true, rented: true });
    assert.equal(result.income, 200);
    assert.deepEqual(errors, []);
    console.log("PASS: house interior, servants, book, chair, sleep, shop, apartment, and rent income.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
