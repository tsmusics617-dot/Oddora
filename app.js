/* =========================================================
   ODDORA — MAIN ENGINE (CLEAN V2)
   File: app.js
   ========================================================= */

"use strict";

const ODDORA_CONFIG = {
  appName: "Oddora",
  storageKey: "oddora_app_v1",
  gameFolder: "games/",
  defaultAvatar: "",
  xpPerWin: 25,
  xpPerDraw: 10,
  xpPerLoss: 5
};

const GAME_REGISTRY = [
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    icon: "",
    description: "Challenge a friend or outsmart the computer in this classic duel.",
    category: "strategy",
    mode: "Pass and Play / AI",
    players: "1 to 2 players",
    xp: 25,
    difficulty: "Easy",
    color: "purple",
    file: "tic-tac-toe.js"
  },
  {
    id: "reflex-duel",
    title: "Reflex Duel",
    icon: "",
    description: "Test your reaction speed and beat your opponent.",
    category: "reflex",
    mode: "Reaction challenge",
    players: "1 to 2 players",
    xp: 25,
    difficulty: "Easy",
    color: "yellow",
    file: "reflex-duel.js"
  },
  {
    id: "memory-match",
    title: "Memory Match",
    icon: "",
    description: "Remember the card patterns and find matching pairs.",
    category: "puzzle",
    mode: "Memory challenge",
    players: "1 to 2 players",
    xp: 25,
    difficulty: "Medium",
    color: "purple",
    file: "memory-match.js"
  }
];

/* STATE MANAGEMENT */
function createDefaultState() {
  return {
    version: 1,
    profile: {
      name: "Player One",
      avatar: ODDORA_CONFIG.defaultAvatar,
      handle: "@playerone"
    },
    stats: {
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      xp: 0
    },
    gameStats: {}
  };
}

function loadAppState() {
  const defaults = createDefaultState();
  try {
    const raw = localStorage.getItem(ODDORA_CONFIG.storageKey);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    return {
      ...defaults,
      ...saved,
      profile: { ...defaults.profile, ...(saved.profile || {}) },
      stats: { ...defaults.stats, ...(saved.stats || {}) },
      gameStats: saved.gameStats || {}
    };
  } catch (e) {
    return defaults;
  }
}

let appState = loadAppState();

function saveAppState() {
  try {
    localStorage.setItem(ODDORA_CONFIG.storageKey, JSON.stringify(appState));
  } catch (e) {}
}

/* DOM HELPERS */
function $(selector) { return document.querySelector(selector); }  function $$(selector) {
  return Array.from(document.querySelectorAll(selector));
}

function setText(selector, val) {
  const el = $(selector);
  if (el) el.textContent = String(val ?? "");
}

function getWinRate() {
  if (appState.stats.gamesPlayed <= 0) return 0;
  return Math.round((appState.stats.wins / appState.stats.gamesPlayed) * 100);
}

function getLevelFromXP(xp) {
  return Math.floor((Number(xp) || 0) / 100) + 1;
}

