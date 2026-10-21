/* =========================================================
   ODDORA — CLEAN MODERN APPLICATION ENGINE WITH COVER ICONS
   File: app.js
   ========================================================= */

"use strict";

const GAME_CATALOG = [
  {
    id: "tic-tac-toe",
    title: "Tic Tac Toe",
    icon: "",
    description: "Challenge a friend or outsmart the computer in this classic duel.",
    category: "strategy",
    difficulty: "Easy",
    bannerClass: "banner-purple",
    players: "1 to 2 players",
    xp: 25,
    file: "tic-tac-toe.js"
  },
  {
    id: "reflex-duel",
    title: "Reflex Duel",
    icon: "",
    description: "Test your reaction speed and beat your opponent.",
    category: "reflex",
    difficulty: "Easy",
    bannerClass: "banner-amber",
    players: "1 to 2 players",
    xp: 25,
    file: "reflex-duel.js"
  },
  {
    id: "memory-match",
    title: "Memory Match",
    icon: "",
    description: "Remember the card patterns and find matching pairs.",
    category: "puzzle",
    difficulty: "Medium",
    bannerClass: "banner-purple",
    players: "1 to 2 players",
    xp: 25,
    file: "memory-match.js"
  },
  {
    id: "shadow-duel",
    title: "Shadow Hunt",
    icon: "",
    description: "Stealth 2D combat arena with Fog of War, C4 traps, and sonar radar.",
    category: "strategy",
    difficulty: "Hard",
    bannerClass: "banner-purple",
    players: "1 to 2 players",
    xp: 35,
    file: "shadow-duel.js"
  }
];

let appState = {
  theme: "dark",
  username: "Player One",
  currentPage: "home",
  selectedCategory: "all"
};

function $(selector) { return document.querySelector(selector); } function $$(selector) { return Array.from(document.querySelectorAll(selector)); }
function setText(selector, val) { const el = $(selector); if (el) el.textContent = String(val ?? ""); }  /* ROUTING & NAVIGATION */ function navigateTo(pageId, pageTitle = "Home") { appState.currentPage = pageId; setText("#current-page-title", pageTitle);    $$(".view-page").forEach(p => p.classList.add("hidden"));
  $(`#page-${pageId}`)?.classList.remove("hidden");

  $("#drawer-overlay")?.classList.add("hidden");
}

function setupNavigation() {
  $("#nav-drawer-btn")?.addEventListener("click", () => {
    $("#drawer-overlay")?.classList.remove("hidden");
  });

  $("#drawer-close-btn")?.addEventListener("click", () => {
    $("#drawer-overlay")?.classList.add("hidden");
  });

  $$(".drawer-link").forEach(link => { link.addEventListener("click", () => { $$
(".drawer-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const target = link.dataset.page;
      navigateTo(target, target === "home" ? "Home" : "Games");
    });
  });

  $("#explore-games-btn")?.addEventListener("click", () => {
    navigateTo("games", "Games");
  });

  $("#theme-toggle-btn")?.addEventListener("click", () => {
    appState.theme = appState.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", appState.theme);
  });
}

/* CATALOG RENDERER WITH BANNER ICONS */
function renderCatalogCards() {
  const container = $("#catalog-cards-container");
  if (!container) return;
  container.replaceChildren();

  const filtered = GAME_CATALOG.filter(game => {
    if (appState.selectedCategory === "all") return true;
    return game.category === appState.selectedCategory;
  });

  filtered.forEach(game => {
    const card = document.createElement("div");
    card.className = "game-catalog-card";
    card.innerHTML = `
      <div class="game-card-banner ${game.bannerClass}">
        <div class="banner-cover-art">${game.icon}</div>
        <span class="difficulty-badge">${game.difficulty}</span>
      </div>
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="game-card-footer">
        <span class="game-meta-text">${game.players}  ${game.xp} XP</span>
        <button class="play-square-btn launch-game-trigger" data-id="${game.id}"></button>
      </div>
    `;
    container.appendChild(card);
  });

  $$(".launch-game-trigger").forEach(btn => {
    btn.onclick = () => launchGameArena(btn.dataset.id);
  });
}

function setupFilters() {
  $$(".filter-btn").forEach(btn => { btn.onclick = () => { $$
(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appState.selectedCategory = btn.dataset.category;
      renderCatalogCards();
    };
  });
}

/* GAME ARENA LAUNCHER */
let currentGameInstance = null;

function launchGameArena(gameId) {
  const game = GAME_CATALOG.find(g => g.id === gameId);
  if (!game) return;

  setText("#arena-game-name", game.title);
  navigateTo("game-arena", "Game");

  const root = $("#arena-root-canvas");
  if (root) root.innerHTML = `<div style="text-align:center; padding: 20px;">Loading Arena Engine...</div>`;

  loadGameScript(game).then(module => {
    if (!module) return;

    const context = {
      game,
      root: root,
      mode: "p2",
      getPlayerName: () => appState.username,
      showToast: (msg) => { alert(msg); },
      recordResult: () => {}
    };

    currentGameInstance = module.init(context);
  });
}

function loadGameScript(game) {
  if (window.OddoraGames?.[game.id]) {
    return Promise.resolve(window.OddoraGames[game.id]);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `./games/${game.file}`;
    script.onload = () => resolve(window.OddoraGames?.[game.id]);
    script.onerror = () => reject(new Error("Script error"));
    document.body.appendChild(script);
  });
}

$("#exit-arena-btn")?.addEventListener("click", () => {
  if (currentGameInstance && typeof currentGameInstance.destroy === "function") {
    try { currentGameInstance.destroy(); } catch (e) {}
  }
  currentGameInstance = null;
  navigateTo("games", "Games");
});

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupFilters();
  renderCatalogCards();
});
