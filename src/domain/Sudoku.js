
import { printSudoku, solveSudoku } from '@sudoku/sudoku';

export class Sudoku {
  constructor(initialGrid, currentGrid = null) {
    this._initialGrid = this._deepCopy(initialGrid);
    this._grid = currentGrid ? this._deepCopy(currentGrid) : this._deepCopy(initialGrid);
    this._fixed = this._initialGrid.map(row => row.map(cell => cell !== 0));
    this._solution = solveSudoku(this._initialGrid);
  }

  _deepCopy(grid) {
    return grid.map(row => [...row]);
  }

  getGrid() {
    return this._deepCopy(this._grid);
  }

  getInitialGrid() {
    return this._deepCopy(this._initialGrid);
  }

  isFixed(row, col) {
    return this._fixed[row][col];
  }

  _isValidPosition(row, col) {
    return Number.isInteger(row) && Number.isInteger(col)
      && row >= 0 && row < 9
      && col >= 0 && col < 9;
  }

  _isValidValue(value) {
    return Number.isInteger(value) && value >= 0 && value <= 9;
  }

  guess(move) {
    const { row, col, value } = move;
    const nextValue = value ?? 0;

    if (!this._isValidPosition(row, col)) return false;
    if (!this._isValidValue(nextValue)) return false;
    if (this.isFixed(row, col)) return false;
    if (this._grid[row][col] === nextValue) return false;

    this._grid[row][col] = nextValue;
    return true;
  }

  _hasRowConflict(row, col, value) {
    for (let c = 0; c < 9; c++) {
      if (c !== col && this._grid[row][c] === value) return true;
    }
    return false;
  }

  _hasColConflict(row, col, value) {
    for (let r = 0; r < 9; r++) {
      if (r !== row && this._grid[r][col] === value) return true;
    }
    return false;
  }

  _hasBoxConflict(row, col, value) {
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;

    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && this._grid[r][c] === value) return true;
      }
    }

    return false;
  }

  isInvalidCell(row, col) {
    const value = this._grid[row][col];
    if (value === 0) return false;

    return this._hasRowConflict(row, col, value)
      || this._hasColConflict(row, col, value)
      || this._hasBoxConflict(row, col, value);
  }

  getInvalidCells() {
    const invalid = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this.isInvalidCell(row, col)) {
          invalid.push(`${col},${row}`);
        }
      }
    }

    return invalid;
  }

  isComplete() {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (this._grid[row][col] === 0) return false;
      }
    }
    return true;
  }

  isWon() {
    return this.isComplete() && this.getInvalidCells().length === 0;
  }

  getSolutionValue(row, col) {
    return this._solution[row][col];
  }

  getViewData() {
    return {
      initialGrid: this.getInitialGrid(),
      grid: this.getGrid(),
      invalidCells: this.getInvalidCells(),
      won: this.isWon(),
    };
  }

  clone() {
    return new Sudoku(this._initialGrid, this._grid);
  }

  toJSON() {
    return {
      initialGrid: this.getInitialGrid(),
      grid: this.getGrid(),
    };
  }

  toString() {
    return printSudoku(this._grid);
  }

  static fromJSON(json) {
    const initialGrid = json.initialGrid ?? json.grid;
    return new Sudoku(initialGrid, json.grid);
  }
}
