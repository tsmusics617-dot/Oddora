/* =========================================================
   ODDORA — TIC TAC TOE (UPGRADED V1)
   File: games/tic-tac-toe.js
   ========================================================= */

(function () {
  "use strict";

  window.OddoraGames = window.OddoraGames || {};

  window.OddoraGames["tic-tac-toe"] = {
    init(context) {
      const root = context.root;

      let board = Array(9).fill("");
      let currentPlayer = "X";
      let gameOver = false;
      let computerThinking = false;
      let gameMode = "pvp"; // "ai" or "pvp" (Pass & Play)
      let difficulty = "medium";
      let scores = { X: 0, O: 0, draws: 0 };
      let roundRecorded = false;
      let computerTimer = null;

      const playerName =
        typeof context.getPlayerName === "function"
          ? context.getPlayerName()
          : "Player One";

      // --- Web Audio API Sound Synthesizer (Zero external files!) ---
      const audioCtx = (function () {
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          return AudioContext ? new AudioContext() : null;
        } catch {
          return null;
        }
      })();

      function playSound(type) {
        if (!audioCtx) return;
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === "tap") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.exponentialRampToValueAtTime(800, now + 0.08);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (type === "win") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(523.25, now); // C5
          osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
          osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        } else if (type === "draw") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.setValueAtTime(200, now + 0.15);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
        }
      }

      function triggerVibrate(pattern) {
        if (navigator.vibrate) {
          try {
            navigator.vibrate(pattern);
          } catch {
            // Ignore if blocked by browser policy
          }
        }
      }

      root.innerHTML = `
        <section class="ttt-game">
          <div class="ttt-topbar">
            <div>
              <div class="ttt-eyebrow">ODDORA DUEL</div>
              <h2 class="ttt-title">Tic-Tac-Toe</h2>
              <p class="ttt-subtitle">
                Play head-to-head or challenge the AI.
              </p>
            </div>
            <div class="ttt-badge" id="mode-badge">2P PASS & PLAY</div>
          </div>

          <div class="ttt-controls-toolbar">
            <div class="ttt-setting-group">
              <label for="ttt-mode">Mode</label>
              <select id="ttt-mode" class="ttt-select">
                <option value="pvp" selected>Pass & Play (2 Players)</option>
                <option value="ai">Vs Computer (AI)</option>
              </select>
            </div>

            <div class="ttt-setting-group" id="ai-difficulty-wrapper" style="display: none;">
              <label for="ttt-difficulty">AI Level</label>
              <select id="ttt-difficulty" class="ttt-select">
                <option value="easy">Easy</option>
                <option value="medium" selected>Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div class="ttt-scoreboard">
            <div class="ttt-score-card active" id="ttt-playerX-card">
              <span class="ttt-score-symbol">X</span>
              <span class="ttt-score-name" id="label-playerX">Player 1</span>
              <strong id="ttt-x-score">0</strong>
            </div>

            <div class="ttt-score-card" id="ttt-draw-card">
              <span class="ttt-score-symbol">＝</span>
              <span class="ttt-score-name">Draws</span>
              <strong id="ttt-draw-score">0</strong>
            </div>

            <div class="ttt-score-card" id="ttt-playerO-card">
              <span class="ttt-score-symbol">O</span>
              <span class="ttt-score-name" id="label-playerO">Player 2</span>
              <strong id="ttt-o-score">0</strong>
            </div>
          </div>

          <div class="ttt-status" id="ttt-status" aria-live="polite">
            Player X's turn
          </div>

          <div class="ttt-board" id="ttt-board" role="group" aria-label="Tic-Tac-Toe board">
            ${Array.from({ length: 9 }, (_, index) => `
              <button
                class="ttt-cell"
                type="button"
                data-index="${index}"
                aria-label="Square ${index + 1}"
              ></button>
            `).join("")}
          </div>

          <div class="ttt-actions">
            <button class="ttt-primary" id="ttt-new-round" type="button">
              New Round ↻
            </button>
            <button class="ttt-secondary" id="ttt-reset-score" type="button">
              Reset Scores
            </button>
          </div>
        </section>

        <style>
          .ttt-game {
            width: 100%;
            max-width: 540px;
            margin: 0 auto;
            padding: 10px;
            color: var(--text, #f5f6ff);
          }
          .ttt-topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .ttt-eyebrow {
            color: var(--primary-light, #a78bfa);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .ttt-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .ttt-subtitle {
            color: var(--text-secondary, #a6adc5);
            font-size: 12px;
            margin-top: 2px;
          }
          .ttt-badge {
            padding: 5px 10px;
            border: 1px solid var(--border, rgba(255,255,255,0.08));
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            background: var(--surface, #151925);
            color: var(--primary-light, #a78bfa);
          }
          .ttt-controls-toolbar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: 14px;
            background: var(--surface);
          }
          .ttt-setting-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .ttt-setting-group label {
            font-size: 11px;
            font-weight: 750;
            color: var(--text-secondary);
          }
          .ttt-select {
            width: 100%;
            padding: 8px 10px;
            border-radius: 10px;
            border: 1px solid var(--border);
            background: var(--bg);
            color: var(--text);
            font-size: 12px;
            font-weight: 600;
          }
          .ttt-scoreboard {
            display: grid;
            grid-template-columns: 1fr 0.8fr 1fr;
            gap: 8px;
            margin-bottom: 15px;
          }
          .ttt-score-card {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 12px;
            background: var(--surface);
            transition: all 0.2s ease;
          }
          .ttt-score-card.active {
            border-color: var(--primary);
            background: rgba(139, 92, 246, 0.12);
          }
          .ttt-score-symbol {
            font-size: 15px;
            font-weight: 900;
            color: var(--primary-light);
          }
          .ttt-score-name {
            font-size: 10px;
            color: var(--text-secondary);
            max-width: 90px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .ttt-score-card strong {
            font-size: 20px;
            font-weight: 900;
            margin-top: 2px;
          }
          .ttt-status {
            min-height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 10px;
            margin-bottom: 12px;
            border-radius: 12px;
            background: var(--surface);
            font-size: 12px;
            font-weight: 750;
            text-align: center;
            border: 1px solid var(--border);
          }
          .ttt-board {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            max-width: 380px;
            margin: 0 auto 18px;
            aspect-ratio: 1;
          }
          .ttt-cell {
            display: grid;
            place-items: center;
            aspect-ratio: 1;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--surface);
            color: var(--text);
            font-size: clamp(36px, 10vw, 56px);
            font-weight: 900;
            cursor: pointer;
            transition: transform 0.1s, background 0.15s;
          }
          .ttt-cell:active:not(:disabled) {
            transform: scale(0.92);
          }
          .ttt-cell.mark-x { color: var(--primary-light); }
          .ttt-cell.mark-o { color: var(--secondary, #22d3ee); }
          .ttt-cell.winner {
            border-color: var(--success, #34d399);
            background: rgba(52, 211, 153, 0.15);
          }
          .ttt-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .ttt-primary, .ttt-secondary {
            min-height: 44px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 800;
            cursor: pointer;
            border: 1px solid var(--border);
          }
          .ttt-primary {
            background: linear-gradient(135deg, var(--primary), #7044db);
            color: white;
            border: none;
          }
          .ttt-secondary {
            background: var(--surface);
            color: var(--text);
          }
        </style>
      `;

      const cells = Array.from(root.querySelectorAll(".ttt-cell"));
      const statusElement = root.querySelector("#ttt-status");
      const modeSelect = root.querySelector("#ttt-mode");
      const difficultySelect = root.querySelector("#ttt-difficulty");
      const aiDifficultyWrapper = root.querySelector("#ai-difficulty-wrapper");
      const modeBadge = root.querySelector("#mode-badge");

      const labelPlayerX = root.querySelector("#label-playerX");
      const labelPlayerO = root.querySelector("#label-playerO");
      const scoreXElement = root.querySelector("#ttt-x-score");
      const scoreOElement = root.querySelector("#ttt-o-score");
      const scoreDrawElement = root.querySelector("#ttt-draw-score");

      const cardX = root.querySelector("#ttt-playerX-card");
      const cardO = root.querySelector("#ttt-playerO-card");
      const cardDraw = root.querySelector("#ttt-draw-card");

      const winningLines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
      ];

      function getWinningLine(pos) {
        for (const line of winningLines) {
          const [a, b, c] = line;
          if (pos[a] && pos[a] === pos[b] && pos[b] === pos[c]) {
            return line;
          }
        }
        return null;
      }

      function getEmptyCells(pos) {
        const empty = [];
        for (let i = 0; i < pos.length; i++) {
          if (!pos[i]) empty.push(i);
        }
        return empty;
      }

      function updateLabels() {
        labelPlayerX.textContent = playerName;
        if (gameMode === "ai") {
          labelPlayerO.textContent = "Computer";
          modeBadge.textContent = "VS COMPUTER";
          aiDifficultyWrapper.style.display = "flex";
        } else {
          labelPlayerO.textContent = "Player 2";
          modeBadge.textContent = "2P PASS & PLAY";
          aiDifficultyWrapper.style.display = "none";
        }
      }

      function updateScoreboard() {
        scoreXElement.textContent = scores.X;
        scoreOElement.textContent = scores.O;
        scoreDrawElement.textContent = scores.draws;
      }

      function updateActiveCard() {
        cardX.classList.toggle("active", !gameOver && !computerThinking && currentPlayer === "X");
        cardO.classList.toggle("active", !gameOver && (computerThinking || currentPlayer === "O"));
        cardDraw.classList.toggle("active", gameOver && !getWinningLine(board));
      }

      function renderBoard(winningLine = null) {
        cells.forEach((cell, index) => {
          const mark = board[index];
          cell.textContent = mark;
          cell.classList.toggle("mark-x", mark === "X");
          cell.classList.toggle("mark-o", mark === "O");
          cell.classList.toggle("winner", Boolean(winningLine && winningLine.includes(index)));
          cell.disabled = gameOver || computerThinking || Boolean(mark);
        });
        updateActiveCard();
      }

      function setStatus(msg) {
        statusElement.textContent = msg;
        if (typeof context.updateStatus === "function") {
          context.updateStatus(msg);
        }
      }

      function chooseComputerMove() {
        const empty = getEmptyCells(board);
        if (!empty.length) return null;

        if (difficulty === "easy" && Math.random() < 0.5) {
          return empty[Math.floor(Math.random() * empty.length)];
        }

        // Check winning or blocking
        for (const mark of ["O", "X"]) {
          for (const idx of empty) {
            board[idx] = mark;
            if (Boolean(getWinningLine(board))) {
              board[idx] = "";
              return idx;
            }
            board[idx] = "";
          }
        }

        if (board[4] === "" && difficulty !== "easy") return 4;
        return empty[Math.floor(Math.random() * empty.length)];
      }

      function finishRound(result, winningLine = null) {
        if (roundRecorded) return;
        roundRecorded = true;
        gameOver = true;
        computerThinking = false;

        if (computerTimer) clearTimeout(computerTimer);

        if (result === "winX") {
          scores.X++;
          setStatus(`🎉 ${playerName} (X) Wins!`);
          playSound("win");
          triggerVibrate([50, 50, 100]);
        } else if (result === "winO") {
          scores.O++;
          const winnerName = gameMode === "ai" ? "Computer" : "Player 2 (O)";
          setStatus(`🏆 ${winnerName} Wins!`);
          playSound(gameMode === "ai" ? "draw" : "win");
          triggerVibrate([50, 50, 100]);
        } else {
          scores.draws++;
          setStatus("🤝 It's a Draw!");
          playSound("draw");
          triggerVibrate(50);
        }

        updateScoreboard();
        renderBoard(winningLine);

        // Record XP if player X wins in AI mode, or general participation
        if (typeof context.recordResult === "function") {
          const outcome = result === "winX" ? "win" : (result === "draw" ? "draw" : (gameMode === "ai" ? "loss" : "win"));
          context.recordResult(outcome, { score: scores.X * 10 });
        }
      }

      function checkRoundEnd() {
        const line = getWinningLine(board);
        if (line) {
          const winner = board[line[0]];
          finishRound(winner === "X" ? "winX" : "winO", line);
          return true;
        }
        if (getEmptyCells(board).length === 0) {
          finishRound("draw");
          return true;
        }
        return false;
      }

      function handleCellClick(e) {
        const idx = Number(e.currentTarget.dataset.index);
        if (gameOver || computerThinking || board[idx]) return;

        playSound("tap");
        triggerVibrate(30);

        board[idx] = currentPlayer;

        if (checkRoundEnd()) return;

        if (gameMode === "ai") {
          currentPlayer = "O";
          computerThinking = true;
          renderBoard();
          setStatus("Computer is thinking...");

          computerTimer = setTimeout(() => {
            if (gameOver) return;
            const move = chooseComputerMove();
            if (move !== null) board[move] = "O";
            computerThinking = false;
            currentPlayer = "X";
            playSound("tap");

            if (!checkRoundEnd()) {
              renderBoard();
              setStatus(`${playerName}'s turn (X)`);
            }
          }, 350);
        } else {
          // Pass & Play Mode
          currentPlayer = currentPlayer === "X" ? "O" : "X";
          renderBoard();
          setStatus(`${currentPlayer === "X" ? playerName : "Player 2"}'s turn (${currentPlayer})`);
        }
      }

      function newRound() {
        if (computerTimer) clearTimeout(computerTimer);
        board = Array(9).fill("");
        currentPlayer = "X";
        gameOver = false;
        computerThinking = false;
        roundRecorded = false;
        renderBoard();
        setStatus(`${playerName}'s turn (X)`);
      }

      function resetScores() {
        scores = { X: 0, O: 0, draws: 0 };
        updateScoreboard();
        newRound();
      }

      cells.forEach(c => c.addEventListener("click", handleCellClick));

      modeSelect.addEventListener("change", (e) => {
        gameMode = e.target.value;
        updateLabels();
        resetScores();
      });

      difficultySelect.addEventListener("change", (e) => {
        difficulty = e.target.value;
      });

      root.querySelector("#ttt-new-round").addEventListener("click", newRound);
      root.querySelector("#ttt-reset-score").addEventListener("click", resetScores);

      updateLabels();
      updateScoreboard();
      renderBoard();
      setStatus(`${playerName}'s turn (X)`);

      return {
        newRound,
        destroy() {
          if (computerTimer) clearTimeout(computerTimer);
          cells.forEach(c => c.removeEventListener("click", handleCellClick));
        }
      };
    }
  };
})();
