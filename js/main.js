/**
 * main.js — Application Orchestrator
 * Owns all live game state. Implements the two-phase Teeko game loop.
 * Supports vs-AI mode and 2-player mode, with color/first-move selection.
 */

// ── Live game state ───────────────────────────────────────────────────

let board         = GameState.createBoard();
let currentPlayer = GameState.BLACK;   // whose turn right now
let gameOver      = false;
let turnCount     = 0;
let currentDepth  = 4;

// Settings
let mode          = 'ai';              // 'ai' | '2p'
let playerPiece   = GameState.BLACK;   // human's piece in vs-AI mode
let aiPiece       = GameState.RED;

// Move-phase selection state
let selectedSrc   = null;             // { row, col } of selected piece (move phase)
let wasDropPhase  = true;

// Threefold repetition tracking: serialized position key → count
let positionHistory = {};

// ── Init ──────────────────────────────────────────────────────────────

function initGame() {
  BOARD_UI.buildBoard(handleCellClick);
  HEATMAP.init('heatmap-canvas', aiPiece);
  PATHFINDER.init('pathfinder-canvas', aiPiece);

  document.getElementById('reset-btn').addEventListener('click', startGame);
  document.getElementById('clear-log-btn').addEventListener('click', () => {
    Visualizer.clearLog();
    Visualizer.logSystem('LOG CLEARED BY OPERATOR.');
  });

  _wireDifficulty();
  _wireModeControls();
  _wireHelpOverlay();

  startGame();
}

function startGame() {
  board           = GameState.createBoard();
  gameOver        = false;
  turnCount       = 0;
  selectedSrc     = null;
  wasDropPhase    = true;
  positionHistory = {};
  currentPlayer   = playerPiece; // color chosen to go first always goes first

  // Record the starting position
  const initKey = GameState.serializeBoard(board) + ':' + currentPlayer;
  positionHistory[initKey] = 1;

  BOARD_UI.renderBoard(board);
  BOARD_UI.clearSelection();
  BOARD_UI.setStatus(_statusForTurn());
  BOARD_UI.setTurnCount(0);
  BOARD_UI.setInputEnabled(true);
  Visualizer.resetStats();
  Visualizer.clearLog();
  Visualizer.logGameStart();
  Visualizer.updatePhaseTracker(board);
  HEATMAP.clear();
  PATHFINDER.clear();

  // If AI goes first
  if (mode === 'ai' && currentPlayer === aiPiece) {
    _triggerAITurn();
  }
}

// ── Cell click handler ────────────────────────────────────────────────

function handleCellClick(row, col) {
  if (gameOver) return;

  const isDropPhase = GameState.isDropPhase(board);

  if (isDropPhase) {
    _handleDrop(row, col);
  } else {
    _handleMove(row, col);
  }
}

function _handleDrop(row, col) {
  if (board[row][col] !== GameState.EMPTY) return;

  const newBoard = GameState.applyMove(board, { dst: { row, col } }, currentPlayer);
  board = newBoard;
  turnCount++;

  BOARD_UI.renderBoard(board);
  BOARD_UI.animateDrop(row, col);
  BOARD_UI.setTurnCount(turnCount);
  Visualizer.updatePhaseTracker(board);

  if (mode === '2p') {
    Visualizer.logP2Move(currentPlayer, { dst: { row, col } });
  } else {
    Visualizer.logPlayerDrop(row, col);
  }

  // check phase transition
  if (wasDropPhase && !GameState.isDropPhase(board)) {
    wasDropPhase = false;
    BOARD_UI.shakeAllPieces();
    Visualizer.logPhaseTransition();
  }

  const win = GameState.checkWin(board, currentPlayer);
  if (win) { endGame(_winner(currentPlayer)); return; }

  _nextTurn();
}

function _handleMove(row, col) {
  // If clicking own piece — select it
  if (board[row][col] === currentPlayer) {
    const validDsts = GameState.getValidMoves(board, currentPlayer)
      .filter(m => m.src.row === row && m.src.col === col)
      .map(m => m.dst);
    BOARD_UI.showSelection(row, col, validDsts);
    selectedSrc = { row, col };
    return;
  }

  // If a piece is selected and clicking a valid destination
  if (selectedSrc) {
    const validDsts = GameState.getValidMoves(board, currentPlayer)
      .filter(m => m.src.row === selectedSrc.row && m.src.col === selectedSrc.col)
      .map(m => m.dst);

    const isValid = validDsts.some(d => d.row === row && d.col === col);
    if (!isValid) {
      BOARD_UI.clearSelection();
      selectedSrc = null;
      return;
    }

    const src = selectedSrc;
    const dst = { row, col };
    const move = { src, dst };

    BOARD_UI.clearSelection();
    selectedSrc = null;
    BOARD_UI.setInputEnabled(false);

    BOARD_UI.animateSlide(src, dst, () => {
      board = GameState.applyMove(board, move, currentPlayer);
      BOARD_UI.renderBoard(board);
      turnCount++;
      BOARD_UI.setTurnCount(turnCount);

      if (mode === '2p') {
        Visualizer.logP2Move(currentPlayer, move);
      } else {
        Visualizer.logPlayerMove(src, dst);
      }

      const win = GameState.checkWin(board, currentPlayer);
      if (win) { endGame(_winner(currentPlayer)); return; }

      BOARD_UI.setInputEnabled(true);
      _nextTurn();
    });
  }
}

