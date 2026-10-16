/* =========================================================
   ODDORA GAMES — PIXEL SHOWDOWN: SHADOW HUNT
   File: games/shadow-duel.js
   ========================================================= */

"use strict";

window.OddoraGames = window.OddoraGames || {};

window.OddoraGames["shadow-duel"] = {
  id: "shadow-duel",
  title: "Shadow Hunt",

  init(context) {
    const container = context.root;
    let mode = "p2"; // "p2" (Pass & Play) or "p1" (vs AI Bot)
    const GRID_SIZE = 6;

    // Game state
    let activePlayer = 1; // 1 or 2
    let ap = 3; // Action points remaining in turn
    let gameActive = false;

    let p1 = { x: 0, y: 0, hp: 100, traps: 2, revealedTurns: 0 };
    let p2 = { x: 5, y: 5, hp: 100, traps: 2, revealedTurns: 0 };
    let traps = []; // { x, y, owner: 1|2 }
    let logs = [];

    function renderSetupUI() {
      container.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto; text-align: center; background: var(--surface); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
          <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 8px; color: #a855f7;">🥷 Shadow Hunt</h2>
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">
            A 2D stealth battle arena. Hide in the dark, place C4 traps, and hunt your opponent!
          </p>
          
          <div style="margin-bottom: 24px; text-align: left;">
            <label style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Game Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
              <button id="sh-mode-p2" class="category-button active" style="padding: 12px;">👥 Pass & Play</button>
              <button id="sh-mode-p1" class="category-button" style="padding: 12px;">🤖 vs AI Bot</button>
            </div>
          </div>

          <button id="sh-start-btn" class="primary-button" style="width: 100%; padding: 14px; font-size: 16px;">
            Enter Arena 🔥
          </button>
        </div>
      `;

      container.querySelector("#sh-mode-p1").onclick = () => {
        mode = "p1";
        container.querySelector("#sh-mode-p1").classList.add("active");
        container.querySelector("#sh-mode-p2").classList.remove("active");
      };

      container.querySelector("#sh-mode-p2").onclick = () => {
        mode = "p2";
        container.querySelector("#sh-mode-p2").classList.add("active");
        container.querySelector("#sh-mode-p1").classList.remove("active");
      };

      container.querySelector("#sh-start-btn").onclick = startMatch;
    }

    function startMatch() {
      gameActive = true;
      activePlayer = 1;
      ap = 3;
      logs = ["Match Started! Shadow Fog active."];

      p1 = { x: 0, y: 0, hp: 100, traps: 2, revealedTurns: 0 };
      p2 = { x: 5, y: 5, hp: 100, traps: 2, revealedTurns: 0 };
      traps = [];

      renderArena();
    }

    function renderArena() {
      if (!gameActive) return;

      const curr = activePlayer === 1 ? p1 : p2;
      const opp = activePlayer === 1 ? p2 : p1;
      const pName = activePlayer === 1 ? context.getPlayerName() : (mode === "p2" ? "Player 2" : "AI Bot");

      let html = `
        <style>
          .sh-board {
            display: grid;
            grid-template-columns: repeat(${GRID_SIZE}, 1fr);
            gap: 6px;
            max-width: 360px;
            margin: 0 auto;
            background: #090a10;
            padding: 8px;
            border-radius: 12px;
            border: 1px solid var(--border);
          }
          .sh-cell {
            aspect-ratio: 1;
            background: #131522;
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            cursor: pointer;
            position: relative;
            user-select: none;
          }
          .sh-cell.self {
            background: rgba(168, 85, 247, 0.25);
            border-color: #a855f7;
          }
          .sh-cell.revealed-enemy {
            background: rgba(239, 68, 68, 0.3);
            border-color: #ef4444;
          }
          .sh-cell.trap {
            border-color: #f59e0b;
          }
          .sh-controls {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            max-width: 360px;
            margin: 14px auto 0;
          }
          .sh-btn {
            padding: 10px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 8px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text-main);
            cursor: pointer;
          }
          .sh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        </style>

        <!-- Status Dashboard -->
        <div style="max-width: 360px; margin: 0 auto 12px; display: flex; justify-content: space-between; align-items: center; background: var(--surface); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);">
          <div>
            <div style="font-size: 12px; font-weight: 900; color: #a855f7;">${pName}</div>
            <div style="font-size: 11px; color: var(--text-secondary);">HP: ${curr.hp}% | Traps: ${curr.traps}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: 900; color: #f59e0b;">⚡ AP: ${ap}/3</div>
            <div style="font-size: 10px; color: var(--text-muted);">Opponent HP: ${opp.hp}%</div>
          </div>
        </div>

        <!-- Combat Grid -->
        <div class="sh-board">
      `;

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          let isSelf = curr.x === c && curr.y === r;
          let isEnemyRevealed = opp.x === c && opp.y === r && opp.revealedTurns > 0;
          let hasMyTrap = traps.some(t => t.x === c && t.y === r && t.owner === activePlayer);

          let cellClass = "sh-cell";
          let icon = "";

          if (isSelf) {
            cellClass += " self";
            icon = activePlayer === 1 ? "🥷" : "🤖";
          } else if (isEnemyRevealed) {
            cellClass += " revealed-enemy";
            icon = "🎯";
          } else if (hasMyTrap) {
            cellClass += " trap";
            icon = "💣";
          }

          html += `<div class="${cellClass}" data-x="${c}" data-y="${r}">${icon}</div>`;
        }
      }

      html += `
        </div>

        <!-- Action Controls -->
        <div class="sh-controls">
          <button id="sh-act-sonar" class="sh-btn" ${ap < 1 ? "disabled" : ""}>📡 Sonar Scan (1 AP)</button>
          <button id="sh-act-trap" class="sh-btn" ${ap < 1 || curr.traps < 1 ? "disabled" : ""}>💣 Plant C4 (1 AP)</button>
          <button id="sh-act-shoot" class="sh-btn" style="grid-column: span 2; background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fca5a5;" ${ap < 2 ? "disabled" : ""}>🎯 Fire Cannon (2 AP)</button>
        </div>

        <div style="max-width: 360px; margin: 10px auto 0; font-size: 11px; color: var(--text-secondary); text-align: center;">
          Tap any adjacent square on the grid to <b>Move (1 AP)</b>.
        </div>

        <div style="max-width: 360px; margin: 12px auto 0; background: #000; padding: 8px 12px; border-radius: 8px; font-size: 11px; color: #a3e635; font-family: monospace; height: 42px; overflow-y: auto;">
          ${logs.slice(-2).join("<br>")}
        </div>
      `;

      container.innerHTML = html;
      bindEvents();
    }

    function bindEvents() {
      const curr = activePlayer === 1 ? p1 : p2;

      // Tap Grid to Move
      container.querySelectorAll(".sh-cell").forEach(cell => {
        cell.onclick = () => {
          if (ap < 1) return;
          const tx = parseInt(cell.dataset.x);
          const ty = parseInt(cell.dataset.y);

          // Check adjacency (1 tile north/south/east/west)
          const dist = Math.abs(curr.x - tx) + Math.abs(curr.y - ty);
          if (dist === 1) {
            curr.x = tx;
            curr.y = ty;
            ap--;
            addLog(`Moved to [${tx + 1}, ${ty + 1}].`);
            checkTraps();
            checkTurnEnd();
          }
        };
      });

      // Actions
      const sonarBtn = container.querySelector("#sh-act-sonar");
      if (sonarBtn) {
        sonarBtn.onclick = () => {
          if (ap < 1) return;
          ap--;
          const opp = activePlayer === 1 ? p2 : p1;
          const quadX = opp.x < 3 ? "West" : "East";
          const quadY = opp.y < 3 ? "North" : "South";
          context.showToast(`Sonar: Enemy detected in ${quadY}-${quadX}!`, "warning");
          addLog(`Sonar detected enemy in ${quadY}-${quadX}.`);
          checkTurnEnd();
        };
      }

      const trapBtn = container.querySelector("#sh-act-trap");
      if (trapBtn) {
        trapBtn.onclick = () => {
          if (ap < 1 || curr.traps < 1) return;
          ap--;
          curr.traps--;
          traps.push({ x: curr.x, y: curr.y, owner: activePlayer });
          context.showToast("C4 Explosive Planted!", "success");
          addLog("Planted C4 explosive.");
          checkTurnEnd();
        };
      }

      const shootBtn = container.querySelector("#sh-act-shoot");
      if (shootBtn) {
        shootBtn.onclick = () => {
          if (ap < 2) return;
          ap -= 2;
          curr.revealedTurns = 2; // Shooting reveals position

          const opp = activePlayer === 1 ? p2 : p1;
          const isHit = Math.abs(curr.x - opp.x) <= 1 && Math.abs(curr.y - opp.y) <= 1;

          if (isHit) {
            opp.hp -= 45;
            context.showToast("DIRECT HIT! 🎯 -45 HP", "success");
            addLog("Direct hit! Dealt 45 damage.");
          } else {
            context.showToast("Shot Missed!", "error");
            addLog("Fired cannon... Missed!");
          }

          if (opp.hp <= 0) {
            endMatch();
            return;
          }

          checkTurnEnd();
        };
      }
    }

    function checkTraps() {
      const curr = activePlayer === 1 ? p1 : p2;
      const hitTrapIdx = traps.findIndex(t => t.x === curr.x && t.y === curr.y && t.owner !== activePlayer);

      if (hitTrapIdx !== -1) {
        curr.hp -= 35;
        traps.splice(hitTrapIdx, 1);
        context.showToast("BOOM! Stepped on C4! 💣 -35 HP", "error");
        addLog("BOOM! Triggered enemy C4 trap!");

        if (curr.hp <= 0) endMatch();
      }
    }

    function checkTurnEnd() {
      if (ap <= 0) {
        switchTurn();
      } else {
        renderArena();
      }
    }

    function switchTurn() {
      // Reduce reveal counter
      if (activePlayer === 1) p1.revealedTurns = Math.max(0, p1.revealedTurns - 1);
      else p2.revealedTurns = Math.max(0, p2.revealedTurns - 1);

      activePlayer = activePlayer === 1 ? 2 : 1;
      ap = 3;

      if (mode === "p1" && activePlayer === 2) {
        renderArena();
        setTimeout(playAITurn, 900);
      } else {
        renderArena();
      }
    }

    function playAITurn() {
      if (!gameActive) return;

      // Simple AI strategy
      if (Math.abs(p2.x - p1.x) <= 1 && Math.abs(p2.y - p1.y) <= 1 && ap >= 2) {
        // Attack if near
        p2.revealedTurns = 2;
        p1.hp -= 45;
        context.showToast("AI Bot Sniped You! -45 HP", "error");
        addLog("AI Bot sniped you!");
      } else {
        // Move towards center or player
        const dx = Math.sign(p1.x - p2.x);
        const dy = Math.sign(p1.y - p2.y);
        if (dx !== 0 && Math.random() > 0.5) p2.x += dx;
        else if (dy !== 0) p2.y += dy;
        addLog("AI Bot moved silently.");
      }

      checkTraps();
      if (p1.hp <= 0) {
        endMatch();
        return;
      }

      switchTurn();
    }

    function addLog(msg) {
      logs.push(msg);
    }

    function endMatch() {
      gameActive = false;
      let winnerText = "";
      let res = "loss";

      if (p1.hp > 0 && p2.hp <= 0) {
        winnerText = `🏆 ${context.getPlayerName()} Wins!`;
        res = "win";
      } else if (p2.hp > 0 && p1.hp <= 0) {
        winnerText = mode === "p2" ? "🏆 Player 2 Wins!" : "🤖 AI Bot Wins!";
      } else {
        winnerText = "🤝 Mutual Destruction!";
        res = "draw";
      }

      context.recordResult(res);

      container.innerHTML = `
        <div style="text-align:center; padding: 36px 20px; background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); max-width: 420px; margin: 0 auto;">
          <div style="font-size: 52px; margin-bottom: 12px;">🎉</div>
          <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">${winnerText}</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">
            Final HP: ${p1.hp}% vs ${p2.hp}%
          </p>
          <button id="sh-rematch-btn" class="primary-button" style="width: 100%; padding: 12px;">Revenge Match 🔄</button>
        </div>
      `;

      container.querySelector("#sh-rematch-btn").onclick = renderSetupUI;
    }

    renderSetupUI();

    return {
      destroy() {},
      newRound() { renderSetupUI(); }
    };
  }
};
