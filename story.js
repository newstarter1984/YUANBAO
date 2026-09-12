const storyHud = document.querySelector("#storyHud");
const storyTitle = document.querySelector("#storyTitle");
const storyText = document.querySelector("#storyText");
const storyInteract = document.querySelector("#storyInteract");
const foxSaveKey = "yuanbao.fox-rescued.v1";
let foxRescued = false;
let foxTutorialPending = false;
let pendingVictory = null;
try { foxTutorialPending = localStorage.getItem("yuanbao.fox-tutorial-pending") === "yes"; } catch (_) {}
try { foxRescued = localStorage.getItem(foxSaveKey) === "yes"; } catch (_) { /* Private browsing may disable storage. */ }

function hideStory() {
  storyHud.classList.add("is-hidden");
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function initializeStoryLevel() {
  hideStory();
  if (level.number === 1) {
    level.story = { type: "meadow", state: "rescue", jump: false, attack: false, saved: foxRescued, clock: 0 };
    if (foxTutorialPending) {
      level.story.state = "tutorial";
      level.story.saved = false;
    }
  } else if (level.theme.id === "ocean") {
    level.story = {
      type: "ocean", state: "help", clock: 0, timer: 0, attacked: false,
      crabX: 440, whaleX: 1510, whaleY: 250, net: 1, ramTimer: 0,
      shipX: level.worldWidth - 620, rewarded: false,
    };
    // Story actors are separate from enemies so friendly creatures cannot be attacked.
    level.enemies = [];
    level.waveHazard = null;
    if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const call = new SpeechSynthesisUtterance("救命呀！请帮帮我们，鲸鱼被困住了！");
      call.lang = "zh-CN";
      call.volume = 0.4;
      call.rate = 1.1;
      window.speechSynthesis.speak(call);
    }
  }
  refreshStoryHud();
}

function storyOwnsChest() {
  const s = level && level.story;
  return Boolean(s && (s.type === "ocean" || !s.saved || s.state === "freed"));
}

function recordStoryAction(action) {
  const s = level && level.story;
  if (!s) return;
  if (s.type === "meadow" && s.state === "tutorial") {
    if (action === "jump") s.jump = true;
    if (action === "attack" && s.jump) { s.attack = true; s.state = "done"; }
  }
}

function isFoxTutorial() {
  const s = level && level.story;
  return Boolean(s && s.type === "meadow" && ["victory", "tutorial", "done"].includes(s.state));
}

function damageStoryCage(hitBox) {
  const s = level && level.story;
  if (gameState !== "playing" || isBackpackOpen() || !s || s.type !== "meadow" || s.saved || s.state !== "rescue") return false;
  const cage = { x: level.chest.x - 16, y: floorY - 93, width: 98, height: 93 };
  if (!touches(hitBox, cage)) return false;
  s.state = "victory";
  foxRescued = true;
  foxTutorialPending = true;
  try { localStorage.setItem("yuanbao.fox-tutorial-pending", "yes"); } catch (_) {}
  try { localStorage.setItem(foxSaveKey, "yes"); } catch (_) { /* Keep session progress if storage is unavailable. */ }
  effects.push({ x: cage.x - 80, y: cage.y - 40, width: 220, height: 30, life: 180, kind: "loot", text: "第一关胜利！小狐狸获救！" });
  refreshStoryHud();
  requestLevelVictory(false, "小狐狸获救了！可以先逛商店，点击开始后跟小狐狸学习跳跃和攻击。");
  return true;
}

// Settle after the current attack finishes, before replacing the active level.
function requestLevelVictory(advance = true, message = "") {
  if (pendingVictory || gameState !== "playing") return;
  pendingVictory = { number: level.number, advance, message };
}

function finishPendingVictory() {
  if (!pendingVictory) return false;
  const win = pendingVictory;
  pendingVictory = null;
  currentLevel = win.number + (win.advance ? 1 : 0);
  keys.clear();
  showMenu("win");
  resultLabel.textContent = `第 ${win.number} 关胜利！`;
  if (win.message) menuText.textContent = win.message;
  return true;
}

function storyNear(x, y, range = 145) {
  return Math.hypot(player.x + player.width / 2 - x, player.y + player.height / 2 - y) < range;
}

