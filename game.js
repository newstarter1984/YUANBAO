const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const playCountElement = document.querySelector("#playCount");
const coinsElement = document.querySelector("#coins");
const heartsElement = document.querySelector("#hearts");
const weaponNameElement = document.querySelector("#weaponName");
const mainMenu = document.querySelector("#mainMenu");
const resultLabel = document.querySelector("#resultLabel");
const menuText = document.querySelector("#menuText");
const menuPlayCount = document.querySelector("#menuPlayCount");
const menuCoins = document.querySelector("#menuCoins");
const shopItems = document.querySelector("#shopItems");
const startButton = document.querySelector("#startButton");

const keys = new Set();
const gravity = 0.75;
const floorY = 454;
const playerStart = { x: 80, y: floorY - 72 };

const weapons = [
  { name: "小剑", cost: 0, damage: 1, range: 70, cooldown: 28, kind: "melee" },
  { name: "狼牙棒", cost: 10, damage: 2, range: 88, cooldown: 30, kind: "melee" },
  { name: "步枪", cost: 30, damage: 2, range: 560, cooldown: 24, kind: "rifle" },
  { name: "火箭筒", cost: 100, damage: 5, range: 620, cooldown: 48, kind: "rocket" },
];

const platforms = [
  { x: 176, y: 378, width: 128, height: 20 },
  { x: 374, y: 318, width: 132, height: 20 },
  { x: 574, y: 374, width: 132, height: 20 },
  { x: 760, y: 294, width: 130, height: 20 },
];

let player;
let stars;
let enemy;
let chest;
let projectiles = [];
let effects = [];
let coins = 0;
let playCount = 0;
let weaponLevel = 0;
let gameState = "menu";
let animationFrame;

function startGame() {
  playCount += 1;
  gameState = "playing";
  mainMenu.classList.add("is-hidden");

  player = {
    x: playerStart.x,
    y: playerStart.y,
    width: 48,
    height: 72,
    vx: 0,
    vy: 0,
    speed: 5.8,
    jumpPower: -16,
    onGround: true,
    facing: 1,
    hearts: 2,
    invincible: 0,
    attackTimer: 0,
    attacking: 0,
  };

  stars = [
    { x: 230, y: 336, size: 24, collected: false },
    { x: 420, y: 274, size: 24, collected: false },
    { x: 620, y: 330, size: 24, collected: false },
    { x: 810, y: 250, size: 24, collected: false },
  ];

  const sizeBonus = weaponLevel * 14;
  const enemyWidth = 56 + sizeBonus;
  const enemyHeight = 48 + sizeBonus;
  enemy = {
    x: 645,
    y: floorY - enemyHeight,
    width: enemyWidth,
    height: enemyHeight,
    vx: 2.2 + weaponLevel * 0.35,
    left: 548,
    right: 842,
    maxHp: 3 + weaponLevel * 4,
    hp: 3 + weaponLevel * 4,
    alive: true,
    hurtFlash: 0,
  };

  chest = {
    x: 862,
    y: floorY - 48,
    width: 58,
    height: 48,
    opened: false,
    locked: true,
  };

  projectiles = [];
  effects = [];
  updateHud();
  cancelAnimationFrame(animationFrame);
  update();
}

function showMenu(reason) {
  gameState = "menu";
  cancelAnimationFrame(animationFrame);

  if (reason === "win") {
    resultLabel.textContent = "胜利！";
    menuText.textContent = "宝箱打开了，金币到手。可以升级武器，再挑战更强的小怪。";
  } else if (reason === "death") {
    resultLabel.textContent = "挑战失败";
    menuText.textContent = "小勇士被碰到两次就会回到主界面。看看金币够不够升级武器。";
  } else {
    resultLabel.textContent = "准备冒险";
    menuText.textContent = "打败小怪，打开宝箱，攒金币升级武器。";
  }

  drawMenuBackdrop();
  updateHud();
  renderShop();
  mainMenu.classList.remove("is-hidden");
}

function update() {
  if (gameState !== "playing") return;

  handleInput();
  movePlayer();
  moveEnemy();
  moveProjectiles();
  collectStars();
  handleChest();
  checkEnemyHitPlayer();
  tickTimers();
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

  if (keys.has("KeyJ")) {
    attack();
  }
}

