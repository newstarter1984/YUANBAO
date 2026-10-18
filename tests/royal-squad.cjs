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
    await page.goto(process.env.GAME_URL || "http://127.0.0.1:8765/?royal-test=1");

    const result = await page.evaluate(() => {
      currentLevel = 8;
      royalCompanion = "";
      startGame();
      const initial = {
        theme: level.theme.id,
        state: level.story.state,
        prompt: storyPrompt().action,
        guards: level.royalGuards.length,
      };

      interactStory();
      const letter = { state: level.story.state, prompt: storyPrompt().action };
      level.story.summonsTimer = 1;
      updateStory();
      const forced = {
        state: level.story.state,
        forced: level.story.forced,
        enemies: level.enemies.length,
        type: level.enemies[0].soldierType,
      };

      damageEnemy(level.enemies[0], level.enemies[0].hp);
      updateStory();
      const apology = { state: level.story.state, prompt: storyPrompt().action };
      interactStory();
      const joined = { state: gameState, companion: royalCompanion };

      pendingVictory = null;
      gameState = "playing";
      dragons = [{ id: "test-dragon", type: "wood", feedCount: 10, hitsTaken: 0, down: false }];
      activeDragonId = "test-dragon";
      activeMount = "dragon";
      player.y = 100;
      player.vy = -3;
      toggleDragonMount();
      const dismount = { mount: activeMount, y: player.y, ground: player.onGround, restY: dragonRestY };
      return { initial, letter, forced, apology, joined, dismount };
    });

    assert.deepEqual(result.initial, { theme: "royal", state: "letter", prompt: "openRoyalLetter", guards: 10 });
    assert.deepEqual(result.letter, { state: "summons", prompt: "enterRoyalDuel" });
    assert.equal(result.forced.state, "duel");
    assert.equal(result.forced.forced, true);
    assert.equal(result.forced.enemies, 1);
    assert.ok(["shield", "archer", "spearman"].includes(result.forced.type));
    assert.equal(result.apology.state, "apology");
    assert.equal(result.apology.prompt, "acceptRoyalCompanion");
    assert.equal(result.joined.state, "menu");
    assert.ok(["shield", "archer", "spearman"].includes(result.joined.companion));
    assert.deepEqual(result.dismount, { mount: "none", y: 382, ground: true, restY: 378 });
    assert.deepEqual(errors, []);
    console.log("PASS: royal letter, forced duel, apology, companion, and dragon dismount.");
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
