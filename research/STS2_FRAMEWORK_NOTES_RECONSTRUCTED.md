# STS2 Framework Notes（重建摘要）

这是对旧 `sts2_framework.md` 的摘要重建版，不是原文。

## 1. 采用的核心架构

- 分层架构
  - `Nodes` 负责表现层
  - `Models / Entities` 负责数据层
  - `GameActions / Combat / Runs` 负责控制层
- 事件驱动 / Hook System
  - 静态 `Hook` 作为全局扩展点
- 命令模式
  - `GameAction` 作为动作执行载体
- 数据驱动设计
  - `AbstractModel` 及 canonical / mutable 区分
- 状态机模式
  - 用于战斗流程与卡牌交互

## 2. 分层职责

### Nodes 层

- UI 渲染
- 输入捕获
- Godot 节点类
- 通常以 `N` 前缀命名

### Models / Entities 层

- 模板数据
- 运行时状态
- 不涉及 UI 逻辑

### GameActions 层

- 动作执行
- 状态流转
- 支持异步和多人同步

### Hooks 层

- 提供扩展点
- 解耦业务逻辑

## 3. 目录印象

旧文档描述的核心结构大致是：

```text
src/Core/
├── Nodes/
├── Models/
├── Entities/
├── GameActions/
├── Hooks/
├── Combat/
├── Runs/
├── Map/
├── Rooms/
├── Modding/
└── Localization/
```

## 4. 对本项目的直接意义

- 大厅 MOD 更适合停留在 `Nodes` 层的 UI 注入和少量联机入口编排。
- 核心同步逻辑应继续复用官方 `JoinFlow` / `ENet` / Lobby 流程，不应重写底层多人协议。
- 如果只做大厅目录和连接协调，最好保持在“外部服务 + UI 注入 + 复用现有联机链路”的边界内。
