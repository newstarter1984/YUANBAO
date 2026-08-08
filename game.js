const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const levelNumberElement = document.querySelector("#levelNumber");
const themeNameElement = document.querySelector("#themeName");
const playCountElement = document.querySelector("#playCount");
const coinsElement = document.querySelector("#coins");
const heroLevelElement = document.querySelector("#heroLevel");
const experienceElement = document.querySelector("#experience");
const heartsElement = document.querySelector("#hearts");
const monsterCountElement = document.querySelector("#monsterCount");
const professionNameElement = document.querySelector("#professionName");
const weaponNameElement = document.querySelector("#weaponName");
const mainMenu = document.querySelector("#mainMenu");
const resultLabel = document.querySelector("#resultLabel");
const menuText = document.querySelector("#menuText");
const menuPlayCount = document.querySelector("#menuPlayCount");
const menuCoins = document.querySelector("#menuCoins");
const shopItems = document.querySelector("#shopItems");
const startButton = document.querySelector("#startButton");
const professionChoices = document.querySelector("#professionChoices");
const professionHint = document.querySelector("#professionHint");
const worldTestButtons = document.querySelector("#worldTestButtons");
const gameActions = document.querySelector(".game-actions");
const healButton = document.querySelector("#healButton");
const cageButton = document.querySelector("#cageButton");
const blackFistButton = document.querySelector("#blackFistButton");
const powerPotionButton = document.querySelector("#powerPotionButton");
const medkitButton = document.querySelector("#medkitButton");
const backpackButton = document.querySelector("#backpackButton");
const backpackPanel = document.querySelector("#backpackPanel");
const closeBackpackButton = document.querySelector("#closeBackpackButton");
const inventoryItems = document.querySelector("#inventoryItems");

const keys = new Set();
const gravity = 0.75;
const floorY = 454;
const starValue = 6;
const experienceNeeded = 10;

const worldThemes = [
  { id: "gravel", name: "砾石草原", next: "海洋" },
  { id: "ocean", name: "海洋", next: "沙漠" },
  { id: "desert", name: "沙漠", next: "沼泽" },
  { id: "swamp", name: "沼泽", next: "岩浆世界" },
  { id: "lava", name: "岩浆世界", next: "砾石草原" },
];

const monsterXp = {
  fish: 4,
  crab: 5,
  shark: 10,
};

const weapons = [
  { name: "小剑", cost: 0, damage: 12, range: 70, cooldown: 28, kind: "melee" },
  { name: "狼牙棒", cost: 10, damage: 22, range: 88, cooldown: 30, kind: "melee" },
  { name: "步枪", cost: 30, damage: 28, range: 560, cooldown: 24, kind: "rifle" },
  { name: "火箭筒", cost: 100, damage: 54, range: 620, cooldown: 48, kind: "rocket" },
  { name: "魔法棒", cost: 80, damage: 42, range: 620, cooldown: 32, kind: "magic" },
  { name: "火焰剑", cost: 120, damage: 46, range: 96, cooldown: 26, kind: "fireSword" },
];

const shopGoods = [
  { type: "weapon", index: 1, name: "狼牙棒", cost: 10 },
  { type: "weapon", index: 2, name: "步枪", cost: 30 },
  { type: "horse", name: "马", cost: 60 },
  { type: "weapon", index: 3, name: "火箭筒", cost: 100 },
  { type: "skin", item: "diverSkin", name: "潜水员皮肤", cost: 60 },
  { type: "weapon", index: 4, name: "魔法棒", cost: 80 },
  { type: "weapon", index: 5, name: "火焰剑", cost: 120 },
  { type: "item", item: "powerPotion", name: "力量药水", cost: 45 },
  { type: "item", item: "fireResistPotion", name: "抗火药水", cost: 2 },
  { type: "item", item: "speedPotion", name: "速度药水", cost: 90 },
  { type: "item", item: "medkit", name: "医疗包", cost: 25 },
];

const professions = {
  doctor: { name: "医生", button: "回复", description: "点击回复，立刻回满生命。" },
  police: { name: "警察", button: "牢笼", description: "发射牢笼，困住怪物 10 秒。" },
  boxer: { name: "黑拳", button: "黑拳", description: "短时间内所有伤害无效。" },
};

let player;
let level;
let projectiles = [];
let effects = [];
let coins = 50;
let experience = 0;
let heroLevel = 1;
let playCount = 0;
let weaponLevel = 0;
let ownedWeapons = [true, false, false, false, false, false];
let specialWeaponIndexes = {};
let hasHorse = false;
let hasDragonAdult = false;
let dragonFeedCount = 0;
let dragonAttackTimer = 0;
let lightningBootsEquipped = false;
let diverSkinOwned = false;
let selectedProfession = "doctor";
let speedPotionOwned = false;
let powerBoostTimer = 0;
let fireResistTimer = 0;
let blackFistTimer = 0;
let inventory = {
  medkit: 0,
  powerPotion: 0,
  fireResistPotion: 0,
  stinkSock: 0,
  lightningSword: 0,
  fireSwordLoot: 0,
  lightningBoots: 0,
  skyAxe: 0,
  dragonEgg: 0,
  dragonWand: 0,
  dragonNest: 0,
  beef: 0,
  chestCoins10: 0,
  chestCoins20: 0,
  chestCoins30: 0,
  chestCoins50: 0,
};
let currentLevel = 1;
let cameraX = 0;
let gameState = "menu";
let animationFrame;
function playSound() {
  // Sound is intentionally disabled.
}

function startGame() {
  playCount += 1;
  gameState = "playing";
  mainMenu.classList.add("is-hidden");
  gameActions.classList.remove("is-hidden");
  backpackButton.classList.remove("is-hidden");
  level = buildLevel(currentLevel);

  player = {
    x: 80,
    y: floorY - 72,
    width: hasDragonAdult ? 78 : hasHorse ? 70 : 48,
    height: hasDragonAdult ? 88 : hasHorse ? 84 : 72,
    vx: 0,
    vy: 0,
    speed: (hasDragonAdult ? 5.6 : hasHorse ? 4.8 : 3.6) * (speedPotionOwned ? 2 : 1) * (lightningBootsEquipped ? 1.25 : 1),
    jumpPower: hasDragonAdult ? -15.5 : hasHorse ? -16.2 : -14.8,
    onGround: true,
    facing: 1,
    hearts: getMaxHearts(),
    invincible: 0,
    attackTimer: 0,
    grenadeTimer: 0,
    skillTimer: 0,
    attacking: 0,
  };

  projectiles = [];
  effects = [];
  cameraX = 0;
  updateHud();
  cancelAnimationFrame(animationFrame);
  update();
}

function getTheme(number) {
  return worldThemes[(number - 1) % worldThemes.length];
}

function enemyKindsForTheme(themeId) {
  if (themeId === "ocean") return ["fish", "crab", "fish", "shark", "harpooner"];
  if (themeId === "desert") return ["mummy", "scorpion", "sandGolem", "scarab"];
  if (themeId === "swamp") return ["swampFrog", "swampWitch", "mudBeast"];
  if (themeId === "lava") return ["lavaMage", "lavaKnight", "lavaBlade", "lavaSoldier", "lavaBeast", "lavaSlime"];
  return ["slime", "bat", "guard", "brute"];
}

function enemySize(kind, number, index) {
  const sizeBonus = Math.min(34, number * 3 + index * 2);
  const table = {
    bat: [58, 42],
    brute: [78, 70],
    fish: [58, 34],
    crab: [60, 38],
    shark: [112, 48],
    harpooner: [64, 72],
    mummy: [58, 70],
    scorpion: [76, 36],
    sandGolem: [88, 82],
    scarab: [54, 34],
    swampFrog: [70, 48],
    swampWitch: [66, 76],
    mudBeast: [86, 70],
    lavaMage: [66, 76],
    lavaKnight: [72, 82],
    lavaBlade: [70, 72],
    lavaSoldier: [64, 70],
    lavaBeast: [90, 76],
    lavaSlime: [66, 44],
    lavaAxeGuard: [86, 86],
    lavaBoss: [156, 138],
  };
  const [baseWidth, baseHeight] = table[kind] || [58, 58];
  return [baseWidth + sizeBonus, baseHeight + sizeBonus];
}

function buildEnemy(kind, x, number, index, themeId) {
  const [width, height] = enemySize(kind, number, index);
  const flying = ["bat", "fish", "shark", "harpooner"].includes(kind);
  const deepSea = themeId === "ocean" && ["crab", "shark", "harpooner"].includes(kind);
  const y = flying ? floorY - (deepSea ? 250 : 150) + (index % 2) * 34 : floorY - height;
  const hpBonus =
    kind === "lavaBoss" ? 0 :
    kind === "shark" || kind === "sandGolem" || kind === "lavaAxeGuard" ? 70 :
    kind.startsWith("lava") ? 44 :
    0;
  const maxHp = kind === "lavaBoss" ? getBossHp() : 42 + number * 20 + index * 13 + hpBonus;
  return {
    kind,
    x,
    y,
    baseY: y,
    width,
    height,
    vx: 0,
    facing: -1,
    maxHp,
    hp: maxHp,
    alive: true,
    hurtFlash: 0,
    attackTimer: 0,
    patrolLeft: x - 180,
    patrolRight: x + 190,
    phase: index * 18,
    cagedTimer: 0,
    bossMode: kind === "lavaBoss" ? "armor" : "",
    bossTimer: kind === "lavaBoss" ? 120 : 0,
    summonTimer: kind === "lavaBoss" ? 210 : 0,
  };
}

function getBossHp() {
  const weapon = weapons[weaponLevel] || weapons[0];
  return getAttackDamage(weapon.damage) * 60;
}

function buildLevel(number) {
  const theme = getTheme(number);
  const worldWidth = 2600 + number * 560;
  const enemyCount = theme.id === "lava" ? 6 + number : theme.id === "swamp" ? 4 + number : 3 + number;
  const platforms = theme.id === "ocean" ? [] : [
    { x: 210, y: 378, width: 150, height: 20 },
    { x: 520, y: 320, width: 160, height: 20 },
    { x: 900, y: 370, width: 160, height: 20 },
    { x: 1260, y: 308, width: 170, height: 20 },
    { x: 1660, y: 362, width: 160, height: 20 },
    { x: worldWidth - 560, y: 318, width: 180, height: 20 },
  ];

  for (let x = 2050; x < worldWidth - 620 && theme.id !== "ocean"; x += 430) {
    platforms.push({ x, y: 318 + ((x / 430) % 2) * 52, width: 170, height: 20 });
  }

  if (theme.id === "lava") {
    platforms.length = 0;
    for (let x = 160; x < worldWidth - 280; x += 250) {
      platforms.push({
        x,
        y: 342 + ((x / 250) % 3) * 34,
        width: x % 500 === 0 ? 190 : 150,
        height: 20,
      });
    }
    platforms.push({ x: worldWidth - 520, y: 306, width: 220, height: 20 });
  }

  const stars = [];
  for (let i = 0; i < 5 + number; i += 1) {
    stars.push({ x: 260 + i * 360, y: theme.id === "ocean" ? 160 + (i % 3) * 72 : i % 2 === 0 ? 332 : 254, size: 24, collected: false });
  }

  const enemies = [];
  const enemyKinds = enemyKindsForTheme(theme.id);
  for (let i = 0; i < enemyCount; i += 1) {
    const kind = enemyKinds[i % enemyKinds.length];
    const x = 620 + i * Math.max(320, (worldWidth - 1000) / enemyCount);
    enemies.push(buildEnemy(kind, x, number, i, theme.id));
  }

  if (theme.id === "lava") {
    const boss = buildEnemy("lavaBoss", worldWidth - 620, number, enemyCount + 2, theme.id);
    boss.patrolLeft = worldWidth - 980;
    boss.patrolRight = worldWidth - 230;
    boss.y = floorY - boss.height;
    boss.baseY = boss.y;
    enemies.push(boss);
  }

  const river = theme.id === "ocean"
    ? { x: 0, y: 74, width: worldWidth, height: floorY + 100 }
    : { x: Math.floor(worldWidth * 0.48), y: floorY - 36, width: 270 + number * 35, height: 78 };

  if (theme.id === "gravel") {
    enemies.push(buildEnemy("drowned", river.x + river.width / 2, number, enemyCount + 1, theme.id));
  }

  const spikeTraps = [];
  for (let i = 0; i < (theme.id === "ocean" ? 0 : 3 + number); i += 1) {
    spikeTraps.push({ x: 760 + i * 430, y: 78, width: 76, height: 38, state: "idle", timer: 0, vy: 0, originalY: 78 });
  }

  const lavaTraps = [];
  for (let i = 0; i < (theme.id === "gravel" ? 2 + number : 0); i += 1) {
    lavaTraps.push({ x: 1110 + i * 520, y: floorY - 10, width: 132, height: 18, state: "safe", timer: 0, shake: 0, permanent: false });
  }
  for (let i = 0; i < (theme.id === "lava" ? 8 + number : 0); i += 1) {
    lavaTraps.push({ x: 410 + i * 360, y: floorY - 6, width: 138, height: 30, state: "lava", timer: 999999, shake: 0, permanent: true });
  }

  const quicksandTraps = [];
  for (let i = 0; i < (theme.id === "desert" ? 3 + Math.floor(number / 2) : 0); i += 1) {
    quicksandTraps.push({ x: 820 + i * 620, y: floorY - 4, width: 150, height: 20, state: "quiet", timer: 0, shake: 0 });
  }

  const bogTraps = [];
  for (let i = 0; i < (theme.id === "swamp" ? 3 + Math.floor(number / 2) : 0); i += 1) {
    bogTraps.push({ x: 760 + i * 570, y: floorY - 5, width: 164, height: 22, state: "quiet", timer: 0, fog: 0 });
  }

  const coral = [];
  for (let i = 0; i < (theme.id === "ocean" ? 10 + number : 0); i += 1) {
    coral.push({ x: 330 + i * 250, y: floorY - 66 + (i % 3) * 14, color: i % 3 });
  }

  const waveHazard = theme.id === "ocean"
    ? { timer: 600, active: false, activeTimer: 0, lane: 1, x: 0, width: 190, height: 74 }
    : null;

  const animals = theme.id === "gravel" ? [
    { kind: "cow", x: 360, y: floorY - 46, width: 62, height: 46, alive: true, vx: 0.45, left: 300, right: 520, phase: 0 },
    { kind: "chicken", x: 720, y: floorY - 30, width: 34, height: 30, alive: true, vx: 0.55, left: 650, right: 860, phase: 20 },
    { kind: "pig", x: 1500, y: floorY - 38, width: 54, height: 38, alive: true, vx: 0.5, left: 1420, right: 1660, phase: 40 },
    { kind: "cow", x: Math.floor(worldWidth * 0.72), y: floorY - 46, width: 62, height: 46, alive: true, vx: 0.48, left: Math.floor(worldWidth * 0.72) - 90, right: Math.floor(worldWidth * 0.72) + 150, phase: 60 },
  ] : [];

  return {
    number,
    theme,
    worldWidth,
    reward: 50 + number * 45,
    platforms,
    stars,
    enemies,
    animals,
    river,
    spikeTraps,
    lavaTraps,
    quicksandTraps,
    bogTraps,
    coral,
    waveHazard,
    chest: {
      x: worldWidth - 150,
      y: floorY - 62,
      width: theme.id === "desert" ? 96 : theme.id === "swamp" ? 104 : theme.id === "lava" ? 118 : 62,
      height: theme.id === "desert" ? 72 : theme.id === "swamp" ? 72 : theme.id === "lava" ? 84 : 52,
      opened: false,
      locked: true,
    },
  };
}

