/**
 * pathfinder.js — AI Search Animation ("Pathfinder")
 * Shows a blurry, overlapping animation of sampled minimax paths
 * while the AI is computing. Intentionally illegible — purely aesthetic.
 */

const PATHFINDER = (() => {

  const CELL  = 22;
  const PAD   = 3;
  const SIZE  = 5 * CELL + 2 * PAD;
  const FADE_ALPHA = 0.06;   // how quickly old frames ghost out
  const FRAME_MS   = 70;     // ms per path frame

  let _canvas  = null;
  let _ctx     = null;
  let _paths   = [];
  let _pathIdx = 0;
  let _frameId = null;
  let _active  = false;
  let _aiPiece = GameState.RED;

  function init(canvasId, aiPiece) {
    _canvas = document.getElementById(canvasId);
    _ctx    = _canvas.getContext('2d');
    _canvas.width  = SIZE;
    _canvas.height = SIZE;
    _aiPiece = aiPiece;
    _drawStandby();
  }

  function setAiPiece(piece) { _aiPiece = piece; }

  /** Called just before AI computation begins. paths = [] initially; start animation loop. */
  function start(paths) {
    _paths   = paths && paths.length ? paths : _makeRandomPaths();
    _pathIdx = 0;
    _active  = true;
    if (_frameId) clearInterval(_frameId);
    // seed the canvas with a dark background
    _ctx.fillStyle = '#fff';
    _ctx.fillRect(0, 0, SIZE, SIZE);
    _frameId = setInterval(_nextFrame, FRAME_MS);
  }

  /** Feed additional sampled paths mid-computation (called by main as AI runs). */
  function update(paths) {
    if (paths && paths.length) _paths = paths;
  }

  function stop() {
    _active = false;
    if (_frameId) { clearInterval(_frameId); _frameId = null; }
    _drawComplete();
  }

  function clear() {
    stop();
    _drawStandby();
  }

  // ── drawing ──────────────────────────────────────────────────────────

  function _nextFrame() {
    if (!_active) return;
    const ctx = _ctx;

    // fade previous content slightly
    ctx.fillStyle = `rgba(255,255,255,${FADE_ALPHA})`;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (_paths.length === 0) {
      _pathIdx++;
      return;
    }

    const path = _paths[_pathIdx % _paths.length];
    _pathIdx++;

    if (!path || path.length === 0) return;

    // draw the board state from this path step
    const step = path[Math.floor(Math.random() * path.length)];
    if (!step || !step.board) return;

    _drawMiniBoard(ctx, step.board, 0.25 + Math.random() * 0.35);

    // draw an arrow for the move if present
    if (step.move && step.move.src && step.move.dst) {
      _drawArrow(ctx, step.move.src, step.move.dst, step.piece, 0.3 + Math.random() * 0.4);
    } else if (step.move && step.move.dst) {
      _drawDot(ctx, step.move.dst, step.piece, 0.35 + Math.random() * 0.45);
    }
  }

  function _drawMiniBoard(ctx, board, alpha) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const v = board[r][c];
        if (v === GameState.EMPTY) continue;
        const x = PAD + c * CELL + CELL / 2;
        const y = PAD + r * CELL + CELL / 2;
        const R = CELL / 2 - 5;
        ctx.beginPath();
        ctx.arc(x, y, R, 0, Math.PI * 2);
        ctx.fillStyle = v === _aiPiece
          ? `rgba(185,28,28,${alpha})`
          : `rgba(26,26,26,${alpha})`;
        ctx.fill();
      }
    }

    // faint grid
    ctx.strokeStyle = `rgba(200,200,200,${alpha * 0.5})`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(PAD + i * CELL, PAD);
      ctx.lineTo(PAD + i * CELL, PAD + 5 * CELL);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(PAD, PAD + i * CELL);
      ctx.lineTo(PAD + 5 * CELL, PAD + i * CELL);
      ctx.stroke();
    }
  }

  function _drawArrow(ctx, src, dst, piece, alpha) {
    const x0 = PAD + src.col * CELL + CELL / 2;
    const y0 = PAD + src.row * CELL + CELL / 2;
    const x1 = PAD + dst.col * CELL + CELL / 2;
    const y1 = PAD + dst.row * CELL + CELL / 2;
    const color = piece === _aiPiece ? `rgba(185,28,28,${alpha})` : `rgba(26,26,26,${alpha})`;

    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // arrowhead
    const angle = Math.atan2(y1 - y0, x1 - x0);
    const hs = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hs * Math.cos(angle - 0.4), y1 - hs * Math.sin(angle - 0.4));
    ctx.lineTo(x1 - hs * Math.cos(angle + 0.4), y1 - hs * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fill();
  }

  function _drawDot(ctx, dst, piece, alpha) {
    const x = PAD + dst.col * CELL + CELL / 2;
    const y = PAD + dst.row * CELL + CELL / 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = piece === _aiPiece
      ? `rgba(185,28,28,${alpha})`
      : `rgba(26,26,26,${alpha})`;
    ctx.fill();
  }

  function _makeRandomPaths() {
    // placeholder paths before real data arrives
    const paths = [];
    for (let i = 0; i < 8; i++) {
      paths.push([{
        board: GameState.createBoard(),
        piece: _aiPiece,
        move: { dst: { row: Math.floor(Math.random() * 5), col: Math.floor(Math.random() * 5) } }
      }]);
    }
    return paths;
  }

  function _drawStandby() {
    if (!_ctx) return;
    const ctx = _ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    // light grid
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      ctx.beginPath(); ctx.moveTo(PAD + i * CELL, PAD); ctx.lineTo(PAD + i * CELL, PAD + 5 * CELL); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD, PAD + i * CELL); ctx.lineTo(PAD + 5 * CELL, PAD + i * CELL); ctx.stroke();
    }
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, 5 * CELL, 5 * CELL);
    ctx.fillStyle = '#ccc';
    ctx.font = '0.45rem Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('STANDBY', SIZE / 2, SIZE / 2);
  }

  function _drawComplete() {
    if (!_ctx) return;
    // fade out then show label
    setTimeout(() => {
      if (!_active) {
        _ctx.fillStyle = 'rgba(255,255,255,0.7)';
        _ctx.fillRect(0, 0, SIZE, SIZE);
        _ctx.fillStyle = '#999';
        _ctx.font = '0.45rem Courier New';
        _ctx.textAlign = 'center';
        _ctx.fillText('ANALYSIS COMPLETE', SIZE / 2, SIZE / 2);
      }
    }, 200);
  }

  return { init, setAiPiece, start, update, stop, clear };

})();