function storyPrompt() {
  const s = level.story;
  if (!s) return null;
  if (s.type === "meadow") {
    if (s.state === "victory") return { label: "跟小狐狸学习", action: "learn" };
    if (s.state === "done") return { label: "前往海洋", action: "next" };
    return null;
  }
  if (s.state === "help" && storyNear(s.crabX, floorY - 32)) return { label: "和螃蟹交谈", action: "guide" };
  if (s.state === "thanks" && storyNear(s.whaleX + 100, s.whaleY + 45, 300)) return { label: "听鲸鱼说话", action: "talk" };
  if (s.state === "offer" && storyNear(s.whaleX + 100, s.whaleY + 45, 300)) return { label: "跟鲸鱼去寻宝", action: "ride" };
  if (s.state === "cave" && storyNear(s.shipX + 180, floorY - 70, 140)) return { label: "进入沉船", action: "enter" };
  if (s.state === "inside" && storyNear(level.chest.x + 38, floorY - 45, 130)) return { label: "打开金色宝箱", action: "treasure" };
  if (s.state === "reward") return { label: "带着宝物前往沙漠", action: "next" };
  return null;
}

function refreshStoryHud() {
  const s = level && level.story;
  storyHud.classList.toggle("is-hidden", !s || gameState !== "playing");
  if (!s) return;
  let title, message;
  if (s.type === "meadow") {
    title = isFoxTutorial() ? "第一关胜利 · 小狐狸的引导" : s.saved ? "砾石草原 · 再次冒险" : "伙伴任务 · 救出小狐狸";
    message = s.saved ? "小狐狸已经安全了，这次终点是宝箱，可以直接去打开。" :
      s.state === "victory" ? "小狐狸：谢谢你打破牢笼！你已经赢了！接下来我教你跳跃和攻击。" :
      s.state === "tutorial" ? (!s.jump ? "小狐狸：跟我跳！按空格、↑ 或 W 试试跳跃，前面有绿色平台。" : "小狐狸：跳得好！现在按 J 挥动武器，练习攻击。") :
      s.state === "done" ? "小狐狸：你学会啦！我们一起去海洋冒险吧！" :
      "小狐狸：我在右边终点！不用打败怪物，靠近牢笼按 J 攻击，就能救我出来！";
  } else {
    const copy = {
      help: ["海洋 · 远处的求救声", "螃蟹们：救命呀！鲸鱼被渔网困住了！向右游，来和我们说说话！"],
      guide: ["跟随螃蟹", "螃蟹：请保护我们，我们带你去！按住空格、↑ 或 W 向上游，松开慢慢下潜。"],
      battle: ["救援鲸鱼", s.attacked ? `螃蟹正在剪网：${Math.round((1 - s.net) * 100)}%。挡住鲨鱼，给它们争取时间！` : "鲸鱼被围住了！先用 J 攻击鲨鱼，螃蟹会趁机剪开渔网。"],
      freed: ["鲸鱼加入战斗", "鲸鱼：我自由了！我们一起赶走鲨鱼！"],
      thanks: ["救援成功", "鲨鱼都被击败了。游到鲸鱼身边，和它说说话。"],
      offer: ["鲸鱼的邀请", "鲸鱼：谢谢你和螃蟹们！我知道一个藏着宝物的水下洞穴，坐上来，我带你去！"],
      ride: ["鲸鱼带路", "坐稳啦！我们穿过珊瑚礁，去寻找那艘古老的沉船。"],
      cave: ["水下洞穴 · 沉船入口", "螃蟹：进去吧，里面有很多好东西！游到下方沉船的破洞处。"],
      inside: ["沉船内部", "腐旧的船梁间游着小鱼，螃蟹在船板上爬行。继续向右，寻找金色宝箱。"],
      reward: ["找到宝藏！", "获得龙蛋 ×1、牛排 ×1，已放进背包。鲸鱼和螃蟹：下次再来找我们玩！"],
    };
    [title, message] = copy[s.state];
  }
  storyTitle.textContent = title;
  if (storyText.textContent !== message) storyText.textContent = message;
  const prompt = storyPrompt();
  storyInteract.classList.toggle("is-hidden", !prompt);
  storyInteract.disabled = isBackpackOpen();
  if (prompt) storyInteract.textContent = `${prompt.label} [E]`;
  positionStoryInteraction();
}

