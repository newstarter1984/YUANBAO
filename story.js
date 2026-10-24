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
}

function initializeStoryLevel() {
  hideStory();
  if (level.theme.id === "town") {
    level.story = { type: "town", state: "explore", clock: 0, captureTimer: 0, message: "和镇上的居民聊聊。花 600 金币买下房屋后，可以从门口进入自己的家。" };
  } else if (level.theme.id === "gravel") {
    level.story = { type: "meadow", state: "rescue", jump: false, attack: false, saved: foxRescued, clock: 0 };
    if (foxTutorialPending) {
      level.story.state = "tutorial";
      level.story.saved = false;
    }
  } else if (level.theme.id === "ocean") {
    level.story = {
      type: "ocean", state: "battle", clock: 0, timer: 0,
      whaleX: 430, whaleY: 255, net: 0,
      shipX: 650, rewarded: false, priestShotTimer: 0,
    };
    level.enemies = [];
    level.waveHazard = null;
    level.stars = [];
    level.chest = { x: 1010, y: floorY - 62, width: 76, height: 58, opened: false, locked: true };
    beginWhaleBattle();
  } else if (level.theme.id === "royal") {
    level.enemies = [];
    level.stars = [];
    level.story = {
      type: "royal",
      state: royalCompanion ? "joined" : "letter",
      clock: 0,
      summonsTimer: 0,
      forced: false,
      duelistType: ["shield", "archer", "spearman"][Math.floor(Math.random() * 3)],
    };
  }
  refreshStoryHud();
}

function storyOwnsChest() {
  const s = level && level.story;
  return Boolean(s && s.type !== "town" && (s.type === "ocean" || !s.saved || s.state === "freed"));
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
  effects.push({ x: cage.x - 80, y: cage.y - 40, width: 220, height: 30, life: 180, kind: "loot", text: "第一关胜利！小狼获救！" });
  refreshStoryHud();
  requestLevelVictory(false, "小狼获救了！可以先逛商店，点击开始后跟小狼学习跳跃和攻击。");
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
  if (s.type === "town") {
    const town = level.town;
    if (town.inside) {
      if (storyNear(town.bed.x + 55, town.bed.y + 44, 130)) return { label: "睡觉到天亮", action: "sleep" };
      if (storyNear(town.bookshelf.x + 45, floorY - 36, 105)) return { label: townBookFound ? "阅读书籍" : "从书柜找到一本书", action: "findBook" };
      if (storyNear(town.exit.x + 50, floorY - 36, 82)) return { label: "走出房屋", action: "leaveHouse" };
      if (storyNear(town.chair.x + 40, floorY - 36, 112)) return { label: "坐下休息", action: "sitChair" };
      if (town.servants.some(servant => storyNear(servant.x, floorY - 36, 112))) return { label: townServantMealReady ? "让仆人帮忙做饭" : "和仆人聊聊", action: "servantCook" };
      return null;
    }
    if (townHouseRented && storyNear(town.entrance.x, town.entrance.y, 145)) return { label: "进入我的房屋", action: "enterHouse" };
    const publicHouse = town.publicHouses?.find(h => storyNear(h.x, h.y, 105));
    if (publicHouse) return { label: `进入${publicHouse.name}`, action: "enterPublicHouse", house: publicHouse };
    const npc = town.npcs.find(person => storyNear(person.x + 14, person.y + 34, 105));
    if (npc) {
      if (npc.item === "rent" && townHouseRented) return { label: "询问我的房屋", action: "townBuy", npc };
      if (npc.item === "shopProperty" && townShopOwned) return { label: townPropertyIncome ? `领取房产收入（${townPropertyIncome}金币）` : "查看我的商铺", action: "townBuy", npc };
      if (npc.item === "apartmentProperty" && townApartmentOwned) return { label: townApartmentRented ? (townPropertyIncome ? `领取租金（${townPropertyIncome}金币）` : "查看公寓租客") : "把公寓出租", action: "townBuy", npc };
      return { label: `购买${npc.itemName}（${npc.cost}金币）`, action: "townBuy", npc };
    }
    const resident = town.residents.find(person => storyNear(person.x + 14, person.y + 34, 90));
    if (resident) return { label: `和${resident.name}聊天`, action: "townTalk", resident };
    return null;
  }
  if (s.type === "meadow") {
    if (s.state === "victory") return { label: "跟小狼学习", action: "learn" };
    if (s.state === "done") return { label: "前往海洋", action: "next" };
    return null;
  }
  if (s.type === "royal") {
    if (s.state === "letter") return { label: "打开国王来信", action: "openRoyalLetter" };
    if (s.state === "summons") return { label: "前往铠甲训练场", action: "enterRoyalDuel" };
    if (s.state === "apology") return { label: "接受皇家伙伴", action: "acceptRoyalCompanion" };
    return null;
  }
  if (s.state === "reconciled" && storyNear(level.chest.x + 38, floorY - 45, 150)) return { label: "打开沉船里的金色宝箱", action: "treasure" };
  return null;
}

