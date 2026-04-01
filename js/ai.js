import { ROWS, COLS, EMPTY, RED, BLACK, R_KING, R_ADVISOR, R_ELEPHANT,
  R_HORSE, R_CHARIOT, R_CANNON, R_PAWN, getSide, absPiece } from './game.js';

// ===================== Piece Values =====================

const PIECE_VALUE = {
  [R_KING]: 10000, [R_CHARIOT]: 600, [R_CANNON]: 285,
  [R_HORSE]: 270, [R_ADVISOR]: 120, [R_ELEPHANT]: 120, [R_PAWN]: 30,
};

// ===================== Position Tables (Black perspective, row 0 = back) =====================

const POS = {
  [R_KING]: [
    [0,0,0,8,12,8,0,0,0],[0,0,0,6,8,6,0,0,0],[0,0,0,2,4,2,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_ADVISOR]: [
    [0,0,0,20,0,20,0,0,0],[0,0,0,0,23,0,0,0,0],[0,0,0,20,0,20,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_ELEPHANT]: [
    [0,0,20,0,0,0,20,0,0],[0,0,0,0,0,0,0,0,0],[18,0,0,0,23,0,0,0,18],
    [0,0,0,0,0,0,0,0,0],[0,0,20,0,0,0,20,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
  ],
  [R_HORSE]: [
    [4,8,16,12,4,12,16,8,4],[4,10,28,16,8,16,28,10,4],
    [12,14,16,20,18,20,16,14,12],[8,24,18,24,20,24,18,24,8],
    [6,16,14,18,16,18,14,16,6],[4,12,16,14,12,14,16,12,4],
    [8,4,10,12,14,12,10,4,8],[4,8,12,14,12,14,12,8,4],
    [4,10,8,12,10,12,8,10,4],[0,2,4,8,4,8,4,2,0],
  ],
  [R_CHARIOT]: [
    [14,14,12,18,16,18,12,14,14],[16,20,18,24,26,24,18,20,16],
    [12,12,12,18,18,18,12,12,12],[12,18,16,22,22,22,16,18,12],
    [12,14,12,18,18,18,12,14,12],[12,16,14,20,20,20,14,16,12],
    [6,10,8,14,14,14,8,10,6],[4,8,6,14,12,14,6,8,4],
    [8,4,8,16,8,16,8,4,8],[-2,10,6,14,12,14,6,10,-2],
  ],
  [R_CANNON]: [
    [6,4,0,-10,-12,-10,0,4,6],[2,2,0,-4,-14,-4,0,2,2],
    [2,2,0,-10,-8,-10,0,2,2],[0,0,-2,4,10,4,-2,0,0],
    [0,0,0,2,8,2,0,0,0],[-2,0,4,2,6,2,4,0,-2],
    [0,0,0,2,4,2,0,0,0],[4,0,8,6,10,6,8,0,4],
    [0,2,4,6,6,6,4,2,0],[0,0,2,6,6,6,2,0,0],
  ],
  [R_PAWN]: [
    [0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0],
    [0,0,-2,0,4,0,-2,0,0],[2,0,8,0,8,0,8,0,2],
    [6,12,18,18,20,18,18,12,6],[10,20,30,34,40,34,30,20,10],
    [14,26,42,60,80,60,42,26,14],[18,36,56,80,120,80,56,36,18],
    [6,12,24,36,50,36,24,12,6],
  ],
};

function posBonus(type, r, c, side) {
  const row = side === BLACK ? r : 9 - r;
  return POS[type]?.[row]?.[c] ?? 0;
}

// ===================== Zobrist Hashing =====================

function makeRng(seed) {
  let s = seed | 0;
  return () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return s >>> 0; };
}

const ZOBRIST = (() => {
  const rng = makeRng(7654321);
  const pieces = {};
  for (let p = -7; p <= 7; p++) {
    if (p === 0) continue;
    pieces[p] = [];
    for (let i = 0; i < 90; i++) pieces[p][i] = [rng(), rng()];
  }
  return { pieces, side: [rng(), rng()] };
})();

// ===================== Transposition Table =====================

const TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;
const MATE_SCORE = 100000;
const MATE_BOUND = 90000;

function ttAdjustStore(score, ply) {
  if (score > MATE_BOUND) return score + ply;
  if (score < -MATE_BOUND) return score - ply;
  return score;
}
function ttAdjustRead(score, ply) {
  if (score > MATE_BOUND) return score - ply;
  if (score < -MATE_BOUND) return score + ply;
  return score;
}

class TTable {
  constructor() { this.map = new Map(); this.maxSize = 1 << 19; }

  probe(h1, h2) {
    const e = this.map.get(h1);
    return (e && e.v === h2) ? e : null;
  }

  store(h1, h2, depth, score, flag, bestMove) {
    const old = this.map.get(h1);
    if (old && old.v === h2 && old.d > depth) return;
    if (this.map.size >= this.maxSize) this.map.clear();
    this.map.set(h1, { v: h2, d: depth, s: score, f: flag, m: bestMove });
  }

  clear() { this.map.clear(); }
}

// ===================== Evaluation =====================

function evaluate(game) {
  let score = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = game.board[r][c];
      if (p === EMPTY) continue;
      const side = getSide(p);
      const type = absPiece(p);
      score += side * (PIECE_VALUE[type] + posBonus(type, r, c, side));
    }
  }
  return score * game.currentPlayer;
}