// ── Turn management ───────────────────────────────────────────────────

/** Records the current (board, player-to-move) position and returns true if it's a draw. */
function _recordAndCheckRepetition() {
  const key = GameState.serializeBoard(board) + ':' + currentPlayer;
  positionHistory[key] = (positionHistory[key] || 0) + 1;
  if (positionHistory[key] >= 3) {
    Visualizer.logSystem('THREEFOLD REPETITION — DRAW CLAIMED');
    endGame('draw');
    return true;
  }
  return false;
}

function _nextTurn() {
  currentPlayer = (currentPlayer === GameState.BLACK) ? GameState.RED : GameState.BLACK;

  if (_recordAndCheckRepetition()) return;

  if (mode === 'ai' && currentPlayer === aiPiece) {
    _triggerAITurn();
  } else {
    BOARD_UI.setStatus(_statusForTurn());
    BOARD_UI.setInputEnabled(true);
  }
}

function _triggerAITurn() {
  BOARD_UI.setInputEnabled(false);
  BOARD_UI.setStatus('A.I. PROCESSING...');

  // Start pathfinder animation immediately with placeholder
  PATHFINDER.start([]);

  setTimeout(() => {
    Visualizer.logAIThinking(currentDepth);

    setTimeout(() => {
      const result = AI_ENGINE.getBestMove(board, aiPiece, currentDepth, positionHistory);
      const { move, boardAfter, stats, influenceMap, sampledPaths } = result;

      // Feed real paths to pathfinder, then stop
      PATHFINDER.update(sampledPaths);
      setTimeout(() => PATHFINDER.stop(), 300);

      Visualizer.updateStats({
        nodes:  stats.nodesEvaluated,
        depth:  stats.depth,
        pruned: stats.branchesPruned,
        score:  stats.score,
      });

      HEATMAP.render(influenceMap, boardAfter);

      _executeAIMove(move, stats);
    }, 0);
  }, 50);
}

function _executeAIMove(move, stats) {
  if (move.src) {
    // slide animation in move phase
    BOARD_UI.animateSlide(move.src, move.dst, () => {
      board = GameState.applyMove(board, move, aiPiece);
      BOARD_UI.renderBoard(board);
      turnCount++;
      BOARD_UI.setTurnCount(turnCount);
      Visualizer.logAIMove(move.src, move.dst, stats);
      _checkAIWinAndContinue();
    });
  } else {
    // drop phase
    board = GameState.applyMove(board, move, aiPiece);
    BOARD_UI.renderBoard(board);
    BOARD_UI.animateDrop(move.dst.row, move.dst.col);
    turnCount++;
    BOARD_UI.setTurnCount(turnCount);
    Visualizer.logAIDrop(move.dst.row, move.dst.col, stats);
    Visualizer.updatePhaseTracker(board);

    if (wasDropPhase && !GameState.isDropPhase(board)) {
      wasDropPhase = false;
      BOARD_UI.shakeAllPieces();
      Visualizer.logPhaseTransition();
    }

    _checkAIWinAndContinue();
  }
}

function _checkAIWinAndContinue() {
  const win = GameState.checkWin(board, aiPiece);
  if (win) { endGame('red'); return; }
  currentPlayer = playerPiece;
  if (_recordAndCheckRepetition()) return;
  BOARD_UI.setInputEnabled(true);
  BOARD_UI.setStatus(_statusForTurn());
}

// ── End game ──────────────────────────────────────────────────────────

function endGame(winner) {
  gameOver = true;
  BOARD_UI.setInputEnabled(false);

  const win = GameState.checkWin(board, winner === 'black' ? GameState.BLACK : GameState.RED);
  if (win) BOARD_UI.highlightWin(win);

  const msgs = {
    black: 'BLACK WINS — EXPERIMENT COMPLETE',
    red:   'RED WINS — EXPERIMENT COMPLETE',
    draw:  'DRAW — THREEFOLD REPETITION',
  };
  BOARD_UI.setStatus(msgs[winner] || 'GAME OVER');
  Visualizer.logGameEnd(winner);
}

