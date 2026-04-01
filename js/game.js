export const EMPTY = 0;
export const RED = 1;
export const BLACK = -1;

export const R_KING = 1;
export const R_ADVISOR = 2;
export const R_ELEPHANT = 3;
export const R_HORSE = 4;
export const R_CHARIOT = 5;
export const R_CANNON = 6;
export const R_PAWN = 7;

export const ROWS = 10;
export const COLS = 9;

export const PIECE_CHARS = {
  [R_KING]: '帅', [R_ADVISOR]: '仕', [R_ELEPHANT]: '相',
  [R_HORSE]: '馬', [R_CHARIOT]: '車', [R_CANNON]: '砲', [R_PAWN]: '兵',
  [-R_KING]: '将', [-R_ADVISOR]: '士', [-R_ELEPHANT]: '象',
  [-R_HORSE]: '马', [-R_CHARIOT]: '车', [-R_CANNON]: '炮', [-R_PAWN]: '卒',
};

export const INITIAL_BOARD = [
  [-5, -4, -3, -2, -1, -2, -3, -4, -5],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0, -6,  0,  0,  0,  0,  0, -6,  0],
  [-7,  0, -7,  0, -7,  0, -7,  0, -7],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 7,  0,  7,  0,  7,  0,  7,  0,  7],
  [ 0,  6,  0,  0,  0,  0,  0,  6,  0],
  [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
  [ 5,  4,  3,  2,  1,  2,  3,  4,  5],
];

export function getSide(piece) {
  if (piece > 0) return RED;
  if (piece < 0) return BLACK;
  return EMPTY;
}

export function absPiece(piece) {
  return Math.abs(piece);
}

