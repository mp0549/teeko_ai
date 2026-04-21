/**
 * aiHeuristic.js — Teeko Heuristic Evaluation
 * JS port of TeekoPlayer.check_heur() and heuristic_game_value().
 * Also provides getCellInfluence() for the heatmap visualization.
 */

const AI_HEURISTIC = (() => {

  function _checkVecCount(line, piece) {
    return line.filter(v => v === piece).length;
  }

  function _getDiagonalLines(board) {
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

  /** Port of check_heur(state, piece) */
  function checkHeur(board, piece) {
    const opp = piece === GameState.BLACK ? GameState.RED : GameState.BLACK;
    let score = 0;

    // rows
    for (let r = 0; r < 5; r++) {
      const row = board[r];
      if (!row.includes(opp))
        score += _checkVecCount(row, piece) * 0.25;
    }

    // cols
    for (let c = 0; c < 5; c++) {
      const col = [0,1,2,3,4].map(r => board[r][c]);
      if (!col.includes(opp))
        score += _checkVecCount(col, piece) * 0.25;
    }

    // diagonals
    const diags = _getDiagonalLines(board);
    for (const diag of diags) {
      if (!diag.includes(opp))
        score += _checkVecCount(diag, piece) * 0.25;
    }

    // 2x2 boxes
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const box = [board[r][c], board[r+1][c], board[r][c+1], board[r+1][c+1]];
        if (!box.includes(opp))
          score += box.filter(v => v === piece).length * 0.25;
      }
    }

    return score;
  }

  /** Port of heuristic_game_value(state) — from AI's perspective (aiPiece). */
  function heuristicGameValue(board, aiPiece) {
    const oppPiece = aiPiece === GameState.BLACK ? GameState.RED : GameState.BLACK;

    const winAI  = GameState.checkWin(board, aiPiece);
    const winOpp = GameState.checkWin(board, oppPiece);
    if (winAI)  return 1;
    if (winOpp) return -1;

    const my  = checkHeur(board, aiPiece);
    const opp = checkHeur(board, oppPiece);
    const val = (my - opp) / Math.max(my + opp, 1);
    return Math.max(-0.99, Math.min(0.99, val));
  }

  /**
   * Returns a 5×5 array of signed influence scores per cell.
   * Positive = AI-favorable, negative = player-favorable.
   * Used by the heatmap canvas.
   */
  function getCellInfluence(board, aiPiece) {
    const oppPiece = aiPiece === GameState.BLACK ? GameState.RED : GameState.BLACK;
    const influence = Array.from({ length: 5 }, () => new Array(5).fill(0));

    function addToWindow(cells, piece, sign) {
      const line = cells.map(([r, c]) => board[r][c]);
      const opp  = piece === GameState.BLACK ? GameState.RED : GameState.BLACK;
      if (line.includes(opp)) return;
      const cnt = line.filter(v => v === piece).length;
      if (cnt === 0) return;
      const contrib = cnt * 0.25 * sign;
      for (const [r, c] of cells) influence[r][c] += contrib;
    }

    // rows
    for (let r = 0; r < 5; r++) {
      const cells = [0,1,2,3,4].map(c => [r, c]);
      addToWindow(cells, aiPiece, 1);
      addToWindow(cells, oppPiece, -1);
    }

    // cols
    for (let c = 0; c < 5; c++) {
      const cells = [0,1,2,3,4].map(r => [r, c]);
      addToWindow(cells, aiPiece, 1);
      addToWindow(cells, oppPiece, -1);
    }

    // diagonals — enumerate cell coordinates for each diagonal window
    const diagCells = [];
    for (const j of [0, 4]) {
      diagCells.push([0,1,2,3].map(i => [i, Math.abs(i - j)]));
      diagCells.push([1,2,3,4].map(i => [i, Math.abs(i - j)]));
      diagCells.push([0,1,2,3].map(i => [i + 1, Math.abs(j - i)]));
      if (j === 0) {
        diagCells.push([0,1,2,3].map(i => [i, Math.abs(j - i) + 1]));
      } else {
        diagCells.push([0,1,2,3].map(i => [i, Math.abs(j - i) - 1]));
      }
    }
    for (const cells of diagCells) {
      // validate — guard against out-of-bounds from python diagonal formula
      if (cells.every(([r, c]) => r >= 0 && r < 5 && c >= 0 && c < 5)) {
        addToWindow(cells, aiPiece, 1);
        addToWindow(cells, oppPiece, -1);
      }
    }

    // 2x2 boxes
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cells = [[r,c],[r+1,c],[r,c+1],[r+1,c+1]];
        addToWindow(cells, aiPiece, 1);
        addToWindow(cells, oppPiece, -1);
      }
    }

    return influence;
  }

  return { checkHeur, heuristicGameValue, getCellInfluence };

})();
