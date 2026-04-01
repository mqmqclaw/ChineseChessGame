import { ROWS, COLS, EMPTY, RED, BLACK, PIECE_CHARS, getSide, absPiece, R_KING } from './game.js';

const BOARD_BG    = '#f0c874';
const LINE_COLOR  = '#5a3215';
const RED_COLOR   = '#c0392b';
const BLACK_COLOR = '#1a1a2e';
const PIECE_BG    = '#faebd7';
const PIECE_BORDER = '#8b6914';
const SELECT_COLOR = 'rgba(46,204,113,0.55)';
const VALID_COLOR  = 'rgba(46,204,113,0.45)';
const LAST_COLOR   = 'rgba(241,196,15,0.35)';
const CHECK_COLOR  = 'rgba(231,76,60,0.5)';

const PIECE_FONT_FAMILY = '"STKaiti","KaiTi","Noto Serif SC","Songti SC","SimSun",serif';

// Positions that have corner decorations (cannon & pawn starting spots)
const DECO_POSITIONS = [
  [2,1],[2,7],[7,1],[7,7],
  [3,0],[3,2],[3,4],[3,6],[3,8],
  [6,0],[6,2],[6,4],[6,6],[6,8],
];

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = 0;
    this.padding = 0;
    this.pieceRadius = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  resize(containerWidth, maxHeight) {
    const dpr = window.devicePixelRatio || 1;
    const padCells = 1.3;
    const cellFromW = (containerWidth) / (8 + padCells * 2);
    const cellFromH = (maxHeight) / (9 + padCells * 2);
    this.cellSize = Math.floor(Math.min(cellFromW, cellFromH));
    this.padding = Math.floor(this.cellSize * padCells);
    this.pieceRadius = Math.floor(this.cellSize * 0.43);

    const w = this.cellSize * 8 + this.padding * 2;
    const h = this.cellSize * 9 + this.padding * 2;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offsetX = this.padding;
    this.offsetY = this.padding;
  }

  boardToCanvas(r, c) {
    return {
      x: this.offsetX + c * this.cellSize,
      y: this.offsetY + r * this.cellSize,
    };
  }

  canvasToBoard(cx, cy) {
    const c = Math.round((cx - this.offsetX) / this.cellSize);
    const r = Math.round((cy - this.offsetY) / this.cellSize);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    const pos = this.boardToCanvas(r, c);
    const dist = Math.hypot(cx - pos.x, cy - pos.y);
    if (dist > this.cellSize * 0.5) return null;
    return { row: r, col: c };
  }

  draw(game, uiState) {
    const ctx = this.ctx;
    const w = parseFloat(this.canvas.style.width);
    const h = parseFloat(this.canvas.style.height);
    ctx.clearRect(0, 0, w, h);

    this._drawBoardBackground(w, h);
    this._drawGrid();
    this._drawPalace();
    this._drawRiver();
    this._drawDecorations();
    this._drawLabels();

    if (game.lastMove) this._drawLastMove(game.lastMove);
    if (uiState.selectedPos) this._drawSelection(uiState.selectedPos);
    if (uiState.validMoves) this._drawValidMoves(uiState.validMoves, game);

    if (game.isInCheck(game.currentPlayer)) {
      const kp = game.findKing(game.currentPlayer);
      if (kp) this._drawCheckGlow(kp);
    }

    this._drawPieces(game);
  }

  _drawBoardBackground(w, h) {
    const ctx = this.ctx;
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#a07030';
    ctx.lineWidth = 2;
    const tl = this.boardToCanvas(0, 0);
    const br = this.boardToCanvas(9, 8);
    ctx.strokeRect(tl.x - 6, tl.y - 6, br.x - tl.x + 12, br.y - tl.y + 12);
    ctx.restore();
  }

  _drawGrid() {
    const ctx = this.ctx;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.2;

    for (let r = 0; r < ROWS; r++) {
      const l = this.boardToCanvas(r, 0);
      const ri = this.boardToCanvas(r, 8);
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(ri.x, ri.y); ctx.stroke();
    }

    for (let c = 0; c < COLS; c++) {
      if (c === 0 || c === 8) {
        const t = this.boardToCanvas(0, c);
        const b = this.boardToCanvas(9, c);
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else {
        const t = this.boardToCanvas(0, c);
        const m1 = this.boardToCanvas(4, c);
        ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(m1.x, m1.y); ctx.stroke();
        const m2 = this.boardToCanvas(5, c);
        const b = this.boardToCanvas(9, c);
        ctx.beginPath(); ctx.moveTo(m2.x, m2.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }

  _drawPalace() {
    const ctx = this.ctx;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.2;

    const draw = (r1, c1, r2, c2) => {
      const a = this.boardToCanvas(r1, c1);
      const b = this.boardToCanvas(r2, c2);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    draw(0, 3, 2, 5); draw(0, 5, 2, 3);
    draw(7, 3, 9, 5); draw(7, 5, 9, 3);
  }

  _drawRiver() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const left = this.boardToCanvas(4, 0);
    const right = this.boardToCanvas(4, 8);

    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(left.x + 1, left.y + 1, right.x - left.x - 2, cs - 2);

    ctx.fillStyle = LINE_COLOR;
    ctx.font = `bold ${Math.floor(cs * 0.42)}px ${PIECE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const midY = left.y + cs / 2;
    ctx.fillText('楚  河', left.x + cs * 2, midY);
    ctx.fillText('漢  界', right.x - cs * 2, midY);
  }

  _drawDecorations() {
    const ctx = this.ctx;
    const len = this.cellSize * 0.12;
    const gap = this.cellSize * 0.06;
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 1.2;

    for (const [r, c] of DECO_POSITIONS) {
      const { x, y } = this.boardToCanvas(r, c);
      const sides = [];
      if (c > 0) sides.push([-1, -1], [-1, 1]);
      if (c < 8) sides.push([1, -1], [1, 1]);

      for (const [sx, sy] of sides) {
        ctx.beginPath();
        ctx.moveTo(x + sx * gap, y + sy * (gap + len));
        ctx.lineTo(x + sx * gap, y + sy * gap);
        ctx.lineTo(x + sx * (gap + len), y + sy * gap);
        ctx.stroke();
      }
    }
  }

  _drawLabels() {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const fontSize = Math.floor(cs * 0.28);
    ctx.fillStyle = '#8b6914';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const redLabels = '九八七六五四三二一';
    const blackLabels = '１２３４５６７８９';
    for (let c = 0; c < COLS; c++) {
      const { x } = this.boardToCanvas(0, c);
      ctx.fillText(blackLabels[c], x, this.offsetY - cs * 0.45);
      ctx.fillText(redLabels[c], x, this.offsetY + 9 * cs + cs * 0.45);
    }
  }

  _drawLastMove(move) {
    const ctx = this.ctx;
    ctx.fillStyle = LAST_COLOR;
    for (const pos of [move.from, move.to]) {
      const { x, y } = this.boardToCanvas(pos[0], pos[1]);
      ctx.beginPath();
      ctx.arc(x, y, this.pieceRadius + 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawSelection(pos) {
    const ctx = this.ctx;
    const { x, y } = this.boardToCanvas(pos[0], pos[1]);
    ctx.save();
    ctx.shadowColor = 'rgba(46,204,113,0.8)';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = SELECT_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, this.pieceRadius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  _drawValidMoves(moves, game) {
    const ctx = this.ctx;
    for (const [r, c] of moves) {
      const { x, y } = this.boardToCanvas(r, c);
      const isCapture = game.board[r][c] !== EMPTY;
      if (isCapture) {
        ctx.strokeStyle = 'rgba(231,76,60,0.6)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x, y, this.pieceRadius + 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = VALID_COLOR;
        ctx.beginPath();
        ctx.arc(x, y, this.cellSize * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawCheckGlow(pos) {
    const ctx = this.ctx;
    const { x, y } = this.boardToCanvas(pos[0], pos[1]);
    ctx.save();
    ctx.shadowColor = 'rgba(231,76,60,0.9)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = CHECK_COLOR;
    ctx.beginPath();
    ctx.arc(x, y, this.pieceRadius + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawPieces(game) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = game.board[r][c];
        if (p !== EMPTY) this._drawPiece(r, c, p);
      }
    }
  }

  _drawPiece(r, c, piece) {
    const ctx = this.ctx;
    const { x, y } = this.boardToCanvas(r, c);
    const radius = this.pieceRadius;
    const side = getSide(piece);

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    const grad = ctx.createRadialGradient(x - radius * 0.2, y - radius * 0.2, radius * 0.1, x, y, radius);
    grad.addColorStop(0, '#fff8e8');
    grad.addColorStop(0.7, PIECE_BG);
    grad.addColorStop(1, '#d4b896');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = PIECE_BORDER;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = side === RED ? '#e0a0a0' : '#a0a0b0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    const charSize = Math.floor(radius * 1.2);
    ctx.fillStyle = side === RED ? RED_COLOR : BLACK_COLOR;
    ctx.font = `bold ${charSize}px ${PIECE_FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(PIECE_CHARS[piece], x, y + 1);
  }
}