function positionStoryInteraction() {
  const s = level && level.story;
  const atShip = s && s.state === "cave" && storyPrompt();
  storyInteract.classList.toggle("story-interact-at-ship", Boolean(atShip));
  if (!atShip) { storyInteract.style.left = ""; storyInteract.style.top = ""; return; }
  const scale = canvas.clientWidth / canvas.width;
  const x = (s.shipX + 180 - cameraX) * scale;
  storyInteract.style.left = `${Math.max(80, Math.min(canvas.clientWidth - 80, x))}px`;
  storyInteract.style.top = `${canvas.offsetTop + (floorY - 85) * scale}px`;
}

function interactStory() {
  if (gameState !== "playing" || isBackpackOpen()) return;
  const prompt = storyPrompt();
  if (!prompt) return;
  const s = level.story;
  switch (prompt.action) {
    case "learn":
      s.state = "tutorial";
      s.jump = s.attack = false;
      player.x = level.worldWidth - 740;
      player.y = floorY - player.height;
      player.vx = player.vy = 0;
      player.onGround = true;
      player.attackTimer = 0;
      keys.clear();
      projectiles = [];
      effects = [];
      break;
    case "guide": s.state = "guide"; break;
    case "talk": s.state = "offer"; break;
    case "ride": s.state = "ride"; keys.clear(); break;
    case "enter": enterStoryShip(); break;
    case "treasure":
      if (s.rewarded) return;
      s.rewarded = true;
      level.chest.opened = true;
      inventory.dragonEgg += 1;
      inventory.beef += 1;
      s.state = "reward";
      renderBackpack();
      updateHud();
      requestLevelVictory(true, "沉船寻宝成功！获得龙蛋 ×1、牛排 ×1，已放入背包。准备好后点击开始前往沙漠。");
      break;
    case "next":
      if (s.type === "meadow") {
        foxTutorialPending = false;
        try { localStorage.removeItem("yuanbao.fox-tutorial-pending"); } catch (_) {}
      }
      requestLevelVictory(true, "引导完成！可以先整理装备，点击开始后继续下一关。");
      break;
  }
  if (finishPendingVictory()) return;
  refreshStoryHud();
}

function beginWhaleBattle() {
  const s = level.story;
  s.state = "battle";
  for (let i = 0; i < 3; i += 1) {
    const shark = buildEnemy("shark", s.whaleX + 100 + i * 130, level.number, i, "ocean");
    shark.questShark = true;
    shark.y = shark.baseY = 300 + i * 28;
    // A rescue must be playable with the starter sword too.
    shark.hp = shark.maxHp = Math.max(12, getAttackDamage(weapons[weaponLevel].damage) * 4);
    level.enemies.push(shark);
  }
  updateHud();
}

function updateStory() {
  const s = level.story;
  if (!s) return;
  s.clock += 1;
  if (s.type === "ocean") {
    player.y = Math.max(80, player.y);
    if (s.state === "guide") {
      if (s.crabX - player.x < 300) s.crabX = Math.min(1300, s.crabX + 2.2);
      if (s.crabX >= 1280 && player.x > 1040) beginWhaleBattle();
    }
    if (["help", "guide"].includes(s.state)) player.x = Math.min(player.x, s.crabX + 100);
    if (s.state === "battle" || s.state === "freed") {
      player.x = Math.min(player.x, 2150);
      const sharks = level.enemies.filter(e => e.questShark);
      if (sharks.some(e => e.hp < e.maxHp)) s.attacked = true;
      if (s.attacked && s.state === "battle") {
        s.net = Math.max(0, s.net - 1 / 360);
        if (s.net < 0.001) { s.net = 0; s.state = "freed"; }
      }
      if (s.state === "freed") {
        s.ramTimer += 1;
        const target = sharks.find(e => e.alive);
        if (target) {
          const dx = target.x - 110 - s.whaleX;
          s.whaleX += Math.sign(dx) * Math.min(Math.abs(dx), 4);
          s.whaleY += (target.y - 35 - s.whaleY) * 0.04;
          if (s.ramTimer >= 90 && Math.abs(dx) < 160) {
            damageEnemy(target, Math.ceil(target.maxHp / 3));
            s.ramTimer = 0;
            effects.push({ x: target.x, y: target.y, width: 110, height: 50, kind: "loot", text: "鲸鱼撞击！", life: 40 });
          }
        } else { s.state = "thanks"; }
      }
    }
    if (s.state === "ride") {
      s.whaleX = Math.min(s.shipX - 220, s.whaleX + 4);
      s.whaleY += (235 - s.whaleY) * 0.05;
      player.x = s.whaleX + 95;
      player.y = s.whaleY - player.height + 16;
      player.vx = player.vy = 0;
      player.invincible = Math.max(2, player.invincible);
      if (s.whaleX >= s.shipX - 220) s.state = "cave";
    }
  }
  refreshStoryHud();
}