function refreshStoryHud() {
  const s = level && level.story;
  storyHud.classList.toggle("is-hidden", !s || gameState !== "playing");
  if (!s) return;
  let title, message;
  if (s.type === "town") {
    title = s.state === "duel" ? "四贵族挑战" : s.state === "captured" ? "小镇" : level.town.inside ? "房屋" : "小镇";
    const prompt = storyPrompt();
    if (s.state === "captured") message = s.captureTimer > 180 ? "押送中。" : "三秒后开始挑战。";
    else if (s.state === "duel") message = "四名贵族认为你的战斗力不够强。打败他们完成挑战；如果倒下，本关失败。";
    else if (s.state === "cleared") message = "你打赢了四名贵族，他们承认了你的实力。三栋房子仍可自由进入。";
    else
    if (prompt && prompt.npc) {
      const npc = prompt.npc;
      message = npc.item === "rent" && townHouseRented ? "房产经纪：房子已经属于你，走到门前就能进去。" :
        npc.item === "shopProperty" && townShopOwned ? `商铺经纪：你的商铺正在营业，当前可领取 ${townPropertyIncome} 金币。` :
        npc.item === "apartmentProperty" && townApartmentOwned ? (townApartmentRented ? `公寓管理员：租客住得很好，当前可领取 ${townPropertyIncome} 金币。` : "公寓管理员：公寓已经买下，现在可以把它出租。") :
        `${npc.name}：要不要买${npc.itemName}？只要 ${npc.cost} 金币。`;
    } else if (prompt && prompt.resident) {
      message = `${prompt.resident.name}：${prompt.resident.line}`;
    } else if (prompt && prompt.action === "sleep") {
      message = level.town.isNight ? "走到床边了。点击睡觉，就能跳过黑夜。" : "现在已经是白天，也可以睡一觉恢复生命。";
    } else {
      message = s.message;
    }
  } else if (s.type === "meadow") {
    title = isFoxTutorial() ? "第一关胜利 · 小狼的引导" : s.saved ? "砾石草原 · 再次冒险" : "伙伴任务 · 救出小狼";
    message = s.saved ? "小狼已经安全了，这次终点是宝箱，可以直接去打开。" :
      s.state === "victory" ? "小狼：谢谢你打破牢笼！你已经赢了！接下来我教你跳跃和攻击。" :
      s.state === "tutorial" ? (!s.jump ? "小狼：跟我跳！按空格、↑ 或 W 试试跳跃，前面有绿色平台。" : "小狼：跳得好！现在按 J 挥动武器，练习攻击。") :
      s.state === "done" ? "小狼：你学会啦！我们一起去海洋冒险吧！" :
      "小狼：我在右边终点！不用打败怪物，靠近牢笼按 J 攻击，就能救我出来！";
  } else if (s.type === "ocean") {
    const copy = {
      battle: ["海洋救援", "三条鳄鱼抓住了鲸鱼！击败它们，再调查前方两艘正在交战的海盗船。"],
      pirateConflict: ["两船冲突", "海盗王和炮手正在交战。先打败两人，阻止他们继续误会。"],
      inkbender: ["幕后挑拨者", "鱼人墨法师才是挑起冲突的坏人！五名牧师会帮助你击败它。"],
      reconciled: ["两船和解", "海盗王和炮手接受了你的建议。沉船旁的金色宝箱已经出现。"],
    };
    [title, message] = copy[s.state];
  } else if (s.type === "royal") {
    const typeName = s.duelistType === "archer" ? "皇家弓箭手" : s.duelistType === "spearman" ? "皇家长枪兵" : "皇家盾兵";
    title = "终章 · 皇家战队";
    message = s.state === "letter" ? "你收到一封盖着王印的短笺。打开它，看看国王为什么召见你。" :
      s.state === "summons" ? `皇家战队误以为你带走了小狼。黑衣追兵和猎犬正在攻击你；${Math.ceil(s.summonsTimer / 60)} 秒后你会被强制带进训练场。` :
      s.state === "duel" ? `${s.forced ? "你被卫兵带进了训练场！" : "你走进了训练场。"}先和${typeName}公平格斗，证明你的勇气。` :
      s.state === "apology" ? `皇家战队发现抓走小狼的命令是错误的。${typeName}向你和小狼道歉，并愿意成为你的伙伴。` :
      `皇家战队已经改正错误，${typeName}成为了你的伙伴，会在之后的地图里跟随并帮助你战斗。`;
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

function enterTownHouse(publicAccess = false) {
  const town = level.town;
  if (!town || town.inside || (!townHouseRented && !publicAccess)) return;
  town.outsideState = {
    worldWidth: level.worldWidth,
    platforms: level.platforms,
    stars: level.stars,
    enemies: level.enemies,
    animals: level.animals,
    river: level.river,
    spikeTraps: level.spikeTraps,
    lavaTraps: level.lavaTraps,
    quicksandTraps: level.quicksandTraps,
    bogTraps: level.bogTraps,
    coral: level.coral,
    waveHazard: level.waveHazard,
    chest: level.chest,
  };
  town.inside = true;
  level.worldWidth = 960;
  level.platforms = [];
  level.stars = [];
  level.enemies = [];
  level.animals = [];
  level.river = null;
  level.spikeTraps = [];
  level.lavaTraps = [];
  level.quicksandTraps = [];
  level.bogTraps = [];
  level.coral = [];
  level.waveHazard = null;
  level.chest = { x: -1000, y: -1000, width: 1, height: 1, opened: true, locked: true };
  player.x = town.selectedHouse ? 455 : 475;
  player.y = floorY - player.height;
  player.vx = player.vy = 0;
  player.onGround = true;
  cameraX = 0;
  keys.clear();
}

function leaveTownHouse() {
  const town = level.town;
  if (!town || !town.inside || !town.outsideState) return;
  const outside = town.outsideState;
  Object.assign(level, outside);
  town.outsideState = null;
  town.inside = false;
  player.x = town.returnX || town.entrance.x;
  player.y = town.returnY || town.entrance.y || floorY - player.height;
  const footBlocked = () => town.blockers.some(block => touches({ x: player.x + 10, y: player.y + player.height - 16, width: Math.max(12, player.width - 20), height: 14 }, block));
  if (footBlocked()) {
    const safeExits = [{ x: 690, y: 335 }, { x: 560, y: 330 }, { x: 330, y: 300 }];
    const safe = safeExits.find(point => { player.x = point.x; player.y = point.y; return !footBlocked(); });
    if (!safe) { player.x = 560; player.y = 330; }
  }
  town.selectedHouse = null;
  town.returnX = 0; town.returnY = 0;
  player.vx = player.vy = 0;
  player.onGround = true;
  cameraX = Math.max(0, player.x - canvas.width * 0.42);
  keys.clear();
}

function collectTownPropertyIncome(label) {
  if (townPropertyIncome <= 0) return 0;
  const amount = townPropertyIncome;
  townPropertyIncome = 0;
  coins += amount;
  effects.push({ x: player.x - 40, y: player.y - 45, width: 220, height: 28, life: 110, kind: "loot", text: `${label} +${amount} 金币` });
  updateHud();
  return amount;
}

function interactStory() {
  if (gameState !== "playing" || isBackpackOpen()) return;
  const prompt = storyPrompt();
  if (!prompt) return;
  const s = level.story;
  switch (prompt.action) {
    case "townBuy": {
      const npc = prompt.npc;
      if (npc.item === "rent" && townHouseRented) {
        s.message = "房产经纪：房子已经属于你。走到房屋门口，按 E 就能进入。";
        break;
      }
      if (npc.item === "shopProperty" && townShopOwned) {
        const collected = collectTownPropertyIncome("商铺收入");
        s.message = collected ? `商铺经纪：已结清 ${collected} 金币的房产收入。` : "商铺经纪：商铺正在营业，睡过一晚后会产生收入。";
        break;
      }
      if (npc.item === "apartmentProperty" && townApartmentOwned) {
        if (!townApartmentRented) {
          townApartmentRented = true;
          s.message = "公寓管理员：已经找到租客！以后每睡过一晚，公寓都会产生租金。";
          effects.push({ x: npc.x - 45, y: floorY - 116, width: 190, height: 28, life: 100, kind: "loot", text: "公寓已出租" });
        } else {
          collectTownPropertyIncome("公寓租金");
          s.message = "公寓管理员：租客的租金已经为你结清。";
        }
        updateHud();
        break;
      }
      if (!unlimitedCoinsMode && coins < npc.cost) {
        s.message = `${npc.name}：金币不够，还差 ${npc.cost - coins} 金币。`;
        effects.push({ x: npc.x - 30, y: floorY - 110, width: 160, height: 26, life: 90, kind: "loot", text: "金币不够" });
        break;
      }
      if (!unlimitedCoinsMode) coins -= npc.cost;
      if (npc.item === "rent") {
        townHouseRented = true;
        try { localStorage.setItem("yuanbao.town-house-rented.v1", "yes"); } catch (_) {}
        s.message = "房产经纪：成交！房子现在属于你，走到门口就能进入。";
        effects.push({ x: npc.x - 60, y: floorY - 120, width: 210, height: 28, life: 120, kind: "loot", text: "已买下房屋！" });
      } else if (npc.item === "shopProperty") {
        townShopOwned = true;
        s.message = "商铺经纪：商铺已经属于你，每睡过一晚都会产生营业收入。";
        effects.push({ x: npc.x - 45, y: floorY - 116, width: 190, height: 28, life: 100, kind: "loot", text: "已买下城镇商铺" });
      } else if (npc.item === "apartmentProperty") {
        townApartmentOwned = true;
        s.message = "公寓管理员：公寓已经属于你。再和我交谈，就能把它出租给镇民。";
        effects.push({ x: npc.x - 45, y: floorY - 116, width: 190, height: 28, life: 100, kind: "loot", text: "已买下城镇公寓" });
      } else {
        inventory[npc.item] = (inventory[npc.item] || 0) + npc.amount;
        s.message = `${npc.name}：谢谢惠顾！${npc.itemName}已经放进背包。`;
        effects.push({ x: npc.x - 45, y: floorY - 116, width: 180, height: 28, life: 90, kind: "loot", text: `获得${npc.itemName}` });
      }
      updateHud();
      renderBackpack();
      break;
    }
    case "townTalk":
      s.message = `${prompt.resident.name}：${prompt.resident.line}`;
      effects.push({ x: prompt.resident.x - 30, y: floorY - 112, width: 170, height: 26, life: 80, kind: "loot", text: "聊了几句" });
      break;
    case "enterHouse":
      enterTownHouse();
      s.message = "欢迎回家。两位仆人可以做饭，床能跳过黑夜，书柜藏着书，椅子可以坐下休息。";
      break;
    case "leaveHouse":
      leaveTownHouse();
      s.message = "你回到了小镇。";
      break;
    case "enterPublicHouse":
      level.town.selectedHouse = prompt.house.id;
      level.town.returnX = prompt.house.x;
      level.town.returnY = prompt.house.y + 55;
      enterTownHouse(true);
      s.message = `你进入了${prompt.house.name}。走到出口可以返回村庄。`;
      break;
    case "servantCook":
      if (townServantMealReady) {
        townServantMealReady = false;
        inventory.homeMeal = (inventory.homeMeal || 0) + 1;
        s.message = "仆人：饭做好了！一份热饭已经放进你的背包。";
        effects.push({ x: player.x - 55, y: player.y - 45, width: 210, height: 28, life: 100, kind: "loot", text: "获得仆人做的热饭" });
        renderBackpack();
      } else s.message = "仆人：今天的饭已经做好了，睡过一晚再为你准备新的。";
      break;
    case "findBook":
      if (!townBookFound) {
        townBookFound = true;
        inventory.storyBook = (inventory.storyBook || 0) + 1;
        effects.push({ x: player.x - 40, y: player.y - 45, width: 190, height: 28, life: 100, kind: "loot", text: "找到一本小镇故事书" });
        renderBackpack();
      }
      s.message = "书里记着月影小镇、皇家战队和五行龙的古老故事。";
      break;
    case "sitChair":
      player.sittingTimer = 180;
      player.vx = 0;
      s.message = "你在书桌旁坐下来休息。三秒后可以继续行动。";
      effects.push({ x: player.x - 25, y: player.y - 40, width: 150, height: 28, life: 90, kind: "loot", text: "坐下休息" });
      break;
    case "sleep":
      level.town.isNight = false;
      player.hearts = Math.min(maxBoostedHealth, player.hearts + 100);
      const sleepingEnemies = level.town.outsideState ? level.town.outsideState.enemies : level.enemies;
      for (const enemy of sleepingEnemies) {
        if (enemy.kind === "skeleton" && enemy.alive) { enemy.alive = false; enemy.deathFall = 999999; }
      }
      townServantMealReady = true;
      townPropertyIncome += (townShopOwned ? 80 : 0) + (townApartmentOwned && townApartmentRented ? 120 : 0);
      level.chest.locked = false;
      s.message = `你一觉睡到了天亮。骷髅兵化成白骨，生命恢复 100${townPropertyIncome ? `，房产待领取 ${townPropertyIncome} 金币` : ""}。`;
      effects.push({ x: player.x - 80, y: player.y - 50, width: 260, height: 28, life: 140, kind: "loot", text: "天亮了！生命 +100" });
      updateHud();
      break;
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
    case "treasure":
      if (s.rewarded) return;
      s.rewarded = true;
      level.chest.opened = true;
      inventory.dragonEgg += 1;
      inventory.beef += 1;
      s.state = "reconciled";
      renderBackpack();
      updateHud();
      requestLevelVictory(true, "沉船宝箱已经打开！获得龙蛋 ×1、牛排 ×1，已回到主界面。");
      break;
    case "next":
      if (s.type === "meadow") {
        foxTutorialPending = false;
        try { localStorage.removeItem("yuanbao.fox-tutorial-pending"); } catch (_) {}
      }
      requestLevelVictory(true, "引导完成！可以先整理装备，点击开始后继续下一关。");
      break;
    case "openRoyalLetter":
      s.state = "summons";
      s.summonsTimer = 600;
      spawnRoyalPursuers();
      effects.push({ x: player.x - 70, y: player.y - 55, width: 260, height: 30, life: 150, kind: "loot", text: "黑衣追兵来袭：10 秒内前往训练场" });
      break;
    case "enterRoyalDuel":
      beginRoyalDuel(false);
      break;
    case "acceptRoyalCompanion":
      royalCompanion = s.duelistType;
      royalCompanionX = player.x - 80;
      royalCompanionY = floorY - 76;
      s.state = "joined";
      renderBackpack();
      updateHud();
      if (typeof saveGame === "function") saveGame("皇家伙伴已加入");
      requestLevelVictory(false, "皇家战队已经道歉，一名皇家士兵成为了你的新伙伴！终章完成。");
      break;
  }
  if (finishPendingVictory()) return;
  if (s.type === "town" && typeof saveGame === "function") saveGame("住宅与房产已保存");
  refreshStoryHud();
}

function beginWhaleBattle() {
  const s = level.story;
  s.state = "battle";
  for (let i = 0; i < 3; i += 1) {
    const crocodile = buildEnemy("shark", s.whaleX - 20 + i * 135, level.number, i, "ocean");
    crocodile.questCrocodile = true;
    crocodile.crocodileOffset = i * 8;
    crocodile.y = crocodile.baseY = 285 + (i % 2) * 58;
    crocodile.hp = crocodile.maxHp = Math.max(18, getAttackDamage(weapons[weaponLevel].damage) * 5);
    level.enemies.push(crocodile);
  }
  updateHud();
}


function beginPirateConflict() {
  const s=level.story; s.state="pirateConflict";
  level.enemies=[["pirateKing",350],["cannonSailor",790]].map(([kind,x],i)=>{ const e=buildEnemy(kind,x,level.number,i,"ocean"); e.pirateConflict=true; e.hp=e.maxHp=Math.max(120,getAttackDamage(weapons[weaponLevel].damage)*8); e.y=e.baseY=floorY-e.height; e.patrolLeft=kind==="pirateKing"?110:650; e.patrolRight=kind==="pirateKing"?550:1090; return e; });
  effects.push({x:430,y:120,width:330,height:32,life:180,kind:"loot",text:"阻止两艘海盗船继续交战！"}); updateHud();
}
function beginInkbenderBattle() {
  const s=level.story; s.state="inkbender"; const e=buildEnemy("fishfolkInkbender",570,level.number,0,"ocean"); e.pirateConflict=true; e.hp=e.maxHp=Math.max(240,getAttackDamage(weapons[weaponLevel].damage)*15); e.y=e.baseY=floorY-e.height; e.patrolLeft=260;e.patrolRight=940; level.enemies=[e];
  effects.push({x:430,y:120,width:360,height:32,life:180,kind:"loot",text:"发现幕后坏人：鱼人墨法师！"}); updateHud();
}

function spawnRoyalPursuers() {
  const pursuers = [
    ["royalHound", 430],
    ["royalRaider", 610],
    ["royalHound", 850],
    ["royalRaider", 1040],
  ];
  level.enemies = pursuers.map(([kind, x], index) => {
    const enemy = buildEnemy(kind, x, level.number, index, "royal");
    enemy.royalPursuer = true;
    enemy.hp = enemy.maxHp = kind === "royalHound" ? 95 : 130;
    enemy.y = enemy.baseY = floorY - enemy.height;
    enemy.patrolLeft = 100;
    enemy.patrolRight = level.worldWidth - 100;
    enemy.alerted = true;
    return enemy;
  });
  updateHud();
}

function beginRoyalDuel(forced) {
  const s = level.story;
  if (!s || s.type !== "royal" || s.state === "duel") return;
  s.state = "duel";
  s.forced = forced;
  level.enemies = [];
  const opponent = buildEnemy("royalDuelist", 790, level.number, 0, "royal");
  opponent.soldierType = s.duelistType;
  opponent.hp = opponent.maxHp = Math.max(180, getAttackDamage(weapons[weaponLevel].damage) * 12);
  opponent.y = opponent.baseY = floorY - opponent.height;
  opponent.patrolLeft = 330;
  opponent.patrolRight = 890;
  level.enemies.push(opponent);
  player.x = 320;
  player.y = floorY - player.height;
  player.vx = player.vy = 0;
  player.onGround = true;
  keys.clear();
  projectiles = [];
  effects.push({ x: player.x - 40, y: player.y - 44, width: 260, height: 30, life: 150, kind: "loot", text: forced ? "卫兵把你带进了训练场！" : "皇家格斗开始！" });
  updateHud();
}

function updateStory() {
  const s = level.story;
  if (!s) return;
  s.clock += 1;
  if (s.type === "town") {
    if (!level.town.inside && s.state === "explore" && Math.hypot(player.x-730,player.y-200)<105) { s.state="captured"; s.captureTimer=270; s.captureStartX=player.x; s.captureStartY=player.y; player.vx=0; effects.push({x:player.x-120,y:90,width:320,height:32,life:150,kind:"loot",text:"士兵出现"}); }
    if (s.state === "captured") { player.vx=0; player.vy=0; if(s.captureTimer>180){ player.x+=(730-player.x)*0.055; player.y+=(245-player.y)*0.055; } s.captureTimer-=1; if(s.captureTimer<=0){ s.state="duel"; player.x=270;player.y=300;player.vx=0;player.vy=0;player.invincible=Math.max(player.invincible,90); level.enemies=[]; [0,1,2,3].forEach((n,i)=>{const e=buildEnemy("townNoble",520+i*145,level.number,i,"town");e.nobleIndex=n;e.hp=e.maxHp=Math.max(90,getAttackDamage(weapons[weaponLevel].damage)*7);e.y=e.baseY=floorY-e.height;e.patrolLeft=400;e.patrolRight=1160;level.enemies.push(e)}); effects.push({x:player.x-20,y:player.y-36,width:230,height:30,life:90,kind:"loot",text:"绳子已解开，可以自由移动！"}); updateHud(); } }
    else if(s.state === "duel" && level.enemies.every(e=>!e.alive)){s.state="cleared";effects.push({x:player.x-60,y:player.y-55,width:300,height:30,life:180,kind:"loot",text:"挑战成功！四名贵族认可了你"});}
    refreshStoryHud(); return;
  }
  if (s.type === "ocean") {
    player.y = Math.max(80, player.y);
    if (s.state === "battle" && level.enemies.filter(e => e.questCrocodile && e.alive).length === 0) beginPirateConflict();
    else if (s.state === "pirateConflict" && level.enemies.every(e => !e.alive)) beginInkbenderBattle();
    else if (s.state === "inkbender") {
      const villain=level.enemies.find(e=>e.kind==="fishfolkInkbender"&&e.alive);
      if (villain) { s.priestShotTimer=(s.priestShotTimer+1)%120; if(s.priestShotTimer===0){ villain.hp=Math.max(0,villain.hp-8); villain.hurtFlash=10; effects.push({x:villain.x-15,y:villain.y-10,width:villain.width+30,height:45,life:20,kind:"magicHit"}); if(villain.hp===0){villain.alive=false;villain.deathFall=24;} } }
      else { s.state="reconciled"; level.chest.locked=false; effects.push({x:level.chest.x-160,y:level.chest.y-45,width:380,height:30,life:180,kind:"loot",text:"两船已经和解，金色宝箱出现了！"}); }
    }
  }
  if (s.type === "royal") {
    if (s.state === "summons") {
      s.summonsTimer -= 1;
      if (s.summonsTimer <= 0) beginRoyalDuel(true);
    } else if (s.state === "duel" && level.enemies.every(enemy => !enemy.alive)) {
      s.state = "apology";
      projectiles = [];
      effects.push({ x: player.x - 60, y: player.y - 50, width: 260, height: 30, life: 180, kind: "loot", text: "误会解开了：皇家战队向你道歉" });
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
  const frame = foxHelperFrames[Math.floor(time / 7) % foxHelperFrames.length];
  ctx.save(); ctx.translate(x + 18, y + 42);
  if (frame?.complete && frame.naturalWidth > 0) ctx.drawImage(frame, -54, -60, 108, 70);
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
  drawOceanFishSprite(x, y, i, i % 2 ? -1 : 1, 72 + (i % 3) * 16, 42);
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
  if (s.type === "town") {
    if (s.state === "captured") {
      const shake=s.captureTimer>240?Math.sin(s.clock*1.7)*10:0; ctx.save();ctx.translate(shake,0);
      drawCaptureGuard(player.x-45,floorY-2,1); drawCaptureGuard(player.x+player.width+45,floorY-2,-1);
      ctx.strokeStyle="#c89b55";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(player.x+player.width/2,player.y+42,player.width*.7,18,0,0,Math.PI*2);ctx.stroke();
      if(s.captureTimer<=180) for(let i=0;i<4;i++) drawTownNoble({x:610+i*72,y:floorY-76,width:64,height:76,facing:-1,nobleIndex:i}); ctx.restore();
      if(s.captureTimer<=180){ctx.fillStyle="rgba(0,0,0,.96)";ctx.fillRect(cameraX,0,canvas.width,canvas.height);drawTinyText(`${Math.max(1,Math.ceil(s.captureTimer/60))}`,cameraX+canvas.width/2-95,canvas.height/2,"#ffffff");}
    }
  } else if (s.type === "meadow") {
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
  } else if (s.type === "ocean") {
    {
      const caveX = s.shipX - 350;
      storyPoly([[caveX, 74], [caveX + 90, 150], [caveX + 120, 86], [caveX + 210, 157], [caveX + 255, 98], [level.worldWidth, 152], [level.worldWidth, 74]], "#274953");
      if (!oceanWreckImage.complete || !oceanWreckImage.naturalWidth) drawStoryShip(s.shipX);
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
      if (["pirateConflict","inkbender","reconciled"].includes(s.state) && pirateShipDeckImage.complete && pirateShipDeckImage.naturalWidth) {
        ctx.save(); ctx.imageSmoothingEnabled=false; ctx.drawImage(pirateShipDeckImage,0,0,315,180,20,190,540,300); ctx.translate(1200,0);ctx.scale(-1,1);ctx.drawImage(pirateShipDeckImage,0,0,315,180,20,190,540,300);ctx.restore();
        [[180,335],[300,315],[500,350],[750,325],[990,345]].forEach((p,i)=>drawPiratePriest(p[0],p[1]+Math.sin(s.clock/15+i)*4,i<3?1:-1));
        if (["inkbender","reconciled"].includes(s.state)) { drawPirateStoryEnemy({x:125,y:floorY-96,width:108,height:96,facing:1},"king"); drawPirateStoryEnemy({x:975,y:floorY-82,width:82,height:82,facing:-1},"sailor"); }
      }
      if (s.state === "reconciled") {
        const c = level.chest;
        ctx.fillStyle = "rgba(255,211,77,.18)"; ctx.beginPath(); ctx.arc(c.x + 38, c.y + 24, 70, 0, Math.PI * 2); ctx.fill();
        drawBlock3D(c.x, c.y + 15, 76, 42, "#bd8e28", "#ffe39a", "#785626", 8);
        ctx.fillStyle = "#ffda63"; ctx.fillRect(c.x, c.y, 76, 19); ctx.fillRect(c.x + 10, c.y + 15, 6, 42); ctx.fillRect(c.x + 59, c.y + 15, 6, 42);
        ctx.fillStyle = "#fff0b4"; ctx.fillRect(c.x + 31, c.y + 20, 14, 12);
      }
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
