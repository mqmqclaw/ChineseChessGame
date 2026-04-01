import { Game, RED, BLACK, EMPTY, getSide } from './game.js';
import { ChessAI } from './ai.js';
import { Renderer } from './renderer.js';

class App {
  constructor() {
    this.game = new Game();
    this.ai = new ChessAI(this.game);
    this.ai.setDifficulty('medium');
    this.canvas = document.getElementById('board');
    this.renderer = new Renderer(this.canvas);
    this.statusEl = document.getElementById('status');
    this.thinkingEl = document.getElementById('thinking');

    this.playerSide = RED;
    this.selectedPos = null;
    this.validMoves = [];
    this.aiThinking = false;

    this._bindEvents();
    this._resize();
    this._render();
    this._updateStatus();
  }

  _bindEvents() {
    this.canvas.addEventListener('click', (e) => this._handleClick(e));
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      const rect = this.canvas.getBoundingClientRect();
      this._handleBoardInput(touch.clientX - rect.left, touch.clientY - rect.top);
    });

    window.addEventListener('resize', () => this._resize());

    document.getElementById('btn-new').addEventListener('click', () => this.newGame());
    document.getElementById('btn-undo').addEventListener('click', () => this.undoMove());
    document.getElementById('difficulty').addEventListener('change', (e) => {
      this.ai.setDifficulty(e.target.value);
    });
  }

  _resize() {
    const container = document.getElementById('game-container');
    const maxW = Math.min(container.clientWidth, 560);
    const maxH = window.innerHeight * 0.68;
    this.renderer.resize(maxW, maxH);
    this._render();
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    this._handleBoardInput(e.clientX - rect.left, e.clientY - rect.top);
  }

  _handleBoardInput(cx, cy) {
    if (this.aiThinking || this.game.gameOver) return;
    if (this.game.currentPlayer !== this.playerSide) return;

    const pos = this.renderer.canvasToBoard(cx, cy);
    if (!pos) return;
    const { row, col } = pos;

    if (this.selectedPos) {
      if (this.validMoves.some(([r, c]) => r === row && c === col)) {
        this._playerMove(row, col);
        return;
      }
      const piece = this.game.getPiece(row, col);
      if (piece !== EMPTY && getSide(piece) === this.playerSide) {
        this._selectPiece(row, col);
        return;
      }
      this._deselect();
      return;
    }

    const piece = this.game.getPiece(row, col);
    if (piece !== EMPTY && getSide(piece) === this.playerSide) {
      this._selectPiece(row, col);
    }
  }

  _selectPiece(r, c) {
    this.selectedPos = [r, c];
    this.validMoves = this.game.getMovesForPiece(r, c);
    this._render();
  }

  _deselect() {
    this.selectedPos = null;
    this.validMoves = [];
    this._render();
  }

  _playerMove(tr, tc) {
    const [fr, fc] = this.selectedPos;
    this.game.makeMove(fr, fc, tr, tc);
    this._deselect();
    this.game.checkGameOver();
    this._updateStatus();
    this._render();

    if (!this.game.gameOver) {
      this._triggerAI();
    }
  }

  _triggerAI() {
    this.aiThinking = true;
    this.thinkingEl.style.display = 'inline-flex';
    this._updateStatus();

    setTimeout(() => {
      const move = this.ai.getBestMove();
      if (move) {
        this.game.makeMove(...move.from, ...move.to);
        this.game.checkGameOver();
      }
      this.aiThinking = false;
      this.thinkingEl.style.display = 'none';
      this._updateStatus();
      this._render();
    }, 50);
  }

  _updateStatus() {
    if (this.game.gameOver) {
      const winner = this.game.winner === RED ? '红方' : '黑方';
      this.statusEl.innerHTML = `<span class="status-gameover">棋局结束 — ${winner}获胜！</span>`;
      return;
    }

    const turn = this.game.currentPlayer === RED ? '红方' : '黑方';
    const turnClass = this.game.currentPlayer === RED ? 'turn-red' : 'turn-black';
    let text = `<span class="${turnClass}">${turn}走棋</span>`;

    if (this.aiThinking) {
      text = `<span class="turn-black">AI 思考中</span>`;
    } else if (this.game.isInCheck(this.game.currentPlayer)) {
      text += ' <span class="status-check">— 将军！</span>';
    }
    this.statusEl.innerHTML = text;
  }

  _render() {
    this.renderer.draw(this.game, {
      selectedPos: this.selectedPos,
      validMoves: this.validMoves,
    });
  }

  newGame() {
    this.game.reset();
    this._deselect();
    this.aiThinking = false;
    this.thinkingEl.style.display = 'none';
    this._updateStatus();
    this._render();
  }

  undoMove() {
    if (this.aiThinking || this.game.moveHistory.length === 0) return;
    // Undo AI's move and player's move (2 moves if both exist)
    this.game.undoMove();
    if (this.game.moveHistory.length > 0 && this.game.currentPlayer !== this.playerSide) {
      this.game.undoMove();
    }
    this._deselect();
    this._updateStatus();
    this._render();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}
