/**
 * ai.js — Teeko Minimax Engine with Alpha-Beta Pruning
 * JS port of TeekoPlayer.max_value() / min_value().
 *
 * Exposes:
 *   AI_ENGINE.getBestMove(board, aiPiece, depth)
 *     → { move, boardAfter, stats, influenceMap, sampledPaths }
 *
 * sampledPaths: array of short move sequences captured during search,
 * consumed by pathfinder.js for the AI thinking animation.
 */

const AI_ENGINE = (() => {

  let _nodesEvaluated = 0;
  let _branchesPruned = 0;
  let _sampledPaths   = [];   // circular buffer — max 40 entries
  let _sampleCounter  = 0;
  const SAMPLE_EVERY  = 30;   // capture one path every N nodes
  const MAX_SAMPLES   = 40;

  function _maxValue(board, aiPiece, oppPiece, depth, alpha, beta, path) {
    _nodesEvaluated++;

    // sample this path for pathfinder animation
    if ((_nodesEvaluated % SAMPLE_EVERY) === 0 && path.length > 0) {
      _sampledPaths.push(path.slice());
      if (_sampledPaths.length > MAX_SAMPLES) _sampledPaths.shift();
    }

    const gv = _gameValue(board, aiPiece, oppPiece);
    if (gv !== 0) return gv;
    if (depth <= 0) return AI_HEURISTIC.heuristicGameValue(board, aiPiece);

    const succs = GameState.getSuccessors(board, aiPiece);
    for (const next of succs) {
      const move = GameState.diffBoards(board, next, aiPiece);
      const val = _minValue(next, aiPiece, oppPiece, depth - 1, alpha, beta, [...path, { board: next, piece: aiPiece, move }]);
      if (val > alpha) alpha = val;
      if (alpha >= beta) { _branchesPruned++; break; }
    }
    return alpha;
  }

  function _minValue(board, aiPiece, oppPiece, depth, alpha, beta, path) {
    _nodesEvaluated++;

    const gv = _gameValue(board, aiPiece, oppPiece);
    if (gv !== 0) return gv;
    if (depth <= 0) return AI_HEURISTIC.heuristicGameValue(board, aiPiece);

    const succs = GameState.getSuccessors(board, oppPiece);
    for (const next of succs) {
      const move = GameState.diffBoards(board, next, oppPiece);
      const val = _maxValue(next, aiPiece, oppPiece, depth - 1, alpha, beta, [...path, { board: next, piece: oppPiece, move }]);
      if (val < beta) beta = val;
      if (beta <= alpha) { _branchesPruned++; break; }
    }
    return beta;
  }

  function _gameValue(board, aiPiece, oppPiece) {
    if (GameState.checkWin(board, aiPiece))  return 1;
    if (GameState.checkWin(board, oppPiece)) return -1;
    return 0;
  }

  // AI will seek a repetition draw when its best available score is below this threshold.
  const DRAW_SEEK_THRESHOLD = -0.15;

  /**
   * Main public API.
   * @param {number[][]} board
   * @param {number} aiPiece        GameState.BLACK or GameState.RED
   * @param {number} depth          Search depth (default 4)
   * @param {Object} positionHistory  Map of serialized position keys → occurrence counts
   * @returns {{ move, boardAfter, stats, influenceMap, sampledPaths }}
   */
  function getBestMove(board, aiPiece, depth = 4, positionHistory = {}) {
    const oppPiece = aiPiece === GameState.BLACK ? GameState.RED : GameState.BLACK;

    _nodesEvaluated = 0;
    _branchesPruned = 0;
    _sampledPaths   = [];
    _sampleCounter  = 0;

    const succs = GameState.getSuccessors(board, aiPiece);

    let bestScore = -Infinity;
    let bestBoard = succs[0];

    for (const next of succs) {
      const move = GameState.diffBoards(board, next, aiPiece);

      // After AI moves, it's the opponent's turn — check if this creates a 3rd repetition.
      const repKey = GameState.serializeBoard(next) + ':' + oppPiece;
      const isRepDraw = (positionHistory[repKey] || 0) >= 2;

      let score;
      if (isRepDraw) {
        // This move causes a draw by threefold repetition.
        // Only prefer it if the AI is significantly losing (score 0 > current best).
        score = 0;
      } else {
        score = _minValue(next, aiPiece, oppPiece, depth - 1, bestScore, Infinity, [{ board: next, piece: aiPiece, move }]);
      }

      if (score > bestScore) {
        bestScore = score;
        bestBoard = next;
      }
    }

    const move = GameState.diffBoards(board, bestBoard, aiPiece);
    const influenceMap = AI_HEURISTIC.getCellInfluence(bestBoard, aiPiece);

    return {
      move,
      boardAfter: bestBoard,
      stats: {
        nodesEvaluated: _nodesEvaluated,
        branchesPruned: _branchesPruned,
        depth,
        score: bestScore,
      },
      influenceMap,
      sampledPaths: _sampledPaths.slice(),
    };
  }

  return { getBestMove };

})();
