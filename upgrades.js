/* 元宝世界：存档、模式、检查点、暂停、龙之家与触屏升级。 */
const saveKey = "yuanbao.adventure.save.v2";
const objectiveHud = document.querySelector("#objectiveHud");
const objectiveText = document.querySelector("#objectiveText");
const checkpointText = document.querySelector("#checkpointText");
const adventureModeButton = document.querySelector("#adventureModeButton");
const creativeModeButton = document.querySelector("#creativeModeButton");
const modeHint = document.querySelector("#modeHint");
const continueButton = document.querySelector("#continueButton");
const exportSaveButton = document.querySelector("#exportSaveButton");
const importSaveButton = document.querySelector("#importSaveButton");
const saveStatus = document.querySelector("#saveStatus");
const dragonHomeButton = document.querySelector("#dragonHomeButton");
const dragonHomePanel = document.querySelector("#dragonHomePanel");
const dragonHomeContent = document.querySelector("#dragonHomeContent");
const closeDragonHomeButton = document.querySelector("#closeDragonHomeButton");
const dragonSkillButton = document.querySelector("#dragonSkillButton");
const pausePanel = document.querySelector("#pausePanel");
const resumeButton = document.querySelector("#resumeButton");
const returnMenuButton = document.querySelector("#returnMenuButton");

let gameMode = "adventure";
let checkpointLevel = 1;
let checkpointX = 80;
let lastCheckpointIndex = 0;
let dragonSkillCooldown = 0;
let autoSaveClock = 0;
let manualPause = false;

function getSaveData() {
  return {
    version: 2, savedAt: Date.now(), gameMode, currentLevel, checkpointLevel, checkpointX,
    coins, diamonds, experience, heroLevel, playCount, weaponLevel,
    ownedWeapons, specialWeaponIndexes, hasHorse, hasRedHare, hasBlackHorse, hasGoldenArmor,
    hasDragonAdult, dragonFeedCount, dragonEggIncubator, dragons, activeDragonId, activeMount, dragonRestX, dragonRestY, dragonRestLevel,
    lightningBootsEquipped, equippedArrow, equippedTool, diverSkinOwned, selectedSkin,
    ownedSkins, selectedProfession, speedPotionOwned, inventory,
    foxRescued: typeof foxRescued === "boolean" ? foxRescued : false,
    foxTutorialPending: typeof foxTutorialPending === "boolean" ? foxTutorialPending : false,
  };
}

function applySaveData(data) {
  if (!data || data.version !== 2) throw new Error("存档版本不兼容");
  gameMode = data.gameMode === "creative" ? "creative" : "adventure";
  unlimitedCoinsMode = gameMode === "creative";
  currentLevel = Math.max(1, Number(data.currentLevel) || 1);
  checkpointLevel = Math.max(1, Number(data.checkpointLevel) || currentLevel);
  checkpointX = Math.max(80, Number(data.checkpointX) || 80);
  coins = Number(data.coins) || 0; diamonds = Number(data.diamonds) || 0;
  experience = Number(data.experience) || 0; heroLevel = Math.max(1, Number(data.heroLevel) || 1);
  playCount = Number(data.playCount) || 0; weaponLevel = Number(data.weaponLevel) || 0;
  if (Array.isArray(data.ownedWeapons)) ownedWeapons = data.ownedWeapons;
  specialWeaponIndexes = data.specialWeaponIndexes || {};
  hasHorse = Boolean(data.hasHorse); hasRedHare = Boolean(data.hasRedHare); hasBlackHorse = Boolean(data.hasBlackHorse);
  hasGoldenArmor = Boolean(data.hasGoldenArmor); hasDragonAdult = Boolean(data.hasDragonAdult);
  dragonFeedCount = Number(data.dragonFeedCount) || 0; dragonEggIncubator = data.dragonEggIncubator || null;
  dragons = Array.isArray(data.dragons) ? data.dragons : []; activeDragonId = data.activeDragonId || "";
  activeMount = data.activeMount || "horse"; lightningBootsEquipped = Boolean(data.lightningBootsEquipped);
  dragonRestX = Number(data.dragonRestX) || 80; dragonRestY = Number(data.dragonRestY) || floorY - 76;
  dragonRestLevel = Number(data.dragonRestLevel) || currentLevel;
  equippedArrow = data.equippedArrow || "normalArrow"; equippedTool = data.equippedTool || "";
  diverSkinOwned = Boolean(data.diverSkinOwned); selectedSkin = data.selectedSkin || "knight";
  ownedSkins = { ...ownedSkins, ...(data.ownedSkins || {}) }; selectedProfession = data.selectedProfession || "doctor";
  speedPotionOwned = Boolean(data.speedPotionOwned); inventory = { ...inventory, ...(data.inventory || {}) };
  if (typeof foxRescued === "boolean") foxRescued = Boolean(data.foxRescued);
  if (typeof foxTutorialPending === "boolean") foxTutorialPending = Boolean(data.foxTutorialPending);
  syncModeUi(); renderProfessions(); renderBackpack(); renderShop(); updateHud();
}

