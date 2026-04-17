# con-oo-dazhuang0325 - Review

## Review 结论

当前实现有一定领域建模基础，但 `src/domain/*` 与 Svelte 真实流程之间的接线存在多处静态可见的断裂。按作业要求看，尚不能认为已经把领域对象稳定地接入到真实游戏流程中。

## 总体评价

| 维度 | 评价 |
| --- | --- |
| OOP | fair |
| JS Convention | poor |
| Sudoku Business | fair |
| OOD | fair |

## 缺点

### 1. 接入层导入领域对象的相对路径错误

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameStore.js:5-6
- 原因：`src/node_modules/@sudoku/stores/gameStore.js` 位于 `src/node_modules/@sudoku/stores`，但使用 `../domain/Sudoku.js` 和 `../domain/Game.js` 会解析到不存在的 `src/node_modules/@sudoku/domain/*`，按静态路径推断无法正确导入真正的 `src/domain/*`。这意味着 Svelte 接入链路在模块边界就已经断开。

### 2. Store 适配层依赖了 Game 上不存在的接口

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameStore.js:38-76; src/domain/Game.js:3-63
- 原因：`sync()` 调用 `game.getViewData()`，`applyHint()` 调用 `game.applyHint()`，但 `Game` 类只提供 `guess`、`undo`、`redo`、`canUndo`、`canRedo`、`getSudoku` 和序列化接口。这里暴露出领域接口与 View-Model 契约没有对齐，导致“开始一局游戏”和“Hint”这类真实流程无法可靠落到领域对象上。

### 3. Undo/Redo 能力没有被正确同步到 UI

- 严重程度：core
- 位置：src/node_modules/@sudoku/stores/gameStore.js:22-31,44-47; src/components/Controls/ActionBar/Actions.svelte:43-58
- 原因：`createEmptyState()` 定义了 `canUndo/canRedo`，但 `sync()` 覆盖状态时没有把这两个字段回填进去；而操作栏按钮又依赖 `$gameStore.canUndo` 和 `$gameStore.canRedo` 控制禁用态。按静态阅读，这会让撤销/重做在界面层始终不可用，未满足作业对真实接入 Undo/Redo 的要求。

### 4. 单元格点击没有按 Svelte 事件惯例注册处理函数

- 严重程度：major
- 位置：src/components/Board/Cell.svelte:39
- 原因：`on:click={cursor.set(cellX - 1, cellY - 1)}` 会在渲染阶段立即求值，而不是在点击时调用。这样光标选择流程无法可靠工作，用户输入链路并没有被正确接入到游戏状态。

### 5. Sudoku 直接产出面向 UI 的表示，职责边界向 View 泄漏

- 严重程度：major
- 位置：src/domain/Sudoku.js:87-125
- 原因：`getInvalidCells()` 返回 `"x,y"` 字符串，`getViewData()` 直接打包 `initialGrid/grid/invalidCells/won` 这类 View 状态。按作业推荐方案，这类面向 Svelte 的投影更适合放在 store adapter；现在 `Sudoku` 同时承担规则计算和界面表示，削弱了领域模型的稳定性与可复用性。

### 6. Undo/Redo 快照策略过重，且 clone 会重复求解整盘数独

- 严重程度：major
- 位置：src/domain/Game.js:14-21; src/domain/Sudoku.js:9,127-129
- 原因：`Game.guess()` 每次输入前都克隆整份 `Sudoku` 进入历史，而 `Sudoku.clone()` 会重新走构造函数，再次执行 `solveSudoku(initialGrid)`。这让一次普通输入的成本绑定到求解器，说明历史存储和快照策略没有设计好，也不符合本次作业鼓励改进 snapshot/history 策略的方向。

### 7. 领域层通过硬编码相对路径直连 node_modules 实现

- 严重程度：minor
- 位置：src/domain/Sudoku.js:2
- 原因：`../node_modules/@sudoku/sudoku.js` 把领域对象绑定到当前目录布局，而不是通过包名或稳定适配层依赖公共能力。这不符合常见 JS 工程的模块引用习惯，也让领域层更难迁移和复用。

## 优点

### 1. 通过防御性拷贝和 fixed 掩码保护核心状态

- 位置：src/domain/Sudoku.js:5-8,16-25,38-49
- 原因：构造函数复制初始盘面与当前盘面，并基于初始盘面生成 `_fixed`；`getGrid()`/`getInitialGrid()` 也返回拷贝。这避免了外部直接篡改内部数组，同时保证 givens 不能被普通输入覆盖。

### 2. 数独冲突检测和胜利判定集中在领域层

- 位置：src/domain/Sudoku.js:51-112
- 原因：行、列、宫冲突检查以及 `isWon()` 都放在 `Sudoku` 内部，而不是散落在组件事件里。就业务建模而言，这一部分抓住了数独游戏的核心规则。

### 3. Undo/Redo 语义本身是清晰的

- 位置：src/domain/Game.js:14-39
- 原因：`guess()` 成功后写入 past 并清空 future，`undo()`/`redo()` 分别维护两个栈，符合常见历史回退模型。即使实现仍偏重，这个职责分配方向是对的。

### 4. 接入方向总体采用了 store adapter，而不是让组件直接改二维数组

- 位置：src/node_modules/@sudoku/stores/grid.js:6-17,29-46; src/components/Board/index.svelte:40-51; src/components/Controls/Keyboard.svelte:14-34
- 原因：Board 从响应式 store 读取盘面，Keyboard 通过 `userGrid.set()` 把输入送入 `gameStore.guess()`。从架构意图看，这比把关键逻辑继续写在 `.svelte` 组件里更接近作业推荐的接入方式。

## 补充说明

- 本次结论仅基于静态阅读 `src/domain/*`、`src/node_modules/@sudoku/stores/*` 以及直接相关的 Svelte 组件，未运行测试、未启动应用；关于导入失败、接口缺失和事件不触发的判断都来自代码路径与接口对照。
- 按用户要求，评审范围没有扩展到无关目录，也没有检查 `DESIGN.md` 是否解释了响应式原理，因此文档质量不在本次结论内。
- `src/node_modules/@sudoku/*` 虽不在 `src/domain/*` 下，但它是当前领域对象接入 Svelte 的实际桥接层，所以相关结论建立在这些接线文件的静态审查之上。