function onBoard(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function inPalace(r, c, side) {
  if (c < 3 || c > 5) return false;
  return side === RED ? (r >= 7 && r <= 9) : (r >= 0 && r <= 2);
}

function onOwnSide(r, side) {
  return side === RED ? r >= 5 : r <= 4;
}

export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = INITIAL_BOARD.map(row => [...row]);
    this.currentPlayer = RED;
    this.moveHistory = [];
    this.gameOver = false;
    this.winner = null;
    this.lastMove = null;
  }

  getPiece(r, c) {
    return this.board[r][c];
  }

  getMovesForPiece(r, c) {
    const piece = this.board[r][c];
    if (piece === EMPTY) return [];
    const side = getSide(piece);
    const type = absPiece(piece);
    let raw;
    switch (type) {
      case R_KING:     raw = this._kingMoves(r, c, side); break;
      case R_ADVISOR:  raw = this._advisorMoves(r, c, side); break;
      case R_ELEPHANT: raw = this._elephantMoves(r, c, side); break;
      case R_HORSE:    raw = this._horseMoves(r, c, side); break;
      case R_CHARIOT:  raw = this._chariotMoves(r, c, side); break;
      case R_CANNON:   raw = this._cannonMoves(r, c, side); break;
      case R_PAWN:     raw = this._pawnMoves(r, c, side); break;
      default:         raw = [];
    }
    return raw.filter(([tr, tc]) => !this._wouldBeInCheck(r, c, tr, tc, side));
  }

  _kingMoves(r, c, side) {
    const moves = [];
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nr = r + dr, nc = c + dc;
      if (onBoard(nr, nc) && inPalace(nr, nc, side)) {
        const t = this.board[nr][nc];
        if (t === EMPTY || getSide(t) !== side) moves.push([nr, nc]);
      }
    }
    return moves;
  }

  _advisorMoves(r, c, side) {
    const moves = [];
    for (const [dr, dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const nr = r + dr, nc = c + dc;
      if (onBoard(nr, nc) && inPalace(nr, nc, side)) {
        const t = this.board[nr][nc];
        if (t === EMPTY || getSide(t) !== side) moves.push([nr, nc]);
      }
    }
    return moves;
  }

  _elephantMoves(r, c, side) {
    const moves = [];
    for (const [dr, dc] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
      const nr = r + dr, nc = c + dc;
      const er = r + dr / 2, ec = c + dc / 2;
      if (onBoard(nr, nc) && onOwnSide(nr, side) && this.board[er][ec] === EMPTY) {
        const t = this.board[nr][nc];
        if (t === EMPTY || getSide(t) !== side) moves.push([nr, nc]);
      }
    }
    return moves;
  }

  _horseMoves(r, c, side) {
    const moves = [];
    const legs = [
      [-1, 0, [[-2,-1],[-2,1]]],
      [ 1, 0, [[ 2,-1],[ 2,1]]],
      [ 0,-1, [[-1,-2],[ 1,-2]]],
      [ 0, 1, [[-1, 2],[ 1, 2]]],
    ];
    for (const [lr, lc, targets] of legs) {
      if (!onBoard(r+lr, c+lc) || this.board[r+lr][c+lc] !== EMPTY) continue;
      for (const [dr, dc] of targets) {
        const nr = r + dr, nc = c + dc;
        if (onBoard(nr, nc)) {
          const t = this.board[nr][nc];
          if (t === EMPTY || getSide(t) !== side) moves.push([nr, nc]);
        }
      }
    }
    return moves;
  }

  _chariotMoves(r, c, side) {
    const moves = [];
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let nr = r + dr, nc = c + dc;
      while (onBoard(nr, nc)) {
        const t = this.board[nr][nc];
        if (t === EMPTY) {
          moves.push([nr, nc]);
        } else {
          if (getSide(t) !== side) moves.push([nr, nc]);
          break;
        }
        nr += dr; nc += dc;
      }
    }
    return moves;
  }

  _cannonMoves(r, c, side) {
    const moves = [];
    for (const [dr, dc] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      let nr = r + dr, nc = c + dc;
      let jumped = false;
      while (onBoard(nr, nc)) {
        const t = this.board[nr][nc];
        if (!jumped) {
          if (t === EMPTY) { moves.push([nr, nc]); }
          else { jumped = true; }
        } else {
          if (t !== EMPTY) {
            if (getSide(t) !== side) moves.push([nr, nc]);
            break;
          }
        }
        nr += dr; nc += dc;
      }
    }
    return moves;
  }

  _pawnMoves(r, c, side) {
    const moves = [];
    const fwd = side === RED ? -1 : 1;
    const crossed = !onOwnSide(r, side);
    const nr = r + fwd;
    if (onBoard(nr, c)) {
      const t = this.board[nr][c];
      if (t === EMPTY || getSide(t) !== side) moves.push([nr, c]);
    }
    if (crossed) {
      for (const dc of [-1, 1]) {
        const nc = c + dc;
        if (onBoard(r, nc)) {
          const t = this.board[r][nc];
          if (t === EMPTY || getSide(t) !== side) moves.push([r, nc]);
        }
      }
    }
    return moves;
  }

  _kingsAreFacing(board) {
    let rk = null, bk = null;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === R_KING) rk = [r, c];
        if (board[r][c] === -R_KING) bk = [r, c];
      }
    }
    if (!rk || !bk || rk[1] !== bk[1]) return false;
    const [minR, maxR] = rk[0] < bk[0] ? [rk[0], bk[0]] : [bk[0], rk[0]];
    for (let r = minR + 1; r < maxR; r++) {
      if (board[r][rk[1]] !== EMPTY) return false;
    }
    return true;
  }

  _wouldBeInCheck(fr, fc, tr, tc, side) {
    const piece = this.board[fr][fc];
    const captured = this.board[tr][tc];
    this.board[tr][tc] = piece;
    this.board[fr][fc] = EMPTY;
    const bad = this.isInCheck(side) || this._kingsAreFacing(this.board);
    this.board[fr][fc] = piece;
    this.board[tr][tc] = captured;
    return bad;
  }

  isInCheck(side) {
    const kv = side === RED ? R_KING : -R_KING;
    let kr = -1, kc = -1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] === kv) { kr = r; kc = c; break; }
      }
      if (kr >= 0) break;
    }
    if (kr < 0) return true;

    const opp = -side;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = this.board[r][c];
        if (getSide(p) !== opp) continue;
        const type = absPiece(p);
        let moves;
        switch (type) {
          case R_KING:     moves = this._kingMoves(r, c, opp); break;
          case R_ADVISOR:  moves = this._advisorMoves(r, c, opp); break;
          case R_ELEPHANT: moves = this._elephantMoves(r, c, opp); break;
          case R_HORSE:    moves = this._horseMoves(r, c, opp); break;
          case R_CHARIOT:  moves = this._chariotMoves(r, c, opp); break;
          case R_CANNON:   moves = this._cannonMoves(r, c, opp); break;
          case R_PAWN:     moves = this._pawnMoves(r, c, opp); break;
          default:         moves = [];
        }
        if (moves.some(([mr, mc]) => mr === kr && mc === kc)) return true;
      }
    }
    return false;
  }

  findKing(side) {
    const kv = side === RED ? R_KING : -R_KING;
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (this.board[r][c] === kv) return [r, c];
    return null;
  }

  getAllMoves(side) {
    const all = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (getSide(this.board[r][c]) === side) {
          for (const [tr, tc] of this.getMovesForPiece(r, c)) {
            all.push({ from: [r, c], to: [tr, tc] });
          }
        }
      }
    }
    return all;
  }

  makeMove(fr, fc, tr, tc) {
    const piece = this.board[fr][fc];
    const captured = this.board[tr][tc];
    this.moveHistory.push({ from: [fr, fc], to: [tr, tc], piece, captured, player: this.currentPlayer });
    this.board[tr][tc] = piece;
    this.board[fr][fc] = EMPTY;
    this.lastMove = { from: [fr, fc], to: [tr, tc] };
    this.currentPlayer = -this.currentPlayer;
    return captured;
  }

  checkGameOver() {
    const moves = this.getAllMoves(this.currentPlayer);
    if (moves.length === 0) {
      this.gameOver = true;
      this.winner = -this.currentPlayer;
    }
    const oppKing = this.findKing(-this.currentPlayer);
    if (!oppKing) {
      this.gameOver = true;
      this.winner = this.currentPlayer;
    }
  }

  undoMove() {
    if (this.moveHistory.length === 0) return false;
    const last = this.moveHistory.pop();
    this.board[last.from[0]][last.from[1]] = last.piece;
    this.board[last.to[0]][last.to[1]] = last.captured;
    this.currentPlayer = last.player;
    this.gameOver = false;
    this.winner = null;
    this.lastMove = this.moveHistory.length > 0
      ? { from: this.moveHistory.at(-1).from, to: this.moveHistory.at(-1).to }
      : null;
    return true;
  }
}