function showMenu(reason) {
  gameState = "menu";
  cancelAnimationFrame(animationFrame);

  if (reason === "win") {
    const nextTheme = getTheme(currentLevel);
    resultLabel.textContent = `第 ${currentLevel - 1} 关胜利！`;
    menuText.textContent = `奖励到手。点击右下角按钮，就会继续第 ${currentLevel} 关：${nextTheme.name}。`;
  } else if (reason === "death") {
    resultLabel.textContent = "挑战失败";
    menuText.textContent = "回商店升级一下，再去试试更聪明的怪物和陷阱。";
  } else {
    const nextTheme = getTheme(currentLevel);
    resultLabel.textContent = "准备冒险";
    menuText.textContent = `当前世界：${nextTheme.name}。砾石草原、海洋、沙漠、沼泽、岩浆世界会不断循环，小星星每个值 6 金币。`;
  }

  level = buildLevel(currentLevel);
  startButton.textContent = `开始第 ${currentLevel} 关：${level.theme.name}`;
  drawMenuBackdrop();
  updateHud();
  renderShop();
  renderWorldTestButtons();
  gameActions.classList.add("is-hidden");
  backpackButton.classList.add("is-hidden");
  backpackPanel.classList.add("is-hidden");
  mainMenu.classList.remove("is-hidden");
}

function update() {
  if (gameState !== "playing") return;

  handleInput();
  movePlayer();
  moveEnemies();
  moveAnimals();
  moveTraps();
  moveWaveHazard();
  moveProjectiles();
  dragonAssistAttack();
  collectStars();
  handleChest();
  checkDangerHits();
  tickTimers();
  updateCamera();
  draw();
  animationFrame = requestAnimationFrame(update);
}

