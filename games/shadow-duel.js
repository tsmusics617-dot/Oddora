/* =========================================================
   ODDORA GAMES — PIXEL SHOWDOWN: SHADOW HUNT (EASY WIN RULES)
   File: games/shadow-duel.js
   ========================================================= */

"use strict";

window.OddoraGames = window.OddoraGames || {};

window.OddoraGames["shadow-duel"] = {
  id: "shadow-duel",
  title: "Shadow Hunt",

  init(context) {
    const container = context.root;
    let mode = "p2";
    const GRID_SIZE = 6;

    let activePlayer = 1;
    let ap = 3;
    let gameActive = false;

    let p1 = { x: 0, y: 0, hp: 100, traps: 2, revealedTurns: 0 };
    let p2 = { x: 5, y: 5, hp: 100, traps: 2, revealedTurns: 0 };
    let traps = [];
    let logs = [];

    function renderSetupUI() {
      container.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto; text-align: center; background: var(--surface); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
          <h2 style="font-size: 22px; font-weight: 900; margin-bottom: 6px; color: #a855f7;">🥷 Shadow Hunt</h2>
          
          <!-- HOW TO WIN CARD -->
          <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid #a855f7; padding: 14px; border-radius: 12px; text-align: left; margin-bottom: 20px; font-size: 12px;">
            <div style="font-weight: 900; color: #a855f7; font-size: 14px; margin-bottom: 6px;">🎯 HOW TO WIN:</div>
            <div style="margin-bottom: 8px;">Find and attack your opponent until their <b>HP reaches 0%</b>!</div>
            
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 8px 0;">
            
            <div style="font-weight: 800; color: #a3e635; margin-bottom: 4px;">⚡ How to Attack:</div>
            <div style="margin-bottom: 4px;">🎯 <b>Fire Cannon:</b> Deals <b>45 Damage</b> to nearby tile.</div>
            <div>💣 <b>Plant Trap:</b> Deals <b>35 Damage</b> if stepped on.</div>
          </div>
          
          <div style="margin-bottom: 20px; text-align: left;">
            <label style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Game Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
              <button id="sh-mode-p2" class="category-button active" style="padding: 10px;">👥 Pass & Play</button>
              <button id="sh-mode-p1" class="category-button" style="padding: 10px;">🤖 vs AI Bot</button>
            </div>
          </div>

          <button id="sh-start-btn" class="primary-button" style="width: 100%; padding: 14px; font-size: 16px;">
            Start Battle 🔥
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
      logs = ["Battle Started! Reduce enemy HP to 0% to win."];

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
          .sh-cell.valid-move {
            border: 1px dashed #10b981;
            background: rgba(16, 185, 129, 0.1);
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
            margin: 12px auto 0;
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
          .hp-bar-bg {
            width: 100%;
            height: 6px;
            background: rgba(255,255,255,0.1);
            border-radius: 3px;
            overflow: hidden;
            margin-top: 4px;
          }
          .hp-bar-fill {
            height: 100%;
            background: #ef4444;
            transition: width 0.3s ease;
          }
        </style>

        <!-- VISUAL HEALTH BARS -->
        <div style="max-width: 360px; margin: 0 auto 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: var(--surface); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border);">
          <div>
            <div style="font-size: 11px; font-weight: 900; color: #a855f7;">${pName}</div>
            <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${curr.hp}%;"></div></div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">HP: ${curr.hp}%</div>
          </div>
          <div>
            <div style="font-size: 11px; font-weight: 900; color: #ef4444; text-align: right;">Enemy Target</div>
            <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${opp.hp}%;"></div></div>
            <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px; text-align: right;">HP: ${opp.hp}%</div>
          </div>
        </div>

        <div class="sh-board">
      `;

      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          let isSelf = curr.x === c && curr.y === r;
          let isEnemyRevealed = opp.x === c && opp.y === r && opp.revealedTurns > 0;
          let hasMyTrap = traps.some(t => t.x === c && t.y === r && t.owner === activePlayer);
          let isValidMove = ap > 0 && Math.abs(curr.x - c) + Math.abs(curr.y - r) === 1;

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
          } else if (isValidMove) {
            cellClass += " valid-move";
          }

          html += `<div class="${cellClass}" data-x="${c}" data-y="${r}">${icon}</div>`;
        }
      }

      html += `
        </div>

        <div class="sh-controls">
          <button id="sh-act-sonar" class="sh-btn" ${ap < 1 ? "disabled" : ""}>📡 Scan Radar (1 AP)</button>
          <button id="sh-act-trap" class="sh-btn" ${ap < 1 || curr.traps < 1 ? "disabled" : ""}>💣 Plant Trap (1 AP)</button>
          <button id="sh-act-shoot" class="sh-btn" style="grid-column: span 2; background: rgba(239, 68, 68, 0.2); border-color: #ef4444; color: #fca5a5;" ${ap < 2 ? "disabled" : ""}>🎯 Fire Cannon (-45 HP)</button>
        </div>

        <div style="max-width: 360px; margin: 10px auto 0; font-size: 11px; color: #a3e635; text-align: center; font-weight: 800;">
          ⚡ Turn Points Left: ${ap}/3
        </div>
      `;

      container.innerHTML = html;
      bindEvents();
    }

    function bindEvents() {
      const curr = activePlayer === 1 ? p1 : p2;

      container.querySelectorAll(".sh-cell").forEach(cell => {
        cell.onclick = () => {
          if (ap < 1) return;
          const tx = parseInt(cell.dataset.x);
          const ty = parseInt(cell.dataset.y);

          const dist = Math.abs(curr.x - tx) + Math.abs(curr.y - ty);
          if (dist === 1) {
            curr.x = tx;
            curr.y = ty;
            ap--;
            addLog(`Moved silently.`);
            checkTraps();
            checkTurnEnd();
          }
        };
      });

      const sonarBtn = container.querySelector("#sh-act-sonar");
      if (sonarBtn) {
        sonarBtn.onclick = () => {
          if (ap < 1) return;
          ap--;
          const opp = activePlayer === 1 ? p2 : p1;
          const quadX = opp.x < 3 ? "West" : "East";
          const quadY = opp.y < 3 ? "North" : "South";
          context.showToast(`Enemy detected in ${quadY}-${quadX}!`, "warning");
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
          context.showToast("C4 Planted! Deals 35 Damage.", "success");
          checkTurnEnd();
        };
      }

      const shootBtn = container.querySelector("#sh-act-shoot");
      if (shootBtn) {
        shootBtn.onclick = () => {
          if (ap < 2) return;
          ap -= 2;
          curr.revealedTurns = 2;

          const opp = activePlayer === 1 ? p2 : p1;
          const isHit = Math.abs(curr.x - opp.x) <= 1 && Math.abs(curr.y - opp.y) <= 1;

          if (isHit) {
            opp.hp -= 45;
            context.showToast("BOOM! Hit enemy for 45 damage! 🎯", "success");
          } else {
            context.showToast("Shot Missed!", "error");
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
        context.showToast("BOOM! Stepped on C4 Trap! -35 HP 💣", "error");

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

      if (Math.abs(p2.x - p1.x) <= 1 && Math.abs(p2.y - p1.y) <= 1 && ap >= 2) {
        p2.revealedTurns = 2;
        p1.hp -= 45;
        context.showToast("AI Bot Sniped You! -45 HP 🎯", "error");
      } else {
        const dx = Math.sign(p1.x - p2.x);
        const dy = Math.sign(p1.y - p2.y);
        if (dx !== 0 && Math.random() > 0.5) p2.x += dx;
        else if (dy !== 0) p2.y += dy;
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
        winnerText = "🤝 Draw!";
        res = "draw";
      }

      context.recordResult(res);

      container.innerHTML = `
        <div style="text-align:center; padding: 36px 20px; background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); max-width: 420px; margin: 0 auto;">
          <div style="font-size: 52px; margin-bottom: 12px;">🎉</div>
          <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">${winnerText}</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">
            Target destroyed!
          </p>
          <button id="sh-rematch-btn" class="primary-button" style="width: 100%; padding: 12px;">Play Again 🔄</button>
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
