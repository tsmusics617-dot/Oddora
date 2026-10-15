/* =========================================================
   ODDORA — REFLEX DUEL
   File: games/reflex-duel.js
   ========================================================= */

(function () {
  "use strict";

  window.OddoraGames = window.OddoraGames || {};

  window.OddoraGames["reflex-duel"] = {
    init(context) {
      const root = context.root;

      let gameState = "idle"; // "idle", "waiting", "ready", "result", "false-start"
      let startTime = 0;
      let timeoutId = null;
      let bestScore = context.stats.bestScore || 0;

      // Web Audio API Synthesizer
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

        if (type === "start") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(300, now);
          osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        } else if (type === "go") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(800, now);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === "fail") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.setValueAtTime(100, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
        }
      }

      function vibrate(pattern) {
        if (navigator.vibrate) {
          try { navigator.vibrate(pattern); } catch {}
        }
      }

      root.innerHTML = `
        <section class="reflex-game">
          <div class="reflex-topbar">
            <div>
              <div class="reflex-eyebrow">SPEED CHALLENGE</div>
              <h2 class="reflex-title">Reflex Duel</h2>
              <p class="reflex-subtitle">Tap as fast as you can when the screen turns green!</p>
            </div>
            <div class="reflex-badge">⚡ REACT</div>
          </div>

          <div class="reflex-scoreboard">
            <div class="reflex-score-card">
              <span class="reflex-score-label">BEST TIME</span>
              <strong id="reflex-best">${bestScore ? bestScore + ' ms' : '—'}</strong>
            </div>
            <div class="reflex-score-card">
              <span class="reflex-score-label">LAST TIME</span>
              <strong id="reflex-last">—</strong>
            </div>
          </div>

          <button class="reflex-arena state-idle" id="reflex-arena" type="button">
            <div class="reflex-icon" id="reflex-icon">⚡</div>
            <h3 id="reflex-prompt">Tap Here to Start</h3>
            <p id="reflex-subtext">Wait for green, then tap instantly.</p>
          </button>
        </section>

        <style>
          .reflex-game {
            width: 100%;
            max-width: 500px;
            margin: 0 auto;
            color: var(--text, #f5f6ff);
          }
          .reflex-topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 16px;
          }
          .reflex-eyebrow {
            color: var(--warning, #f59e0b);
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .reflex-title {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: -0.5px;
          }
          .reflex-subtitle {
            color: var(--text-secondary, #94a3b8);
            font-size: 12px;
            margin-top: 2px;
          }
          .reflex-badge {
            padding: 5px 10px;
            border: 1px solid var(--border, rgba(255,255,255,0.08));
            border-radius: 20px;
            font-size: 10px;
            font-weight: 800;
            background: var(--surface, #141824);
            color: var(--warning, #f59e0b);
          }
          .reflex-scoreboard {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }
          .reflex-score-card {
            padding: 12px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm, 12px);
            background: var(--surface, #141824);
            text-align: center;
          }
          .reflex-score-label {
            font-size: 10px;
            color: var(--text-muted, #64748b);
            font-weight: 700;
            display: block;
            margin-bottom: 2px;
          }
          .reflex-score-card strong {
            font-size: 18px;
            font-weight: 900;
          }
          .reflex-arena {
            width: 100%;
            aspect-ratio: 1;
            border-radius: var(--radius-lg, 24px);
            border: 2px solid var(--border);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: background 0.15s ease, border-color 0.15s ease, transform 0.08s ease;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          }
          .reflex-arena:active {
            transform: scale(0.98);
          }
          .reflex-arena.state-idle {
            background: var(--surface, #141824);
            border-color: var(--border);
          }
          .reflex-arena.state-waiting {
            background: linear-gradient(135deg, #7f1d1d, #450a0a);
            border-color: #ef4444;
          }
          .reflex-arena.state-ready {
            background: linear-gradient(135deg, #065f46, #064e3b);
            border-color: #10b981;
          }
          .reflex-arena.state-false {
            background: linear-gradient(135deg, #331115, #140708);
            border-color: #f43f5e;
          }
          .reflex-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }
          .reflex-arena h3 {
            font-size: 22px;
            font-weight: 900;
            margin-bottom: 6px;
          }
          .reflex-arena p {
            font-size: 13px;
            color: var(--text-secondary, #94a3b8);
          }
        </style>
      `;

      const arena = root.querySelector("#reflex-arena");
      const iconEl = root.querySelector("#reflex-icon");
      const promptEl = root.querySelector("#reflex-prompt");
      const subEl = root.querySelector("#reflex-subtext");
      const bestEl = root.querySelector("#reflex-best");
      const lastEl = root.querySelector("#reflex-last");

      function updateState(newState) {
        gameState = newState;
        arena.className = `reflex-arena state-${newState}`;
      }

      function handleInteraction() {
        if (gameState === "idle" || gameState === "false-start" || gameState === "result") {
          // Start a new test
          playSound("start");
          updateState("waiting");
          iconEl.textContent = "⏳";
          promptEl.textContent = "Wait for Green...";
          subEl.textContent = "Don't tap too early!";

          const randomDelay = 1500 + Math.random() * 3000;
          timeoutId = setTimeout(() => {
            updateState("ready");
            startTime = performance.now();
            iconEl.textContent = "🟢";
            promptEl.textContent = "TAP NOW!";
            subEl.textContent = "GO GO GO!";
            playSound("go");
            vibrate(50);
          }, randomDelay);

        } else if (gameState === "waiting") {
          // Tapped too early! False start
          clearTimeout(timeoutId);
          playSound("fail");
          vibrate([100, 50, 100]);
          updateState("false-start");
          iconEl.textContent = "❌";
          promptEl.textContent = "Too Soon!";
          subEl.textContent = "Tap anywhere to try again.";

        } else if (gameState === "ready") {
          // Successful reaction!
          const reactionTime = Math.round(performance.now() - startTime);
          playSound("go");
          vibrate(100);
          updateState("result");

          iconEl.textContent = "🏆";
          promptEl.textContent = `${reactionTime} ms`;
          subEl.textContent = reactionTime < 250 ? "Lightning fast! Tap to retry." : "Good job! Tap to retry.";

          lastEl.textContent = `${reactionTime} ms`;

          if (!bestScore || reactionTime < bestScore) {
            bestScore = reactionTime;
            bestEl.textContent = `${bestScore} ms`;
          }

          // Record score in app state
          if (typeof context.recordResult === "function") {
            // Lower reaction time is better, award win if under 350ms
            const outcome = reactionTime < 400 ? "win" : "draw";
            context.recordResult(outcome, { score: Math.max(0, 1000 - reactionTime) });
          }
        }
      }

      arena.addEventListener("click", handleInteraction);

      return {
        newRound() {
          if (timeoutId) clearTimeout(timeoutId);
          updateState("idle");
          iconEl.textContent = "⚡";
          promptEl.textContent = "Tap Here to Start";
          subEl.textContent = "Wait for green, then tap instantly.";
        },
        destroy() {
          if (timeoutId) clearTimeout(timeoutId);
          arena.removeEventListener("click", handleInteraction);
        }
      };
    }
  };
})();
