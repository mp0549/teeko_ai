/**
 * heatmap.js — Territorial Influence Heatmap Canvas
 * Renders a 5×5 influence map after each AI move.
 * Positive values = AI-favorable (red), negative = player-favorable (dark).
 * Tweens smoothly between states using rAF.
 */

const HEATMAP = (() => {

  const CELL = 44;   // px per cell
  const PAD  = 4;    // px padding around canvas content
  const SIZE  = 5 * CELL + 2 * PAD;  // canvas dimension

  let _canvas = null;
  let _ctx    = null;
  let _current = Array.from({ length: 5 }, () => new Array(5).fill(0)); // displayed values
  let _target  = Array.from({ length: 5 }, () => new Array(5).fill(0)); // target values
  let _animId  = null;
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

  /** Called after each move with a new influenceMap (5×5 signed floats). */
  function render(influenceMap, board) {
    _target = influenceMap.map(row => row.slice());
    _board  = board ? board.map(r => r.slice()) : null;
    if (_animId) cancelAnimationFrame(_animId);
    _tween();
  }

  let _board = null;

  function _tween() {
    let allDone = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const diff = _target[r][c] - _current[r][c];
        if (Math.abs(diff) > 0.005) {
          _current[r][c] += diff * 0.12;
          allDone = false;
        } else {
          _current[r][c] = _target[r][c];
        }
      }
    }
    _draw();
    if (!allDone) {
      _animId = requestAnimationFrame(_tween);
    }
  }

  function _draw() {
    const ctx = _ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    // find max absolute value for normalization
    let maxAbs = 0.01;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        maxAbs = Math.max(maxAbs, Math.abs(_current[r][c]));

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const x = PAD + c * CELL;
        const y = PAD + r * CELL;
        const norm = _current[r][c] / maxAbs; // -1 to 1
        const alpha = Math.min(0.85, Math.abs(norm) * 0.85 + 0.05);

        // base cell — dark
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(x, y, CELL, CELL);

        // influence color: red = AI, near-black = player
        if (norm > 0) {
          ctx.fillStyle = `rgba(185, 28, 28, ${alpha})`;
        } else if (norm < 0) {
          ctx.fillStyle = `rgba(26, 26, 26, ${alpha * 0.7})`;
        }
        ctx.fillRect(x, y, CELL, CELL);

        // grid line
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      }
    }

    // draw threat corridors — connections in strongly-AI-favorable rows/cols/diags
    _drawThreatCorridors(ctx);

    // draw pieces on top
    if (_board) _drawPieces(ctx);

    // outer border
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, 5 * CELL, 5 * CELL);
  }

  function _drawThreatCorridors(ctx) {
    ctx.strokeStyle = 'rgba(185, 28, 28, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);

    function maybeDrawLine(cells) {
      // only draw if all cells have positive (AI-favorable) influence
      const allPos = cells.every(([r, c]) => _current[r][c] > 0.15);
      if (!allPos) return;
      const [r0, c0] = cells[0];
      const [r1, c1] = cells[cells.length - 1];
      const x0 = PAD + c0 * CELL + CELL / 2;
      const y0 = PAD + r0 * CELL + CELL / 2;
      const x1 = PAD + c1 * CELL + CELL / 2;
      const y1 = PAD + r1 * CELL + CELL / 2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // rows
    for (let r = 0; r < 5; r++) maybeDrawLine([0,1,2,3,4].map(c => [r, c]));
    // cols
    for (let c = 0; c < 5; c++) maybeDrawLine([0,1,2,3,4].map(r => [r, c]));
    // main diagonals
    maybeDrawLine([0,1,2,3,4].map(i => [i, i]));
    maybeDrawLine([0,1,2,3,4].map(i => [i, 4 - i]));

    ctx.setLineDash([]);
  }

  function _drawPieces(ctx) {
    const R = CELL / 2 - 8;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (_board[r][c] === GameState.EMPTY) continue;
        const cx = PAD + c * CELL + CELL / 2;
        const cy = PAD + r * CELL + CELL / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fillStyle = _board[r][c] === _aiPiece ? '#b91c1c' : '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  function _drawStandby() {
    if (!_ctx) return;
    const ctx = _ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        ctx.fillStyle = '#f4f4f4';
        ctx.fillRect(PAD + c * CELL, PAD + r * CELL, CELL, CELL);
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 1;
        ctx.strokeRect(PAD + c * CELL + 0.5, PAD + r * CELL + 0.5, CELL - 1, CELL - 1);
      }
    }
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.strokeRect(PAD, PAD, 5 * CELL, 5 * CELL);
    ctx.fillStyle = '#bbb';
    ctx.font = '0.55rem Courier New';
    ctx.letterSpacing = '0.12em';
    ctx.textAlign = 'center';
    ctx.fillText('AWAITING DATA...', SIZE / 2, SIZE / 2);
  }

  function clear() {
    if (_animId) cancelAnimationFrame(_animId);
    _current = Array.from({ length: 5 }, () => new Array(5).fill(0));
    _target  = Array.from({ length: 5 }, () => new Array(5).fill(0));
    _board   = null;
    _drawStandby();
  }

  return { init, setAiPiece, render, clear };

})();
