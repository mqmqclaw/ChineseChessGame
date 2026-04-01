import { ROWS, COLS, EMPTY, RED, BLACK, R_KING, R_ADVISOR, R_ELEPHANT, R_HORSE, R_CHARIOT, R_CANNON, R_PAWN, getSide, absPiece } from './game.js';

const PIECE_VALUES = {
  [R_KING]: 10000,
  [R_CHARIOT]: 600,
  [R_CANNON]: 285,
  [R_HORSE]: 270,
  [R_ADVISOR]: 120,
  [R_ELEPHANT]: 120,
  [R_PAWN]: 30,
};

// Position tables from Black's perspective (row 0 = Black back rank).
// For Red pieces, look up with row index (9 - r).
const POS = {
  [R_KING]: [
    [0,0,0, 8,12, 8, 0,0,0],
    [0,0,0, 6, 8, 6, 0,0,0],
    [0,0,0, 2, 4, 2, 0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_ADVISOR]: [
    [0,0,0,20, 0,20,0,0,0],
    [0,0,0, 0,23, 0,0,0,0],
    [0,0,0,20, 0,20,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_ELEPHANT]: [
    [0,0,20,0, 0,0,20,0,0],
    [0,0, 0,0, 0,0, 0,0,0],
    [18,0, 0,0,23,0, 0,0,18],
    [0,0, 0,0, 0,0, 0,0,0],
    [0,0,20,0, 0,0,20,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_HORSE]: [
    [ 4, 8,16,12, 4,12,16, 8, 4],
    [ 4,10,28,16, 8,16,28,10, 4],
    [12,14,16,20,18,20,16,14,12],
    [ 8,24,18,24,20,24,18,24, 8],
    [ 6,16,14,18,16,18,14,16, 6],
    [ 4,12,16,14,12,14,16,12, 4],
    [ 8, 4,10,12,14,12,10, 4, 8],
    [ 4, 8,12,14,12,14,12, 8, 4],
    [ 4,10, 8,12,10,12, 8,10, 4],
    [ 0, 2, 4, 8, 4, 8, 4, 2, 0],
  ],
  [R_CHARIOT]: [
    [14,14,12,18,16,18,12,14,14],
    [16,20,18,24,26,24,18,20,16],
    [12,12,12,18,18,18,12,12,12],
    [12,18,16,22,22,22,16,18,12],
    [12,14,12,18,18,18,12,14,12],
    [12,16,14,20,20,20,14,16,12],
    [ 6,10, 8,14,14,14, 8,10, 6],
    [ 4, 8, 6,14,12,14, 6, 8, 4],
    [ 8, 4, 8,16, 8,16, 8, 4, 8],
    [-2,10, 6,14,12,14, 6,10,-2],
  ],
  [R_CANNON]: [
    [ 6, 4, 0,-10,-12,-10, 0, 4, 6],
    [ 2, 2, 0, -4,-14, -4, 0, 2, 2],
    [ 2, 2, 0,-10, -8,-10, 0, 2, 2],
    [ 0, 0,-2,  4, 10,  4,-2, 0, 0],
    [ 0, 0, 0,  2,  8,  2, 0, 0, 0],
    [-2, 0, 4,  2,  6,  2, 4, 0,-2],
    [ 0, 0, 0,  2,  4,  2, 0, 0, 0],
    [ 4, 0, 8,  6, 10,  6, 8, 0, 4],
    [ 0, 2, 4,  6,  6,  6, 4, 2, 0],
    [ 0, 0, 2,  6,  6,  6, 2, 0, 0],
  ],
  [R_PAWN]: [
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [ 0, 0,-2, 0, 4, 0,-2, 0, 0],
    [ 2, 0, 8, 0, 8, 0, 8, 0, 2],
    [ 6,12,18,18,20,18,18,12, 6],
    [10,20,30,34,40,34,30,20,10],
    [14,26,42,60,80,60,42,26,14],
    [18,36,56,80,120,80,56,36,18],
    [6,12,24,36,50,36,24,12,6],
  ],
};

function posBonus(type, r, c, side) {
  const row = side === BLACK ? r : 9 - r;
  return POS[type]?.[row]?.[c] ?? 0;
}

export class ChessAI {
  constructor(game, depth = 3) {
    this.game = game;
    this.maxDepth = depth;
    this.nodesSearched = 0;
  }

  setDepth(d) { this.maxDepth = d; }

  evaluate() {
    let score = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = this.game.board[r][c];
        if (p === EMPTY) continue;
        const side = getSide(p);
        const type = absPiece(p);
        const val = PIECE_VALUES[type] + posBonus(type, r, c, side);
        score += side * val;
      }
    }
    return score * this.game.currentPlayer;
  }

  orderMoves(moves) {
    const board = this.game.board;
    return moves.sort((a, b) => {
      const va = absPiece(board[a.to[0]][a.to[1]]) || 0;
      const vb = absPiece(board[b.to[0]][b.to[1]]) || 0;
      return (PIECE_VALUES[vb] || 0) - (PIECE_VALUES[va] || 0);
    });
  }

  negamax(depth, alpha, beta) {
    this.nodesSearched++;
    if (depth === 0) return this.evaluate();

    const side = this.game.currentPlayer;
    const moves = this.game.getAllMoves(side);

    if (moves.length === 0) {
      return -100000 + (this.maxDepth - depth);
    }

    this.orderMoves(moves);

    for (const move of moves) {
      this.game.makeMove(...move.from, ...move.to);
      const score = -this.negamax(depth - 1, -beta, -alpha);
      this.game.undoMove();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  getBestMove() {
    this.nodesSearched = 0;
    const side = this.game.currentPlayer;
    const moves = this.game.getAllMoves(side);
    if (moves.length === 0) return null;
    this.orderMoves(moves);

    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      this.game.makeMove(...move.from, ...move.to);
      const score = -this.negamax(this.maxDepth - 1, -Infinity, -bestScore);
      this.game.undoMove();
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }
}