function enterStoryShip() {
  const s = level.story;
  s.state = "inside";
  level.worldWidth = 1900;
  level.river.width = 1900;
  level.enemies = [];
  level.stars = [];
  level.coral = [];
  level.chest = { x: 1660, y: floorY - 62, width: 76, height: 58, opened: false, locked: false };
  player.x = 110;
  player.y = 300;
  player.vx = player.vy = 0;
  cameraX = 0;
  projectiles = [];
  effects = [];
  updateHud();
}

function storyPoly(points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function drawStoryFox(x, y, time) {
  ctx.save(); ctx.translate(x, y);
  storyPoly([[-10, 36], [-31, 24 + Math.sin(time / 12) * 3], [-35, 9], [-20, 16], [4, 28]], "#d87728");
  storyPoly([[-31, 24], [-35, 9], [-25, 13], [-23, 24]], "#fff0d1");
  ctx.fillStyle = "#d87728"; ctx.fillRect(0, 19, 35, 24);
  storyPoly([[6, 19], [3, -6], [17, 3], [27, 1], [39, -5], [38, 24], [23, 35]], "#ed9846");
  storyPoly([[8, 7], [7, 0], [15, 6]], "#492d34");
  storyPoly([[29, 6], [35, 0], [35, 10]], "#492d34");
  storyPoly([[8, 22], [21, 24], [35, 21], [23, 35]], "#fff0d1");
  ctx.fillStyle = "#202933"; ctx.fillRect(12, 15, 3, 4); ctx.fillRect(29, 15, 3, 4); ctx.fillRect(21, 25, 4, 3);
  ctx.fillRect(3, 40, 7, 7); ctx.fillRect(27, 40, 7, 7);
  ctx.restore();
}

function drawStoryCrabs(x, y, time) {
  for (let i = 0; i < 3; i += 1) {
    const cx = x + i * 40, cy = y + Math.sin(time / 9 + i) * 3;
    ctx.strokeStyle = "#f0b091"; ctx.lineWidth = 3;
    for (let leg = 0; leg < 3; leg += 1) {
      ctx.beginPath(); ctx.moveTo(cx + 7, cy + 11); ctx.lineTo(cx - 6, cy + leg * 7); ctx.moveTo(cx + 20, cy + 11); ctx.lineTo(cx + 33, cy + leg * 7); ctx.stroke();
    }
    ctx.fillStyle = "#dd7255"; ctx.fillRect(cx, cy, 26, 15);
    ctx.fillStyle = "#ffa783"; ctx.fillRect(cx - 7, cy - 10, 10, 9); ctx.fillRect(cx + 22, cy - 10, 10, 9);
    ctx.fillStyle = "#ffefcf"; ctx.fillRect(cx + 5, cy - 5, 4, 7); ctx.fillRect(cx + 17, cy - 5, 4, 7);
    ctx.fillStyle = "#1b2938"; ctx.fillRect(cx + 6, cy - 5, 2, 3); ctx.fillRect(cx + 18, cy - 5, 2, 3);
  }
}

function drawStoryWhale(s) {
  ctx.save(); ctx.translate(s.whaleX, s.whaleY + Math.sin(s.clock / 28) * 4);
  const tail = Math.sin(s.clock / 12) * 15;
  storyPoly([[36, 40], [-32, tail], [-19, 46], [-44, 86 + tail], [45, 73]], "#447aab");
  ctx.fillStyle = "#4f8fb8"; ctx.beginPath(); ctx.ellipse(128, 52, 122, 61, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#b9dbe0"; ctx.beginPath(); ctx.ellipse(141, 77, 98, 30, 0, 0, Math.PI); ctx.fill();
  storyPoly([[110, 63], [67, 130 + tail / 3], [146, 96]], "#34658e");
  ctx.fillStyle = "#a3d3e5"; ctx.fillRect(116, 5, 62, 5);
  ctx.fillStyle = "#172f42"; ctx.fillRect(212, 38, 9, 9);
  ctx.fillStyle = "#fff"; ctx.fillRect(214, 38, 3, 3);
  ctx.strokeStyle = "#30566d"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(216, 76); ctx.lineTo(246, 68); ctx.stroke();
  if (s.net > 0) {
    ctx.save(); ctx.globalAlpha = Math.max(0.15, s.net); ctx.strokeStyle = "#d4c5a0"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(30, -8, 205, 118); ctx.clip();
    for (let n = -140; n < 280; n += 22) {
      ctx.beginPath(); ctx.moveTo(n, -8); ctx.lineTo(n + 140, 110); ctx.moveTo(n, 110); ctx.lineTo(n + 140, -8); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawStoryFish(x, y, i, time) {
  const sway = Math.sin(time / 10 + i) * 5;
  const colors = ["#ff947f", "#70ceef", "#f0d06a", "#bf9de3"];
  storyPoly([[x - 17, y - 12 + sway], [x - 17, y + 12 + sway], [x + 2, y]], colors[i % 4]);
  ctx.fillStyle = colors[i % 4]; ctx.beginPath(); ctx.ellipse(x + 8, y, 20, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#f1f8da"; ctx.fillRect(x + 3, y - 7, 4, 14);
  ctx.fillStyle = "#142b36"; ctx.fillRect(x + 19, y - 3, 3, 3);
}

function drawStoryShip(x) {
  storyPoly([[x, 335], [x + 405, 320], [x + 349, floorY], [x + 62, floorY]], "#4c4440");
  for (let row = 0; row < 5; row += 1) {
    ctx.fillStyle = row % 2 ? "#746052" : "#665548";
    ctx.fillRect(x + 50 + row * 3, 343 + row * 19, 304 - row * 6, 15);
  }
  ctx.fillStyle = "#3c4847"; ctx.fillRect(x + 216, 171, 13, 165);
  storyPoly([[x + 233, 188], [x + 331, 257], [x + 293, 249], [x + 313, 278], [x + 238, 265]], "#829294");
  storyPoly([[x + 133, 370], [x + 170, 347], [x + 224, 361], [x + 245, 416], [x + 214, 445], [x + 146, 432]], "#102b32");
  ctx.strokeStyle = "#85c4b4"; ctx.lineWidth = 3; ctx.strokeRect(x + 153, 368, 70, 65);
}

function drawStoryInterior(s) {
  ctx.fillStyle = "#172d33"; ctx.fillRect(0, 74, level.worldWidth, floorY - 74);
  for (let x = 0; x < level.worldWidth; x += 95) {
    ctx.fillStyle = "#394440"; ctx.fillRect(x, 92, 89, 330);
    ctx.strokeStyle = "#526053"; ctx.lineWidth = 2;
    for (let y = 110; y < 420; y += 42) { ctx.beginPath(); ctx.moveTo(x + 8, y); ctx.lineTo(x + 70, y + 13); ctx.stroke(); }
  }
  for (let x = 210; x < level.worldWidth; x += 370) {
    ctx.fillStyle = "#5b6253"; ctx.fillRect(x, 75, 22, 365);
    ctx.fillStyle = "#0c5669"; ctx.beginPath(); ctx.arc(x + 100, 193, 42, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#a2a480"; ctx.lineWidth = 7; ctx.stroke();
    ctx.fillStyle = "#57654b"; ctx.fillRect(x + 36, 401, 66, 36);
    storyPoly([[x + 21, 420], [x - 4, 350], [x + 9, 365], [x + 39, 425]], "#446f62");
  }
  ctx.fillStyle = "#716954"; ctx.fillRect(0, floorY - 6, level.worldWidth, 18);
  const c = level.chest;
  ctx.fillStyle = "rgba(248,211,91,0.10)"; ctx.beginPath(); ctx.arc(c.x + 38, c.y + 20, 83, 0, Math.PI * 2); ctx.fill();
  drawBlock3D(c.x, c.y + 15, 76, 42, "#bd8e28", "#ffe39a", "#785626", 8);
  ctx.fillStyle = "#ffda63"; ctx.fillRect(c.x, c.y - (c.opened ? 20 : 0), 76, 19); ctx.fillRect(c.x + 10, c.y + 15, 6, 42); ctx.fillRect(c.x + 59, c.y + 15, 6, 42);
  ctx.fillStyle = "#fff0b4"; ctx.fillRect(c.x + 31, c.y + 20, 14, 12);
  drawStoryCrabs(470, floorY - 26, s.clock);
  drawStoryCrabs(1200, floorY - 26, s.clock + 10);
}

function drawStoryScene() {
  const s = level.story;
  if (!s) return;
  ctx.save(); ctx.translate(-cameraX, 0);
  if (s.type === "meadow") {
    if (!s.saved || s.state === "freed") {
      const x = level.chest.x, y = floorY - 93;
      const free = isFoxTutorial();
      const hop = s.state === "tutorial" && !s.jump ? Math.max(0, Math.sin(s.clock / 18)) * 45 : 0;
      drawStoryFox(free ? player.x + 75 : x + 17, free ? floorY - 48 - hop : y + 45, s.clock);
      ctx.fillStyle = "#3c4d57"; ctx.fillRect(x - 16, y, 98, 8); ctx.fillRect(x - 16, floorY - 7, 98, 7);
      for (let bar = 0; bar < 6; bar += 1) {
        ctx.fillStyle = "#91a7ab";
        if (free) { ctx.save(); ctx.translate(x - 12 + bar * 17, floorY - 10); ctx.rotate((bar % 2 ? 1 : -1) * 0.9); ctx.fillRect(0, -24, 5, 28); ctx.restore(); }
        else ctx.fillRect(x - 12 + bar * 17, y + 8, 5, 78);
      }
      drawTinyText(free ? "牢笼已打破" : "按 J 打破牢笼", x - 60, y - 15, "#ffdfa0");
    }
  } else {
    const inside = ["inside", "reward"].includes(s.state);
    if (inside) drawStoryInterior(s);
    else {
      const caveX = s.shipX - 350;
      storyPoly([[caveX, 74], [caveX + 90, 150], [caveX + 120, 86], [caveX + 210, 157], [caveX + 255, 98], [level.worldWidth, 152], [level.worldWidth, 74]], "#274953");
      drawStoryShip(s.shipX);
      for (let i = 0; i < 8; i += 1) {
        const x = s.shipX - 340 + i * 110;
        const y = floorY - 8;
        const tint = ["#d582a4", "#e6ba7e", "#90c8b1"][i % 3];
        ctx.strokeStyle = tint; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 53);
        ctx.moveTo(x + 2, y - 24); ctx.lineTo(x - 20, y - 39); ctx.lineTo(x - 22, y - 60);
        ctx.moveTo(x + 3, y - 39); ctx.lineTo(x + 23, y - 54); ctx.lineTo(x + 25, y - 73); ctx.stroke();
        ctx.fillStyle = "#dbcba9"; ctx.fillRect(x - 8, y - 3, 26, 7);
      }
      drawStoryWhale(s);
      const cutting = ["battle", "freed"].includes(s.state);
      drawStoryCrabs(cutting ? s.whaleX + 40 : s.state === "cave" ? s.shipX + 60 : s.state === "ride" ? s.whaleX + 40 : s.crabX, cutting ? s.whaleY + 82 : s.state === "ride" ? s.whaleY - 5 : floorY - 26, s.clock);
      if (s.state === "help") drawTinyText("救命呀！", s.crabX - 8, floorY - 65, "#ffedbd");
    }
    for (let i = 0; i < 16; i += 1) {
      const x = (i * 257 + s.clock * (0.4 + i % 3 * 0.15)) % level.worldWidth;
      drawStoryFish(x, 160 + i % 5 * 43 + Math.sin(s.clock / 30 + i) * 13, i, s.clock);
    }
  }
  ctx.restore();
  positionStoryInteraction();
}

storyInteract.addEventListener("click", interactStory);
window.addEventListener("keydown", event => {
  if (event.code === "KeyE" && !event.repeat) { event.preventDefault(); interactStory(); }
});
