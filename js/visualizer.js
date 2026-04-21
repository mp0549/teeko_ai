/**
 * visualizer.js — Stats Panel & Event Log
 * Same pattern as connect4/js/visualizer.js, adapted for Teeko.
 */

const Visualizer = (() => {

  let _moveCount = 0;

  // ── Stats ────────────────────────────────────────────────────────────

  function updateStats({ nodes, depth, pruned, score }) {
    document.getElementById('stat-nodes').textContent  = nodes.toLocaleString();
    document.getElementById('stat-depth').textContent  = String(depth);
    document.getElementById('stat-pruned').textContent = pruned.toLocaleString();

    let scoreStr;
    if (score >= 1)        scoreStr = 'WIN';
    else if (score <= -1)  scoreStr = 'LOSS';
    else                   scoreStr = (score >= 0 ? '+' : '') + score.toFixed(2);
    document.getElementById('stat-score').textContent = scoreStr;
  }

  function resetStats() {
    ['stat-nodes','stat-depth','stat-pruned','stat-score'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
  }

  function updatePhaseTracker(board) {
    const count = GameState.getPieceCount(board);
    const drop  = GameState.isDropPhase(board);
    const el    = document.getElementById('phase-tracker');
    if (!el) return;

    if (drop) {
      const filled = '●'.repeat(count);
      const empty  = '○'.repeat(8 - count);
      el.textContent = `DROP: ${filled}${empty}`;
    } else {
      el.textContent = 'MOVE PHASE: ACTIVE';
    }
  }

  // ── Log ──────────────────────────────────────────────────────────────

  function _ts() {
    return `[T+${String(_moveCount).padStart(2, '0')}]`;
  }

  function _colLabel(col) {
    return String.fromCharCode(65 + col);  // A-E
  }

  function _append(type, message) {
    const log = document.getElementById('vis-log');
    const entry = document.createElement('div');
    entry.className = `log-entry log-entry--${type}`;

    const ts  = document.createElement('span');
    ts.className = 'log-timestamp';
    ts.textContent = _ts();

    const msg = document.createElement('span');
    msg.className = 'log-message';
    msg.textContent = message;

    entry.appendChild(ts);
    entry.appendChild(msg);
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function clearLog() {
    document.getElementById('vis-log').innerHTML = '';
    _moveCount = 0;
  }

  function logGameStart() {
    _moveCount = 0;
    _append('system', 'EXPERIMENT INITIATED — DROP PHASE');
  }

  function logPlayerDrop(row, col) {
    _moveCount++;
    _append('player', `PLAYER → PLACED ${_colLabel(col)}${row}`);
  }

  function logPlayerMove(src, dst) {
    _moveCount++;
    _append('player', `PLAYER → MOVED ${_colLabel(src.col)}${src.row} → ${_colLabel(dst.col)}${dst.row}`);
  }

  function logAIThinking(depth) {
    _append('analysis', `SYS: EVALUATING DEPTH ${depth}...`);
  }

  function logAIDrop(row, col, stats) {
    _moveCount++;
    _append('ai', `A.I.   → PLACED ${_colLabel(col)}${row}`);
    _append('analysis', `NODES: ${stats.nodesEvaluated.toLocaleString()}  PRUNED: ${stats.branchesPruned.toLocaleString()}  SCORE: ${stats.score >= 0 ? '+' : ''}${stats.score.toFixed(2)}`);
  }

  function logAIMove(src, dst, stats) {
    _moveCount++;
    _append('ai', `A.I.   → MOVED ${_colLabel(src.col)}${src.row} → ${_colLabel(dst.col)}${dst.row}`);
    _append('analysis', `NODES: ${stats.nodesEvaluated.toLocaleString()}  PRUNED: ${stats.branchesPruned.toLocaleString()}  SCORE: ${stats.score >= 0 ? '+' : ''}${stats.score.toFixed(2)}`);
  }

  function logPhaseTransition() {
    _append('system', 'PHASE TRANSITION: DROP → MOVE');
  }

  function logGameEnd(winner) {
    const msgs = {
      black: 'RESULT: BLACK WINS — EXPERIMENT CONCLUDED',
      red:   'RESULT: RED WINS — EXPERIMENT CONCLUDED',
      draw:  'RESULT: DRAW — STALEMATE DETECTED',
    };
    _append('win', msgs[winner] || 'RESULT: GAME OVER');
  }

  function logSystem(msg) {
    _append('system', msg);
  }

  function logP2Move(piece, move) {
    _moveCount++;
    if (move.src) {
      _append('player', `${piece === GameState.BLACK ? 'BLACK' : 'RED  '} → MOVED ${_colLabel(move.src.col)}${move.src.row} → ${_colLabel(move.dst.col)}${move.dst.row}`);
    } else {
      _append('player', `${piece === GameState.BLACK ? 'BLACK' : 'RED  '} → PLACED ${_colLabel(move.dst.col)}${move.dst.row}`);
    }
  }

  return {
    updateStats, resetStats, updatePhaseTracker,
    clearLog, logGameStart,
    logPlayerDrop, logPlayerMove, logAIThinking,
    logAIDrop, logAIMove, logPhaseTransition,
    logGameEnd, logSystem, logP2Move,
  };

})();
