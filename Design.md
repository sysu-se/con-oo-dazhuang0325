
# DESIGN

## 1. 本次作业的目标

本次 Homework 1.1 的目标不是只让 `Sudoku` / `Game` 在测试中可用，而是让它们真正进入现有 Svelte 游戏流程中，成为真实界面的核心。我的实现围绕两个问题展开：

1. Svelte 的响应式机制如何与领域对象协作。
2. View 层如何消费 `Sudoku` / `Game`。

## 2. 领域对象设计

### 2.1 Sudoku 的职责

`Sudoku` 负责表示当前数独局面，并承担数独规则相关的职责。它至少包含以下能力：

- 持有当前 grid / board 数据
- 提供 `guess(...)` 接口
- 提供校验能力
- 提供外表化能力，如 `toString()` / `toJSON()`
- 支持 Undo / Redo 所需的状态演进

在我的实现中，`Sudoku` 负责维护题面数据、当前局面、复制、序列化，以及与局面本身直接相关的规则判断。

### 2.2 Game 的职责

`Game` 负责表示“一局游戏”的会话状态，并承担历史管理相关的职责。它至少包含以下能力：

- 持有当前 `Sudoku`
- 管理历史
- 提供 `undo()` / `redo()`
- 对外提供面向 UI 的游戏操作入口

在我的实现中，`Game` 不直接负责 UI 渲染，而是负责组织 `Sudoku` 的状态变化，并维护撤销/重做历史。

## 3. View 层如何消费领域对象

### 3.1 View 层直接消费的对象

View 层不直接操作 `Sudoku` 或 `Game` 实例本身，也不直接修改旧的二维数组。  
View 层直接消费的是一个面向 Svelte 的 adapter/store：`[你的 store 名称，例如 gameStore]`。

这个 adapter/store 内部持有 `Game`，由 `Game` 持有当前 `Sudoku`。因此，领域层与 UI 之间通过一个响应式边界进行连接。

### 3.2 View 层拿到的数据

View 层从 `[gameStore]` 中拿到响应式状态，例如：

- `grid`
- `invalidCells`
- `won`
- `canUndo`
- `canRedo`
- `[如果你还有 initialGrid / selectedCell 等，也写上]`

这些数据不是组件自己推导出的旧状态，而是由领域对象当前状态导出的视图状态。

### 3.3 用户操作如何进入领域对象

用户操作不会直接修改二维数组，而是先进入 `[gameStore]` 暴露的方法，再由它转发到 `Game` / `Sudoku`。

例如：

- 用户输入数字时，组件调用 `[gameStore.guess(...)]`
- 用户点击 Undo 时，组件调用 `[gameStore.undo()]`
- 用户点击 Redo 时，组件调用 `[gameStore.redo()]`
- 开始新游戏时，组件或入口模块调用 `[gameStore.startNew(...)]`

因此，真实交互路径是：

UI -> store adapter -> Game -> Sudoku

而不是：

UI -> 旧数组 / 旧 store -> 组件内逻辑

## 4. 为什么 Svelte 会更新

我的实现依赖的是 **Svelte 3 的 store / custom store 机制**，以及组件中的 `$store` 自动订阅能力。

`[gameStore]` 内部持有一个 `Game` 实例。  
当用户调用 `guess`、`undo`、`redo` 等方法时：

1. 先由 `Game` / `Sudoku` 修改领域状态
2. 再由 `[gameStore]` 重新导出新的视图快照
3. 调用 `set(...)` 或等价方式更新 store
4. 组件中的 `$gameStore` 收到新值后重新渲染

因此，UI 刷新并不是因为 Svelte 自动跟踪了类实例内部字段，而是因为 store 的值被显式更新了。

## 5. 为什么不能直接 mutate 内部对象

如果直接修改领域对象内部字段，或者直接修改二维数组的某个元素，Svelte 不一定能感知到变化。  
这是因为 Svelte 3 的响应式更新依赖于：

- store 值变化
- 变量重新赋值
- `$:` 的依赖追踪

而不是任意对象深层属性的自动追踪。

所以如果组件直接 mutate 内部对象，可能会出现“数据变了但界面不刷新”的问题。  
这也是我使用 `[gameStore]` 作为响应式边界的原因。

## 6. 相比 HW1 的改进

相比 HW1，我做了以下实质性改进：

1. 明确了 `Sudoku` 与 `Game` 的职责边界  
   `Sudoku` 负责局面与规则，`Game` 负责会话与历史。

2. 改进了历史管理方式  
   不再把撤销/重做逻辑散落在 UI 中，而是集中到 `Game` 中统一管理。

3. 改进了对象对 UI 的暴露方式  
   View 层不再直接拿可变领域对象或旧数组，而是通过 adapter/store 获取响应式视图状态。

4. 将领域对象真正接入真实 Svelte 流程  
   真实界面的开始游戏、输入、撤销重做、渲染刷新都通过领域对象完成，而不是只在测试里可用。

## 7. 为什么 HW1 的做法不足以支撑真实接入

HW1 中即使已经抽出了 `Sudoku` / `Game`，如果真实界面仍然直接操作旧数组、旧 store 或组件内部状态，那么领域对象实际上只存在于测试环境中，无法成为游戏流程的核心。

这会带来几个问题：

- UI 和领域层双重维护状态
- Undo / Redo 逻辑容易分散
- 组件中业务逻辑过重
- 容易出现“领域对象存在，但 UI 没真正用”的情况

因此，Homework 1.1 需要进一步增加 adapter/store 这一层，把领域对象与 Svelte 响应式机制真正接起来。

## 8. trade-off

我的方案增加了一层 adapter/store，因此比“组件里直接操作数组”多了一层间接性，代码量也更大一些。  
但是它带来的好处是：

- 响应式边界清晰
- 领域层职责更稳定
- UI 与领域层解耦
- Undo / Redo 和渲染联动更容易保证
- 后续迁移框架或调整 UI 时，对领域层影响更小

## 9. 响应式边界与未来演进

在我的实现中，响应式边界位于 `[gameStore]`。  
`Sudoku` / `Game` 是相对稳定的领域层；Svelte 组件和 store adapter 属于更靠近框架的部分。

如果将来迁移到 Svelte 5，我认为最稳定的是领域层，即 `Sudoku` / `Game`；  
最可能改动的是 adapter/store 以及组件层，因为它们直接依赖当前 Svelte 3 的 store / `$store` 机制。
