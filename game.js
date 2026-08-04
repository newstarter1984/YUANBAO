const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const coinsElement = document.querySelector("#coins");
const heartsElement = document.querySelector("#hearts");
const weaponNameElement = document.querySelector("#weaponName");
const message = document.querySelector("#message");
const messageTitle = document.querySelector("#messageTitle");
const messageText = document.querySelector("#messageText");
const restartButton = document.querySelector("#restartButton");
const shop = document.querySelector("#shop");
const shopHint = document.querySelector("#shopHint");
const shopItems = document.querySelector("#shopItems");

const keys = new Set();
const gravity = 0.75;
const floorY = 454;
const attackCooldown = 28;
const playerStart = { x: 80, y: floorY - 72 };

const weapons = [
  { name: "小剑", cost: 0, damage: 1, range: 70, cooldown: 28, kind: "melee" },
  { name: "狼牙棒", cost: 20, damage: 2, range: 86, cooldown: 30, kind: "melee" },
  { name: "步枪", cost: 40, damage: 2, range: 560, cooldown: 26, kind: "rifle" },
  { name: "散弹枪", cost: 70, damage: 2, range: 350, cooldown: 36, kind: "shotgun" },
  { name: "火箭筒", cost: 110, damage: 5, range: 620, cooldown: 48, kind: "rocket" },
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
let projectiles;
let effects;
let coins = 0;
let weaponLevel = 0;
let gameOver = false;
let animationFrame;

function resetGame() {
  player = {
    x: playerStart.x,
    y: playerStart.y,
    width: 54,
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
    { x: 230, y: 336, size: 26, collected: false },
    { x: 420, y: 274, size: 26, collected: false },
    { x: 620, y: 330, size: 26, collected: false },
    { x: 810, y: 250, size: 26, collected: false },
  ];

  const sizeBonus = weaponLevel * 10;
  const enemyWidth = 58 + sizeBonus;
  const enemyHeight = 46 + sizeBonus;
  enemy = {
    x: 645,
    y: floorY - enemyHeight,
    width: enemyWidth,
    height: enemyHeight,
    vx: 2.2 + weaponLevel * 0.28,
    left: 548,
    right: 842,
    maxHp: 3 + weaponLevel * 3,
    hp: 3 + weaponLevel * 3,
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
  gameOver = false;
  message.classList.add("is-hidden");
  updateHud();
  cancelAnimationFrame(animationFrame);
  update();
}

function update() {
  handleInput();
  movePlayer();
  moveEnemy();
  moveProjectiles();
  collectStars();
  handleChest();
  checkEnemyHitPlayer();
  tickTimers();
  draw();

  if (!gameOver) {
    animationFrame = requestAnimationFrame(update);
  }
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

  player.attackTimer = weapon.cooldown || attackCooldown;
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

  if (weapon.kind === "shotgun") {
    for (const offset of [-0.22, 0, 0.22]) {
      spawnBullet(weapon, offset);
    }
    return;
  }

  spawnBullet(weapon, 0);
}

function spawnBullet(weapon, slope) {
  const speed = weapon.kind === "rocket" ? 8 : 12;
  projectiles.push({
    x: player.facing > 0 ? player.x + player.width : player.x - 10,
    y: player.y + 34,
    width: weapon.kind === "rocket" ? 22 : 12,
    height: weapon.kind === "rocket" ? 12 : 6,
    vx: speed * player.facing,
    vy: slope * speed,
    damage: weapon.damage,
    rangeLeft: weapon.range,
    kind: weapon.kind,
  });
}

function moveProjectiles() {
  for (const projectile of projectiles) {
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.rangeLeft -= Math.abs(projectile.vx);

    if (enemy.alive && touches(projectile, enemy)) {
      damageEnemy(projectile.damage);
      projectile.rangeLeft = 0;

      if (projectile.kind === "rocket") {
        effects.push({ x: projectile.x - 28, y: projectile.y - 28, width: 70, height: 70, life: 18, kind: "boom" });
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
    effects.push({ x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height, life: 28, kind: "poof" });
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
    effects.push({ x: chest.x - 4, y: chest.y - 36, width: 72, height: 36, life: 54, kind: "coins" });
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
    showDeathScreen();
  }
}

function showDeathScreen() {
  gameOver = true;
  messageTitle.textContent = "小勇士倒下了";
  messageText.textContent = "被小怪碰到两次就会失败。升级武器后，小怪也会更强。";
  renderShop();
  message.classList.remove("is-hidden");
}

function renderShop() {
  const nextWeapon = weapons[weaponLevel + 1];
  shopItems.innerHTML = "";

  if (!nextWeapon) {
    shop.classList.remove("is-hidden");
    shopHint.textContent = "装备已经升到最高级了。";
    return;
  }

  const canAffordAny = weapons.slice(1).some((weapon) => coins >= weapon.cost && weapons.indexOf(weapon) > weaponLevel);
  shop.classList.toggle("is-hidden", !canAffordAny);
  shopHint.textContent = `当前金币：${coins}。下一件装备：${nextWeapon.name}，需要 ${nextWeapon.cost} 金币。`;

  for (let i = 1; i < weapons.length; i += 1) {
    const weapon = weapons[i];
    const button = document.createElement("button");
    const owned = i <= weaponLevel;
    button.type = "button";
    button.textContent = owned ? `${weapon.name} 已拥有` : `${weapon.name} ${weapon.cost} 金币`;
    button.disabled = owned || coins < weapon.cost || i !== weaponLevel + 1;
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
  coinsElement.textContent = coins;
  heartsElement.textContent = player ? player.hearts : 2;
  weaponNameElement.textContent = weapons[weaponLevel].name;
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
  drawSky();
  drawGround();
  drawPlatforms();
  drawStars();
  drawChest();
  drawEnemy();
  drawProjectiles();
  drawPlayer();
  drawEffects();
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#72cdf4");
  sky.addColorStop(0.72, "#caefff");
  sky.addColorStop(1, "#f7df85");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloud(138, 96, 1.1);
  drawCloud(514, 78, 0.82);
  drawCloud(785, 132, 1);
}

function drawCloud(x, y, scale) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(x, y, 28 * scale, 0, Math.PI * 2);
  ctx.arc(x + 30 * scale, y - 10 * scale, 34 * scale, 0, Math.PI * 2);
  ctx.arc(x + 66 * scale, y, 26 * scale, 0, Math.PI * 2);
  ctx.rect(x - 6 * scale, y, 86 * scale, 24 * scale);
  ctx.fill();
}

function drawGround() {
  ctx.fillStyle = "#54c878";
  ctx.fillRect(0, floorY, canvas.width, canvas.height - floorY);
  ctx.fillStyle = "#2e9a55";
  ctx.fillRect(0, floorY, canvas.width, 16);

  for (let x = 0; x < canvas.width; x += 42) {
    ctx.fillStyle = x % 84 === 0 ? "#237f45" : "#319e57";
    ctx.fillRect(x, floorY + 16, 22, 8);
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    ctx.fillStyle = "#8b5a36";
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.fillStyle = "#4fc370";
    ctx.fillRect(platform.x, platform.y - 10, platform.width, 14);
  }
}

function drawStars() {
  for (const star of stars) {
    if (star.collected) continue;
    drawStar(star.x, star.y, star.size);
  }
}

function drawStar(x, y, size) {
  const spikes = 5;
  const outerRadius = size;
  const innerRadius = size * 0.45;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.beginPath();

  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / spikes;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }

  ctx.closePath();
  ctx.fillStyle = "#ffd447";
  ctx.strokeStyle = "#8c6414";
  ctx.lineWidth = 4;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawChest() {
  ctx.fillStyle = chest.opened ? "#b0783d" : "#d99b45";
  roundRect(chest.x, chest.y + (chest.opened ? 10 : 0), chest.width, chest.height - (chest.opened ? 10 : 0), 7);
  ctx.fill();
  ctx.strokeStyle = "#5d351d";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = chest.locked ? "#777" : "#ffd447";
  ctx.fillRect(chest.x + 23, chest.y + 18, 12, 16);

  if (chest.locked) {
    ctx.fillStyle = "#172033";
    ctx.font = "700 14px Microsoft YaHei, sans-serif";
    ctx.fillText("打败小怪", chest.x - 8, chest.y - 8);
  }
}

function drawEnemy() {
  if (!enemy.alive) {
    drawEnemyHealthBar();
    return;
  }

  ctx.fillStyle = enemy.hurtFlash > 0 ? "#ffffff" : "#e64b55";
  roundRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10, 14);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.width * 0.32, enemy.y + enemy.height * 0.42, 6, 0, Math.PI * 2);
  ctx.arc(enemy.x + enemy.width * 0.68, enemy.y + enemy.height * 0.42, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(enemy.x + enemy.width * 0.34, enemy.y + enemy.height * 0.42, 2.5, 0, Math.PI * 2);
  ctx.arc(enemy.x + enemy.width * 0.66, enemy.y + enemy.height * 0.42, 2.5, 0, Math.PI * 2);
  ctx.fill();

  drawEnemyHealthBar();
}

function drawEnemyHealthBar() {
  const barWidth = Math.max(58, enemy.width);
  const x = enemy.x + enemy.width / 2 - barWidth / 2;
  const y = enemy.y - 16;
  ctx.fillStyle = "#222f44";
  ctx.fillRect(x, y, barWidth, 8);
  ctx.fillStyle = enemy.alive ? "#73df64" : "#8aa0aa";
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), 8);
}

function drawProjectiles() {
  for (const projectile of projectiles) {
    ctx.fillStyle = projectile.kind === "rocket" ? "#ff8f3d" : "#172033";
    roundRect(projectile.x, projectile.y, projectile.width, projectile.height, 4);
    ctx.fill();
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;
  const flashing = player.invincible > 0 && Math.floor(player.invincible / 6) % 2 === 0;

  if (flashing) return;

  ctx.fillStyle = "#2451c5";
  roundRect(x + 10, y + 32, 34, 38, 8);
  ctx.fill();

  ctx.fillStyle = "#f2b279";
  ctx.beginPath();
  ctx.arc(x + 27, y + 22, 23, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(x + (player.facing > 0 ? 35 : 20), y + 18, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 28, y + 27, 8, 0.1 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "#ffcf4a";
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 5);
  ctx.lineTo(x + 45, y + 5);
  ctx.lineTo(x + 27, y - 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8c6414";
  ctx.stroke();

  drawWeapon();
}

function drawWeapon() {
  const weapon = weapons[weaponLevel];
  const handX = player.facing > 0 ? player.x + 47 : player.x + 7;
  const handY = player.y + 44;
  const direction = player.facing;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.scale(direction, 1);
  ctx.rotate(player.attacking > 0 ? -0.55 : 0.2);

  if (weapon.kind === "melee") {
    ctx.strokeStyle = weaponLevel === 0 ? "#d9dde5" : "#5e5b62";
    ctx.lineWidth = weaponLevel === 0 ? 6 : 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(weaponLevel === 0 ? 44 : 54, -10);
    ctx.stroke();
  } else {
    ctx.fillStyle = weapon.kind === "rocket" ? "#5e5b62" : "#333c4d";
    roundRect(0, -10, weapon.kind === "shotgun" ? 54 : 66, weapon.kind === "rocket" ? 20 : 14, 5);
    ctx.fill();
  }

  ctx.restore();
}

function drawEffects() {
  for (const effect of effects) {
    const alpha = Math.max(0, effect.life / 54);
    ctx.save();
    ctx.globalAlpha = alpha;

    if (effect.kind === "slash") {
      ctx.strokeStyle = "#fff8a8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(effect.x + effect.width / 2, effect.y + effect.height / 2, effect.width / 2, -0.7, 0.6);
      ctx.stroke();
    }

    if (effect.kind === "boom" || effect.kind === "poof") {
      ctx.fillStyle = effect.kind === "boom" ? "#ff8f3d" : "#d8edf5";
      ctx.beginPath();
      ctx.arc(effect.x + effect.width / 2, effect.y + effect.height / 2, effect.width * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    if (effect.kind === "coins") {
      ctx.fillStyle = "#ffd447";
      ctx.font = "900 24px Microsoft YaHei, sans-serif";
      ctx.fillText("+20 金币", effect.x, effect.y + (1 - alpha) * -24);
    }

    ctx.restore();
  }
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyJ"].includes(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Enter" && gameOver) {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

restartButton.addEventListener("click", resetGame);

resetGame();