// ===================== ChessAI Engine =====================

export class ChessAI {
  constructor(game, depth = 3) {
    this.game = game;
    this.tt = new TTable();
    this.killers = [];
    this.history = new Int32Array(8100);
    this.maxDepth = 10;
    this.timeLimit = 2000;
    this.nodes = 0;
    this.startTime = 0;
    this.stopped = false;
    this.h1 = 0;
    this.h2 = 0;
    this._setDifficultyByDepth(depth);
  }

  _setDifficultyByDepth(d) {
    if (d <= 2) this.setDifficulty('easy');
    else if (d <= 3) this.setDifficulty('medium');
    else this.setDifficulty('hard');
  }

  setDepth(d) { this._setDifficultyByDepth(d); }

  setDifficulty(level) {
    switch (level) {
      case 'easy':   this.timeLimit = 800;  this.maxDepth = 5;  break;
      case 'medium': this.timeLimit = 2000; this.maxDepth = 9;  break;
      case 'hard':   this.timeLimit = 4000; this.maxDepth = 13; break;
      default:       this.timeLimit = 2000; this.maxDepth = 9;
    }
  }

  // ---------- Hash Helpers ----------

  computeHash() {
    this.h1 = 0; this.h2 = 0;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const p = this.game.board[r][c];
        if (p !== EMPTY) {
          const i = r * 9 + c;
          this.h1 ^= ZOBRIST.pieces[p][i][0];
          this.h2 ^= ZOBRIST.pieces[p][i][1];
        }
      }
    if (this.game.currentPlayer === BLACK) {
      this.h1 ^= ZOBRIST.side[0]; this.h2 ^= ZOBRIST.side[1];
    }
  }

  _hashDelta(piece, pos, captured, capPos) {
    this.h1 ^= ZOBRIST.pieces[piece][pos][0];
    this.h2 ^= ZOBRIST.pieces[piece][pos][1];
    if (captured) {
      this.h1 ^= ZOBRIST.pieces[captured][capPos][0];
      this.h2 ^= ZOBRIST.pieces[captured][capPos][1];
    }
  }

  _doMove(fr, fc, tr, tc) {
    const piece = this.game.board[fr][fc];
    const captured = this.game.board[tr][tc];
    const fp = fr * 9 + fc, tp = tr * 9 + tc;
    this._hashDelta(piece, fp, 0, 0);
    this._hashDelta(piece, tp, captured, tp);
    this.h1 ^= ZOBRIST.side[0]; this.h2 ^= ZOBRIST.side[1];
    this.game.makeMove(fr, fc, tr, tc);
    return captured;
  }

  _undoMove() {
    const mv = this.game.moveHistory.at(-1);
    const fp = mv.from[0] * 9 + mv.from[1], tp = mv.to[0] * 9 + mv.to[1];
    this.h1 ^= ZOBRIST.side[0]; this.h2 ^= ZOBRIST.side[1];
    this._hashDelta(mv.piece, tp, mv.captured, tp);
    this._hashDelta(mv.piece, fp, 0, 0);
    this.game.undoMove();
  }

  // ---------- Move Ordering ----------

  _moveKey(m) { return m.from[0] * 810 + m.from[1] * 90 + m.to[0] * 9 + m.to[1]; }

  _movesMatch(a, b) {
    return a && b && a.from[0]===b.from[0] && a.from[1]===b.from[1]
      && a.to[0]===b.to[0] && a.to[1]===b.to[1];
  }

  _scoreMove(m, ttMove, ply) {
    if (this._movesMatch(m, ttMove)) return 2000000;
    const captured = this.game.board[m.to[0]][m.to[1]];
    if (captured !== EMPTY) {
      const victim = PIECE_VALUE[absPiece(captured)] || 0;
      const attacker = PIECE_VALUE[absPiece(this.game.board[m.from[0]][m.from[1]])] || 0;
      return 1000000 + victim * 10 - attacker;
    }
    const k = this.killers[ply];
    if (k) {
      if (this._movesMatch(m, k[0])) return 900000;
      if (this._movesMatch(m, k[1])) return 800000;
    }
    return this.history[this._moveKey(m)] || 0;
  }

  _orderMoves(moves, ttMove, ply) {
    const scores = moves.map(m => this._scoreMove(m, ttMove, ply));
    const indices = moves.map((_, i) => i);
    indices.sort((a, b) => scores[b] - scores[a]);
    return indices.map(i => moves[i]);
  }

  _storeKiller(m, ply) {
    if (!this.killers[ply]) this.killers[ply] = [null, null];
    const k = this.killers[ply];
    if (this._movesMatch(m, k[0])) return;
    k[1] = k[0]; k[0] = { from: [...m.from], to: [...m.to] };
  }

  _storeHistory(m, depth) {
    this.history[this._moveKey(m)] += depth * depth;
  }

  // ---------- Quiescence Search ----------

  _quiesce(alpha, beta) {
    this.nodes++;
    const stand = evaluate(this.game);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;

    const side = this.game.currentPlayer;
    const caps = this.game.getAllMoves(side, true);
    caps.sort((a, b) => {
      const va = PIECE_VALUE[absPiece(this.game.board[a.to[0]][a.to[1]])] || 0;
      const vb = PIECE_VALUE[absPiece(this.game.board[b.to[0]][b.to[1]])] || 0;
      return vb - va;
    });

    for (const m of caps) {
      const capVal = PIECE_VALUE[absPiece(this.game.board[m.to[0]][m.to[1]])] || 0;
      if (stand + capVal + 200 < alpha) continue;

      this._doMove(...m.from, ...m.to);
      const score = -this._quiesce(-beta, -alpha);
      this._undoMove();

      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  // ---------- Main Search (Negamax + Alpha-Beta) ----------

  _search(depth, alpha, beta, ply, allowNull) {
    if (this.stopped) return 0;
    if ((this.nodes & 4095) === 0 && Date.now() - this.startTime > this.timeLimit) {
      this.stopped = true; return 0;
    }
    this.nodes++;

    if (ply > 0) {
      const hist = this.game.positionHistory;
      const len = hist.length;
      const current = hist[len - 1];
      for (let i = len - 3; i >= 0; i -= 2) {
        if (hist[i] === current) return 0;
      }
    }

    const origAlpha = alpha;
    const side = this.game.currentPlayer;

    // TT Probe
    let ttMove = null;
    const ttE = this.tt.probe(this.h1, this.h2);
    if (ttE) {
      ttMove = ttE.m;
      if (ttE.d >= depth) {
        const s = ttAdjustRead(ttE.s, ply);
        if (ttE.f === TT_EXACT) return s;
        if (ttE.f === TT_BETA && s >= beta) return s;
        if (ttE.f === TT_ALPHA && s <= alpha) return s;
      }
    }

    if (depth <= 0) return this._quiesce(alpha, beta);

    const inCheck = this.game.isInCheck(side);
    if (inCheck) depth++;

    // Null Move Pruning
    if (allowNull && !inCheck && depth >= 3 && ply > 0) {
      let pcount = 0;
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (this.game.board[r][c] !== EMPTY) pcount++;
      if (pcount > 10) {
        this.game.currentPlayer = -side;
        this.h1 ^= ZOBRIST.side[0]; this.h2 ^= ZOBRIST.side[1];
        const ns = -this._search(depth - 1 - 2, -beta, -beta + 1, ply + 1, false);
        this.game.currentPlayer = side;
        this.h1 ^= ZOBRIST.side[0]; this.h2 ^= ZOBRIST.side[1];
        if (this.stopped) return 0;
        if (ns >= beta) return beta;
      }
    }

    const moves = this.game.getAllMoves(side);
    if (moves.length === 0) return -MATE_SCORE + ply;

    const ordered = this._orderMoves(moves, ttMove, ply);
    let bestMove = ordered[0];
    let bestScore = -Infinity;
    let searched = 0;

    // Static eval for futility pruning
    const canFutile = !inCheck && depth <= 2;
    const staticEval = canFutile ? evaluate(this.game) : 0;
    const futileMargin = depth === 1 ? 200 : 500;

    for (const m of ordered) {
      const isCapture = this.game.board[m.to[0]][m.to[1]] !== EMPTY;

      // Futility pruning at shallow depths
      if (canFutile && searched > 0 && !isCapture && staticEval + futileMargin < alpha) continue;

      this._doMove(...m.from, ...m.to);

      let score;
      if (searched === 0) {
        score = -this._search(depth - 1, -beta, -alpha, ply + 1, true);
      } else {
        // Late Move Reductions
        let reduction = 0;
        if (searched >= 3 && depth >= 3 && !inCheck && !isCapture) {
          reduction = 1;
          if (searched >= 6) reduction = 2;
        }
        // PVS with null window
        score = -this._search(depth - 1 - reduction, -alpha - 1, -alpha, ply + 1, true);
        if (score > alpha && (reduction > 0 || score < beta)) {
          score = -this._search(depth - 1, -beta, -alpha, ply + 1, true);
        }
      }

      this._undoMove();
      if (this.stopped) return 0;

      if (score > bestScore) { bestScore = score; bestMove = m; }
      if (score >= beta) {
        if (!isCapture) { this._storeKiller(m, ply); this._storeHistory(m, depth); }
        this.tt.store(this.h1, this.h2, depth, ttAdjustStore(beta, ply), TT_BETA, bestMove);
        return beta;
      }
      if (score > alpha) alpha = score;
      searched++;
    }

    const flag = bestScore <= origAlpha ? TT_ALPHA : TT_EXACT;
    this.tt.store(this.h1, this.h2, depth, ttAdjustStore(bestScore, ply), flag, bestMove);
    return bestScore;
  }

  // ---------- Iterative Deepening ----------

  getBestMove() {
    this.computeHash();
    this.nodes = 0;
    this.stopped = false;
    this.startTime = Date.now();
    this.killers = [];
    this.history.fill(0);

    const side = this.game.currentPlayer;
    const moves = this.game.getAllMoves(side);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    let bestMove = moves[0];

    for (let depth = 1; depth <= this.maxDepth; depth++) {
      let alpha = -Infinity;
      let iterBest = null;
      let iterScore = -Infinity;

      // Put PV move first
      const pvIdx = moves.findIndex(m => this._movesMatch(m, bestMove));
      if (pvIdx > 0) { const pv = moves.splice(pvIdx, 1)[0]; moves.unshift(pv); }

      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        this._doMove(...m.from, ...m.to);

        let score;
        if (i === 0) {
          score = -this._search(depth - 1, -Infinity, -alpha, 1, true);
        } else {
          score = -this._search(depth - 1, -alpha - 1, -alpha, 1, true);
          if (score > alpha && !this.stopped) {
            score = -this._search(depth - 1, -Infinity, -alpha, 1, true);
          }
        }

        this._undoMove();
        if (this.stopped) break;

        if (score > iterScore) {
          iterScore = score;
          iterBest = m;
        }
        if (score > alpha) alpha = score;
      }

      if (!this.stopped && iterBest) {
        bestMove = iterBest;
      }
      if (Date.now() - this.startTime > this.timeLimit * 0.55) break;
      if (iterScore > MATE_BOUND) break;
    }

    return bestMove;
  }
}