function movePlayer() {
  const previousBottom = player.y + player.height;

  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;
  player.onGround = false;

  for (const platform of platforms) {
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

  player.x = Math.max(18, Math.min(canvas.width - player.width - 18, player.x));
}

function moveEnemy() {
  if (!enemy.alive) return;

  enemy.x += enemy.vx;

  if (enemy.x < enemy.left || enemy.x + enemy.width > enemy.right) {
    enemy.vx *= -1;
  }
}

function attack() {
  const weapon = weapons[weaponLevel];
  if (player.attackTimer > 0) return;

  player.attackTimer = weapon.cooldown;
  player.attacking = 12;

  if (weapon.kind === "melee") {
    const hitBox = {
      x: player.facing > 0 ? player.x + player.width - 6 : player.x - weapon.range + 6,
      y: player.y + 18,
      width: weapon.range,
      height: 42,
    };
    damageEnemyIfHit(hitBox, weapon.damage);
    effects.push({ x: hitBox.x, y: hitBox.y, width: hitBox.width, height: hitBox.height, life: 10, kind: "slash" });
    return;
  }

  spawnBullet(weapon);
}

function spawnBullet(weapon) {
  const speed = weapon.kind === "rocket" ? 8 : 12;
  projectiles.push({
    x: player.facing > 0 ? player.x + player.width : player.x - 12,
    y: player.y + 34,
    width: weapon.kind === "rocket" ? 24 : 12,
    height: weapon.kind === "rocket" ? 12 : 6,
    vx: speed * player.facing,
    damage: weapon.damage,
    rangeLeft: weapon.range,
    kind: weapon.kind,
  });
}

function moveProjectiles() {
  for (const projectile of projectiles) {
    projectile.x += projectile.vx;
    projectile.rangeLeft -= Math.abs(projectile.vx);

    if (enemy.alive && touches(projectile, enemy)) {
      damageEnemy(projectile.damage);
      projectile.rangeLeft = 0;

      if (projectile.kind === "rocket") {
        effects.push({ x: projectile.x - 28, y: projectile.y - 28, width: 72, height: 72, life: 18, kind: "boom" });
      }
    }
  }

  projectiles = projectiles.filter((projectile) => projectile.rangeLeft > 0 && projectile.x > -40 && projectile.x < canvas.width + 40);
}

function damageEnemyIfHit(hitBox, damage) {
  if (enemy.alive && touches(hitBox, enemy)) {
    damageEnemy(damage);
  }
}

function damageEnemy(damage) {
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hurtFlash = 10;

  if (enemy.hp === 0) {
    enemy.alive = false;
    chest.locked = false;
    effects.push({ x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height, life: 24, kind: "poof" });
  }
}

function collectStars() {
  for (const star of stars) {
    if (!star.collected && touches(player, starBox(star))) {
      star.collected = true;
      coins += 1;
      updateHud();
    }
  }
}

function handleChest() {
  if (!chest.opened && !chest.locked && touches(player, chest)) {
    chest.opened = true;
    coins += 20;
    updateHud();
    effects.push({ x: chest.x - 4, y: chest.y - 36, width: 72, height: 36, life: 42, kind: "coins" });
    draw();
    setTimeout(() => showMenu("win"), 450);
  }
}

function checkEnemyHitPlayer() {
  if (!enemy.alive || player.invincible > 0 || !touches(player, enemy)) return;

  player.hearts -= 1;
  player.invincible = 70;
  player.vx = player.x < enemy.x ? -8 : 8;
  player.vy = -8;
  updateHud();

  if (player.hearts <= 0) {
    showMenu("death");
  }
}

function renderShop() {
  shopItems.innerHTML = "";

  for (let i = 1; i < weapons.length; i += 1) {
    const weapon = weapons[i];
    const button = document.createElement("button");
    const owned = i <= weaponLevel;
    const lockedByOrder = i !== weaponLevel + 1 && !owned;
    button.type = "button";
    button.className = owned ? "shop-item is-owned" : "shop-item";
    button.disabled = owned || lockedByOrder || coins < weapon.cost;
    button.innerHTML = `<strong>${weapon.name}</strong><span>${owned ? "已拥有" : `${weapon.cost} 金币`}</span>`;
    button.addEventListener("click", () => buyWeapon(i));
    shopItems.append(button);
  }
}

function buyWeapon(index) {
  const weapon = weapons[index];
  if (!weapon || index !== weaponLevel + 1 || coins < weapon.cost) return;

  coins -= weapon.cost;
  weaponLevel = index;
  updateHud();
  renderShop();
}

function tickTimers() {
  player.attackTimer = Math.max(0, player.attackTimer - 1);
  player.attacking = Math.max(0, player.attacking - 1);
  player.invincible = Math.max(0, player.invincible - 1);
  enemy.hurtFlash = Math.max(0, enemy.hurtFlash - 1);

  for (const effect of effects) {
    effect.life -= 1;
  }
  effects = effects.filter((effect) => effect.life > 0);
}

function updateHud() {
  playCountElement.textContent = playCount;
  coinsElement.textContent = coins;
  heartsElement.textContent = player ? player.hearts : 2;
  weaponNameElement.textContent = weapons[weaponLevel].name;
  menuPlayCount.textContent = playCount;
  menuCoins.textContent = coins;
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
  drawChest();
  drawEnemy();
  drawProjectiles();
  drawPlayer();
  drawEffects();
}

function drawMenuBackdrop() {
  drawWorld();
  drawPixelSign(346, 238, "PIXEL QUEST");
}

function drawWorld() {
  drawSky();
  drawGround();
  drawPlatforms();
}

function drawSky() {
  ctx.fillStyle = "#6dcff6";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#4db4e6";
  ctx.fillRect(0, 284, canvas.width, 170);

  drawBlockCloud(96, 88, 4);
  drawBlockCloud(492, 70, 3);
  drawBlockCloud(772, 126, 4);

  ctx.fillStyle = "#ffe66d";
  ctx.fillRect(54, 52, 56, 56);
  ctx.fillStyle = "#fff29a";
  ctx.fillRect(70, 66, 24, 24);
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
  ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
  ctx.fillStyle = "#2aa654";
  ctx.fillRect(0, floorY, canvas.width, 16);
  ctx.fillStyle = "#7d4a2b";
  ctx.fillRect(0, floorY + 42, canvas.width, canvas.height - floorY - 42);

  for (let x = 0; x < canvas.width; x += 32) {
    ctx.fillStyle = x % 64 === 0 ? "#216f3e" : "#2d8c4a";
    ctx.fillRect(x, floorY + 16, 16, 10);
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    ctx.fillStyle = "#6a3d24";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#45d06f";
    ctx.fillRect(platform.x, platform.y - 12, platform.width, 14);
    ctx.fillStyle = "#2b9a54";
    ctx.fillRect(platform.x, platform.y, platform.width, 5);
  }
}

function drawStars() {
  for (const star of stars) {
    if (star.collected) continue;
    ctx.fillStyle = "#ffd34d";
    ctx.fillRect(star.x - 4, star.y - 16, 8, 32);
    ctx.fillRect(star.x - 16, star.y - 4, 32, 8);
    ctx.fillRect(star.x - 10, star.y - 10, 20, 20);
    ctx.fillStyle = "#fff29a";
    ctx.fillRect(star.x - 4, star.y - 4, 8, 8);
  }
}

function drawChest() {
  ctx.fillStyle = chest.opened ? "#8e5a32" : "#d9903d";
  ctx.fillRect(chest.x, chest.y + (chest.opened ? 12 : 0), chest.width, chest.height - (chest.opened ? 12 : 0));
  ctx.fillStyle = "#5d351d";
  ctx.fillRect(chest.x, chest.y + 18, chest.width, 6);
  ctx.fillRect(chest.x + 6, chest.y + 6, 8, chest.height - 10);
  ctx.fillRect(chest.x + chest.width - 14, chest.y + 6, 8, chest.height - 10);
  ctx.fillStyle = chest.locked ? "#8f95a3" : "#ffd34d";
  ctx.fillRect(chest.x + 23, chest.y + 18, 12, 16);

  if (chest.locked) {
    drawTinyText("打败小怪", chest.x - 9, chest.y - 13, "#211b2c");
  }
}

function drawEnemy() {
  if (!enemy.alive) {
    drawEnemyHealthBar();
    return;
  }

  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#e84c5f";
  ctx.fillRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10);
  ctx.fillStyle = "#bb2b43";
  ctx.fillRect(enemy.x + 8, enemy.y, enemy.width - 16, 16);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(enemy.x + enemy.width * 0.24, enemy.y + enemy.height * 0.34, 10, 10);
  ctx.fillRect(enemy.x + enemy.width * 0.62, enemy.y + enemy.height * 0.34, 10, 10);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(enemy.x + enemy.width * 0.28, enemy.y + enemy.height * 0.38, 4, 4);
  ctx.fillRect(enemy.x + enemy.width * 0.66, enemy.y + enemy.height * 0.38, 4, 4);
  ctx.fillRect(enemy.x + enemy.width * 0.32, enemy.y + enemy.height * 0.68, enemy.width * 0.36, 6);
  drawEnemyHealthBar();
}

