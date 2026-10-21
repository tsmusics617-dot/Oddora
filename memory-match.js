/* =========================================================
   ODDORA GAMES — MEMORY MATCH (DUAL PLAYER & HARD MODE)
   File: games/memory-match.js
   ========================================================= */

"use strict";

window.OddoraGames = window.OddoraGames || {};

window.OddoraGames["memory-match"] = {
  id: "memory-match",
  title: "Memory Match Pro",

  init(context) {
    let container = context.root;
    let mode = "p2"; // "p1" (vs AI) or "p2" (Pass & Play)
    let difficulty = "medium"; // easy (4x3), medium (4x4), hard (5x4), extreme (6x4)
    let cards = [];
    let flippedCards = [];
    let matchedPairs = 0;
    let totalPairs = 8;
    let activePlayer = 1; // Player 1 or Player 2
    let scores = { p1: 0, p2: 0 };
    let streak = 0;
    let isLocked = false;
    let turnTimer = null;
    let timeLeft = 15;

    const THEMES = {
      easy: ["", "", "", "", "", ""],
      medium: ["", "", "", "", "", "", "", ""],
      hard: ["", "", "", "", "", "", "", "", "", ""],
      extreme: ["", "", "", "", "", "", "", "", "", "", "", ""]
    };

    const GRID_SIZES = {
      easy: { rows: 3, cols: 4, pairs: 6 },
      medium: { rows: 4, cols: 4, pairs: 8 },
      hard: { rows: 4, cols: 5, pairs: 10 },
      extreme: { rows: 4, cols: 6, pairs: 12 }
    };

    function renderSetupUI() {
      container.innerHTML = `
        <div style="max-width: 480px; margin: 0 auto; text-align: center; background: var(--surface); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
          <h3 style="font-size: 20px; font-weight: 900; margin-bottom: 16px;"> Select Game Rules</h3>
          
          <div style="margin-bottom: 20px; text-align: left;">
            <label style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Game Mode</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
              <button id="mm-mode-p2" class="category-button active" style="padding: 10px;"> Pass & Play</button>
              <button id="mm-mode-p1" class="category-button" style="padding: 10px;"> vs AI Bot</button>
            </div>
          </div>

          <div style="margin-bottom: 24px; text-align: left;">
            <label style="font-size: 11px; font-weight: 800; color: var(--text-secondary); text-transform: uppercase;">Grid Difficulty</label>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px;">
              <button class="diff-btn category-button" data-diff="easy">Easy (4x3)</button>
              <button class="diff-btn category-button active" data-diff="medium">Medium (4x4)</button>
              <button class="diff-btn category-button" data-diff="hard">Hard (5x4)</button>
              <button class="diff-btn category-button" data-diff="extreme">Extreme (6x4)</button>
            </div>
          </div>

          <button id="mm-start-btn" class="primary-button" style="width: 100%; padding: 14px;">Start Match </button>
        </div>
      `;

      // Setup Listeners
      container.querySelector("#mm-mode-p1").onclick = () => {
        mode = "p1";
        container.querySelector("#mm-mode-p1").classList.add("active");
        container.querySelector("#mm-mode-p2").classList.remove("active");
      };

      container.querySelector("#mm-mode-p2").onclick = () => {
        mode = "p2";
        container.querySelector("#mm-mode-p2").classList.add("active");
        container.querySelector("#mm-mode-p1").classList.remove("active");
      };

      container.querySelectorAll(".diff-btn").forEach(btn => {
        btn.onclick = () => {
          container.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          difficulty = btn.dataset.diff;
        };
      });

      container.querySelector("#mm-start-btn").onclick = startNewGame;
    }

    function startNewGame() {
      const config = GRID_SIZES[difficulty];
      totalPairs = config.pairs;
      matchedPairs = 0;
      scores = { p1: 0, p2: 0 };
      activePlayer = 1;
      streak = 0;
      isLocked = false;

      // Build & Shuffle Deck
      const icons = THEMES[difficulty];
      const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);

      container.innerHTML = `
        <style>
          .mm-grid {
            display: grid;
            grid-template-columns: repeat(${config.cols}, 1fr);
            gap: 10px;
            max-width: ${config.cols * 75}px;
            margin: 0 auto;
          }
          .mm-card {
            aspect-ratio: 1;
            background: var(--surface-hover);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            display: grid;
            place-items: center;
            font-size: clamp(20px, 5vw, 32px);
            cursor: pointer;
            user-select: none;
            transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
          }
          .mm-card:active { transform: scale(0.92); }
          .mm-card.flipped {
            background: var(--surface-light);
            border-color: var(--primary-light);
            transform: rotateY(180deg);
          }
          .mm-card.matched {
            background: rgba(16, 185, 129, 0.15);
            border-color: var(--success);
            cursor: default;
            opacity: 0.7;
          }
          .scoreboard {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: ${config.cols * 75}px;
            margin: 0 auto 16px;
            padding: 12px 16px;
            background: var(--surface);
            border-radius: var(--radius-sm);
            border: 1px solid var(--border);
          }
          .player-box {
            padding: 6px 12px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 800;
          }
          .player-box.active {
            background: rgba(139, 92, 246, 0.25);
            border: 1px solid var(--primary-light);
            color: #c084fc;
          }
        </style>

        <div class="scoreboard">
          <div id="p1-box" class="player-box active">
            ${context.getPlayerName()}: <span id="p1-score">0</span>
          </div>
          <div style="font-size: 11px; font-weight: 800; color: var(--warning);" id="turn-timer"> 15s</div>
          <div id="p2-box" class="player-box">
            ${mode === "p2" ? "Player 2" : "AI Bot"}: <span id="p2-score">0</span>
          </div>
        </div>

        <div class="mm-grid" id="mm-board"></div>
      `;

      const board = container.querySelector("#mm-board");
      cards = deck.map((icon, idx) => {
        const cardEl = document.createElement("div");
        cardEl.className = "mm-card";
        cardEl.dataset.index = idx;
        cardEl.innerHTML = `<span class="card-inner" style="display:none;">${icon}</span>`;
        cardEl.onclick = () => handleCardClick(idx, icon, cardEl);
        board.appendChild(cardEl);
        return { icon, element: cardEl, matched: false };
      });

      resetTurnTimer();
      context.updateStatus(`Player 1's Turn`);
    }

    function resetTurnTimer() {
      clearInterval(turnTimer);
      timeLeft = 15;
      const timerEl = container.querySelector("#turn-timer");
      if (timerEl) timerEl.textContent = ` ${timeLeft}s`;

      turnTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) timerEl.textContent = ` ${timeLeft}s`;
        if (timeLeft <= 0) {
          clearInterval(turnTimer);
          context.showToast("Time's up! Turn switched.", "warning");
          switchTurn();
        }
      }, 1000);
    }

    function handleCardClick(idx, icon, cardEl) {
      if (isLocked || cards[idx].matched || flippedCards.some(c => c.idx === idx)) return;

      // Flip card visually
      cardEl.classList.add("flipped");
      cardEl.querySelector(".card-inner").style.display = "block";
      flippedCards.push({ idx, icon, cardEl });

      if (flippedCards.length === 2) {
        checkMatch();
      }
    }

    function checkMatch() {
      isLocked = true;
      clearInterval(turnTimer);
      const [c1, c2] = flippedCards;

      if (c1.icon === c2.icon) {
        // Matched!
        cards[c1.idx].matched = true;
        cards[c2.idx].matched = true;
        c1.cardEl.classList.add("matched");
        c2.cardEl.classList.add("matched");

        scores[activePlayer === 1 ? "p1" : "p2"] += 1;
        matchedPairs++;
        streak++;

        updateScoreboard();
        flippedCards = [];
        isLocked = false;

        if (matchedPairs === totalPairs) {
          endGame();
        } else {
          context.showToast(`Match! Streak x${streak} `, "success");
          resetTurnTimer();
          if (mode === "p1" && activePlayer === 2) {
            setTimeout(triggerAITurn, 800);
          }
        }
      } else {
        // Not a match
        streak = 0;
        setTimeout(() => {
          c1.cardEl.classList.remove("flipped");
          c2.cardEl.classList.remove("flipped");
          c1.cardEl.querySelector(".card-inner").style.display = "none";
          c2.cardEl.querySelector(".card-inner").style.display = "none";
          flippedCards = [];
          switchTurn();
        }, 900);
      }
    }

    function switchTurn() {
      activePlayer = activePlayer === 1 ? 2 : 1;
      isLocked = false;
      updateScoreboard();
      resetTurnTimer();

      const pName = activePlayer === 1 ? context.getPlayerName() : (mode === "p2" ? "Player 2" : "AI Bot");
      context.updateStatus(`${pName}'s Turn`);

      if (mode === "p1" && activePlayer === 2) {
        setTimeout(triggerAITurn, 1000);
      }
    }

    function triggerAITurn() {
      if (matchedPairs === totalPairs || activePlayer !== 2) return;

      const unflipped = cards
        .map((c, i) => ({ ...c, i }))
        .filter(c => !c.matched && !flippedCards.some(fc => fc.idx === c.i));

      if (unflipped.length < 2) return;

      // Pick two random cards
      const rand1 = unflipped[Math.floor(Math.random() * unflipped.length)];
      handleCardClick(rand1.i, rand1.icon, rand1.element);

      setTimeout(() => {
        const remaining = unflipped.filter(c => c.i !== rand1.i);
        const rand2 = remaining[Math.floor(Math.random() * remaining.length)];
        handleCardClick(rand2.i, rand2.icon, rand2.element);
      }, 700);
    }

    function updateScoreboard() {
      const p1Score = container.querySelector("#p1-score");
      const p2Score = container.querySelector("#p2-score");
      const p1Box = container.querySelector("#p1-box");
      const p2Box = container.querySelector("#p2-box");

      if (p1Score) p1Score.textContent = scores.p1;
      if (p2Score) p2Score.textContent = scores.p2;

      if (p1Box && p2Box) {
        p1Box.classList.toggle("active", activePlayer === 1);
        p2Box.classList.toggle("active", activePlayer === 2);
      }
    }

    function endGame() {
      clearInterval(turnTimer);
      let winnerText = "";
      let res = "loss";

      if (scores.p1 > scores.p2) {
        winnerText = ` ${context.getPlayerName()} Wins!`;
        res = "win";
      } else if (scores.p2 > scores.p1) {
        winnerText = mode === "p2" ? " Player 2 Wins!" : " AI Bot Wins!";
      } else {
        winnerText = " It's a Tie!";
        res = "draw";
      }

      context.recordResult(res);

      container.innerHTML = `
        <div style="text-align:center; padding: 36px 20px; background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); max-width: 420px; margin: 0 auto;">
          <div style="font-size: 52px; margin-bottom: 12px;"></div>
          <h2 style="font-size: 24px; font-weight: 900; margin-bottom: 8px;">${winnerText}</h2>
          <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 20px;">
            Final Score: ${scores.p1} vs ${scores.p2}
          </p>
          <button id="mm-rematch-btn" class="primary-button" style="width: 100%; padding: 12px;">Play Again </button>
        </div>
      `;

      container.querySelector("#mm-rematch-btn").onclick = renderSetupUI;
    }

    renderSetupUI();

    return {
      destroy() {
        clearInterval(turnTimer);
      },
      newRound() {
        renderSetupUI();
      }
    };
  }
};