function handleInput() {
  player.vx = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) {
    player.vx = -player.speed;
    player.facing = -1;
  }

  if (keys.has("ArrowRight") || keys.has("KeyD")) {
    player.vx = player.speed;
    player.facing = 1;
  }

  if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && player.onGround) {
    player.vy = player.jumpPower;
    player.onGround = false;
  }

  if ((keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && isPlayerInRiver()) {
    player.vy = -5.8;
  }

  if (hasDragonAdult && (keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW")) && !player.onGround) {
    player.vy = Math.max(player.vy - 0.42, -7.2);
  }

  if (keys.has("KeyJ")) attack();
  if (keys.has("KeyK")) throwGrenade();
}

function isPlayerInRiver() {
  if (!level || !level.river) return false;
  if (level.theme.id === "ocean") return player.y + player.height > level.river.y;
  return touches(player, level.river);
}

function moveWaveHazard() {
  if (!level.waveHazard || !player) return;
  const wave = level.waveHazard;
  if (!wave.active) {
    wave.timer -= 1;
    if (wave.timer <= 0) {
      wave.active = true;
      wave.activeTimer = 150;
      wave.lane = Math.floor(Math.random() * 3);
      wave.x = cameraX + canvas.width + 60;
    }
    return;
  }

  wave.activeTimer -= 1;
  wave.x -= 8;
  const laneY = [110, 235, 350][wave.lane];
  const waveBox = { x: wave.x, y: laneY, width: wave.width, height: wave.height };
  if (touches(player, waveBox)) {
    player.x = 80;
    player.y = floorY - player.height;
    player.vx = 0;
    player.vy = 0;
    effects.push({ x: player.x, y: player.y - 28, width: 130, height: 30, life: 60, kind: "loot", text: "被海浪冲回起点" });
  }

  if (wave.activeTimer <= 0 || wave.x + wave.width < cameraX - 80) {
    wave.active = false;
    wave.timer = 600;
  }
}

function movePlayer() {
  const previousBottom = player.y + player.height;

  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;
  if (isPlayerInRiver()) {
    player.vy *= level.theme.id === "ocean" ? 0.64 : 0.72;
    if (level.theme.id === "ocean" && !diverSkinOwned) {
      player.vx *= 0.72;
    }
  }
  player.onGround = false;

  for (const platform of level.platforms) {
    const nextBottom = player.y + player.height;
    const isFalling = player.vy >= 0;
    const wasAbove = previousBottom <= platform.y + 4;
    const isInsideX = player.x + player.width > platform.x + 8 && player.x < platform.x + platform.width - 8;

    if (isFalling && wasAbove && nextBottom >= platform.y && isInsideX) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
    }
  }

  if (player.y + player.height >= floorY) {
    player.y = floorY - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  player.x = Math.max(18, Math.min(level.worldWidth - player.width - 18, player.x));
}

function moveEnemies() {
  for (const enemy of level.enemies) {
    if (!enemy.alive) continue;
    if (enemy.cagedTimer > 0) {
      continue;
    }

    if (enemy.kind === "lavaBoss") {
      moveLavaBoss(enemy);
      continue;
    }

    const distance = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
    const absDistance = Math.abs(distance);
    const inSight = absDistance < 620;
    enemy.facing = distance > 0 ? 1 : -1;

    if (["bat", "drowned", "fish", "shark", "harpooner", "swampWitch", "lavaMage"].includes(enemy.kind)) {
      enemy.y = enemy.baseY + Math.sin((Date.now() / 160 + enemy.phase) % 80) * (enemy.kind === "shark" ? 16 : 22);
    }

    const attackRange =
      enemy.kind === "shark" || enemy.kind === "harpooner" ? 150 :
      enemy.kind === "crab" || enemy.kind === "scorpion" ? 104 :
      122;

    if (inSight && absDistance > attackRange * 0.55) {
      const speed =
        enemy.kind === "brute" || enemy.kind === "sandGolem" ? 1.35 :
        enemy.kind === "lavaKnight" || enemy.kind === "lavaBeast" || enemy.kind === "lavaAxeGuard" ? 1.45 :
        enemy.kind === "lavaBlade" || enemy.kind === "lavaSoldier" ? 2.25 :
        enemy.kind === "shark" || enemy.kind === "fish" ? 2.55 :
        enemy.kind === "crab" || enemy.kind === "scorpion" ? 1.8 :
        2.05;
      enemy.x += Math.sign(distance) * speed;
    } else if (!inSight) {
      enemy.x += Math.sin((Date.now() / 550 + enemy.phase) % 20) * 0.85;
    }

    enemy.x = inSight
      ? Math.max(18, Math.min(level.worldWidth - enemy.width - 18, enemy.x))
      : Math.max(enemy.patrolLeft, Math.min(enemy.patrolRight, enemy.x));

    if (absDistance <= attackRange && Math.abs(player.y - enemy.y) < 118 && enemy.attackTimer === 0) {
      enemy.attackTimer = enemy.kind === "brute" || enemy.kind === "lavaAxeGuard" ? 92 : 70;
      hurtPlayer(enemy.kind === "brute" || enemy.kind === "shark" || enemy.kind === "lavaAxeGuard" ? 2 : 1);
      effects.push({ x: enemy.x, y: enemy.y + 8, width: enemy.width, height: enemy.height, life: 12, kind: "claw" });
    }
  }
}

function moveLavaBoss(enemy) {
  enemy.bossTimer = Math.max(0, enemy.bossTimer - 1);
  enemy.summonTimer = Math.max(0, enemy.summonTimer - 1);

  if (enemy.bossMode === "hidden") {
    enemy.y = floorY + 18;
    if (enemy.bossTimer <= 0) {
      enemy.bossMode = "emerge";
      enemy.bossTimer = 54;
      enemy.y = floorY - enemy.height;
      effects.push({ x: enemy.x - 20, y: floorY - 90, width: enemy.width + 40, height: 80, life: 38, kind: "boom" });
    }
    return;
  }

  const distance = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
  const absDistance = Math.abs(distance);
  const inSight = absDistance < 760;
  enemy.facing = distance > 0 ? 1 : -1;

  if (enemy.bossMode === "emerge") {
    if (absDistance < 145 && Math.abs(player.y - enemy.y) < 130 && enemy.attackTimer === 0) {
      enemy.attackTimer = 110;
      hurtPlayer(2);
      effects.push({ x: enemy.x + (enemy.facing > 0 ? 92 : -26), y: enemy.y + 44, width: 88, height: 28, life: 18, kind: "claw" });
      if (Math.random() < 0.45) {
        enemy.bossMode = "axeStuck";
        enemy.bossTimer = 120;
      }
    }
    if (enemy.bossTimer <= 0) {
      enemy.bossMode = "armor";
      enemy.bossTimer = 160;
    }
    return;
  }

  if (enemy.bossMode === "axeStuck") {
    if (enemy.bossTimer <= 0) {
      enemy.bossMode = "armor";
      enemy.bossTimer = 150;
    }
    return;
  }

  if (inSight && absDistance > 110) {
    enemy.x += Math.sign(distance) * 1.25;
    enemy.x = Math.max(18, Math.min(level.worldWidth - enemy.width - 18, enemy.x));
  } else if (!inSight) {
    enemy.x += Math.sin((Date.now() / 620 + enemy.phase) % 20) * 0.8;
    enemy.x = Math.max(enemy.patrolLeft, Math.min(enemy.patrolRight, enemy.x));
  }

  if (enemy.summonTimer <= 0) {
    summonLavaAxeGuard(enemy);
    enemy.summonTimer = 260;
  }

  if (absDistance < 170 && enemy.attackTimer === 0) {
    enemy.bossMode = "emerge";
    enemy.bossTimer = 58;
  }
}

function summonLavaAxeGuard(boss) {
  const aliveSummons = level.enemies.filter((enemy) => enemy.alive && enemy.kind === "lavaAxeGuard").length;
  if (aliveSummons >= 3) return;
  const guard = buildEnemy("lavaAxeGuard", boss.x - boss.facing * 150, level.number, aliveSummons + 1, "lava");
  guard.patrolLeft = Math.max(260, guard.x - 180);
  guard.patrolRight = Math.min(level.worldWidth - 140, guard.x + 180);
  level.enemies.push(guard);
  effects.push({ x: guard.x - 10, y: guard.y - 28, width: guard.width + 20, height: 40, life: 46, kind: "boom" });
}

function moveAnimals() {
  for (const animal of level.animals) {
    if (!animal.alive) continue;
    animal.phase = (animal.phase || 0) + 0.08;
    animal.x += animal.vx;
    if (animal.x < animal.left || animal.x + animal.width > animal.right) {
      animal.vx *= -1;
    }
  }
}

function dragonAssistAttack() {
  if (!hasDragonAdult || !player || dragonAttackTimer > 0) return;
  const dragonReady = inventory.dragonNest > 0 && inventory.dragonWand > 0;
  if (!dragonReady) return;

  const playerCenter = player.x + player.width / 2;
  let target = null;
  let bestDistance = Infinity;
  for (const enemy of level.enemies) {
    if (!enemy.alive || enemy.kind === "lavaBoss" && enemy.bossMode === "hidden") continue;
    const enemyCenter = enemy.x + enemy.width / 2;
    const distance = Math.abs(enemyCenter - playerCenter);
    if (distance < 430 && Math.abs(enemy.y - player.y) < 190 && distance < bestDistance) {
      target = enemy;
      bestDistance = distance;
    }
  }

  if (!target) return;
  dragonAttackTimer = 84;
  effects.push({
    x: Math.min(player.x, target.x),
    y: Math.min(player.y, target.y) + 18,
    width: Math.abs(target.x - player.x) + target.width,
    height: 22,
    life: 18,
    kind: "dragonFire",
  });
  damageEnemy(target, getAttackDamage(18));
}

function moveTraps() {
  for (const trap of level.spikeTraps) {
    const underTrap = player.x + player.width > trap.x && player.x < trap.x + trap.width && player.y > trap.y;

    if (trap.state === "idle" && underTrap) {
      trap.state = "warning";
      trap.timer = 34;
    } else if (trap.state === "warning") {
      trap.timer -= 1;
      if (trap.timer <= 0) {
        trap.state = "falling";
        trap.vy = 0;
      }
    } else if (trap.state === "falling") {
      trap.vy += 0.9;
      trap.y += trap.vy;
      if (trap.y > floorY - trap.height) {
        trap.state = "resetting";
        trap.timer = 70;
      }
    } else if (trap.state === "resetting") {
      trap.timer -= 1;
      if (trap.timer <= 0) {
        trap.y = trap.originalY;
        trap.state = "idle";
      }
    }
  }

  for (const trap of level.lavaTraps) {
    const onTrap = player.x + player.width > trap.x && player.x < trap.x + trap.width && player.y + player.height >= floorY - 4;

    if (trap.state === "safe" && onTrap) {
      trap.state = "shaking";
      trap.timer = 74;
    } else if (trap.state === "shaking") {
      trap.timer -= 1;
      trap.shake = trap.timer % 12 < 6 ? -4 : 4;
      if (trap.timer <= 0) {
        trap.state = "lava";
        trap.timer = 170;
        trap.shake = 0;
      }
    } else if (trap.state === "lava") {
      if (!trap.permanent) trap.timer -= 1;
      if (onTrap && !isFireResistant()) hurtPlayer(1);
      if (!trap.permanent && trap.timer <= 0) {
        trap.state = "safe";
      }
    }
  }

  for (const trap of level.quicksandTraps) {
    const onTrap = player.x + player.width > trap.x && player.x < trap.x + trap.width && player.y + player.height >= floorY - 8;
    if (trap.state === "quiet" && onTrap) {
      trap.state = "sinking";
      trap.timer = 180;
    } else if (trap.state === "sinking") {
      trap.shake = trap.timer % 14 < 7 ? -3 : 3;
      if (onTrap) {
        trap.timer -= 1;
        player.vx *= 0.35;
        player.y += 0.45;
        if (trap.timer <= 0) {
          trap.state = "swallowed";
          trap.timer = 140;
          hurtPlayer(2);
        }
      } else {
        trap.state = "quiet";
        trap.timer = 0;
        trap.shake = 0;
      }
    } else if (trap.state === "swallowed") {
      trap.timer -= 1;
      if (trap.timer <= 0) trap.state = "quiet";
    }
  }

  for (const trap of level.bogTraps) {
    const onTrap = player.x + player.width > trap.x && player.x < trap.x + trap.width && player.y + player.height >= floorY - 8;
    if (trap.state === "quiet" && onTrap) {
      trap.state = "blinding";
      trap.timer = 180;
      trap.fog = 0;
    } else if (trap.state === "blinding") {
      trap.fog = Math.min(1, trap.fog + 0.01);
      if (onTrap) {
        trap.timer -= 1;
        player.vx *= 0.42;
        if (trap.timer <= 0) {
          trap.state = "swallowed";
          trap.timer = 140;
          hurtPlayer(2);
        }
      } else {
        trap.state = "quiet";
        trap.timer = 0;
        trap.fog = 0;
      }
    } else if (trap.state === "swallowed") {
      trap.timer -= 1;
      trap.fog = Math.max(0, trap.fog - 0.015);
      if (trap.timer <= 0) trap.state = "quiet";
    }
  }
}

function attack() {
  const weapon = weapons[weaponLevel];
  if (player.attackTimer > 0) return;

  playSound("attack");
  player.attackTimer = weapon.cooldown;
  player.attacking = 12;

  if (weapon.kind === "melee" || weapon.kind === "fireSword") {
    const hitBox = {
      x: player.facing > 0 ? player.x + player.width - 6 : player.x - weapon.range + 6,
      y: player.y + 18,
      width: weapon.range,
      height: 42,
    };
    damageEnemiesIfHit(hitBox, getAttackDamage(weapon.damage));
    effects.push({ x: hitBox.x, y: hitBox.y, width: hitBox.width, height: hitBox.height, life: 10, kind: "slash" });
    return;
  }

  spawnBullet(weapon);
}

function getAttackDamage(baseDamage) {
  return baseDamage * (2 ** (heroLevel - 1)) * (powerBoostTimer > 0 ? 3 : 1);
}

function getMaxHearts() {
  return 2 + heroLevel - 1;
}

function throwGrenade() {
  if (gameState !== "playing") return;
  if (player.grenadeTimer > 0) return;

  player.grenadeTimer = 42;
  projectiles.push({
    x: player.facing > 0 ? player.x + player.width : player.x - 14,
    y: player.y + 20,
    width: 22,
    height: 22,
    vx: 9.6 * player.facing,
    vy: -6.8,
    damage: getAttackDamage(60),
    rangeLeft: 560,
    kind: "grenade",
    timer: 42,
  });
  effects.push({ x: player.x + player.width / 2, y: player.y + 18, width: 32, height: 32, life: 8, kind: "throw" });
}

function useProfessionSkill() {
  if (gameState !== "playing" || !player || player.skillTimer > 0) return;

  if (selectedProfession === "doctor") {
    player.hearts = getMaxHearts();
    player.skillTimer = 180;
    effects.push({ x: player.x - 10, y: player.y - 28, width: 90, height: 30, life: 44, kind: "heal" });
  }

  if (selectedProfession === "police") {
    player.skillTimer = 90;
    projectiles.push({
      x: player.facing > 0 ? player.x + player.width : player.x - 18,
      y: player.y + 28,
      width: 24,
      height: 24,
      vx: 10 * player.facing,
      vy: 0,
      damage: 0,
      rangeLeft: 560,
      kind: "cage",
    });
  }

  if (selectedProfession === "boxer") {
    blackFistTimer = 360;
    player.skillTimer = 420;
    effects.push({ x: player.x - 10, y: player.y - 28, width: 100, height: 30, life: 70, kind: "blackFist" });
  }

  updateHud();
}

function usePowerPotion() {
  if (inventory.powerPotion <= 0) return;
  inventory.powerPotion -= 1;
  powerBoostTimer = 900;
  effects.push({ x: player ? player.x : cameraX + 360, y: player ? player.y - 28 : 250, width: 130, height: 30, life: 70, kind: "power" });
  updateHud();
  renderBackpack();
}

function useFireResistPotion() {
  if (inventory.fireResistPotion <= 0) return;
  inventory.fireResistPotion -= 1;
  fireResistTimer = 3600;
  effects.push({ x: player ? player.x - 12 : cameraX + 340, y: player ? player.y - 34 : 250, width: 150, height: 30, life: 90, kind: "fireResist" });
  updateHud();
  renderBackpack();
}

function useMedkit() {
  if (!player || inventory.medkit <= 0) return;
  inventory.medkit -= 1;
  player.hearts = getMaxHearts();
  effects.push({ x: player.x - 10, y: player.y - 28, width: 90, height: 30, life: 44, kind: "heal" });
  updateHud();
  renderBackpack();
}

function spawnBullet(weapon) {
  const speed = weapon.kind === "rocket" ? 8 : 12;
  projectiles.push({
    x: player.facing > 0 ? player.x + player.width : player.x - 12,
    y: player.y + 34,
    width: weapon.kind === "rocket" ? 24 : 12,
    height: weapon.kind === "rocket" ? 12 : 6,
    vx: speed * player.facing,
    vy: 0,
    damage: getAttackDamage(weapon.damage),
    rangeLeft: weapon.range,
    kind: weapon.kind,
  });
}

function moveProjectiles() {
  for (const projectile of projectiles) {
    projectile.x += projectile.vx;
    projectile.y += projectile.vy || 0;
    projectile.rangeLeft -= Math.abs(projectile.vx);

    if (projectile.kind === "grenade") {
      projectile.vy += 0.34;
      projectile.timer -= 1;
      if (projectile.y + projectile.height >= floorY) {
        projectile.y = floorY - projectile.height;
        projectile.vy *= -0.48;
      }

      for (const enemy of level.enemies) {
        if (enemy.alive && touches(projectile, enemy)) {
          explode(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2, projectile.damage, 112);
          projectile.rangeLeft = 0;
          break;
        }
      }

      for (const animal of level.animals) {
        if (animal.alive && touches(projectile, animal)) {
          collectAnimal(animal);
          projectile.rangeLeft = 0;
          break;
        }
      }

      if (projectile.timer <= 0) {
        explode(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2, projectile.damage, 112);
        projectile.rangeLeft = 0;
      }
      continue;
    }

    for (const enemy of level.enemies) {
      if (enemy.alive && touches(projectile, enemy)) {
        if (projectile.kind === "cage") {
          enemy.cagedTimer = 600;
          effects.push({ x: enemy.x - 8, y: enemy.y - 12, width: enemy.width + 16, height: enemy.height + 22, life: 60, kind: "cageHit" });
        } else {
          damageEnemy(enemy, projectile.damage);
        }
        projectile.rangeLeft = 0;
        if (projectile.kind === "rocket") explode(projectile.x, projectile.y, projectile.damage, 86);
        break;
      }
    }
    for (const animal of level.animals) {
      if (animal.alive && touches(projectile, animal)) {
        collectAnimal(animal);
        projectile.rangeLeft = 0;
        break;
      }
    }
  }

  projectiles = projectiles.filter((projectile) => projectile.rangeLeft > 0 && projectile.x > cameraX - 80 && projectile.x < cameraX + canvas.width + 80);
}

function explode(x, y, damage, radius) {
  effects.push({ x: x - radius / 2, y: y - radius / 2, width: radius, height: radius, life: 18, kind: "boom" });

  for (const enemy of level.enemies) {
    const dx = enemy.x + enemy.width / 2 - x;
    const dy = enemy.y + enemy.height / 2 - y;
    if (enemy.alive && Math.hypot(dx, dy) < radius) {
      damageEnemy(enemy, damage);
    }
  }
  for (const animal of level.animals) {
    const dx = animal.x + animal.width / 2 - x;
    const dy = animal.y + animal.height / 2 - y;
    if (animal.alive && Math.hypot(dx, dy) < radius) {
      collectAnimal(animal);
    }
  }
}

function damageEnemiesIfHit(hitBox, damage) {
  for (const enemy of level.enemies) {
    if (enemy.alive && touches(hitBox, enemy)) {
      damageEnemy(enemy, damage);
    }
  }
  for (const animal of level.animals) {
    if (animal.alive && touches(hitBox, animal)) {
      collectAnimal(animal);
    }
  }
}

function damageEnemy(enemy, damage) {
  if (enemy.kind === "lavaBoss") {
    if (enemy.bossMode === "hidden") {
      effects.push({ x: enemy.x, y: floorY - 44, width: 120, height: 28, life: 32, kind: "miss" });
      return;
    }
    if (enemy.bossMode === "armor" && Math.random() < 0.32) {
      enemy.bossMode = "hidden";
      enemy.bossTimer = 92;
      effects.push({ x: enemy.x - 18, y: floorY - 78, width: enemy.width + 36, height: 64, life: 42, kind: "boom" });
      updateHud();
      return;
    }
    if (enemy.bossMode === "axeStuck") {
      damage *= 1.5;
    }
  }

  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hurtFlash = 10;

  if (enemy.hp === 0) {
    enemy.alive = false;
    if (monsterXp[enemy.kind]) {
      addExperience(monsterXp[enemy.kind], enemy.x, enemy.y);
    }
    effects.push({ x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height, life: 24, kind: "poof" });
    if (level.enemies.every((monster) => !monster.alive)) {
      level.chest.locked = false;
      effects.push({ x: level.chest.x - 42, y: level.chest.y - 42, width: 160, height: 36, life: 110, kind: "unlock" });
    }
  }
  updateHud();
}

function collectAnimal(animal) {
  if (!animal.alive) return;
  animal.alive = false;
  const gained = animal.kind === "cow" ? 1 + Math.floor(Math.random() * 2) : animal.kind === "pig" ? 1 : 0;
  playSound(animal.kind);
  effects.push({ x: animal.x, y: animal.y - 20, width: animal.width, height: animal.height, life: 34, kind: "animalPoof" });
  if (gained > 0) {
    addExperience(gained, animal.x, animal.y);
    playSound("animalDrop");
  }
}

function addExperience(amount, x, y) {
  experience += amount;
  effects.push({ x, y: y - 18, width: 80, height: 26, life: 58, kind: "xp", amount });
  while (experience >= experienceNeeded) {
    experience -= experienceNeeded;
    heroLevel += 1;
    if (player) {
      player.hearts = Math.min(getMaxHearts(), player.hearts + 1);
    }
    playSound("levelUp");
    effects.push({ x: player ? player.x - 18 : x, y: player ? player.y - 38 : y, width: 150, height: 30, life: 90, kind: "levelUp" });
  }
  updateHud();
}

function collectStars() {
  for (const star of level.stars) {
    if (!star.collected && touches(player, starBox(star))) {
      star.collected = true;
      coins += starValue;
      effects.push({ x: star.x - 28, y: star.y - 32, width: 90, height: 30, life: 42, kind: "starCoins" });
      updateHud();
    }
  }
}

function handleChest() {
  const chest = level.chest;
  if (!chest.opened && !chest.locked && touches(player, chest)) {
    chest.opened = true;
    const drops = rollChestDrops(level.number);
    coins += drops.coins;
    const cameFromSwamp = level.theme.id === "swamp";
    currentLevel += 1;
    updateHud();
    renderBackpack();
    effects.push({ x: chest.x - 4, y: chest.y - 36, width: 150, height: 36, life: 70, kind: "coins", amount: drops.coins });
    if (cameFromSwamp) {
      effects.push({ x: chest.x - 26, y: chest.y - 82, width: 210, height: 30, life: 80, kind: "loot", text: "传送到岩浆世界！" });
    } else if (drops.message) {
      effects.push({ x: chest.x - 18, y: chest.y - 76, width: 190, height: 30, life: 100, kind: "loot", text: drops.message });
    }
    draw();
    if (cameFromSwamp) {
      setTimeout(() => enterNextLevelFromPortal(), 450);
    } else {
      setTimeout(() => showMenu("win"), 450);
    }
  }
}

function enterNextLevelFromPortal() {
  if (gameState !== "playing") return;
  level = buildLevel(currentLevel);
  player.x = 80;
  player.y = floorY - player.height;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  projectiles = [];
  effects = [{ x: player.x + 20, y: player.y - 34, width: 170, height: 30, life: 90, kind: "loot", text: "岩浆世界开启！" }];
  cameraX = 0;
  updateHud();
  draw();
}

function rollChestDrops(levelNumber) {
  const maxCoins = Math.min(60, 50 + Math.max(0, levelNumber - 1) * 5);
  const coinChoices = [10, 20, 30, maxCoins];
  const chestCoins = coinChoices[Math.floor(Math.random() * coinChoices.length)];
  const drops = [];

  if (Math.random() < 0.96) {
    inventory.stinkSock += 1;
    drops.push("臭袜子");
  }

  if (Math.random() < (levelNumber >= 2 ? 0.35 : 0.3)) {
    if (Math.random() < 0.5) {
      inventory.lightningSword += 1;
      drops.push("闪电剑");
    } else {
      inventory.fireSwordLoot = (inventory.fireSwordLoot || 0) + 1;
      ownedWeapons[5] = true;
      drops.push("火焰剑");
    }
  }

  if (Math.random() < 0.006) {
    if (Math.random() < 0.5) {
      inventory.lightningBoots += 1;
      drops.push("闪电靴子");
    } else {
      inventory.skyAxe += 1;
      drops.push("轰天斧");
    }
  }

  if (Math.random() < 0.001) {
    inventory.dragonEgg += 1;
    drops.push("龙蛋");
  }
  if (Math.random() < 0.003) {
    if (Math.random() < 0.5) {
      inventory.dragonWand += 1;
      drops.push("驯龙杖");
    } else {
      inventory.dragonNest += 1;
      drops.push("驯龙巢");
    }
  }
  if (Math.random() < 0.1) {
    inventory.beef += 1;
    drops.push("牛肉");
  }

  return { coins: chestCoins, message: drops.length ? drops.join("、") : "" };
}

function checkDangerHits() {
  for (const enemy of level.enemies) {
    if (enemy.alive && touches(player, enemy)) {
      hurtPlayer(1);
    }
  }

  for (const trap of level.spikeTraps) {
    if (trap.state === "falling" && touches(player, trap)) {
      if (!isFireResistant()) hurtPlayer(1);
    }
  }

  for (const trap of level.quicksandTraps) {
    if (trap.state === "swallowed" && touches(player, trap)) hurtPlayer(1);
  }

  for (const trap of level.bogTraps) {
    if (trap.state === "swallowed" && touches(player, trap)) hurtPlayer(1);
  }
}

function hurtPlayer(amount) {
  if (blackFistTimer > 0 || player.invincible > 0 || gameState !== "playing") return;

  playSound("hurt");
  player.hearts -= amount;
  player.invincible = 76;
  player.vx = -player.facing * 9;
  player.vy = -9;
  updateHud();

  if (player.hearts <= 0) {
    showMenu("death");
  }
}

function renderShop() {
  shopItems.innerHTML = "";

  for (const item of shopGoods) {
    const button = document.createElement("button");
    const owned =
      item.type === "horse" ? hasHorse :
      item.type === "skin" && item.item === "diverSkin" ? diverSkinOwned :
      item.type === "item" && item.item === "speedPotion" ? speedPotionOwned :
      item.type === "weapon" && ownedWeapons[item.index];
    const lockedByOrder = item.type === "weapon" && item.index > 0 && !ownedWeapons[item.index - 1] && !owned;
    button.type = "button";
    button.className = owned ? "shop-item is-owned" : "shop-item";
    button.disabled = owned || lockedByOrder || coins < item.cost;
    button.innerHTML = `<strong>${item.name}</strong><span>${owned ? "已拥有" : `${item.cost} 金币`}</span>`;
    button.addEventListener("click", () => buyItem(item));
    shopItems.append(button);
  }
}

function renderProfessions() {
  professionChoices.innerHTML = "";
  professionHint.textContent = `${professions[selectedProfession].name}：${professions[selectedProfession].description}`;

  for (const [id, profession] of Object.entries(professions)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = id === selectedProfession ? "is-selected" : "";
    button.innerHTML = `<strong>${profession.name}</strong><span>${profession.description}</span>`;
    button.addEventListener("click", () => {
      selectedProfession = id;
      updateHud();
      renderProfessions();
    });
    professionChoices.append(button);
  }
}

function renderBackpack() {
  inventoryItems.innerHTML = "";
  const rows = [
    { key: "slots", name: `物品栏 6格：${getQuickSlotsText()}`, count: 1, action: "整理", onClick: renderBackpack },
    { key: "stinkSock", name: "臭袜子", count: inventory.stinkSock, action: "卖 1", onClick: () => sellTreasure("stinkSock", 1) },
    { key: "powerPotion", name: "力量药水", count: inventory.powerPotion, action: "使用", onClick: usePowerPotion },
    { key: "fireResistPotion", name: "抗火药水", count: inventory.fireResistPotion, action: "使用", onClick: useFireResistPotion },
    { key: "medkit", name: "医疗包", count: inventory.medkit, action: "使用", onClick: useMedkit },
    { key: "lightningSword", name: "闪电剑", count: inventory.lightningSword, action: "装备", onClick: () => equipLootWeapon("lightningSword") },
    { key: "fireSwordLoot", name: "火焰剑", count: inventory.fireSwordLoot || 0, action: "装备", onClick: () => equipWeapon(5) },
    { key: "lightningBoots", name: "闪电靴子", count: inventory.lightningBoots, action: "装备", onClick: () => useLightningBoots() },
    { key: "skyAxe", name: "轰天斧", count: inventory.skyAxe, action: "装备", onClick: () => equipLootWeapon("skyAxe") },
    { key: "dragonEgg", name: `龙蛋/幼龙 喂养${dragonFeedCount}/10`, count: inventory.dragonEgg, action: "喂牛肉", onClick: feedDragon },
    { key: "dragonWand", name: "驯龙杖", count: inventory.dragonWand, action: "查看", onClick: renderBackpack },
    { key: "dragonNest", name: "驯龙巢", count: inventory.dragonNest, action: "查看", onClick: renderBackpack },
    { key: "beef", name: "牛肉", count: inventory.beef, action: "喂龙", onClick: feedDragon },
  ];

  weapons.forEach((weapon, index) => {
    if (ownedWeapons[index]) {
      rows.push({ key: `weapon${index}`, name: weapon.name, count: 1, action: index === weaponLevel ? "已装备" : "装备", onClick: () => equipWeapon(index) });
    }
  });

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = row.key === "slots" ? "inventory-item inventory-item--slots" : row.key.startsWith("weapon") ? "inventory-item inventory-item--equipped" : "inventory-item";
    item.innerHTML = `<span>${row.name} x${row.count}</span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = row.action;
    button.disabled = row.count <= 0 || row.action === "已装备";
    button.addEventListener("click", row.onClick);
    item.append(button);
    inventoryItems.append(item);
  }
}

function sellTreasure(key, value) {
  if (inventory[key] <= 0) return;
  inventory[key] -= 1;
  coins += value;
  updateHud();
  renderBackpack();
  renderShop();
}

function buyItem(item) {
  const owned =
    item.type === "horse" ? hasHorse :
    item.type === "skin" && item.item === "diverSkin" ? diverSkinOwned :
      item.type === "item" && item.item === "speedPotion" ? speedPotionOwned :
      item.type === "weapon" && ownedWeapons[item.index];
  if (owned || coins < item.cost) return;
  if (item.type === "weapon" && item.index > 0 && !ownedWeapons[item.index - 1]) return;

  coins -= item.cost;
  if (item.type === "horse") {
    hasHorse = true;
  } else if (item.type === "skin" && item.item === "diverSkin") {
    diverSkinOwned = true;
  } else if (item.type === "item" && item.item === "speedPotion") {
    speedPotionOwned = true;
  } else if (item.type === "item") {
    inventory[item.item] += 1;
  } else {
    ownedWeapons[item.index] = true;
    weaponLevel = item.index;
  }
  updateHud();
  renderShop();
  renderBackpack();
}

function tickTimers() {
  player.attackTimer = Math.max(0, player.attackTimer - 1);
  player.grenadeTimer = Math.max(0, player.grenadeTimer - 1);
  player.skillTimer = Math.max(0, player.skillTimer - 1);
  player.attacking = Math.max(0, player.attacking - 1);
  player.invincible = Math.max(0, player.invincible - 1);
  powerBoostTimer = Math.max(0, powerBoostTimer - 1);
  fireResistTimer = Math.max(0, fireResistTimer - 1);
  blackFistTimer = Math.max(0, blackFistTimer - 1);
  dragonAttackTimer = Math.max(0, dragonAttackTimer - 1);

  for (const enemy of level.enemies) {
    enemy.hurtFlash = Math.max(0, enemy.hurtFlash - 1);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - 1);
    enemy.cagedTimer = Math.max(0, enemy.cagedTimer - 1);
  }

  for (const effect of effects) {
    effect.life -= 1;
  }
  effects = effects.filter((effect) => effect.life > 0);
  updateActionButtons();
}

function updateCamera() {
  const target = player.x + player.width / 2 - canvas.width * 0.42;
  cameraX += (target - cameraX) * 0.14;
  cameraX = Math.max(0, Math.min(level.worldWidth - canvas.width, cameraX));
}

function updateHud() {
  const remainingMonsters = level ? level.enemies.filter((enemy) => enemy.alive).length : 0;
  levelNumberElement.textContent = currentLevel;
  if (themeNameElement) {
    themeNameElement.textContent = level ? level.theme.name : getTheme(currentLevel).name;
  }
  playCountElement.textContent = playCount;
  coinsElement.textContent = coins;
  heroLevelElement.textContent = heroLevel;
  experienceElement.textContent = `${experience}/${experienceNeeded}`;
  heartsElement.textContent = player ? `${Math.max(0, player.hearts)}/${getMaxHearts()}` : getMaxHearts();
  monsterCountElement.textContent = remainingMonsters;
  professionNameElement.textContent = professions[selectedProfession].name;
  const fireText = fireResistTimer > 0 ? ` 抗火${Math.ceil(fireResistTimer / 60)}秒` : "";
  weaponNameElement.textContent = `${hasHorse ? `${weapons[weaponLevel].name}+马` : weapons[weaponLevel].name}${fireText}`;
  menuPlayCount.textContent = playCount;
  menuCoins.textContent = coins;
  updateActionButtons();
}

function updateActionButtons() {
  const inGame = gameState === "playing" && Boolean(player);
  healButton.classList.toggle("is-hidden", selectedProfession !== "doctor");
  cageButton.classList.toggle("is-hidden", selectedProfession !== "police");
  blackFistButton.classList.toggle("is-hidden", selectedProfession !== "boxer");
  healButton.classList.toggle("is-active-skill", selectedProfession === "doctor");
  cageButton.classList.toggle("is-active-skill", selectedProfession === "police");
  blackFistButton.classList.toggle("is-active-skill", selectedProfession === "boxer");
  healButton.textContent = player && player.skillTimer > 0 && selectedProfession === "doctor" ? "回复冷却中" : "回复";
  cageButton.textContent = player && player.skillTimer > 0 && selectedProfession === "police" ? "牢笼冷却中" : "牢笼";
  blackFistButton.textContent = blackFistTimer > 0 ? "黑拳生效中" : player && player.skillTimer > 0 && selectedProfession === "boxer" ? "黑拳冷却中" : "黑拳";
  healButton.disabled = !inGame || selectedProfession !== "doctor" || player.skillTimer > 0;
  cageButton.disabled = !inGame || selectedProfession !== "police" || player.skillTimer > 0;
  blackFistButton.disabled = !inGame || selectedProfession !== "boxer" || player.skillTimer > 0;
  powerPotionButton.disabled = !inGame || inventory.powerPotion <= 0;
  medkitButton.disabled = !inGame || inventory.medkit <= 0;
}

function touches(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function starBox(star) {
  return {
    x: star.x - star.size / 2,
    y: star.y - star.size / 2,
    width: star.size,
    height: star.size,
  };
}

function draw() {
  drawWorld();
  drawStars();
  drawWaveHazard();
  drawTraps();
  drawChest();
  drawAnimals();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawEffects();
  drawQuickSlots();
}

function drawMenuBackdrop() {
  cameraX = Math.max(0, Math.min(level.worldWidth - canvas.width, level.worldWidth - canvas.width - 120));
  drawWorld();
  drawTraps();
  drawPixelSign(cameraX + 318, 238, "LONG QUEST");
}

function drawWorld() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  drawSky();
  drawGround();
  drawRiver();
  drawThemeDecor();
  drawPlatforms();
  ctx.restore();
}

function getQuickSlotsText() {
  return ["武器", "药水", "抗火", "医疗", "龙", "金币"].join(" / ");
}

function drawQuickSlots() {
  if (gameState !== "playing") return;
  const slots = [
    weapons[weaponLevel].name,
    `力${inventory.powerPotion}`,
    `抗${inventory.fireResistPotion}`,
    `医${inventory.medkit}`,
    hasDragonAdult ? "成年龙" : `龙${dragonFeedCount}`,
    `${coins}`,
  ];
  ctx.save();
  const startX = canvas.width / 2 - 174;
  const y = canvas.height - 58;
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i === 0 ? "rgba(255, 211, 77, 0.95)" : "rgba(33, 27, 44, 0.82)";
    ctx.fillRect(startX + i * 58, y, 50, 46);
    ctx.fillStyle = i === 0 ? "#211b2c" : "#fff4c7";
    ctx.font = "900 13px Microsoft YaHei, sans-serif";
    ctx.fillText(String(slots[i]).slice(0, 4), startX + i * 58 + 7, y + 27);
  }
  ctx.restore();
}

function equipWeapon(index) {
  if (!ownedWeapons[index]) return;
  weaponLevel = index;
  updateHud();
  renderBackpack();
  renderShop();
}

function equipLootWeapon(key) {
  if ((inventory[key] || 0) <= 0) return;
  if (specialWeaponIndexes[key] === undefined) {
    const weapon = key === "lightningSword"
      ? { name: "闪电剑", cost: 0, damage: 66, range: 104, cooldown: 18, kind: "magic" }
      : { name: "轰天斧", cost: 0, damage: 90, range: 116, cooldown: 32, kind: "melee" };
    weapons.push(weapon);
    ownedWeapons.push(true);
    specialWeaponIndexes[key] = weapons.length - 1;
  }
  weaponLevel = specialWeaponIndexes[key];
  updateHud();
  renderBackpack();
}

function useLightningBoots() {
  if (inventory.lightningBoots <= 0 || lightningBootsEquipped) return;
  lightningBootsEquipped = true;
  if (player) {
    player.speed *= 1.25;
    effects.push({ x: player.x - 10, y: player.y - 28, width: 120, height: 30, life: 70, kind: "loot", text: "闪电靴加速" });
  }
  updateHud();
  renderBackpack();
}

function feedDragon() {
  if (inventory.beef <= 0 || inventory.dragonEgg <= 0 || inventory.dragonNest <= 0) return;
  inventory.beef -= 1;
  dragonFeedCount += 1;
  if (dragonFeedCount >= 10) {
    hasDragonAdult = true;
    if (player) {
      player.speed = Math.max(player.speed, 5.6 * (speedPotionOwned ? 2 : 1) * (lightningBootsEquipped ? 1.25 : 1));
      player.jumpPower = Math.min(player.jumpPower, -15.5);
    }
    effects.push({ x: player ? player.x - 20 : cameraX + 320, y: player ? player.y - 38 : 230, width: 170, height: 30, life: 110, kind: "loot", text: "龙成年了！" });
  }
  updateHud();
  renderBackpack();
}

function isFireResistant() {
  return fireResistTimer > 0;
}

function renderWorldTestButtons() {
  if (!worldTestButtons) return;
  worldTestButtons.innerHTML = "";

  worldThemes.forEach((theme, index) => {
    const levelNumber = index + 1;
    const button = document.createElement("button");
    button.type = "button";
    button.className = getTheme(currentLevel).id === theme.id ? "is-current" : "";
    button.textContent = `测试${theme.name}`;
    button.addEventListener("click", () => {
      currentLevel = levelNumber;
      level = buildLevel(currentLevel);
      resultLabel.textContent = `测试：${theme.name}`;
      menuText.textContent = `已切换到第 ${currentLevel} 关：${theme.name}。点击右下角按钮开始测试。`;
      startButton.textContent = `开始第 ${currentLevel} 关：${level.theme.name}`;
      updateHud();
      drawMenuBackdrop();
      renderWorldTestButtons();
    });
    worldTestButtons.append(button);
  });
}

function drawSky() {
  const themeId = level.theme.id;
  ctx.fillStyle =
    themeId === "ocean" ? "#2387c8" :
    themeId === "desert" ? "#f2b866" :
    themeId === "lava" ? "#3a1620" :
    themeId === "swamp" ? "#7c8a67" :
    "#6dcff6";
  ctx.fillRect(cameraX, 0, canvas.width, canvas.height);
  ctx.fillStyle =
    themeId === "ocean" ? "#126aa6" :
    themeId === "desert" ? "#d89047" :
    themeId === "lava" ? "#5c1d22" :
    themeId === "swamp" ? "#536247" :
    "#4db4e6";
  ctx.fillRect(cameraX, 284, canvas.width, 170);

  for (let x = 80; x < level.worldWidth && themeId !== "ocean"; x += 470) {
    drawBlockCloud(x, 78 + (x % 3) * 18, x % 2 === 0 ? 3 : 4);
  }

  ctx.fillStyle = "#ffe66d";
  ctx.fillRect(cameraX + 54, 52, 56, 56);
  ctx.fillStyle = "#fff29a";
  ctx.fillRect(cameraX + 70, 66, 24, 24);
}

function drawBlockCloud(x, y, scale) {
  const size = 12 * scale;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y + size, size * 6, size);
  ctx.fillRect(x + size, y, size * 4, size);
  ctx.fillRect(x + size * 2, y - size, size * 2, size);
}

function drawGround() {
  const themeId = level.theme.id;
  ctx.fillStyle =
    themeId === "ocean" ? "#135b87" :
    themeId === "desert" ? "#e4b757" :
    themeId === "lava" ? "#21161b" :
    themeId === "swamp" ? "#48613e" :
    "#42c96d";
  ctx.fillRect(0, floorY, level.worldWidth, canvas.height - floorY);
  ctx.fillStyle =
    themeId === "ocean" ? "#0d4161" :
    themeId === "desert" ? "#b98a38" :
    themeId === "lava" ? "#ff5a2e" :
    themeId === "swamp" ? "#2f442d" :
    "#2aa654";
  ctx.fillRect(0, floorY, level.worldWidth, 16);
  ctx.fillStyle =
    themeId === "ocean" ? "#0a324a" :
    themeId === "desert" ? "#8f6631" :
    themeId === "lava" ? "#3b1513" :
    themeId === "swamp" ? "#203022" :
    "#7d4a2b";
  ctx.fillRect(0, floorY + 42, level.worldWidth, canvas.height - floorY - 42);

  for (let x = 0; x < level.worldWidth; x += 32) {
    ctx.fillStyle = themeId === "lava" ? (x % 64 === 0 ? "#ff8a2d" : "#cc3c21") : x % 64 === 0 ? "#216f3e" : "#2d8c4a";
    ctx.fillRect(x, floorY + 16, 16, 10);
  }
}

function drawPlatforms() {
  for (const platform of level.platforms) {
    const themeId = level.theme.id;
    ctx.fillStyle = themeId === "lava" ? "#2b2229" : themeId === "desert" ? "#8f6631" : themeId === "swamp" ? "#3b3024" : "#6a3d24";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = themeId === "lava" ? "#ff7a2e" : themeId === "desert" ? "#f0cc72" : themeId === "swamp" ? "#5d7e45" : "#45d06f";
    ctx.fillRect(platform.x, platform.y - 12, platform.width, 14);
    ctx.fillStyle = themeId === "lava" ? "#ffd34d" : themeId === "desert" ? "#c99b44" : themeId === "swamp" ? "#324c33" : "#2b9a54";
    ctx.fillRect(platform.x, platform.y, platform.width, 5);
  }
}

function drawRiver() {
  const river = level.river;
  const isOcean = level.theme.id === "ocean";
  ctx.fillStyle = isOcean ? "#126aa6" : "#1d8fd8";
  ctx.fillRect(river.x, river.y, river.width, river.height);
  ctx.fillStyle = isOcean ? "rgba(101, 215, 255, 0.45)" : "#65d7ff";
  const drift = Math.floor(Date.now() / 90) % 46;
  for (let x = river.x + 12 - drift; x < river.x + river.width; x += 46) {
    ctx.fillRect(x, river.y + 14, 24, 5);
    ctx.fillRect(x + 18, river.y + 42, 30, 5);
    if (isOcean) ctx.fillRect(x + 8, river.y + 118, 36, 4);
  }
  ctx.fillStyle = isOcean ? "rgba(6, 45, 82, 0.55)" : "#0f5f9f";
  ctx.fillRect(river.x, river.y + river.height - 12, river.width, 12);
}

function drawWaveHazard() {
  if (!level.waveHazard || !level.waveHazard.active) return;
  const wave = level.waveHazard;
  const y = [110, 235, 350][wave.lane];
  ctx.save();
  ctx.translate(-cameraX, 0);
  ctx.fillStyle = "#d7fbff";
  ctx.fillRect(wave.x, y + 24, wave.width, 24);
  ctx.fillStyle = "#65d7ff";
  for (let i = 0; i < 5; i += 1) {
    ctx.fillRect(wave.x + i * 38, y + (i % 2) * 18, 34, 28);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(wave.x + 18, y + 10, wave.width - 44, 8);
  ctx.restore();
}

function drawThemeDecor() {
  if (level.theme.id === "ocean") {
    for (const reef of level.coral) {
      const colors = ["#ff6b8a", "#ffd34d", "#7fffd4"];
      ctx.fillStyle = colors[reef.color];
      ctx.fillRect(reef.x, reef.y, 12, 46);
      ctx.fillRect(reef.x - 10, reef.y + 14, 22, 10);
      ctx.fillRect(reef.x + 8, reef.y + 24, 18, 10);
      ctx.fillStyle = "#2f6b3f";
      ctx.fillRect(reef.x - 22, floorY - 18, 18, 18);
    }
  }

  if (level.theme.id === "desert") {
    for (let x = 120; x < level.worldWidth; x += 520) {
      ctx.fillStyle = "#d39a45";
      ctx.fillRect(x, floorY - 34, 76, 10);
      ctx.fillRect(x + 10, floorY - 48, 42, 14);
      ctx.fillStyle = "#b98235";
      ctx.fillRect(x + 52, floorY - 44, 28, 10);
    }
  }

  if (level.theme.id === "swamp") {
    for (let x = 160; x < level.worldWidth; x += 420) {
      ctx.fillStyle = "#1f3d2b";
      ctx.fillRect(x, floorY - 76, 18, 76);
      ctx.fillStyle = "#385b35";
      ctx.fillRect(x - 22, floorY - 90, 62, 22);
      ctx.fillRect(x + 6, floorY - 116, 48, 22);
    }
  }

  if (level.theme.id === "lava") {
    const flameTime = Date.now() / 120;
    for (let x = 30; x < level.worldWidth; x += 96) {
      const height = 72 + ((x / 13 + Math.floor(flameTime)) % 5) * 18;
      const sway = Math.sin(flameTime + x * 0.02) * 10;
      ctx.fillStyle = "#7a1d19";
      ctx.fillRect(x + sway, floorY - height, 34, height);
      ctx.fillStyle = "#ff4d2e";
      ctx.fillRect(x + 7 + sway * 0.4, floorY - height + 18, 20, height - 18);
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(x + 13 - sway * 0.2, floorY - height + 42, 10, Math.max(18, height - 54));
    }

    for (let ember = 0; ember < 44; ember += 1) {
      const x = (ember * 211 + Math.floor(Date.now() / 35) * (ember % 3 + 1)) % level.worldWidth;
      const y = 66 + ((ember * 47 + Math.floor(Date.now() / 60)) % 250);
      ctx.fillStyle = ember % 2 === 0 ? "#ff8a2d" : "#ffd34d";
      ctx.fillRect(x, y, 5, 5);
    }

    for (let x = 90; x < level.worldWidth; x += 470) {
      ctx.fillStyle = "#1b1116";
      ctx.fillRect(x, floorY - 112, 64, 112);
      ctx.fillStyle = "#ff5a2e";
      ctx.fillRect(x + 12, floorY - 90, 14, 74);
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(x + 34, floorY - 62, 10, 42);
      ctx.fillStyle = "#4a2028";
      ctx.fillRect(x - 22, floorY - 18, 112, 18);
    }
  }
}

function drawStars() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const star of level.stars) {
    if (star.collected) continue;
    ctx.fillStyle = "#ffd34d";
    ctx.fillRect(star.x - 4, star.y - 16, 8, 32);
    ctx.fillRect(star.x - 16, star.y - 4, 32, 8);
    ctx.fillRect(star.x - 10, star.y - 10, 20, 20);
    ctx.fillStyle = "#fff29a";
    ctx.fillRect(star.x - 4, star.y - 4, 8, 8);
  }
  ctx.restore();
}

function drawTraps() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const trap of level.spikeTraps) {
    ctx.fillStyle = trap.state === "warning" ? "#fff29a" : "#8f95a3";
    ctx.fillRect(trap.x, trap.y - 8, trap.width, 10);
    ctx.fillStyle = "#e84c5f";
    for (let x = trap.x; x < trap.x + trap.width; x += 19) {
      ctx.beginPath();
      ctx.moveTo(x, trap.y + trap.height);
      ctx.lineTo(x + 9, trap.y);
      ctx.lineTo(x + 18, trap.y + trap.height);
      ctx.fill();
    }
  }

  for (const trap of level.lavaTraps) {
    const x = trap.x + trap.shake;
    if (trap.state === "lava") {
      ctx.fillStyle = "#7a1d19";
      ctx.fillRect(x, trap.y, trap.width, trap.height);
      ctx.fillStyle = "#ff4d2e";
      ctx.fillRect(x + 4, trap.y + 5, trap.width - 8, trap.height - 8);
      ctx.fillStyle = "#ffd34d";
      const lavaDrift = Math.floor(Date.now() / 80) % 34;
      for (let line = x - lavaDrift; line < x + trap.width; line += 34) {
        ctx.fillRect(line, trap.y + 10, 22, 5);
        ctx.fillRect(line + 12, trap.y + 22, 16, 4);
      }
      ctx.fillStyle = "#fff29a";
      for (let bubble = x + 12; bubble < x + trap.width; bubble += 46) {
        ctx.fillRect(bubble, trap.y - 4 + (bubble % 2) * 6, 8, 8);
      }
    } else {
      ctx.fillStyle = trap.state === "shaking" ? "#d9903d" : "#6a3d24";
      ctx.fillRect(x, trap.y, trap.width, trap.height);
      ctx.fillStyle = "#45d06f";
      ctx.fillRect(x, trap.y - 8, trap.width, 8);
    }
  }

  for (const trap of level.quicksandTraps) {
    const x = trap.x + trap.shake;
    ctx.fillStyle = trap.state === "swallowed" ? "#8f6631" : trap.state === "sinking" ? "#d6a94d" : "#e8c86b";
    ctx.fillRect(x, trap.y, trap.width, trap.height);
    ctx.fillStyle = "#f4dc8a";
    for (let dot = x + 10; dot < x + trap.width; dot += 24) {
      ctx.fillRect(dot, trap.y + (trap.state === "sinking" ? 4 : 8), 12, 4);
    }
    if (trap.state === "sinking") {
      ctx.fillStyle = "#c08d3d";
      ctx.fillRect(x + trap.width / 2 - 28, trap.y - 10, 56, 12);
    }
  }

  for (const trap of level.bogTraps) {
    ctx.fillStyle = trap.state === "swallowed" ? "#142319" : trap.state === "blinding" ? "#31462f" : "#496b35";
    ctx.fillRect(trap.x, trap.y, trap.width, trap.height);
    ctx.fillStyle = "#89b35c";
    ctx.fillRect(trap.x + 12, trap.y - 8, 38, 8);
    ctx.fillRect(trap.x + 88, trap.y - 6, 48, 7);
    if (trap.state === "blinding") {
      ctx.fillStyle = `rgba(70, 90, 62, ${Math.min(0.65, trap.fog)})`;
      ctx.fillRect(trap.x - 60, 150, trap.width + 120, 260);
    }
  }
  ctx.restore();
}

function drawChest() {
  const chest = level.chest;
  ctx.save();
  ctx.translate(-cameraX, 0);
  if (level.theme.id === "desert") {
    ctx.fillStyle = "#d4a24a";
    ctx.beginPath();
    ctx.moveTo(chest.x - 12, chest.y + chest.height);
    ctx.lineTo(chest.x + chest.width / 2, chest.y);
    ctx.lineTo(chest.x + chest.width + 12, chest.y + chest.height);
    ctx.fill();
    ctx.fillStyle = "#8f6631";
    ctx.fillRect(chest.x + 38, chest.y + 42, 22, 30);
    ctx.fillStyle = chest.locked ? "#7d4a2b" : "#ffd34d";
    ctx.fillRect(chest.x + 16, chest.y + 52, 66, 8);
    drawTinyText(chest.locked ? `剩 ${level.enemies.filter((enemy) => enemy.alive).length} 只怪` : "进入金字塔", chest.x - 8, chest.y - 13, chest.locked ? "#211b2c" : "#ffd34d");
    ctx.restore();
    return;
  }

  if (level.theme.id === "swamp") {
    const pulse = Math.sin(Date.now() / 120) * 6;
    ctx.fillStyle = "#05040a";
    ctx.fillRect(chest.x + 8, chest.y - 8, 92, 92);
    ctx.fillStyle = "#211b2c";
    ctx.fillRect(chest.x + 18, chest.y + 2, 72, 72);
    ctx.fillStyle = chest.locked ? "#1b2220" : "#7fffd4";
    ctx.fillRect(chest.x + 28, chest.y + 12, 52, 52);
    ctx.fillStyle = chest.locked ? "#31462f" : "#6f4dff";
    ctx.fillRect(chest.x + 36 + pulse * 0.25, chest.y + 20, 36, 36);
    ctx.fillStyle = chest.locked ? "#243225" : "#c8fff3";
    ctx.fillRect(chest.x + 46 - pulse * 0.2, chest.y + 30, 16, 16);
    ctx.fillStyle = "#05040a";
    ctx.fillRect(chest.x + 12, chest.y + 76, 84, 10);
    drawTinyText(chest.locked ? `打败 ${level.enemies.filter((enemy) => enemy.alive).length} 只怪` : "进入岩浆传送门", chest.x - 18, chest.y - 13, chest.locked ? "#211b2c" : "#7fffd4");
    ctx.restore();
    return;
  }

  if (level.theme.id === "lava") {
    ctx.fillStyle = chest.locked ? "#3b1513" : "#ff5a2e";
    ctx.fillRect(chest.x + 12, chest.y + 16, 94, 62);
    ctx.fillStyle = chest.locked ? "#7a2e22" : "#ffd34d";
    ctx.fillRect(chest.x + 26, chest.y + 26, 66, 42);
    ctx.fillStyle = "#21161b";
    ctx.fillRect(chest.x + 8, chest.y + 72, 102, 12);
    ctx.fillStyle = "#ff8a2d";
    ctx.fillRect(chest.x + 42, chest.y - 8, 34, 30);
    drawTinyText(chest.locked ? `剩 ${level.enemies.filter((enemy) => enemy.alive).length} 只岩浆怪` : "离开岩浆世界", chest.x - 20, chest.y - 13, chest.locked ? "#211b2c" : "#ffd34d");
    ctx.restore();
    return;
  }

  ctx.fillStyle = chest.opened ? "#8e5a32" : "#d9903d";
  ctx.fillRect(chest.x, chest.y + (chest.opened ? 12 : 0), chest.width, chest.height - (chest.opened ? 12 : 0));
  ctx.fillStyle = "#5d351d";
  ctx.fillRect(chest.x, chest.y + 18, chest.width, 6);
  ctx.fillRect(chest.x + 6, chest.y + 6, 8, chest.height - 10);
  ctx.fillRect(chest.x + chest.width - 14, chest.y + 6, 8, chest.height - 10);
  ctx.fillStyle = chest.locked ? "#8f95a3" : "#ffd34d";
  ctx.fillRect(chest.x + 25, chest.y + 19, 12, 16);
  if (chest.locked) {
    drawTinyText(`剩 ${level.enemies.filter((enemy) => enemy.alive).length} 只怪`, chest.x - 20, chest.y - 13, "#211b2c");
  } else {
    drawTinyText("宝箱已解锁", chest.x - 26, chest.y - 13, "#ffd34d");
  }
  ctx.restore();
}

function drawEnemies() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const enemy of level.enemies) {
    if (!enemy.alive) {
      drawEnemyHealthBar(enemy);
      continue;
    }

    if (enemy.kind === "slime") drawSlime(enemy);
    if (enemy.kind === "bat") drawBat(enemy);
    if (enemy.kind === "guard") drawGuard(enemy);
    if (enemy.kind === "brute") drawBrute(enemy);
    if (enemy.kind === "drowned") drawDrowned(enemy);
    if (enemy.kind === "fish") drawFish(enemy);
    if (enemy.kind === "crab") drawCrab(enemy);
    if (enemy.kind === "shark") drawShark(enemy);
    if (enemy.kind === "harpooner") drawHarpooner(enemy);
    if (enemy.kind === "mummy") drawMummy(enemy);
    if (enemy.kind === "scorpion") drawScorpion(enemy);
    if (enemy.kind === "sandGolem") drawSandGolem(enemy);
    if (enemy.kind === "scarab") drawScarab(enemy);
    if (enemy.kind === "swampFrog") drawSwampFrog(enemy);
    if (enemy.kind === "swampWitch") drawSwampWitch(enemy);
    if (enemy.kind === "mudBeast") drawMudBeast(enemy);
    if (enemy.kind === "lavaMage") drawLavaMage(enemy);
    if (enemy.kind === "lavaKnight") drawLavaKnight(enemy);
    if (enemy.kind === "lavaBlade") drawLavaBlade(enemy);
    if (enemy.kind === "lavaSoldier") drawLavaSoldier(enemy);
    if (enemy.kind === "lavaBeast") drawLavaBeast(enemy);
    if (enemy.kind === "lavaSlime") drawLavaSlime(enemy);
    if (enemy.kind === "lavaAxeGuard") drawLavaAxeGuard(enemy);
    if (enemy.kind === "lavaBoss") drawLavaBoss(enemy);
    if (enemy.cagedTimer > 0) drawCage(enemy);
    drawEnemyHealthBar(enemy);
  }
  ctx.restore();
}

function drawAnimals() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const animal of level.animals) {
    if (!animal.alive) continue;
    if (animal.kind === "cow") drawCow(animal);
    if (animal.kind === "chicken") drawChicken(animal);
    if (animal.kind === "pig") drawPig(animal);
  }
  ctx.restore();
}

function drawCow(animal) {
  const step = Math.sin(animal.phase || Date.now() / 150) * 3;
  ctx.fillStyle = "#f4f1df";
  ctx.fillRect(animal.x, animal.y + 12, animal.width, animal.height - 12);
  ctx.fillStyle = "#4a342a";
  ctx.fillRect(animal.x + 8, animal.y + 18, 14, 12);
  ctx.fillRect(animal.x + 36, animal.y + 28, 16, 12);
  ctx.fillStyle = "#f4f1df";
  ctx.fillRect(animal.x + 42, animal.y, 24, 24);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(animal.x + 48, animal.y + 8, 5, 5);
  ctx.fillStyle = "#f6c2a9";
  ctx.fillRect(animal.x + 56, animal.y + 14, 12, 8);
  ctx.fillStyle = "#4a342a";
  ctx.fillRect(animal.x + 10, animal.y + animal.height - 4 + Math.max(0, step), 9, 12);
  ctx.fillRect(animal.x + 42, animal.y + animal.height - 4 + Math.max(0, -step), 9, 12);
}

function drawChicken(animal) {
  const bob = Math.sin(animal.phase || Date.now() / 120) * 2;
  ctx.fillStyle = "#fffdf0";
  ctx.fillRect(animal.x + 6, animal.y + 8 + bob, 24, 20);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(animal.x + 14, animal.y, 20, 18);
  ctx.fillStyle = "#ffcf4a";
  ctx.fillRect(animal.x + 30, animal.y + 8, 8, 5);
  ctx.fillStyle = "#e84c5f";
  ctx.fillRect(animal.x + 18, animal.y - 6, 10, 8);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(animal.x + 26, animal.y + 6, 4, 4);
  ctx.fillStyle = "#d9903d";
  ctx.fillRect(animal.x + 10, animal.y + 26, 5, 8);
  ctx.fillRect(animal.x + 24, animal.y + 26, 5, 8);
}

function drawPig(animal) {
  const step = Math.sin(animal.phase || Date.now() / 150) * 3;
  ctx.fillStyle = "#f4a0b7";
  ctx.fillRect(animal.x, animal.y + 10, animal.width, animal.height - 10);
  ctx.fillStyle = "#ffc0d0";
  ctx.fillRect(animal.x + 34, animal.y, 22, 22);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(animal.x + 42, animal.y + 7, 4, 4);
  ctx.fillStyle = "#e77796";
  ctx.fillRect(animal.x + 48, animal.y + 12, 10, 8);
  ctx.fillStyle = "#b85c7a";
  ctx.fillRect(animal.x + 8, animal.y + animal.height - 3 + Math.max(0, step), 8, 10);
  ctx.fillRect(animal.x + 34, animal.y + animal.height - 3 + Math.max(0, -step), 8, 10);
}

function drawSlime(enemy) {
  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#66d86f";
  ctx.fillRect(enemy.x, enemy.y + 14, enemy.width, enemy.height - 14);
  ctx.fillRect(enemy.x + 10, enemy.y, enemy.width - 20, 18);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 14, enemy.y + 24, 6, 6);
  ctx.fillRect(enemy.x + enemy.width - 20, enemy.y + 24, 6, 6);
}

function drawBat(enemy) {
  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#673ab7";
  ctx.fillRect(enemy.x + 16, enemy.y + 10, enemy.width - 32, enemy.height - 12);
  ctx.fillRect(enemy.x, enemy.y + 18, 22, 12);
  ctx.fillRect(enemy.x + enemy.width - 22, enemy.y + 18, 22, 12);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 24, enemy.y + 24, 6, 6);
  ctx.fillRect(enemy.x + enemy.width - 30, enemy.y + 24, 6, 6);
}

function drawGuard(enemy) {
  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#3a76f0";
  ctx.fillRect(enemy.x + 8, enemy.y + 8, enemy.width - 16, enemy.height - 8);
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(enemy.x + 12, enemy.y, enemy.width - 24, 18);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 18, enemy.y + 28, 7, 7);
  ctx.fillRect(enemy.x + enemy.width - 25, enemy.y + 28, 7, 7);
}

function drawBrute(enemy) {
  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#e84c5f";
  ctx.fillRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10);
  ctx.fillStyle = "#8e2440";
  ctx.fillRect(enemy.x + 12, enemy.y, enemy.width - 24, 18);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(enemy.x + 18, enemy.y + 30, 9, 9);
  ctx.fillRect(enemy.x + enemy.width - 27, enemy.y + 30, 9, 9);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + enemy.width * 0.32, enemy.y + enemy.height * 0.7, enemy.width * 0.36, 7);
}

function drawDrowned(enemy) {
  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#227c8f";
  ctx.fillRect(enemy.x + 6, enemy.y + 12, enemy.width - 12, enemy.height - 12);
  ctx.fillStyle = "#49c7bd";
  ctx.fillRect(enemy.x + 12, enemy.y, enemy.width - 24, 22);
  ctx.fillStyle = "#b6fff3";
  ctx.fillRect(enemy.x + 18, enemy.y + 30, 8, 8);
  ctx.fillRect(enemy.x + enemy.width - 26, enemy.y + 30, 8, 8);
  ctx.fillStyle = "#15454f";
  ctx.fillRect(enemy.x + 26, enemy.y + enemy.height - 18, enemy.width - 52, 8);
  ctx.fillStyle = "#7fffd4";
  ctx.fillRect(enemy.x - 10, enemy.y + 28, 12, 30);
  ctx.fillRect(enemy.x + enemy.width - 2, enemy.y + 28, 12, 30);
}

function enemyFill(enemy, color) {
  return enemy.hurtFlash > 0 ? "#ffffff" : color;
}

function drawFish(enemy) {
  const swim = Math.sin(Date.now() / 120 + enemy.phase) * 5;
  const tailX = enemy.facing > 0 ? enemy.x - 4 : enemy.x + enemy.width - 12;
  const faceX = enemy.facing > 0 ? enemy.x + 22 : enemy.x + enemy.width - 28;
  ctx.fillStyle = enemyFill(enemy, "#ff9f43");
  ctx.fillRect(enemy.x + 12, enemy.y + 8, enemy.width - 22, enemy.height - 14);
  ctx.fillRect(enemy.x + enemy.width - 16, enemy.y + 14, 18, 10);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 18, enemy.y + 3, 28, 8);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(faceX, enemy.y + 16, 5, 5);
  ctx.fillStyle = "#f36b3d";
  ctx.fillRect(tailX, enemy.y + 12 + swim, 16, 16);
}

function drawCrab(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#e84c5f");
  ctx.fillRect(enemy.x + 12, enemy.y + 12, enemy.width - 24, enemy.height - 12);
  ctx.fillStyle = "#ff8a76";
  ctx.fillRect(enemy.x + 8, enemy.y + 4, 16, 14);
  ctx.fillRect(enemy.x + enemy.width - 24, enemy.y + 4, 16, 14);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 22, enemy.y + 18, 5, 5);
  ctx.fillRect(enemy.x + enemy.width - 28, enemy.y + 18, 5, 5);
  ctx.fillStyle = "#8e2440";
  for (let leg = 0; leg < 3; leg += 1) {
    ctx.fillRect(enemy.x + 8 + leg * 16, enemy.y + enemy.height - 4, 10, 8);
    ctx.fillRect(enemy.x + enemy.width - 18 - leg * 16, enemy.y + enemy.height - 4, 10, 8);
  }
}

function drawShark(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#6d8291");
  ctx.fillRect(enemy.x + 12, enemy.y + 14, enemy.width - 24, enemy.height - 18);
  ctx.fillRect(enemy.x + enemy.width - 24, enemy.y + 22, 26, 14);
  ctx.fillStyle = "#465966";
  ctx.fillRect(enemy.x + 38, enemy.y + 2, 28, 16);
  ctx.fillStyle = "#f4f1df";
  ctx.fillRect(enemy.x + 18, enemy.y + enemy.height - 12, enemy.width - 50, 9);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 26, enemy.y + 24, 6, 6);
  ctx.fillStyle = "#ffffff";
  for (let tooth = 0; tooth < 5; tooth += 1) {
    ctx.fillRect(enemy.x + 48 + tooth * 8, enemy.y + enemy.height - 12, 4, 6);
  }
}

function drawHarpooner(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#16877b");
  ctx.fillRect(enemy.x + 12, enemy.y + 18, enemy.width - 24, enemy.height - 18);
  ctx.fillStyle = "#65d7ff";
  ctx.fillRect(enemy.x + 18, enemy.y + 4, enemy.width - 36, 22);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 24, enemy.y + 12, 6, 6);
  ctx.fillRect(enemy.x + enemy.width - 30, enemy.y + 12, 6, 6);
  ctx.fillStyle = "#8f95a3";
  ctx.fillRect(enemy.x - 16, enemy.y + 28, enemy.width + 32, 5);
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(enemy.x + enemy.width + 8, enemy.y + 23, 12, 15);
}

function drawMummy(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#d8c7a1");
  ctx.fillRect(enemy.x + 10, enemy.y + 8, enemy.width - 20, enemy.height - 8);
  ctx.fillStyle = "#f1e2bd";
  for (let band = enemy.y + 12; band < enemy.y + enemy.height; band += 14) {
    ctx.fillRect(enemy.x + 8, band, enemy.width - 16, 5);
  }
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 22, enemy.y + 28, 7, 7);
  ctx.fillRect(enemy.x + enemy.width - 30, enemy.y + 28, 7, 7);
}

function drawScorpion(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#6a3d24");
  ctx.fillRect(enemy.x + 18, enemy.y + 12, enemy.width - 36, enemy.height - 12);
  ctx.fillRect(enemy.x + enemy.width - 26, enemy.y - 10, 16, 28);
  ctx.fillStyle = "#d9903d";
  ctx.fillRect(enemy.x + 8, enemy.y + 6, 18, 12);
  ctx.fillRect(enemy.x + enemy.width - 22, enemy.y + 6, 18, 12);
  for (let leg = 0; leg < 4; leg += 1) {
    ctx.fillRect(enemy.x + 10 + leg * 14, enemy.y + enemy.height - 4, 10, 8);
  }
}

function drawSandGolem(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#b98235");
  ctx.fillRect(enemy.x + 10, enemy.y + 18, enemy.width - 20, enemy.height - 18);
  ctx.fillStyle = "#e4b757";
  ctx.fillRect(enemy.x + 20, enemy.y, enemy.width - 40, 28);
  ctx.fillRect(enemy.x - 6, enemy.y + 34, 20, 28);
  ctx.fillRect(enemy.x + enemy.width - 14, enemy.y + 34, 20, 28);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 30, enemy.y + 12, 8, 8);
  ctx.fillRect(enemy.x + enemy.width - 38, enemy.y + 12, 8, 8);
}

function drawScarab(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#17445f");
  ctx.fillRect(enemy.x + 10, enemy.y + 8, enemy.width - 20, enemy.height - 8);
  ctx.fillStyle = "#31c6d4";
  ctx.fillRect(enemy.x + 18, enemy.y + 12, enemy.width - 36, 8);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 18, enemy.y + 24, 5, 5);
  ctx.fillRect(enemy.x + enemy.width - 24, enemy.y + 24, 5, 5);
}

function drawSwampFrog(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#62a64f");
  ctx.fillRect(enemy.x + 8, enemy.y + 16, enemy.width - 16, enemy.height - 16);
  ctx.fillStyle = "#b2e36f";
  ctx.fillRect(enemy.x + 14, enemy.y + 4, 18, 18);
  ctx.fillRect(enemy.x + enemy.width - 32, enemy.y + 4, 18, 18);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + 20, enemy.y + 10, 6, 6);
  ctx.fillRect(enemy.x + enemy.width - 26, enemy.y + 10, 6, 6);
  ctx.fillStyle = "#d94f66";
  ctx.fillRect(enemy.x + 28, enemy.y + enemy.height - 16, enemy.width - 56, 6);
}

function drawSwampWitch(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#5a3a82");
  ctx.fillRect(enemy.x + 12, enemy.y + 24, enemy.width - 24, enemy.height - 24);
  ctx.fillStyle = "#243225";
  ctx.beginPath();
  ctx.moveTo(enemy.x + 8, enemy.y + 26);
  ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - 14);
  ctx.lineTo(enemy.x + enemy.width - 8, enemy.y + 26);
  ctx.fill();
  ctx.fillStyle = "#7fffd4";
  ctx.fillRect(enemy.x + 24, enemy.y + 34, 6, 6);
  ctx.fillRect(enemy.x + enemy.width - 30, enemy.y + 34, 6, 6);
  ctx.fillStyle = "#8f95a3";
  ctx.fillRect(enemy.x - 12, enemy.y + 54, enemy.width + 24, 5);
}

function drawMudBeast(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#5b4a32");
  ctx.fillRect(enemy.x + 8, enemy.y + 18, enemy.width - 16, enemy.height - 18);
  ctx.fillStyle = "#35562f";
  ctx.fillRect(enemy.x + 20, enemy.y + 4, enemy.width - 40, 18);
  ctx.fillStyle = "#b2e36f";
  ctx.fillRect(enemy.x + 26, enemy.y + 30, 8, 8);
  ctx.fillRect(enemy.x + enemy.width - 34, enemy.y + 30, 8, 8);
  ctx.fillStyle = "#243225";
  ctx.fillRect(enemy.x + 28, enemy.y + enemy.height - 20, enemy.width - 56, 9);
}

function drawLavaMage(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#6b1d2a");
  ctx.fillRect(enemy.x + 12, enemy.y + 22, enemy.width - 24, enemy.height - 22);
  ctx.fillStyle = "#ff5a2e";
  ctx.beginPath();
  ctx.moveTo(enemy.x + 10, enemy.y + 26);
  ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - 10);
  ctx.lineTo(enemy.x + enemy.width - 10, enemy.y + 26);
  ctx.fill();
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 22, enemy.y + 34, 7, 7);
  ctx.fillRect(enemy.x + enemy.width - 29, enemy.y + 34, 7, 7);
  ctx.fillRect(enemy.x + enemy.width - 4, enemy.y + 42, 10, 34);
}

function drawLavaKnight(enemy) {
  drawLavaArmor(enemy, "#4a2028", "#ff5a2e");
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(enemy.x + enemy.width - 6, enemy.y + 34, 12, 54);
}

function drawLavaBlade(enemy) {
  drawLavaArmor(enemy, "#72232c", "#ff8a2d");
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(enemy.x - 12, enemy.y + 36, enemy.width + 24, 8);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + enemy.width - 4, enemy.y + 32, 18, 16);
}

function drawLavaSoldier(enemy) {
  drawLavaArmor(enemy, "#3b2f36", "#ff5a2e");
  ctx.fillStyle = "#8f95a3";
  ctx.fillRect(enemy.x + 8, enemy.y + 42, 12, 30);
}

function drawLavaBeast(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#8b2c24");
  ctx.fillRect(enemy.x + 8, enemy.y + 20, enemy.width - 16, enemy.height - 20);
  ctx.fillStyle = "#ff8a2d";
  ctx.fillRect(enemy.x + 18, enemy.y + 4, enemy.width - 36, 24);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 28, enemy.y + 30, 9, 9);
  ctx.fillRect(enemy.x + enemy.width - 37, enemy.y + 30, 9, 9);
  ctx.fillStyle = "#21161b";
  ctx.fillRect(enemy.x + 26, enemy.y + enemy.height - 22, enemy.width - 52, 10);
}

function drawLavaSlime(enemy) {
  ctx.fillStyle = enemyFill(enemy, "#ff5a2e");
  ctx.fillRect(enemy.x, enemy.y + 14, enemy.width, enemy.height - 14);
  ctx.fillRect(enemy.x + 12, enemy.y + 4, enemy.width - 24, 18);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 16, enemy.y + 24, 8, 8);
  ctx.fillRect(enemy.x + enemy.width - 24, enemy.y + 24, 8, 8);
  ctx.fillStyle = "#8b1e18";
  ctx.fillRect(enemy.x + 20, enemy.y + enemy.height - 12, enemy.width - 40, 7);
}

function drawLavaAxeGuard(enemy) {
  drawLavaArmor(enemy, "#2f252b", "#ff5a2e");
  drawHugeAxe(enemy, enemy.facing, enemy.x + (enemy.facing > 0 ? enemy.width - 6 : 6), enemy.y + 42, false);
}

function drawLavaBoss(enemy) {
  if (enemy.bossMode === "hidden") {
    ctx.fillStyle = "#ff5a2e";
    ctx.fillRect(enemy.x + 18, floorY - 16, enemy.width - 36, 16);
    ctx.fillStyle = "#ffd34d";
    ctx.fillRect(enemy.x + 44, floorY - 28, enemy.width - 88, 12);
    return;
  }

  ctx.fillStyle = enemyFill(enemy, enemy.bossMode === "axeStuck" ? "#6a2d25" : "#21161b");
  ctx.fillRect(enemy.x + 14, enemy.y + 34, enemy.width - 28, enemy.height - 34);
  ctx.fillStyle = "#ff5a2e";
  ctx.fillRect(enemy.x + 30, enemy.y + 10, enemy.width - 60, 42);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 44, enemy.y + 28, 16, 16);
  ctx.fillRect(enemy.x + enemy.width - 60, enemy.y + 28, 16, 16);
  ctx.fillStyle = "#7a2e22";
  ctx.fillRect(enemy.x - 10, enemy.y + 62, 30, 50);
  ctx.fillRect(enemy.x + enemy.width - 20, enemy.y + 62, 30, 50);
  drawHugeAxe(enemy, enemy.facing, enemy.x + (enemy.facing > 0 ? enemy.width - 14 : 14), enemy.y + 62, enemy.bossMode === "axeStuck");
  if (enemy.bossMode === "axeStuck") {
    drawTinyText("斧头卡住了！", enemy.x + 28, enemy.y - 12, "#ffd34d");
  }
}

function drawLavaArmor(enemy, armorColor, glowColor) {
  ctx.fillStyle = enemyFill(enemy, armorColor);
  ctx.fillRect(enemy.x + 10, enemy.y + 18, enemy.width - 20, enemy.height - 18);
  ctx.fillStyle = glowColor;
  ctx.fillRect(enemy.x + 18, enemy.y + 2, enemy.width - 36, 28);
  ctx.fillRect(enemy.x + 22, enemy.y + 42, enemy.width - 44, 8);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(enemy.x + 24, enemy.y + 14, 7, 7);
  ctx.fillRect(enemy.x + enemy.width - 31, enemy.y + 14, 7, 7);
  ctx.fillStyle = "#21161b";
  ctx.fillRect(enemy.x + 22, enemy.y + enemy.height - 18, enemy.width - 44, 8);
}

function drawHugeAxe(enemy, facing, handX, handY, stuck) {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.scale(facing, 1);
  ctx.rotate(stuck ? 0.75 : -0.35);
  ctx.fillStyle = "#6a3d24";
  ctx.fillRect(0, -8, 72, 10);
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(52, -24, 24, 34);
  ctx.fillStyle = "#ff5a2e";
  ctx.fillRect(58, -16, 12, 12);
  ctx.restore();
}

function drawCage(enemy) {
  ctx.strokeStyle = "#fff29a";
  ctx.lineWidth = 4;
  ctx.strokeRect(enemy.x - 8, enemy.y - 10, enemy.width + 16, enemy.height + 18);
  ctx.lineWidth = 2;
  for (let x = enemy.x - 2; x < enemy.x + enemy.width + 12; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, enemy.y - 10);
    ctx.lineTo(x, enemy.y + enemy.height + 8);
    ctx.stroke();
  }
}

function drawEnemyHealthBar(enemy) {
  if (enemy.kind === "lavaBoss") {
    drawBossHealthBar(enemy);
    return;
  }

  const barWidth = Math.max(58, enemy.width);
  const x = enemy.x + enemy.width / 2 - barWidth / 2;
  const y = enemy.y - 16;
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x, y, barWidth, 8);
  ctx.fillStyle = enemy.alive ? "#45d06f" : "#8f95a3";
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), 8);
}

function drawBossHealthBar(enemy) {
  const barWidth = Math.max(220, enemy.width + 86);
  const x = enemy.x + enemy.width / 2 - barWidth / 2;
  const y = Math.max(26, enemy.y - 30);
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);

  ctx.fillStyle = "#21161b";
  ctx.fillRect(x - 4, y - 4, barWidth + 8, 18);
  ctx.fillStyle = "#4a2028";
  ctx.fillRect(x, y, barWidth, 10);
  ctx.fillStyle = enemy.alive ? "#e62735" : "#8f95a3";
  ctx.fillRect(x, y, barWidth * ratio, 10);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(x, y + 10, Math.max(0, barWidth * ratio), 3);
  drawTinyText("BOSS", x, y - 8, "#ffd34d");
}

function drawProjectiles() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const projectile of projectiles) {
    ctx.fillStyle =
      projectile.kind === "rocket" ? "#ff6b50" :
      projectile.kind === "grenade" ? "#2f6b3f" :
      projectile.kind === "cage" ? "#fff29a" :
      projectile.kind === "magic" ? "#9b5cff" :
      "#211b2c";
    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    if (projectile.kind === "rocket") {
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(projectile.x - Math.sign(projectile.vx) * 10, projectile.y + 3, 10, 6);
    }
  }
  ctx.restore();
}

function drawPlayer() {
  const flashing = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0;
  if (flashing) return;

  ctx.save();
  ctx.translate(-cameraX, 0);
  const x = player.x;
  const y = player.y;
  const moving = Math.abs(player.vx) > 0.15 || Math.abs(player.vy) > 0.5;
  const gait = moving ? Math.sin(Date.now() / 85) * 5 : 0;
  const swimKick = isPlayerInRiver() ? Math.sin(Date.now() / 90) * 6 : gait;

  if (level && level.theme.id === "ocean" && diverSkinOwned) {
    ctx.fillStyle = "#ffd08a";
    ctx.fillRect(x + 14, y + 8, 28, 24);
    ctx.fillStyle = "#1b3958";
    ctx.fillRect(x + 8, y + 28, 40, 36);
    ctx.fillStyle = "#65d7ff";
    ctx.fillRect(x + 16, y + 12, 20, 10);
    ctx.fillStyle = "#211b2c";
    ctx.fillRect(x + 18, y + 14, 16, 5);
    ctx.fillStyle = "#f0c24d";
    ctx.fillRect(x + 5, y + 34, 7, 30);
    ctx.fillRect(x + 44, y + 34, 7, 30);
    ctx.fillStyle = "#0e2236";
    ctx.fillRect(x + 7, y + 62 + Math.max(0, swimKick), 16, 10);
    ctx.fillRect(x + 31, y + 62 + Math.max(0, -swimKick), 16, 10);
    ctx.fillStyle = "#8f95a3";
    ctx.fillRect(x + 39, y + 8, 6, 26);
    drawWeapon(y);
    ctx.restore();
    return;
  }

  if (hasDragonAdult) {
    drawDragonMount(x, y, gait);
  }

  if (hasHorse) {
    ctx.fillStyle = "#8b5a36";
    ctx.fillRect(x - 6, y + 44, 72, 30);
    ctx.fillRect(x + 44, y + 24, 26, 28);
    ctx.fillStyle = "#211b2c";
    ctx.fillRect(x + 6, y + 70 + Math.max(0, gait), 10, 14);
    ctx.fillRect(x + 24, y + 70 + Math.max(0, -gait), 9, 13);
    ctx.fillRect(x + 48, y + 70 + Math.max(0, -gait), 10, 14);
    ctx.fillRect(x + 60, y + 70 + Math.max(0, gait), 8, 13);
    ctx.fillStyle = "#fff4c7";
    ctx.fillRect(x + 58, y + 34, 5, 5);
  }

  const knightY = hasDragonAdult ? y - 4 : hasHorse ? y + 4 : y;
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(x + 10, knightY + 30, 30, 36);
  ctx.fillStyle = "#8f95a3";
  ctx.fillRect(x + 10, knightY + 56 + Math.max(0, gait), 12, 12);
  ctx.fillRect(x + 28, knightY + 56 + Math.max(0, -gait), 12, 12);
  ctx.fillStyle = "#c7d4e8";
  ctx.fillRect(x + 8, knightY + 8, 36, 30);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x + (player.facing > 0 ? 30 : 16), knightY + 20, 12, 5);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(x + 14, knightY - 8, 24, 10);
  ctx.fillRect(x + 22, knightY - 16, 8, 8);
  drawWeapon(knightY);
  ctx.restore();
}

function drawDragonMount(x, y, gait) {
  const wing = Math.sin(Date.now() / 95) * 10;
  ctx.fillStyle = "#2f9c5a";
  ctx.fillRect(x - 12, y + 42, 90, 30);
  ctx.fillRect(x + 44, y + 20, 32, 30);
  ctx.fillStyle = "#1d6d43";
  ctx.fillRect(x + 10, y + 28 + wing, 34, 14);
  ctx.fillRect(x + 8, y + 70 + Math.max(0, gait), 12, 16);
  ctx.fillRect(x + 54, y + 70 + Math.max(0, -gait), 12, 16);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(x + 68, y + 28, 8, 8);
  ctx.fillStyle = "#ff6b2e";
  ctx.fillRect(x + 78, y + 34, 16, 8);
}

function drawWeapon(knightY) {
  const weapon = weapons[weaponLevel];
  const handX = player.facing > 0 ? player.x + 42 : player.x + 6;
  const handY = knightY + 44;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.scale(player.facing, 1);

  if (weapon.kind === "melee" || weapon.kind === "fireSword") {
    ctx.fillStyle = weapon.kind === "fireSword" ? "#ff6b50" : weaponLevel === 0 ? "#d9dde5" : "#5e5b62";
    ctx.fillRect(0, player.attacking > 0 ? -18 : -8, weaponLevel === 0 ? 44 : 54, weaponLevel === 0 ? 7 : 14);
    if (weapon.kind === "fireSword") {
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(12, player.attacking > 0 ? -25 : -15, 28, 7);
    }
    ctx.fillStyle = "#8b5a36";
    ctx.fillRect(-8, -3, 12, 8);
  } else {
    ctx.fillStyle = weapon.kind === "rocket" ? "#595461" : weapon.kind === "magic" ? "#8b5cf6" : "#2d3142";
    ctx.fillRect(0, -10, weapon.kind === "rocket" ? 68 : 60, weapon.kind === "rocket" ? 20 : 14);
    ctx.fillStyle = "#8f95a3";
    ctx.fillRect(weapon.kind === "rocket" ? 52 : 46, -6, 18, 8);
  }

  ctx.restore();
}

function drawEffects() {
  ctx.save();
  ctx.translate(-cameraX, 0);
  for (const effect of effects) {
    if (effect.kind === "slash" || effect.kind === "claw" || effect.kind === "throw") {
      ctx.fillStyle = effect.kind === "slash" ? "#fff29a" : effect.kind === "throw" ? "#45d06f" : "#ff4d2e";
      ctx.fillRect(effect.x + 10, effect.y + 12, Math.max(12, effect.width - 20), 8);
    }

    if (effect.kind === "boom" || effect.kind === "poof") {
      const size = Math.max(8, effect.life * 3);
      ctx.fillStyle = effect.kind === "boom" ? "#ff6b50" : "#d8edf5";
      ctx.fillRect(effect.x + effect.width / 2 - size / 2, effect.y + effect.height / 2 - size / 2, size, size);
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(effect.x + effect.width / 2 - size / 4, effect.y + effect.height / 2 - size / 4, size / 2, size / 2);
    }

    if (effect.kind === "animalPoof") {
      ctx.fillStyle = "#fffdf0";
      ctx.fillRect(effect.x + effect.width / 2 - 18, effect.y + effect.height / 2 - 12, 36, 24);
      ctx.fillStyle = "#d8edf5";
      ctx.fillRect(effect.x + effect.width / 2 - 10, effect.y + effect.height / 2 - 20, 20, 12);
    }

    if (effect.kind === "coins") drawTinyText(`+${effect.amount || level.reward} 金币`, effect.x, effect.y - (42 - effect.life), "#ffd34d");
    if (effect.kind === "starCoins") drawTinyText(`+${starValue} 金币`, effect.x, effect.y - (42 - effect.life), "#ffd34d");
    if (effect.kind === "loot") drawTinyText(effect.text, effect.x, effect.y - Math.max(0, 42 - effect.life), "#fff29a");
    if (effect.kind === "dragonFire") {
      ctx.fillStyle = "#ff6b2e";
      ctx.fillRect(effect.x, effect.y, effect.width, effect.height);
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(effect.x + 16, effect.y + 5, Math.max(20, effect.width - 32), 7);
    }
    if (effect.kind === "xp") drawTinyText(`+${effect.amount} 经验`, effect.x, effect.y, "#8ee8ff");
    if (effect.kind === "levelUp") drawTinyText(`升级！攻击 x${2 ** (heroLevel - 1)} 生命+1`, effect.x, effect.y, "#ffd34d");
    if (effect.kind === "unlock") drawTinyText("宝箱已解锁！", effect.x, effect.y, "#ffd34d");
    if (effect.kind === "heal") drawTinyText("生命回满", effect.x, effect.y, "#45d06f");
    if (effect.kind === "power") drawTinyText("力量 x3", effect.x, effect.y, "#ff6b50");
    if (effect.kind === "fireResist") drawTinyText("抗火 60 秒", effect.x, effect.y, "#ff8a2d");
    if (effect.kind === "blackFist") drawTinyText("黑拳无敌", effect.x, effect.y, "#fff29a");
    if (effect.kind === "cageHit") drawTinyText("困住 10 秒", effect.x, effect.y - 8, "#fff29a");
  }
  ctx.restore();
}

function drawPixelSign(x, y, text) {
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x - 18, y - 18, 268, 70);
  ctx.fillStyle = "#fff4c7";
  ctx.fillRect(x - 10, y - 10, 252, 54);
  drawTinyText(text, x + 8, y + 12, "#211b2c");
}

function drawTinyText(text, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "900 18px Microsoft YaHei, sans-serif";
  ctx.fillText(text, x, y);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyJ", "KeyK", "Enter"].includes(event.code)) event.preventDefault();
  if (event.code === "KeyK") throwGrenade();
  if (event.code === "Enter" && gameState === "menu") startGame();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", startGame);
healButton.addEventListener("click", useProfessionSkill);
cageButton.addEventListener("click", useProfessionSkill);
blackFistButton.addEventListener("click", useProfessionSkill);
powerPotionButton.addEventListener("click", usePowerPotion);
medkitButton.addEventListener("click", useMedkit);
backpackButton.addEventListener("click", () => {
  renderBackpack();
  backpackPanel.classList.toggle("is-hidden");
});
closeBackpackButton.addEventListener("click", () => {
  backpackPanel.classList.add("is-hidden");
});

renderProfessions();
renderBackpack();
showMenu("ready");
