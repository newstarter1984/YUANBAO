const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const levelNumberElement = document.querySelector("#levelNumber");
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
const starValue = 60;
const experienceNeeded = 10;

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
  { type: "weapon", index: 4, name: "魔法棒", cost: 80 },
  { type: "weapon", index: 5, name: "火焰剑", cost: 120 },
  { type: "item", item: "powerPotion", name: "力量药水", cost: 45 },
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
let hasHorse = false;
let selectedProfession = "doctor";
let speedPotionOwned = false;
let powerBoostTimer = 0;
let blackFistTimer = 0;
let inventory = {
  medkit: 0,
  powerPotion: 0,
  painting: 0,
  watch: 0,
};
let currentLevel = 1;
let cameraX = 0;
let gameState = "menu";
let animationFrame;
let audioContext;
let musicNodes = [];

function ensureAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playTone(frequency, duration, type = "square", volume = 0.08, when = 0) {
  if (!audioContext) return;
  const start = audioContext.currentTime + when;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function playSound(name) {
  ensureAudio();
  const sounds = {
    chicken: () => [[820, 0.06], [1040, 0.05, 0.08], [760, 0.06, 0.16]].forEach(([f, d, w = 0]) => playTone(f, d, "square", 0.07, w)),
    cow: () => [[165, 0.22], [130, 0.28, 0.18]].forEach(([f, d, w = 0]) => playTone(f, d, "sawtooth", 0.08, w)),
    pig: () => [[330, 0.08], [250, 0.1, 0.09], [370, 0.08, 0.18]].forEach(([f, d, w = 0]) => playTone(f, d, "square", 0.075, w)),
    hurt: () => [[220, 0.08], [160, 0.12, 0.08]].forEach(([f, d, w = 0]) => playTone(f, d, "sawtooth", 0.1, w)),
    levelUp: () => [[440, 0.08], [660, 0.08, 0.1], [880, 0.12, 0.2]].forEach(([f, d, w = 0]) => playTone(f, d, "square", 0.08, w)),
    attack: () => playTone(520, 0.06, "square", 0.06),
    animalDrop: () => [[620, 0.05], [760, 0.07, 0.06]].forEach(([f, d, w = 0]) => playTone(f, d, "triangle", 0.06, w)),
  };
  if (sounds[name]) sounds[name]();
}

function startMusic() {
  ensureAudio();
  if (musicNodes.length > 0) return;
  const gain = audioContext.createGain();
  gain.gain.value = 0.018;
  const bass = audioContext.createOscillator();
  bass.type = "square";
  bass.frequency.value = 110;
  const pulse = audioContext.createOscillator();
  pulse.type = "triangle";
  pulse.frequency.value = 220;
  bass.connect(gain);
  pulse.connect(gain);
  gain.connect(audioContext.destination);
  bass.start();
  pulse.start();
  musicNodes = [bass, pulse, gain];
}

function startGame() {
  ensureAudio();
  startMusic();
  playCount += 1;
  gameState = "playing";
  mainMenu.classList.add("is-hidden");
  gameActions.classList.remove("is-hidden");
  backpackButton.classList.remove("is-hidden");
  level = buildLevel(currentLevel);

  player = {
    x: 80,
    y: floorY - 72,
    width: hasHorse ? 70 : 48,
    height: hasHorse ? 84 : 72,
    vx: 0,
    vy: 0,
    speed: (hasHorse ? 7.4 : 5.8) * (speedPotionOwned ? 3 : 1),
    jumpPower: hasHorse ? -17.2 : -16,
    onGround: true,
    facing: 1,
    hearts: 2,
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

function buildLevel(number) {
  const worldWidth = 2200 + number * 520;
  const enemyCount = 2 + number;
  const platforms = [
    { x: 210, y: 378, width: 150, height: 20 },
    { x: 520, y: 320, width: 160, height: 20 },
    { x: 900, y: 370, width: 160, height: 20 },
    { x: 1260, y: 308, width: 170, height: 20 },
    { x: 1660, y: 362, width: 160, height: 20 },
    { x: worldWidth - 560, y: 318, width: 180, height: 20 },
  ];

  for (let x = 2050; x < worldWidth - 620; x += 430) {
    platforms.push({ x, y: 318 + ((x / 430) % 2) * 52, width: 170, height: 20 });
  }

  const stars = [];
  for (let i = 0; i < 5 + number; i += 1) {
    stars.push({ x: 260 + i * 360, y: i % 2 === 0 ? 332 : 254, size: 24, collected: false });
  }

  const enemies = [];
  const enemyKinds = ["slime", "bat", "guard", "brute"];
  for (let i = 0; i < enemyCount; i += 1) {
    const kind = enemyKinds[i % enemyKinds.length];
    const sizeBonus = number * 4 + i * 3;
    const width = kind === "brute" ? 72 + sizeBonus : 54 + sizeBonus;
    const height = kind === "bat" ? 42 + sizeBonus : 52 + sizeBonus;
    const x = 620 + i * Math.max(320, (worldWidth - 1000) / enemyCount);
    enemies.push({
      kind,
      x,
      y: kind === "bat" ? floorY - 170 : floorY - height,
      baseY: kind === "bat" ? floorY - 170 : floorY - height,
      width,
      height,
      vx: 0,
      facing: -1,
      maxHp: 42 + number * 22 + i * 12,
      hp: 42 + number * 22 + i * 12,
      alive: true,
      hurtFlash: 0,
      attackTimer: 0,
      patrolLeft: x - 160,
      patrolRight: x + 160,
      phase: i * 18,
      cagedTimer: 0,
    });
  }

  const river = {
    x: Math.floor(worldWidth * 0.48),
    y: floorY - 36,
    width: 270 + number * 35,
    height: 78,
  };

  enemies.push({
    kind: "drowned",
    x: river.x + river.width / 2,
    y: floorY - 70,
    baseY: floorY - 70,
    width: 58 + number * 5,
    height: 64 + number * 5,
    vx: 0,
    facing: -1,
    maxHp: 58 + number * 24,
    hp: 58 + number * 24,
    alive: true,
    hurtFlash: 0,
    attackTimer: 0,
    patrolLeft: river.x + 10,
    patrolRight: river.x + river.width - 70,
    phase: 44,
    cagedTimer: 0,
  });

  const spikeTraps = [];
  for (let i = 0; i < 3 + number; i += 1) {
    spikeTraps.push({
      x: 760 + i * 430,
      y: 78,
      width: 76,
      height: 38,
      state: "idle",
      timer: 0,
      vy: 0,
      originalY: 78,
    });
  }

  const lavaTraps = [];
  for (let i = 0; i < 2 + number; i += 1) {
    lavaTraps.push({
      x: 1110 + i * 520,
      y: floorY - 10,
      width: 132,
      height: 18,
      state: "safe",
      timer: 0,
      shake: 0,
    });
  }

  const animals = [
    { kind: "cow", x: 360, y: floorY - 46, width: 62, height: 46, alive: true, vx: 0.45, left: 300, right: 520, phase: 0 },
    { kind: "chicken", x: 720, y: floorY - 30, width: 34, height: 30, alive: true, vx: 0.55, left: 650, right: 860, phase: 20 },
    { kind: "pig", x: 1500, y: floorY - 38, width: 54, height: 38, alive: true, vx: 0.5, left: 1420, right: 1660, phase: 40 },
    { kind: "cow", x: Math.floor(worldWidth * 0.72), y: floorY - 46, width: 62, height: 46, alive: true, vx: 0.48, left: Math.floor(worldWidth * 0.72) - 90, right: Math.floor(worldWidth * 0.72) + 150, phase: 60 },
  ];

  return {
    number,
    worldWidth,
    reward: 40 + number * 40,
    platforms,
    stars,
    enemies,
    animals,
    river,
    spikeTraps,
    lavaTraps,
    chest: {
      x: worldWidth - 150,
      y: floorY - 52,
      width: 62,
      height: 52,
      opened: false,
      locked: true,
    },
  };
}

function showMenu(reason) {
  gameState = "menu";
  cancelAnimationFrame(animationFrame);

  if (reason === "win") {
    resultLabel.textContent = `第 ${currentLevel - 1} 关胜利！`;
    menuText.textContent = "奖励到手。下一关地图更长、怪更多、奖励也更丰富。";
  } else if (reason === "death") {
    resultLabel.textContent = "挑战失败";
    menuText.textContent = "回商店升级一下，再去试试更聪明的怪物和陷阱。";
  } else {
    resultLabel.textContent = "准备冒险";
    menuText.textContent = "长地图里有怪物、尖刺、岩浆陷阱和宝箱。小星星每个值 60 金币。";
  }

  level = buildLevel(currentLevel);
  drawMenuBackdrop();
  updateHud();
  renderShop();
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
  moveProjectiles();
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

  if (keys.has("KeyJ")) attack();
  if (keys.has("KeyK")) throwGrenade();
}

function isPlayerInRiver() {
  if (!level || !level.river) return false;
  return touches(player, level.river);
}

function movePlayer() {
  const previousBottom = player.y + player.height;

  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;
  if (isPlayerInRiver()) {
    player.vy *= 0.72;
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

    const distance = player.x + player.width / 2 - (enemy.x + enemy.width / 2);
    const absDistance = Math.abs(distance);
    const inSight = absDistance < 430;
    enemy.facing = distance > 0 ? 1 : -1;

    if (enemy.kind === "bat" || enemy.kind === "drowned") {
      enemy.y = enemy.baseY + Math.sin((Date.now() / 160 + enemy.phase) % 80) * 22;
    }

    if (inSight && absDistance > 82) {
      enemy.x += Math.sign(distance) * (enemy.kind === "brute" ? 1.45 : 2.05);
    } else if (!inSight) {
      enemy.x += Math.sin((Date.now() / 550 + enemy.phase) % 20) * 0.85;
    }

    enemy.x = Math.max(enemy.patrolLeft, Math.min(enemy.patrolRight, enemy.x));

    if (absDistance >= 48 && absDistance <= 110 && Math.abs(player.y - enemy.y) < 96 && enemy.attackTimer === 0) {
      enemy.attackTimer = enemy.kind === "brute" ? 92 : 70;
      hurtPlayer(enemy.kind === "brute" ? 2 : 1);
      effects.push({ x: enemy.x, y: enemy.y + 8, width: enemy.width, height: enemy.height, life: 12, kind: "claw" });
    }
  }
}

function moveAnimals() {
  for (const animal of level.animals) {
    if (!animal.alive) continue;
    animal.x += animal.vx;
    if (animal.x < animal.left || animal.x + animal.width > animal.right) {
      animal.vx *= -1;
    }
  }
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
      trap.timer -= 1;
      if (onTrap) hurtPlayer(1);
      if (trap.timer <= 0) {
        trap.state = "safe";
      }
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
    player.hearts = 2;
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
  renderBackpack();
}

function useMedkit() {
  if (!player || inventory.medkit <= 0) return;
  inventory.medkit -= 1;
  player.hearts = 2;
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
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hurtFlash = 10;

  if (enemy.hp === 0) {
    enemy.alive = false;
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
    playSound("levelUp");
    effects.push({ x: player ? player.x - 18 : x, y: player ? player.y - 38 : y, width: 110, height: 30, life: 90, kind: "levelUp" });
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
    coins += level.reward;
    const gotPainting = Math.random() < 0.9;
    const gotWatch = Math.random() < 0.65;
    if (gotPainting) inventory.painting += 1;
    if (gotWatch) inventory.watch += 1;
    currentLevel += 1;
    updateHud();
    renderBackpack();
    effects.push({ x: chest.x - 4, y: chest.y - 36, width: 96, height: 36, life: 42, kind: "coins" });
    if (gotPainting) effects.push({ x: chest.x - 18, y: chest.y - 76, width: 150, height: 30, life: 88, kind: "painting" });
    if (gotWatch) effects.push({ x: chest.x - 10, y: chest.y - 104, width: 130, height: 30, life: 88, kind: "watch" });
    draw();
    setTimeout(() => showMenu("win"), 450);
  }
}

function checkDangerHits() {
  for (const enemy of level.enemies) {
    if (enemy.alive && touches(player, enemy)) {
      hurtPlayer(1);
    }
  }

  for (const trap of level.spikeTraps) {
    if (trap.state === "falling" && touches(player, trap)) {
      hurtPlayer(1);
    }
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
    const owned = item.type === "horse" ? hasHorse : item.type === "item" && item.item === "speedPotion" ? speedPotionOwned : item.type === "weapon" && item.index <= weaponLevel;
    const lockedByOrder = item.type === "weapon" && item.index !== weaponLevel + 1 && !owned;
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
    { key: "painting", name: "家人是一幅画", count: inventory.painting, action: "卖 300", onClick: () => sellTreasure("painting", 300) },
    { key: "watch", name: "黄金手表", count: inventory.watch, action: "卖 100", onClick: () => sellTreasure("watch", 100) },
    { key: "powerPotion", name: "力量药水", count: inventory.powerPotion, action: "使用", onClick: usePowerPotion },
    { key: "medkit", name: "医疗包", count: inventory.medkit, action: "使用", onClick: useMedkit },
  ];

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "inventory-item";
    item.innerHTML = `<span>${row.name} x${row.count}</span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = row.action;
    button.disabled = row.count <= 0;
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
  const owned = item.type === "horse" ? hasHorse : item.type === "item" && item.item === "speedPotion" ? speedPotionOwned : item.type === "weapon" && item.index <= weaponLevel;
  if (owned || coins < item.cost) return;
  if (item.type === "weapon" && item.index !== weaponLevel + 1) return;

  coins -= item.cost;
  if (item.type === "horse") {
    hasHorse = true;
  } else if (item.type === "item" && item.item === "speedPotion") {
    speedPotionOwned = true;
  } else if (item.type === "item") {
    inventory[item.item] += 1;
  } else {
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
  blackFistTimer = Math.max(0, blackFistTimer - 1);

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
  playCountElement.textContent = playCount;
  coinsElement.textContent = coins;
  heroLevelElement.textContent = heroLevel;
  experienceElement.textContent = `${experience}/${experienceNeeded}`;
  heartsElement.textContent = player ? Math.max(0, player.hearts) : 2;
  monsterCountElement.textContent = remainingMonsters;
  professionNameElement.textContent = professions[selectedProfession].name;
  weaponNameElement.textContent = hasHorse ? `${weapons[weaponLevel].name}+马` : weapons[weaponLevel].name;
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
  drawTraps();
  drawChest();
  drawAnimals();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawEffects();
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
  drawPlatforms();
  ctx.restore();
}

function drawSky() {
  ctx.fillStyle = "#6dcff6";
  ctx.fillRect(cameraX, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4db4e6";
  ctx.fillRect(cameraX, 284, canvas.width, 170);

  for (let x = 80; x < level.worldWidth; x += 470) {
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
  ctx.fillStyle = "#42c96d";
  ctx.fillRect(0, floorY, level.worldWidth, canvas.height - floorY);
  ctx.fillStyle = "#2aa654";
  ctx.fillRect(0, floorY, level.worldWidth, 16);
  ctx.fillStyle = "#7d4a2b";
  ctx.fillRect(0, floorY + 42, level.worldWidth, canvas.height - floorY - 42);

  for (let x = 0; x < level.worldWidth; x += 32) {
    ctx.fillStyle = x % 64 === 0 ? "#216f3e" : "#2d8c4a";
    ctx.fillRect(x, floorY + 16, 16, 10);
  }
}

function drawPlatforms() {
  for (const platform of level.platforms) {
    ctx.fillStyle = "#6a3d24";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#45d06f";
    ctx.fillRect(platform.x, platform.y - 12, platform.width, 14);
    ctx.fillStyle = "#2b9a54";
    ctx.fillRect(platform.x, platform.y, platform.width, 5);
  }
}

function drawRiver() {
  const river = level.river;
  ctx.fillStyle = "#1d8fd8";
  ctx.fillRect(river.x, river.y, river.width, river.height);
  ctx.fillStyle = "#65d7ff";
  for (let x = river.x + 12; x < river.x + river.width; x += 46) {
    ctx.fillRect(x, river.y + 14, 24, 6);
    ctx.fillRect(x + 18, river.y + 42, 30, 6);
  }
  ctx.fillStyle = "#0f5f9f";
  ctx.fillRect(river.x, river.y + river.height - 12, river.width, 12);
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
    ctx.fillStyle = trap.state === "lava" ? "#ff4d2e" : trap.state === "shaking" ? "#d9903d" : "#6a3d24";
    ctx.fillRect(x, trap.y, trap.width, trap.height);
    ctx.fillStyle = trap.state === "lava" ? "#ffd34d" : "#45d06f";
    ctx.fillRect(x, trap.y - 8, trap.width, 8);
  }
  ctx.restore();
}

function drawChest() {
  const chest = level.chest;
  ctx.save();
  ctx.translate(-cameraX, 0);
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
  ctx.fillRect(animal.x + 10, animal.y + animal.height - 4, 9, 12);
  ctx.fillRect(animal.x + 42, animal.y + animal.height - 4, 9, 12);
}

function drawChicken(animal) {
  ctx.fillStyle = "#fffdf0";
  ctx.fillRect(animal.x + 6, animal.y + 8, 24, 20);
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
  ctx.fillStyle = "#f4a0b7";
  ctx.fillRect(animal.x, animal.y + 10, animal.width, animal.height - 10);
  ctx.fillStyle = "#ffc0d0";
  ctx.fillRect(animal.x + 34, animal.y, 22, 22);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(animal.x + 42, animal.y + 7, 4, 4);
  ctx.fillStyle = "#e77796";
  ctx.fillRect(animal.x + 48, animal.y + 12, 10, 8);
  ctx.fillStyle = "#b85c7a";
  ctx.fillRect(animal.x + 8, animal.y + animal.height - 3, 8, 10);
  ctx.fillRect(animal.x + 34, animal.y + animal.height - 3, 8, 10);
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
  const barWidth = Math.max(58, enemy.width);
  const x = enemy.x + enemy.width / 2 - barWidth / 2;
  const y = enemy.y - 16;
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x, y, barWidth, 8);
  ctx.fillStyle = enemy.alive ? "#45d06f" : "#8f95a3";
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), 8);
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

  if (hasHorse) {
    ctx.fillStyle = "#8b5a36";
    ctx.fillRect(x - 6, y + 44, 72, 30);
    ctx.fillRect(x + 44, y + 24, 26, 28);
    ctx.fillStyle = "#211b2c";
    ctx.fillRect(x + 6, y + 70, 10, 14);
    ctx.fillRect(x + 48, y + 70, 10, 14);
    ctx.fillStyle = "#fff4c7";
    ctx.fillRect(x + 58, y + 34, 5, 5);
  }

  const knightY = hasHorse ? y + 4 : y;
  ctx.fillStyle = "#d9dde5";
  ctx.fillRect(x + 10, knightY + 30, 30, 36);
  ctx.fillStyle = "#8f95a3";
  ctx.fillRect(x + 10, knightY + 56, 12, 12);
  ctx.fillRect(x + 28, knightY + 56, 12, 12);
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

    if (effect.kind === "coins") drawTinyText(`+${level.reward} 金币`, effect.x, effect.y - (42 - effect.life), "#ffd34d");
    if (effect.kind === "starCoins") drawTinyText("+60 金币", effect.x, effect.y - (42 - effect.life), "#ffd34d");
    if (effect.kind === "xp") drawTinyText(`+${effect.amount} 经验`, effect.x, effect.y, "#8ee8ff");
    if (effect.kind === "levelUp") drawTinyText(`升级！攻击 x${2 ** (heroLevel - 1)}`, effect.x, effect.y, "#ffd34d");
    if (effect.kind === "unlock") drawTinyText("宝箱已解锁！", effect.x, effect.y, "#ffd34d");
    if (effect.kind === "heal") drawTinyText("生命回满", effect.x, effect.y, "#45d06f");
    if (effect.kind === "power") drawTinyText("力量 x3", effect.x, effect.y, "#ff6b50");
    if (effect.kind === "blackFist") drawTinyText("黑拳无敌", effect.x, effect.y, "#fff29a");
    if (effect.kind === "cageHit") drawTinyText("困住 10 秒", effect.x, effect.y - 8, "#fff29a");
    if (effect.kind === "painting") drawTinyText("获得：家人是一幅画", effect.x, effect.y, "#ffd34d");
    if (effect.kind === "watch") drawTinyText("获得：黄金手表", effect.x, effect.y, "#ffd34d");
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