function drawEnemyHealthBar() {
  const barWidth = Math.max(58, enemy.width);
  const x = enemy.x + enemy.width / 2 - barWidth / 2;
  const y = enemy.y - 16;
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x, y, barWidth, 8);
  ctx.fillStyle = enemy.alive ? "#45d06f" : "#8f95a3";
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), 8);
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    ctx.fillStyle = projectile.kind === "rocket" ? "#ff6b50" : "#211b2c";
    ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    if (projectile.kind === "rocket") {
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(projectile.x - Math.sign(projectile.vx) * 10, projectile.y + 3, 10, 6);
    }
  }
}

function drawPlayer() {
  const flashing = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0;
  if (flashing) return;

  const x = player.x;
  const y = player.y;
  ctx.fillStyle = "#2451c5";
  ctx.fillRect(x + 10, y + 34, 30, 34);
  ctx.fillStyle = "#16358f";
  ctx.fillRect(x + 10, y + 60, 12, 12);
  ctx.fillRect(x + 28, y + 60, 12, 12);
  ctx.fillStyle = "#f2b279";
  ctx.fillRect(x + 8, y + 10, 36, 30);
  ctx.fillStyle = "#8a4b2b";
  ctx.fillRect(x + 8, y + 6, 36, 10);
  ctx.fillRect(x + 4, y + 14, 8, 14);
  ctx.fillStyle = "#211b2c";
  ctx.fillRect(x + (player.facing > 0 ? 32 : 16), y + 21, 5, 5);
  ctx.fillRect(x + 21, y + 32, 12, 4);
  ctx.fillStyle = "#ffd34d";
  ctx.fillRect(x + 14, y - 8, 24, 10);
  ctx.fillRect(x + 22, y - 16, 8, 8);
  drawWeapon();
}

