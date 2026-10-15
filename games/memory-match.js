/* =========================================================
   ODDORA â€” MEMORY MATCH
   File: games/memory-match.js
   ========================================================= */

(function () {
  "use strict";

  window.OddoraGames = window.OddoraGames || {};

  window.OddoraGames["memory-match"] = {
    init(context) {
      const root = context.root;

      const SYMBOLS = ["ðŸŽ®", "ðŸ‘¾", "âš¡", "ðŸ”¥", "ðŸ’Ž", "ðŸš€"];
      let cards = [];
      let flippedCards = [];
      let matchedPairs = 0;
      let moves = 0;
      let timer = 0;
      let timerInterval = null;
      let gameActive = false;

      // Web Audio Synthesizer
      const audioCtx = (function () {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          return AC ? new AC() : null;
        } catch { return null; }
      })();

      function playSound(type) {
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        const now = audioCtx.currentTime;

        if (type === "flip") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.08);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "match") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.1);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          osc.start(now);
          osc.stop(now + 0.25);
        } else if (type === "win") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.setValueAtTime(600, now + 0.1);
          osc.frequency.setValueAtTime(800, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        }
      }

      function vibrate(pattern) {
        if (navigator.vibrate) {
          try { navigator.vibrate(pattern); } catch {}
        }
      }

      root.innerHTML = `
        <section class="memory-game">
          <div class="memory-topbar">
            <div>
              <div class="memory-eyebrow">PUZZLE CHALLENGE</div>
              <h2 class="memory-title">Memory Match</h2>
              <p class="memory-subtitle">Find all matching pairs in as few moves as possible.</p>
            </div>
            <div class="memory-badge">ðŸ§  FOCUS</div>
          </div>

          <div class="memory-scoreboard">
            <div class="memory-score-card">
              <span class="memory-label">MOVES</span>
              <strong id="memory-moves">0</strong>
            </div>
            <div class="memory-score-card">
              <span class="memory-label">TIME</span>
              <strong id="memory-time">0s</strong>
            </div>
            <div class="memory-score-card">
              <span class="memory-label">PAIRS</span>
              <strong id="memory-pairs">0 / 6</strong>
            </div>
          </div>

          <div class="memory-grid" id="memory-grid"></div>

          <div class="memory-actions">
            <button class="memory-primary" id="memory-restart" type="button">
              Restart Game â†»
            </button>
          </div>
        </section>

        <style>
          .memory-game {
            width: 100%;
            max-width: 480px;
            margin: 0 auto;
            color: var(--text, #f5f6ff);
          }
          .memory-topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .memory-eyebrow {
            color: var(--primary-light, #a78bfa);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .memory-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .memory-subtitle {
            color: var(--text-secondary, #94a3b8);
            font-size: 12px;
            margin-top: 2px;
          }
          .memory-badge {
            padding: 5px 10px;
            border: 1px solid var(--border, rgba(255,255,255,0.08));
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            background: var(--surface, #141824);
            color: var(--primary-light, #a78bfa);
          }
          .memory-scoreboard {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .memory-score-card {
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm, 12px);
            background: var(--surface, #141824);
            text-align: center;
          }
          .memory-label {
            font-size: 9px;
            color: var(--text-muted, #64748b);
            font-weight: 800;
            display: block;
            margin-bottom: 2px;
          }
          .memory-score-card strong {
            font-size: 18px;
            font-weight: 900;
          }
          .memory-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 20px;
            aspect-ratio: 4/3;
          }
          .memory-card-btn {
            width: 100%;
            height: 100%;
            border-radius: var(--radius-sm, 12px);
            border: 1px solid var(--border);
            background: var(--surface, #141824);
            font-size: 28px;
            display: grid;
            place-items: center;
            cursor: pointer;
            transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
            user-select: none;
          }
          .memory-card-btn:active {
            transform: scale(0.95);
          }
          .memory-card-btn.flipped {
            background: var(--surface-hover, #1c2235);
            border-color: var(--primary-light, #a78bfa);
          }
          .memory-card-btn.matched {
            background: rgba(16, 185, 129, 0.15);
            border-color: #10b981;
            cursor: default;
          }
          .memory-actions {
            display: flex;
            justify-content: center;
          }
          .memory-primary {
            width: 100%;
            min-height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, var(--primary), #6d28d9);
            color: white;
            font-size: 13px;
            font-weight: 800;
            border: none;
            cursor: pointer;
          }
        </style>
      `;

      const gridEl = root.querySelector("#memory-grid");
      const movesEl = root.querySelector("#memory-moves");
      const timeEl = root.querySelector("#memory-time");
      const pairsEl = root.querySelector("#memory-pairs");

      function startTimer() {
        if (timerInterval) clearInterval(timerInterval);
        timer = 0;
        timeEl.textContent = "0s";
        timerInterval = setInterval(() => {
          timer++;
          timeEl.textContent = `${timer}s`;
        }, 1000);
      }

      function stopTimer() {
        if (timerInterval) clearInterval(timerInterval);
      }

      function initBoard() {
        stopTimer();
        gameActive = false;
        matchedPairs = 0;
        moves = 0;
        flippedCards = [];

        movesEl.textContent = "0";
        timeEl.textContent = "0s";
        pairsEl.textContent = "0 / 6";

        const deck = [...SYMBOLS, ...SYMBOLS].sort(() => Math.random() - 0.5);
        cards = deck.map((symbol, index) => ({
          id: index,
          symbol,
          isFlipped: false,
          isMatched: false
        }));

        renderGrid();
      }

      function renderGrid() {
        gridEl.innerHTML = "";
        cards.forEach(card => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = `memory-card-btn ${card.isFlipped ? "flipped" : ""} ${card.isMatched ? "matched" : ""}`;
          btn.textContent = card.isFlipped || card.isMatched ? card.symbol : "â“";

          btn.addEventListener("click", () => handleCardClick(card));
          gridEl.appendChild(btn);
        });
      }

      function handleCardClick(card) {
        if (card.isFlipped || card.isMatched || flippedCards.length >= 2) return;

        if (!gameActive) {
          gameActive = true;
          startTimer();
        }

        playSound("flip");
        vibrate(20);

        card.isFlipped = true;
        flippedCards.push(card);
        renderGrid();

        if (flippedCards.length === 2) {
          moves++;
          movesEl.textContent = moves;

          const [card1, card2] = flippedCards;

          if (card1.symbol === card2.symbol) {
            // Match found!
            card1.isMatched = true;
            card2.isMatched = true;
            flippedCards = [];
            matchedPairs++;
            pairsEl.textContent = `${matchedPairs} / 6`;

            playSound("match");
            vibrate([40, 40]);

            renderGrid();

            if (matchedPairs === SYMBOLS.length) {
              // Game Won!
              stopTimer();
              playSound("win");
              vibrate([100, 50, 100]);

              if (typeof context.recordResult === "function") {
                context.recordResult("win", { score: Math.max(0, 1000 - (moves * 20 + timer * 5)) });
              }
            }
          } else {
            // No match - unflip after delay
            setTimeout(() => {
              card1.isFlipped = false;
              card2.isFlipped = false;
              flippedCards = [];
              renderGrid();
            }, 700);
          }
        }
      }

      root.querySelector("#memory-restart").addEventListener("click", initBoard);

      initBoard();

      return {
        newRound: initBoard,
        destroy() {
          stopTimer();
        }
      };
    }
  };
})();