// ── Helpers ───────────────────────────────────────────────────────────

function _winner(piece) {
  return piece === GameState.BLACK ? 'black' : 'red';
}

function _statusForTurn() {
  if (mode === '2p') {
    return `${currentPlayer === GameState.BLACK ? 'BLACK' : 'RED'} TO MOVE`;
  }
  return currentPlayer === playerPiece ? 'YOUR MOVE — SELECT A CELL' : 'A.I. PROCESSING...';
}

// ── Wiring ────────────────────────────────────────────────────────────

function _wireDifficulty() {
  const easyBtn     = document.getElementById('diff-easy');
  const medBtn      = document.getElementById('diff-med');
  const hardBtn     = document.getElementById('diff-hard');
  const toggleBtn   = document.getElementById('diff-toggle');
  const advPanel    = document.getElementById('diff-advanced');
  const depthSlider = document.getElementById('depth-slider');
  const depthDisplay = document.getElementById('depth-display');
  const presetBtns  = [easyBtn, medBtn, hardBtn];

  function applyDifficulty(depth, activeBtn) {
    currentDepth = depth;
    depthSlider.value        = depth;
    depthDisplay.textContent = String(depth);
    presetBtns.forEach(b => b.classList.remove('lab-btn--active'));
    if (activeBtn) activeBtn.classList.add('lab-btn--active');
  }

  easyBtn.addEventListener('click', () => applyDifficulty(2, easyBtn));
  medBtn .addEventListener('click', () => applyDifficulty(4, medBtn));
  hardBtn.addEventListener('click', () => applyDifficulty(6, hardBtn));

  toggleBtn.addEventListener('click', () => {
    const isOpen = advPanel.classList.toggle('open');
    toggleBtn.textContent = isOpen ? 'ADV ▴' : 'ADV ▾';
  });

  depthSlider.addEventListener('input', () => {
    applyDifficulty(parseInt(depthSlider.value, 10), null);
  });
}

function _wireModeControls() {
  const aiModeBtn   = document.getElementById('mode-ai');
  const p2ModeBtn   = document.getElementById('mode-2p');
  const blackFirstBtn = document.getElementById('first-black');
  const redFirstBtn   = document.getElementById('first-red');
  const diffSection   = document.getElementById('diff-section');

  function setMode(m) {
    mode = m;
    if (m === 'ai') {
      aiModeBtn.classList.add('lab-btn--active');
      p2ModeBtn.classList.remove('lab-btn--active');
      if (diffSection) diffSection.style.display = '';
    } else {
      p2ModeBtn.classList.add('lab-btn--active');
      aiModeBtn.classList.remove('lab-btn--active');
      if (diffSection) diffSection.style.display = 'none';
    }
    startGame();
  }

  function setFirstColor(piece) {
    playerPiece = piece;
    aiPiece     = piece === GameState.BLACK ? GameState.RED : GameState.BLACK;
    HEATMAP.setAiPiece(aiPiece);
    PATHFINDER.setAiPiece(aiPiece);

    if (piece === GameState.BLACK) {
      blackFirstBtn.classList.add('lab-btn--active');
      redFirstBtn.classList.remove('lab-btn--active');
    } else {
      redFirstBtn.classList.add('lab-btn--active');
      blackFirstBtn.classList.remove('lab-btn--active');
    }
    startGame();
  }

  aiModeBtn.addEventListener('click',   () => setMode('ai'));
  p2ModeBtn.addEventListener('click',   () => setMode('2p'));
  blackFirstBtn.addEventListener('click', () => setFirstColor(GameState.BLACK));
  redFirstBtn.addEventListener('click',   () => setFirstColor(GameState.RED));
}

function _wireHelpOverlay() {
  const overlay      = document.getElementById('help-overlay');
  const helpBtn      = document.getElementById('help-btn');
  const closeHelpBtn = document.getElementById('close-help-btn');

  function showHelp() { overlay.classList.remove('hidden'); }
  function hideHelp() {
    overlay.classList.add('hidden');
    localStorage.setItem('teeko-helpSeen', '1');
  }

  helpBtn.addEventListener('click', showHelp);
  closeHelpBtn.addEventListener('click', hideHelp);
  overlay.addEventListener('click', hideHelp);

  if (!localStorage.getItem('teeko-helpSeen')) showHelp();
}

// ── Boot ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initGame);