function drawWeapon() {
  const weapon = weapons[weaponLevel];
  const handX = player.facing > 0 ? player.x + 42 : player.x + 6;
  const handY = player.y + 44;
  const direction = player.facing;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.scale(direction, 1);

  if (weapon.kind === "melee") {
    ctx.fillStyle = weaponLevel === 0 ? "#d9dde5" : "#5e5b62";
    ctx.fillRect(0, player.attacking > 0 ? -18 : -8, weaponLevel === 0 ? 44 : 54, weaponLevel === 0 ? 7 : 14);
    ctx.fillStyle = "#8b5a36";
    ctx.fillRect(-8, -3, 12, 8);
  } else {
    ctx.fillStyle = weapon.kind === "rocket" ? "#595461" : "#2d3142";
    ctx.fillRect(0, -10, weapon.kind === "rocket" ? 68 : 60, weapon.kind === "rocket" ? 20 : 14);
    ctx.fillStyle = "#8f95a3";
    ctx.fillRect(weapon.kind === "rocket" ? 52 : 46, -6, 18, 8);
  }

  ctx.restore();
}

function drawEffects() {
  for (const effect of effects) {
    if (effect.kind === "slash") {
      ctx.fillStyle = "#fff29a";
      ctx.fillRect(effect.x + 10, effect.y + 12, effect.width - 20, 8);
    }

    if (effect.kind === "boom" || effect.kind === "poof") {
      const size = Math.max(8, effect.life * 3);
      ctx.fillStyle = effect.kind === "boom" ? "#ff6b50" : "#d8edf5";
      ctx.fillRect(effect.x + effect.width / 2 - size / 2, effect.y + effect.height / 2 - size / 2, size, size);
      ctx.fillStyle = "#ffd34d";
      ctx.fillRect(effect.x + effect.width / 2 - size / 4, effect.y + effect.height / 2 - size / 4, size / 2, size / 2);
    }

    if (effect.kind === "coins") {
      drawTinyText("+20 金币", effect.x, effect.y - (42 - effect.life), "#ffd34d");
    }
  }
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

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyJ", "Enter"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Enter" && gameState === "menu") {
    startGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

startButton.addEventListener("click", startGame);

showMenu("ready");