function saveGame(label = "已自动保存") {
  try {
    localStorage.setItem(saveKey, JSON.stringify(getSaveData()));
    saveStatus.textContent = `${label} · ${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    continueButton.disabled = false;
    return true;
  } catch (_) {
    saveStatus.textContent = "浏览器无法保存，请导出存档";
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(saveKey);
    if (!raw) return false;
    applySaveData(JSON.parse(raw));
    saveStatus.textContent = "已载入上次冒险";
    return true;
  } catch (_) {
    saveStatus.textContent = "存档读取失败";
    return false;
  }
}

function syncModeUi() {
  unlimitedCoinsMode = gameMode === "creative";
  adventureModeButton.classList.toggle("is-selected", gameMode === "adventure");
  creativeModeButton.classList.toggle("is-selected", gameMode === "creative");
  modeHint.textContent = gameMode === "creative"
    ? "创造模式：无限金币、测试世界和快速养成，适合自由体验。"
    : "冒险模式：正常金币与真实掉落，成长会自动保存。";
  updateHud(); renderShop();
}

function selectMode(mode) {
  gameMode = mode;
  if (mode === "adventure" && coins > 99999) coins = 50;
  syncModeUi(); saveGame("模式已保存");
}

function getWorldObjective() {
  if (!level) return "准备下一次冒险";
  if (level.story) {
    if (level.story.type === "meadow") return level.story.saved ? "打开终点宝箱" : "找到并救出小狐狸";
    const oceanObjectives = { help: "找到求救的螃蟹", guide: "跟随螃蟹找到鲸鱼", battle: "保护螃蟹，击退鲨鱼", freed: "和鲸鱼一起击退鲨鱼", thanks: "游到鲸鱼身边", offer: "接受鲸鱼的邀请", ride: "乘鲸鱼前往沉船", cave: "进入沉船", inside: "寻找金色宝箱", reward: "带着宝物前往沙漠" };
    return oceanObjectives[level.story.state] || "完成海洋救援";
  }
  if (level.theme.id === "desert") return "穿过流沙，击败守卫并进入金字塔";
  if (level.theme.id === "swamp") return "净化沼泽怪物，开启传送门";
  if (level.theme.id === "lava") return "穿越岩浆池，击败终极 BOSS";
  return "收集星星，击败怪物并打开宝箱";
}

function updateAdventureSystems() {
  if (gameState !== "playing" || !player || !level) return;
  objectiveHud.classList.remove("is-hidden");
  objectiveText.textContent = getWorldObjective();
  dragonSkillCooldown = Math.max(0, dragonSkillCooldown - 1);
  level.platforms.forEach(platform => { if (platform.temporary) platform.temporary -= 1; });
  level.platforms = level.platforms.filter(platform => !platform.temporary || platform.temporary > 0);
  const checkpointIndex = Math.floor(player.x / 1000);
  if (checkpointIndex > lastCheckpointIndex) {
    lastCheckpointIndex = checkpointIndex;
    checkpointLevel = currentLevel;
    checkpointX = Math.min(level.worldWidth - 180, checkpointIndex * 1000 + 60);
    checkpointText.textContent = `检查点 ${checkpointIndex} 已点亮`;
    effects.push({ x: player.x - 20, y: player.y - 30, width: 180, height: 28, life: 90, kind: "loot", text: "检查点已保存！" });
    saveGame("检查点已保存");
  } else {
    checkpointText.textContent = checkpointIndex ? `已到达检查点 ${checkpointIndex}` : "从起点出发";
  }
  autoSaveClock += 1;
  if (autoSaveClock >= 600) { autoSaveClock = 0; saveGame(); }
  const activeDragon = getActiveDragon();
  dragonSkillButton.textContent = activeDragon?.type === "gold" ? "金龙无龙技" : dragonSkillCooldown > 0 ? `龙技冷却 ${Math.ceil(dragonSkillCooldown / 60)}秒` : "五行龙技";
  dragonSkillButton.disabled = !activeDragon || activeDragon.type === "gold" || dragonSkillCooldown > 0;
}

function useDragonSkill() {
  if (gameState !== "playing" || dragonSkillCooldown > 0) return;
  const dragon = getActiveDragon();
  if (!dragon || dragon.feedCount < 10) return;
  const type = dragon.type;
  if (type === "gold") return;
  const centerX = player.x + player.width / 2;
  if (type === "wood" || type === "earth") {
    level.platforms.push({ x: Math.min(level.worldWidth - 190, player.x + player.facing * 105), y: Math.min(floorY - 80, player.y + 45), width: type === "wood" ? 190 : 140, height: 20, temporary: 600 });
    effects.push({ x: centerX, y: player.y, width: 160, height: 34, life: 70, kind: "loot", text: type === "wood" ? "藤蔓桥生长！" : "岩石平台升起！" });
  } else if (type === "water") {
    fireResistTimer = Math.max(fireResistTimer, 600);
    level.enemies.forEach(enemy => { if (enemy.alive && Math.abs(enemy.x - player.x) < 500) enemy.cagedTimer = Math.max(enemy.cagedTimer, 180); });
    effects.push({ x: player.x, y: player.y - 30, width: 180, height: 28, life: 70, kind: "loot", text: "冰霜冻结危险！" });
  } else if (type === "fire") {
    level.enemies.forEach(enemy => { if (enemy.alive && Math.abs(enemy.x - player.x) < 520) damageEnemy(enemy, 55 + heroLevel * 4); });
    effects.push({ x: player.x - 180, y: player.y, width: 440, height: 42, life: 40, kind: "dragon-fire" });
  }
  dragonSkillCooldown = 600; updateHud(); saveGame();
}

function renderDragonHome() {
  dragonHomeContent.innerHTML = "";
  const friend = document.createElement("div"); friend.className = "dragon-card";
  friend.innerHTML = `<strong>伙伴墙</strong><span>${typeof foxRescued === "boolean" && foxRescued ? "🦊 小狐狸已获救" : "继续冒险，寻找小狐狸"}</span>`;
  dragonHomeContent.append(friend);
  if (!dragons.length) {
    const empty = document.createElement("div"); empty.className = "dragon-card"; empty.innerHTML = "<strong>温暖的空巢</strong><span>海洋沉船中藏着第一颗龙蛋。</span>"; dragonHomeContent.append(empty);
  }
  dragons.forEach((dragon, index) => {
    const type = getDragonType(dragon.type); const adult = dragon.feedCount >= 10;
    const card = document.createElement("button"); card.type = "button"; card.className = `dragon-card${activeDragonId === dragon.id ? " is-active" : ""}`;
    card.innerHTML = `<strong>${type.name} · ${adult ? "成年" : "幼龙"}</strong><span>名字：元宝的${type.name}${index + 1}号</span><span>${type.skill}</span><span>${adult ? "点击选择出战" : `成长 ${dragon.feedCount}/10`}</span>`;
    card.disabled = !adult; card.addEventListener("click", () => { selectDragon(dragon.id); renderDragonHome(); saveGame(); });
    dragonHomeContent.append(card);
  });
}

function pauseGame(showPanel = true) {
  if (gameState !== "playing") return;
  manualPause = true; gameState = "paused"; cancelAnimationFrame(animationFrame); keys.clear(); saveGame("已暂停并保存");
  if (showPanel) pausePanel.classList.remove("is-hidden");
}
function resumeGame() {
  if (gameState !== "paused") return;
  manualPause = false; pausePanel.classList.add("is-hidden"); gameState = "playing"; lastFrameTime = 0; frameAccumulator = 0; update();
}

function initializeUpgradeRun() {
  lastCheckpointIndex = checkpointLevel === currentLevel ? Math.floor(checkpointX / 1000) : 0;
  if (checkpointLevel === currentLevel && checkpointX > 80) {
    player.x = Math.min(level.worldWidth - player.width - 20, checkpointX);
    effects.push({ x: player.x, y: player.y - 30, width: 170, height: 28, life: 90, kind: "loot", text: "从检查点继续" });
  }
  if (!isRidingDragon() && dragonRestLevel !== currentLevel) {
    dragonRestLevel = currentLevel;
    dragonRestX = player.x - 100;
    dragonRestY = floorY - 76;
  }
  objectiveHud.classList.remove("is-hidden"); saveGame("冒险已开始");
}

const baseUpdate = update;
update = function upgradedUpdate(time) { updateAdventureSystems(); baseUpdate(time); };
const baseShowMenu = showMenu;
showMenu = function upgradedShowMenu(reason) { objectiveHud.classList.add("is-hidden"); baseShowMenu(reason); saveGame(reason === "death" ? "失败进度已保存" : "进度已保存"); };

adventureModeButton.addEventListener("click", () => selectMode("adventure"));
creativeModeButton.addEventListener("click", () => selectMode("creative"));
continueButton.addEventListener("click", () => startGame());
dragonSkillButton.addEventListener("click", useDragonSkill);
dragonHomeButton.addEventListener("click", () => { renderDragonHome(); dragonHomePanel.classList.remove("is-hidden"); });
closeDragonHomeButton.addEventListener("click", () => dragonHomePanel.classList.add("is-hidden"));
resumeButton.addEventListener("click", resumeGame);
returnMenuButton.addEventListener("click", () => { pausePanel.classList.add("is-hidden"); manualPause = false; gameState = "playing"; showMenu("ready"); });

exportSaveButton.addEventListener("click", async () => {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(getSaveData()))));
  try { await navigator.clipboard.writeText(data); saveStatus.textContent = "存档代码已复制"; }
  catch (_) { window.prompt("复制下面的存档代码：", data); }
});
importSaveButton.addEventListener("click", () => {
  const code = window.prompt("粘贴存档代码："); if (!code) return;
  try { applySaveData(JSON.parse(decodeURIComponent(escape(atob(code.trim()))))); saveGame("存档导入成功"); }
  catch (_) { saveStatus.textContent = "存档代码无效"; }
});

window.addEventListener("keydown", event => {
  if (event.code === "Escape") { event.preventDefault(); gameState === "playing" ? pauseGame() : gameState === "paused" ? resumeGame() : null; }
  if (event.code === "KeyL") useDragonSkill();
});
window.addEventListener("blur", () => { if (gameState === "playing") pauseGame(true); });
window.addEventListener("beforeunload", () => saveGame());

document.querySelectorAll("[data-hold]").forEach(button => {
  const code = button.dataset.hold;
  const down = event => { event.preventDefault(); keys.add(code); };
  const up = event => { event.preventDefault(); keys.delete(code); };
  button.addEventListener("pointerdown", down); button.addEventListener("pointerup", up); button.addEventListener("pointercancel", up); button.addEventListener("pointerleave", up);
});
document.querySelectorAll("[data-tap]").forEach(button => button.addEventListener("pointerdown", event => {
  event.preventDefault(); const code = button.dataset.tap; keys.add(code); setTimeout(() => keys.delete(code), 90);
  if (code === "KeyK") throwGrenade();
}));

continueButton.disabled = !loadGame();
syncModeUi();
renderDragonHome();
