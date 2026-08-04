const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreElement = document.querySelector("#score");
const message = document.querySelector("#message");
const restartButton = document.querySelector("#restartButton");

const keys = new Set();
const gravity = 0.75;
const floorY = 454;

let player;
let stars;
let enemy;
let score;
let gameOver;
let animationFrame;

function resetGame() {
  player = {
    x: 80,
    y: floorY - 72,
    width: 54,
    height: 72,
    vx: 0,
    vy: 0,
    speed: 5.8,
    jumpPower: -16,
    onGround: true,
    facing: 1,
  };

  stars = [
    { x: 230, y: 336, size: 26, collected: false },
    { x: 420, y: 274, size: 26, collected: false },
    { x: 620, y: 330, size: 26, collected: false },
    { x: 810, y: 250, size: 26, collected: false },
  ];

  enemy = {
    x: 690,
    y: floorY - 46,
    width: 58,
    height: 46,
    vx: 2.2,
    left: 560,
    right: 875,
  };

  score = 0;
  gameOver = false;
  scoreElement.textContent = score;
  message.classList.add("is-hidden");
  cancelAnimationFrame(animationFrame);
  update();
}

function update() {
  handleInput();
  movePlayer();
  moveEnemy();
  collectStars();
  checkEnemyHit();
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
}

function movePlayer() {
  player.x += player.vx;
  player.y += player.vy;
  player.vy += gravity;

  if (player.y + player.height >= floorY) {
    player.y = floorY - player.height;
    player.vy = 0;
    player.onGround = true;
  }

  player.x = Math.max(18, Math.min(canvas.width - player.width - 18, player.x));
}

function moveEnemy() {
  enemy.x += enemy.vx;

  if (enemy.x < enemy.left || enemy.x + enemy.width > enemy.right) {
    enemy.vx *= -1;
  }
}

function collectStars() {
  for (const star of stars) {
    if (!star.collected && touches(player, starBox(star))) {
      star.collected = true;
      score += 10;
      scoreElement.textContent = score;
    }
  }
}

function checkEnemyHit() {
  if (touches(player, enemy)) {
    gameOver = true;
    message.classList.remove("is-hidden");
  }
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
  drawEnemy();
  drawPlayer();
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
  platform(176, 378, 128);
  platform(374, 318, 132);
  platform(574, 374, 132);
  platform(760, 294, 130);
}

function platform(x, y, width) {
  ctx.fillStyle = "#8b5a36";
  ctx.fillRect(x, y, width, 20);
  ctx.fillStyle = "#4fc370";
  ctx.fillRect(x, y - 10, width, 14);
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

function drawEnemy() {
  ctx.fillStyle = "#e64b55";
  roundRect(enemy.x, enemy.y + 10, enemy.width, enemy.height - 10, 14);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(enemy.x + 18, enemy.y + 22, 6, 0, Math.PI * 2);
  ctx.arc(enemy.x + 40, enemy.y + 22, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#172033";
  ctx.beginPath();
  ctx.arc(enemy.x + 20, enemy.y + 22, 2.5, 0, Math.PI * 2);
  ctx.arc(enemy.x + 38, enemy.y + 22, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

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

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
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
