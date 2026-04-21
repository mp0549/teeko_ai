/**
 * board.js — 5×5 DOM Board Renderer
 * Builds and manages the interactive Teeko board.
 * Handles drop-phase placement and move-phase selection/slide.
 */

const BOARD_UI = (() => {

  let _onCellClick = null;   // callback(row, col)
  let _cells = [];           // 2D array of cell DOM elements
  let _pieces = [];          // 2D array of piece DOM elements
  let _selectedCell = null;  // { row, col } during move phase
  let _validDsts = [];       // [{row,col}] shown as move targets
  let _dragSrcEl = null;     // piece element currently being dragged

  const CELL_SIZE = 80; // px, matches CSS

  function buildBoard(onCellClick) {
    _onCellClick = onCellClick;
    const boardEl = document.getElementById('board');
    boardEl.innerHTML = '';
    _cells = [];
    _pieces = [];

    for (let r = 0; r < 5; r++) {
      _cells[r] = [];
      _pieces[r] = [];
      for (let c = 0; c < 5; c++) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        const piece = document.createElement('div');
        piece.className = 'piece';
        piece.draggable = true;
        cell.appendChild(piece);

        // ── click ──
        cell.addEventListener('click', () => _onCellClick(r, c));
        cell.addEventListener('mouseenter', () => _onCellHover(r, c));
        cell.addEventListener('mouseleave', () => _onCellLeave(r, c));

        // ── drag-and-drop ──
        piece.addEventListener('dragstart', (e) => {
          // Only draggable if it's a placed piece
          if (!piece.classList.contains('piece--player') && !piece.classList.contains('piece--ai')) {
            e.preventDefault();
            return;
          }
          _dragSrcEl = piece;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', `${r},${c}`);
          // Fade after browser captures the drag ghost
          setTimeout(() => { if (_dragSrcEl === piece) piece.classList.add('piece--dragging'); }, 0);
          _onCellClick(r, c); // select this piece
        });

        piece.addEventListener('dragend', () => {
          piece.classList.remove('piece--dragging');
          _dragSrcEl = null;
          for (let dr = 0; dr < 5; dr++)
            for (let dc = 0; dc < 5; dc++)
              _cells[dr][dc].classList.remove('board-cell--drag-over');
        });

        cell.addEventListener('dragover', (e) => {
          if (!_dragSrcEl) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          cell.classList.add('board-cell--drag-over');
        });

        cell.addEventListener('dragleave', () => {
          cell.classList.remove('board-cell--drag-over');
        });

        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('board-cell--drag-over');
          if (_dragSrcEl) _onCellClick(r, c);
        });

        boardEl.appendChild(cell);
        _cells[r][c] = cell;
        _pieces[r][c] = piece;
      }
    }
  }

  function renderBoard(board) {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const piece = _pieces[r][c];
        piece.classList.remove('piece--player', 'piece--ai', 'piece--win', 'piece--selected');
        if (board[r][c] === GameState.BLACK) piece.classList.add('piece--player');
        if (board[r][c] === GameState.RED)   piece.classList.add('piece--ai');
      }
    }
  }

  /** Spring-in animation for a newly placed piece */
  function animateDrop(row, col) {
    const piece = _pieces[row][col];
    piece.classList.remove('piece--drop');
    void piece.offsetWidth; // force reflow to restart animation
    piece.classList.add('piece--drop');
  }

  /** Slide a piece visually from src to dst, then call callback */
  function animateSlide(src, dst, callback) {
    const fromEl = _pieces[src.row][src.col];
    const toCell  = _cells[dst.row][dst.col];
    const fromCell = _cells[src.row][src.col];

    const fromRect = fromCell.getBoundingClientRect();
    const toRect   = toCell.getBoundingClientRect();
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top  - fromRect.top;

    fromEl.style.transition = 'transform 230ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    fromEl.style.transform  = `translate(${dx}px, ${dy}px)`;
    fromEl.style.zIndex     = '10';

    setTimeout(() => {
      fromEl.style.transition = '';
      fromEl.style.transform  = '';
      fromEl.style.zIndex     = '';
      if (callback) callback();
    }, 240);
  }

  /** Highlight selected piece and valid destinations */
  function showSelection(row, col, validDsts) {
    clearSelection();
    _selectedCell = { row, col };
    _validDsts    = validDsts;
    _pieces[row][col].classList.add('piece--selected');
    for (const { row: dr, col: dc } of validDsts) {
      _cells[dr][dc].classList.add('board-cell--valid-dst');
    }
  }

  function clearSelection() {
    if (_selectedCell) {
      _pieces[_selectedCell.row][_selectedCell.col].classList.remove('piece--selected');
      _selectedCell = null;
    }
    for (const { row, col } of _validDsts) {
      _cells[row][col].classList.remove('board-cell--valid-dst');
    }
    _validDsts = [];
  }

  function getSelectedCell() { return _selectedCell; }

  /** Pulse all pieces briefly (phase transition) */
  function shakeAllPieces() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (_pieces[r][c].classList.contains('piece--player') ||
            _pieces[r][c].classList.contains('piece--ai')) {
          _pieces[r][c].classList.remove('piece--phase-shimmer');
          void _pieces[r][c].offsetWidth;
          _pieces[r][c].classList.add('piece--phase-shimmer');
        }
      }
    }
  }

  function highlightWin(cells) {
    for (const { row, col } of cells) {
      _pieces[row][col].classList.add('piece--win');
    }
  }

  function setInputEnabled(enabled) {
    const boardEl = document.getElementById('board');
    boardEl.style.pointerEvents = enabled ? '' : 'none';
    boardEl.style.cursor = enabled ? '' : 'not-allowed';
  }

  function _onCellHover(r, c) {
    // hover tint handled by CSS :hover on .board-cell
  }

  function _onCellLeave(r, c) { }

  function setStatus(text) {
    document.getElementById('status-text').textContent = text;
  }

  function setTurnCount(n) {
    const el = document.getElementById('turn-count');
    el.textContent = n;
    el.classList.remove('count-pop');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('count-pop');
  }

  return {
    buildBoard, renderBoard, animateDrop, animateSlide,
    showSelection, clearSelection, getSelectedCell,
    shakeAllPieces, highlightWin, setInputEnabled,
    setStatus, setTurnCount,
  };

})();
