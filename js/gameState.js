/**
 * gameState.js — Pure Teeko Game Logic
 * JS port of game.py (TeekoPlayer class)
 * All functions are pure and return new boards (immutable).
 */

const GameState = (() => {

  const EMPTY  = 0;
  const BLACK  = 1;  // human default
  const RED    = 2;  // AI default

  function createBoard() {
    return Array.from({ length: 5 }, () => new Array(5).fill(EMPTY));
  }

  function copyBoard(board) {
    return board.map(row => row.slice());
  }

  function getPieceCount(board) {
    let count = 0;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (board[r][c] !== EMPTY) count++;
    return count;
  }

  function isDropPhase(board) {
    return getPieceCount(board) < 8;
  }

  /** Returns all empty cells sorted by distance from center (mirrors Python succ drop ordering) */
  function getValidPlacements(board) {
    const cells = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++)
        if (board[r][c] === EMPTY)
          cells.push({ row: r, col: c, dist: Math.abs(r - 2) + Math.abs(c - 2) });
    cells.sort((a, b) => a.dist - b.dist);
    return cells.map(({ row, col }) => ({ row, col }));
  }

  /** Returns all {src, dst} move pairs for a piece in move phase (8-directional adjacency) */
  function getValidMoves(board, piece) {
    const moves = [];
    const candidates = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (board[r][c] === piece) {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 5 && nc >= 0 && nc < 5 && board[nr][nc] === EMPTY) {
                candidates.push({
                  dist: Math.abs(nr - 2) + Math.abs(nc - 2),
                  src: { row: r, col: c },
                  dst: { row: nr, col: nc }
                });
              }
            }
          }
        }
      }
    }
    candidates.sort((a, b) => a.dist - b.dist);
    for (const { src, dst } of candidates) moves.push({ src, dst });
    return moves;
  }

  /** Returns successor board states — mirrors Python succ(). */
  function getSuccessors(board, piece) {
    if (isDropPhase(board)) {
      return getValidPlacements(board).map(({ row, col }) => {
        const next = copyBoard(board);
        next[row][col] = piece;
        return next;
      });
    } else {
      return getValidMoves(board, piece).map(({ src, dst }) => {
        const next = copyBoard(board);
        next[src.row][src.col] = EMPTY;
        next[dst.row][dst.col] = piece;
        return next;
      });
    }
  }

  /** Apply a move (drop or slide) and return a new board. */
  function applyMove(board, move, piece) {
    const next = copyBoard(board);
    if (move.src) next[move.src.row][move.src.col] = EMPTY;
    next[move.dst.row][move.dst.col] = piece;
    return next;
  }

  /** Get all diagonals of length 4 — mirrors Python check_win diag logic. */
  function _getDiagonals(board) {
    const diags = [];
    for (const j of [0, 4]) {
      diags.push([0,1,2,3].map(i => board[i][Math.abs(i - j)]));
      diags.push([1,2,3,4].map(i => board[i][Math.abs(i - j)]));
      diags.push([0,1,2,3].map(i => board[i + 1][Math.abs(j - i)]));
      if (j === 0) {
        diags.push([0,1,2,3].map(i => board[i][Math.abs(j - i) + 1]));
      } else {
        diags.push([0,1,2,3].map(i => board[i][Math.abs(j - i) - 1]));
      }
    }
    return diags;
  }

  function _checkVec(line, piece) {
    for (let i = 0; i <= line.length - 4; i++) {
      if (line[i] === piece && line[i+1] === piece && line[i+2] === piece && line[i+3] === piece)
        return true;
    }
    return false;
  }

  /**
   * Returns winning cells [{row,col}×4] if piece has won, else null.
   */
  function checkWin(board, piece) {
    // rows
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c <= 1; c++) {
        if ([0,1,2,3].every(k => board[r][c+k] === piece))
          return [{row:r,col:c},{row:r,col:c+1},{row:r,col:c+2},{row:r,col:c+3}];
      }
    }
    // cols
    for (let c = 0; c < 5; c++) {
      for (let r = 0; r <= 1; r++) {
        if ([0,1,2,3].every(k => board[r+k][c] === piece))
          return [{row:r,col:c},{row:r+1,col:c},{row:r+2,col:c},{row:r+3,col:c}];
      }
    }
    // 2x2 boxes
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === piece && board[r+1][c] === piece &&
            board[r][c+1] === piece && board[r+1][c+1] === piece)
          return [{row:r,col:c},{row:r+1,col:c},{row:r,col:c+1},{row:r+1,col:c+1}];
      }
    }
    // diagonals — enumerate directly
    // down-right
    for (let r = 0; r <= 1; r++) {
      for (let c = 0; c <= 1; c++) {
        if ([0,1,2,3].every(k => board[r+k][c+k] === piece))
          return [{row:r,col:c},{row:r+1,col:c+1},{row:r+2,col:c+2},{row:r+3,col:c+3}];
      }
    }
    // down-left
    for (let r = 0; r <= 1; r++) {
      for (let c = 3; c < 5; c++) {
        if ([0,1,2,3].every(k => board[r+k][c-k] === piece))
          return [{row:r,col:c},{row:r+1,col:c-1},{row:r+2,col:c-2},{row:r+3,col:c-3}];
      }
    }
    return null;
  }

  /** Reconstruct a move (dst + optional src) by diffing two boards. */
  function diffBoards(before, after, piece) {
    let dst = null, src = null;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (after[r][c] === piece && before[r][c] !== piece) dst = { row: r, col: c };
        if (after[r][c] !== piece && before[r][c] === piece) src = { row: r, col: c };
      }
    }
    return { dst, src };
  }

  /** Compact string key for a board position — used for threefold repetition tracking. */
  function serializeBoard(board) {
    return board.map(row => row.join('')).join('|');
  }

  return {
    EMPTY, BLACK, RED,
    createBoard, copyBoard, getPieceCount, isDropPhase,
    getValidPlacements, getValidMoves, getSuccessors,
    applyMove, checkWin, diffBoards, serializeBoard,
  };

})();
