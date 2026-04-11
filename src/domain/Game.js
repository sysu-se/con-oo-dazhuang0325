import { Sudoku } from './Sudoku.js';

export class Game {
  constructor(sudoku) {
    this._currentSudoku = sudoku.clone();
    this._past = [];
    this._future = [];
  }

  getSudoku() {
    return this._currentSudoku.clone();
  }

  guess(move) {
    const before = this._currentSudoku.clone();
    const changed = this._currentSudoku.guess(move);

    if (!changed) return false;

    this._past.push(before);
    this._future = [];
    return true;
  }

  undo() {
    if (!this.canUndo()) return false;

    this._future.push(this._currentSudoku.clone());
    this._currentSudoku = this._past.pop();
    return true;
  }

  redo() {
    if (!this.canRedo()) return false;

    this._past.push(this._currentSudoku.clone());
    this._currentSudoku = this._future.pop();
    return true;
  }

  canUndo() {
    return this._past.length > 0;
  }

  canRedo() {
    return this._future.length > 0;
  }

  toJSON() {
    return {
      currentSudoku: this._currentSudoku.toJSON(),
      past: this._past.map(s => s.toJSON()),
      future: this._future.map(s => s.toJSON())
    };
  }

  static fromJSON(json) {
    const game = new Game(Sudoku.fromJSON(json.currentSudoku));
    game._past = (json.past ?? []).map(item => Sudoku.fromJSON(item));
    game._future = (json.future ?? []).map(item => Sudoku.fromJSON(item));
    return game;
  }
}
