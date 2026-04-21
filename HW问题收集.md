### 已解决

1. `gameStore` 到底是什么，它在项目里起什么作用？

   1. **上下文**：在接入领域对象时，我发现项目里除了 `Sudoku` / `Game` 以外，还需要一个 `gameStore`。一开始我不清楚它和领域对象是什么关系，也不清楚为什么不能直接让组件去操作 `Game` / `Sudoku` 实例。
   2. **解决手段**：我梳理了 `src/game.js`、`stores/grid.js`、`stores/game.js` 以及 `Board`、`Keyboard`、`Actions` 之间的数据流，并查阅了 Svelte 中 custom store 的用法。
   3. **解决结果**：我理解到，`gameStore` 是领域对象和 Svelte 界面之间的适配层。它内部持有 `Game`，而 `Game` 再持有当前 `Sudoku`；对外则暴露给 UI 可直接消费的响应式状态和方法，例如开始新局、输入、Undo / Redo、胜利状态等。这样组件不需要直接操作领域对象内部状态，而是通过 `gameStore` 统一进入真实游戏流程。

2. `derived store` 是什么，它和普通 `writable store` 有什么区别？

   1. **上下文**：在改造过程中，我看到项目里有 `gameWon`、`invalidCells` 这种通过 `derived(...)` 得到的状态。一开始我不太清楚 `derived store` 和普通 `writable store` 的区别，也不清楚什么时候应该用它。
   2. **解决手段**：我查阅了 Svelte 中关于 `store` / `derived store`的资料，并结合代码里的 `stores/grid.js` 和 `stores/game.js` 来理解。
   3. **解决结果**：我最后理解到，`writable store` 用来保存和更新原始状态，而 `derived store` 用来从已有状态中派生出新的状态。例如 `gameWon` 不需要自己单独维护一套数据，而是可以直接从 `gameStore.won` 派生出来。这样做的好处是响应式来源更统一，也能避免多处重复维护状态。

3. 为什么 `Game.getSudoku()` 要返回 `clone()`，而不是直接返回内部对象？

   1. **上下文**：在实现 `Game` 时，我一开始只想让它能支持 `guess`、`undo`、`redo`，后来才意识到一个问题：如果 `getSudoku()` 直接把内部 `_currentSudoku` 返回给外部，那么外部就可以绕过 `Game.guess()`，直接调用 `sudoku.guess(...)` 修改状态。
   2. **解决手段**：我重新思考和设计了 `Game` 和 `Sudoku` 的职责边界，并结合 Undo / Redo 的历史管理去看待问题。
   3. **解决结果**：我最后把 `getSudoku()` 设计成返回 `clone()`，这样外部拿到的是当前局面的副本，而不是 `Game` 内部真正持有的可变对象。这样可以避免外部绕过 `Game` 直接修改状态，也能保证 Undo / Redo 的历史一致性，让 `Game` 继续作为一局游戏的统一入口。

   ### 未解决

1. 领域对象与 Svelte 真实流程之间的接线还不够稳定

   1. **上下文**：当前实现虽然已经有领域建模基础，但 `src/domain/*` 与 Svelte 真实流程之间的接线仍然存在静态可见的断裂，例如接入层导入路径错误，以及 store 适配层调用了 `Game` 上并不存在的接口。
   2. **尝试解决手段**：我尝试通过 gameStore 作为适配层，把界面流程统一导向 `Game` / `Sudoku`，也尽量减少组件直接操作旧数组的情况。


2. 领域接口和 View-Model / store adapter 之间的连接还没有完全对齐

   1. **上下文**：我的适配层依赖了 Game上不存在的接口，例如 `sync()` 调用 `getViewData()`，`applyHint()` 调用 `game.applyHint()`，但 `Game` 本身并没有完整提供这组接口。这说明领域层和接入层之间的契约没有完全对齐。
   2. **尝试解决手段**：我已经在 Game 中补充了核心的 `guess()`、`undo()`、`redo()`、`getSudoku()` 等能力，也尝试让 UI  `gameStore` 间接访问领域对象。
   

3. Undo / Redo 虽然在领域层语义清楚，但在真实界面层的同步还不够放心

   1. **上下文**：当前实现中 `Game` 的 Undo / Redo 语义本身是清楚的，但 `canUndo` / `canRedo` 在适配层同步到 UI 时存在问题，操作栏按钮也依赖这些状态来控制禁用态。如果同步不完整，就会出现领域层能回退，但界面层表现不出来的问题。
   2. **尝试解决手段**：我尝试把撤销/重做逻辑集中在 `Game` 内部，并通过 `gameStore` 把操作入口接到界面上，而不是再把历史逻辑散在组件中。
  