function showToast(msg, type = "success") {
  const container = $("#toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.style.cssText = "background: #141824; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 16px; border-radius: 10px; margin-bottom: 8px; font-size: 12px; font-weight: 700;";
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function openModal({ title = "Oddora", icon = "", content = "", confirmText = "Got It" } = {}) {
  const overlay = $("#modal-overlay");
  if (!overlay) return;
  setText("#modal-icon", icon);
  setText("#modal-title", title);
  const contentEl = $("#modal-content");
  if (contentEl) contentEl.innerHTML = content;
  setText("#modal-confirm", confirmText);
  overlay.classList.remove("hidden");
  overlay.classList.add("active");
}

function closeModal() {
  const overlay = $("#modal-overlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  overlay.classList.add("hidden");
}

/* ROUTING & PAGE SWITCHING */
let currentPage = "home";
let currentGameId = null;
let currentGameInstance = null;

function navigateTo(pageName) {
  const target = $(`#page-${pageName}`);
  if (!target) return;

  if (currentPage === "game" && pageName !== "game") {
    stopCurrentGame();
  }

  $$(".page").forEach(page => page.classList.toggle("active", page.id === `page-${pageName}`));
  $$("[data-page]").forEach(btn => btn.classList.toggle("active", btn.dataset.page === pageName));

  currentPage = pageName;
  setText("#breadcrumb-current", pageName.charAt(0).toUpperCase() + pageName.slice(1));

  closeSidebar();

  if (pageName === "home") renderHomePage();
  if (pageName === "games") renderGamesCatalog();
  if (pageName === "profile") renderProfilePage();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupNavigation() {
  document.addEventListener("click", e => {
    const navBtn = e.target.closest("[data-page]");
    if (navBtn) {
      e.preventDefault();
      const page = navBtn.dataset.page;
      if (page) navigateTo(page);
    }
  });

  $("#back-to-games")?.addEventListener("click", () => navigateTo("games"));
  $("#hero-play-button")?.addEventListener("click", () => navigateTo("games"));
  $("#modal-close")?.addEventListener("click", closeModal);
  $("#modal-confirm")?.addEventListener("click", closeModal);

  $("#feedback-button")?.addEventListener("click", () => {
    openModal({
      title: " Beta Feedback",
      icon: "",
      content: `
        <p style="margin-bottom: 12px; font-size: 13px; color: var(--text-secondary);">
          Which game is your favorite so far?
        </p>
        <textarea id="feedback-text" rows="3" style="width: 100%; padding: 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); color: var(--text); font-size: 12px;" placeholder="Tell us what you think..."></textarea>
      `,
      confirmText: "Submit",
      onConfirm: () => showToast("Feedback saved! ")
    });
  });

  $("#sidebar-play-button")?.addEventListener("click", () => {
    const text = encodeURIComponent(" Play Oddora mini-games with me! Think you can beat my high score?");
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  });
}

/* SIDEBAR DRAWER */
function openSidebar() {
  $("#sidebar")?.classList.add("open");
  $("#sidebar-backdrop")?.classList.add("active");
}

function closeSidebar() {
  $("#sidebar")?.classList.remove("open");
  $("#sidebar-backdrop")?.classList.remove("active");
}

function setupSidebar() {
  $("#mobile-menu-button")?.addEventListener("click", e => {
    e.stopPropagation();
    const sidebar = $("#sidebar");
    if (sidebar?.classList.contains("open")) closeSidebar();
    else openSidebar();
  });

  $("#sidebar-backdrop")?.addEventListener("click", closeSidebar);
}

/* GAME LOADER & RECORDING */
function getGameStats(gameId) {
  if (!appState.gameStats[gameId]) {
    appState.gameStats[gameId] = { played: 0, wins: 0, xp: 0 };
  }
  return appState.gameStats[gameId];
}

function recordResult(gameId, result) {
  const gStats = getGameStats(gameId);
  appState.stats.gamesPlayed += 1;
  gStats.played += 1;

  let xpEarned = ODDORA_CONFIG.xpPerLoss;
  if (result === "win") {
    appState.stats.wins += 1;
    gStats.wins += 1;
    xpEarned = ODDORA_CONFIG.xpPerWin;
  }

  appState.stats.xp += xpEarned;
  saveAppState();
  renderHomePage();

  return { result, xpEarned };
}

const loadedScripts = new Set();

function loadGameScript(game) {
  if (loadedScripts.has(game.id)) {
    return Promise.resolve(window.OddoraGames?.[game.id]);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${ODDORA_CONFIG.gameFolder}${game.file}`;
    script.onload = () => {
      loadedScripts.add(game.id);
      const module = window.OddoraGames?.[game.id];
      if (module) resolve(module);
      else reject(new Error("Module load failed"));
    };
    script.onerror = () => reject(new Error("Script file missing"));
    document.body.appendChild(script);
  });
}

async function openGame(gameId) {
  const game = GAME_REGISTRY.find(g => g.id === gameId);
  if (!game) return;

  stopCurrentGame();
  currentGameId = gameId;

  const gameIconEl = $("#current-game-icon");
  if (gameIconEl) {
    gameIconEl.textContent = game.icon;
    gameIconEl.className = `game-screen-dp banner-${game.color || 'purple'}`;
  }

  setText("#current-game-title", game.title);
  setText("#current-game-description", game.description);
  setText("#game-status-text", "Loading game...");

  const gameRoot = $("#game-root");
  if (gameRoot) gameRoot.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--text-muted);">Loading arena...</div>`;

  navigateTo("game");

  try {
    const module = await loadGameScript(game);
    if (currentPage !== "game" || currentGameId !== gameId) return;

    const context = {
      game,
      root: gameRoot,
      state: appState,
      stats: getGameStats(gameId),
      recordResult: (res) => recordResult(gameId, res),
      updateStatus: msg => setText("#game-status-text", msg),
      getPlayerName: () => appState.profile.name,
      showToast
    };

    currentGameInstance = await module.init(context);
    setText("#game-status-text", "Game Ready");
  } catch (err) {
    if (gameRoot) {
      gameRoot.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--danger);">Failed to load game module.</div>`;
    }
  }
}

function stopCurrentGame() {
  if (currentGameInstance && typeof currentGameInstance.destroy === "function") {
    try { currentGameInstance.destroy(); } catch (e) {}
  }
  currentGameInstance = null;
  currentGameId = null;
}

/* RENDERING CARDS */
function createGameCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";
  const colorClass = game.color ? `banner-${game.color}` : "banner-purple";

  card.innerHTML = `
    <div class="game-card-banner ${colorClass}">
      <span class="cover-icon">${game.icon}</span>
      <span class="banner-tag">${game.difficulty}</span>
    </div>
    <h3 class="game-card-title">${game.title}</h3>
    <p class="game-card-description">${game.description}</p>
    <div class="game-card-footer">
      <div class="game-card-meta"> ${game.players} •  ${game.xp} XP</div>
      <div class="game-card-play"></div>
    </div>
  `;

  card.addEventListener("click", () => openGame(game.id));
  return card;
}

function renderHomePage() {
  setText("#welcome-username", appState.profile.name);
  setText("#stat-games-played", appState.stats.gamesPlayed);
  setText("#stat-wins", appState.stats.wins);
  setText("#stat-win-rate", `${getWinRate()}%`);
  setText("#stat-xp", appState.stats.xp);
  setText("#topbar-username", appState.profile.name);

  const grid = $("#featured-games-grid");
  if (grid) {
    grid.replaceChildren();
    GAME_REGISTRY.forEach(g => grid.appendChild(createGameCard(g)));
  }
}

function renderGamesCatalog() {
  const grid = $("#all-games-grid");
  if (grid) {
    grid.replaceChildren();
    GAME_REGISTRY.forEach(g => grid.appendChild(createGameCard(g)));
  }
}

function renderProfilePage() {
  setText("#profile-display-name", appState.profile.name);
  setText("#profile-handle", appState.profile.handle);
  setText("#profile-level", getLevelFromXP(appState.stats.xp));
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupSidebar();

  $("#restart-game-button")?.addEventListener("click", () => {
    if (currentGameInstance?.newRound) currentGameInstance.newRound();
  });

  renderHomePage();
  navigateTo("home");
});
