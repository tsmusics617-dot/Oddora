/* =========================================================
   ODDORA GAMES — SHADOW HUNT (HTML5 CANVAS ARENA ENGINE)
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

    function renderSetupUI() {
      container.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto; text-align: center; background: #0a0e1a; padding: 28px 22px; border-radius: 24px; border: 2px solid rgba(167, 139, 250, 0.4); box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
          <div style="font-size: 56px; margin-bottom: 10px; filter: drop-shadow(0 0 15px #a855f7);"></div>
          <h2 style="font-size: 26px; font-weight: 900; margin-bottom: 6px; color: #c084fc;">SHADOW HUNT ARENA</h2>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">
            Tactical 2D Stealth Canvas Arena. Outsmart your rival in the fog of war!
          </p>

          <div style="background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.5); padding: 16px; border-radius: 16px; text-align: left; margin-bottom: 24px; font-size: 12px; color: #f8fafc;">
            <div style="font-weight: 900; color: #a3e635; margin-bottom: 8px;"> HOW TO PLAY:</div>
            <div style="margin-bottom: 6px;">1 Tap adjacent neon tiles to move silently (1 AP per step).</div>
            <div style="margin-bottom: 6px;">2 Plant C4 Traps  or Fire Cannons  (-45 HP).</div>
            <div>3 Reduce rival's HP to 0% to win!</div>
          </div>
          
          <div style="margin-bottom: 24px; text-align: left;">
            <label style="font-size: 11px; font-weight: 900; color: #94a3b8; text-transform: uppercase;">Battle Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px;">
              <button id="sh-mode-p2" class="category-button active" style="padding: 12px;"> Pass & Play</button>
              <button id="sh-mode-p1" class="category-button" style="padding: 12px;"> vs AI Bot</button>
            </div>
          </div>

          <button id="sh-start-btn" class="primary-button" style="width: 100%; padding: 16px; font-size: 16px;">
            Launch Battle Arena 
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
            gap: 8px;
            max-width: 380px;
            margin: 0 auto;
            background: #03050c;
            padding: 12px;
            border-radius: 20px;
            border: 2px solid rgba(167, 139, 250, 0.4);
            box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 30px rgba(139, 92, 246, 0.25);
          }
          .sh-cell {
            aspect-ratio: 1;
            background: #0a0e1a;
            border: 1px solid rgba(167, 139, 250, 0.15);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            cursor: pointer;
            position: relative;
            user-select: none;
            transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .sh-cell:active { transform: scale(0.88); }
          .sh-cell.self {
            background: rgba(168, 85, 247, 0.35);
            border-color: #a855f7;
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.6);
          }
          .sh-cell.valid-move {
            border: 2px dashed #10b981;
            background: rgba(16, 185, 129, 0.18);
            animation: moveGlow 1.2s infinite ease-in-out;
          }
          @keyframes moveGlow {
            0% { border-color: rgba(16, 185, 129, 0.4); }
            50% { border-color: rgba(16, 185, 129, 1); }
            100% { border-color: rgba(16, 185, 129, 0.4); }
          }
          .sh-cell.revealed-enemy {
            background: rgba(239, 68, 68, 0.4);
            border-color: #ef4444;
            box-shadow: 0 0 25px rgba(239, 68, 68, 0.7);
          }
          .sh-cell.trap {
            border-color: #f59e0b;
            background: rgba(245, 158, 11, 0.25);
          }
          .sh-controls {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 380px;
            margin: 16px auto 0;
          }
          .sh-btn {
            padding: 14px;
            font-size: 12px;
            font-weight: 900;
            border-radius: 14px;
            background: linear-gradient(180deg, #1e2647 0%, #101426 100%);
            border: 1px solid rgba(167, 139, 250, 0.4);
            color: #ffffff;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            transition: all 0.15s ease;
          }
          .sh-btn:hover { transform: translateY(-2px); }
          .sh-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; }
          .hp-bar-bg {
            width: 100%;
            height: 10px;
            background: rgba(255,255,255,0.1);
            border-radius: 5px;
            overflow: hidden;
            margin-top: 6px;
          }
          .hp-bar-fill {
            height: 100%;
            background: linear-gradient(90deg, #ef4444, #f87171);
            transition: width 0.35s ease;
            box-shadow: 0 0 10px #ef4444;
          }
        </style>

        <div style="max-width: 380px; margin: 0 auto 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #0a0e1a; padding: 14px; border-radius: 16px; border: 1px solid rgba(167, 139, 250, 0.2);">
          <div>
            <div style="font-size: 12px; font-weight: 900; color: #c084fc;">${pName}</div>
            <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${curr.hp}%;"></div></div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 800;">HP: ${curr.hp}%</div>
          </div>
          <div>
            <div style="font-size: 12px; font-weight: 900; color: #ef4444; text-align: right;">Enemy Target</div>
            <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${opp.hp}%;"></div></div>
            <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; text-align: right; font-weight: 800;">HP: ${opp.hp}%</div>
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
            icon = activePlayer === 1 ? "" : "";
          } else if (isEnemyRevealed) {
            cellClass += " revealed-enemy";
            icon = "";
          } else if (hasMyTrap) {
            cellClass += " trap";
            icon = "";
          } else if (isValidMove) {
            cellClass += " valid-move";
          }

          html += `<div class="${cellClass}" data-x="${c}" data-y="${r}">${icon}</div>`;
        }
      }

      html += `
        </div>

        <div class="sh-controls">
          <button id="sh-act-sonar" class="sh-btn" ${ap < 1 ? "disabled" : ""}> Radar Scan (1 AP)</button>
          <button id="sh-act-trap" class="sh-btn" ${ap < 1 || curr.traps < 1 ? "disabled" : ""}> Plant Trap (1 AP)</button>
          <button id="sh-act-shoot" class="sh-btn" style="grid-column: span 2; background: linear-gradient(180deg, #dc2626 0%, #991b1b 100%); border-color: #f87171; color: #ffffff;" ${ap < 2 ? "disabled" : ""}> FIRE CANNON (-45 HP)</button>
        </div>

        <div style="max-width: 380px; margin: 14px auto 0; font-size: 13px; color: #a3e635; text-align: center; font-weight: 900;">
           Action Points: ${ap}/3
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
          context.showToast(`Radar: Enemy detected in ${quadY}-${quadX}!`, "warning");
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
          context.showToast("C4 Trap Planted! (-35 HP)", "success");
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
            context.showToast("DIRECT HIT!  -45 HP", "success");
          } else {
            context.showToast("Shot Missed into the Void!", "error");
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
        context.showToast("BOOM! Stepped on C4 Trap!  -35 HP", "error");

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
        context.showToast("AI Bot Sniped You!  -45 HP", "error");
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

    function endMatch() {
      gameActive = false;
      let winnerText = "";
      let res = "loss";

      if (p1.hp > 0 && p2.hp <= 0) {
        winnerText = ` ${context.getPlayerName()} Wins!`;
        res = "win";
      } else if (p2.hp > 0 && p1.hp <= 0) {
        winnerText = mode === "p2" ? " Player 2 Wins!" : " AI Bot Wins!";
      } else {
        winnerText = " Mutual Draw!";
        res = "draw";
      }

      context.recordResult(res);

      container.innerHTML = `
        <div style="text-align:center; padding: 40px 20px; background: #0a0e1a; border-radius: 24px; border: 2px solid rgba(167, 139, 250, 0.4); max-width: 420px; margin: 0 auto; box-shadow: 0 20px 50px rgba(0,0,0,0.8);">
          <div style="font-size: 56px; margin-bottom: 12px; filter: drop-shadow(0 0 15px #f59e0b);"></div>
          <h2 style="font-size: 26px; font-weight: 900; margin-bottom: 8px;">${winnerText}</h2>
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 24px;">
            Battle concluded!
          </p>
          <button id="sh-rematch-btn" class="primary-button" style="width: 100%; padding: 14px;">Revenge Match </button>
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
