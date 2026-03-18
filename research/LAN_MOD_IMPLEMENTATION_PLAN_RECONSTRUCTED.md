# STS2 LAN Connect 实施文档（重建版）

## 当前状态

- 原始 V1 手输 IP 方案已经保留为“开发/故障回退入口”。
- 当前主路径升级为：
  - 多人首页 `游戏大厅`
  - 大厅页 `房间列表 / 创建房间`
  - 独立 `Node.js/TypeScript` 大厅服务
- 客户端依旧复用官方 `ENet + JoinFlow`，没有重写游戏内多人协议。
- `WS /control` 与房主心跳已接入，但当前版本仍是“直连优先”，未开启完整短时中继。

## 目标

- 基于游戏内置 ENet/JoinFlow 流程实现联机，而不是自建多人协议。
- 保留 Steam 原生好友加入流程。
- 在多人首页增加 `游戏大厅` 入口，并进入独立大厅页。
- 在大厅页支持房间列表、创建房间、密码房间加入。
- 保留多人 Host/Join 页的手动 `LAN/IP` 调试入口。

## 当前实现基线

- 工程名与产物名统一为 `sts2_lan_connect`。
- 本地开发链路已经包含：
  - `.NET 9.0.311`
  - `Godot 4.5.1 .NET`
  - Mac 构建脚本 `./scripts/build-sts2-lan-connect.sh`
- 代码侧已引入：
  - 多人首页 `游戏大厅` 入口与全屏大厅 overlay
  - Host 页面 `LAN 调试建房` 回退入口
  - Join 页面 `LAN/IP 调试直连` 回退入口
  - 大厅服务 HTTP/WS 客户端
  - 房主房间注册、心跳、主动关房、超时清理
  - `config.json` 持久化房间名、显示名、大厅服务地址与回退地址

## 关键设计

### 大厅主路径

- 多人首页新增 `游戏大厅` 按钮，不再把大厅 UI 堆进原 Join 页。
- 大厅页通过 HTTP 拉房间列表，通过 WS 保持房主控制通道。
- 创建房间时：
  - 先本地启动 `NetHostGameService.StartENetHost(33771, 4)`
  - 再向大厅服务 `POST /rooms`
  - 成功后把房主会话交给后台 runtime 托管
- 加入房间时：
  - `POST /rooms/:id/join`
  - 获取连接计划与加入票据
  - 直接复用 `JoinFlow.Begin(...)`

### 回退路径

- `NMultiplayerHostSubmenu` 仍保留 `LAN 调试建房`
- `NJoinFriendScreen` 仍保留 `LAN/IP 调试直连`
- 这些入口不再作为用户主路径，只用于开发、排障或纯局域网手工直连

### 连接链路

- 连接逻辑继续使用 `ENetClientConnectionInitializer(随机netId, ip, port)`。
- 大厅服务返回多个候选地址时，客户端会按顺序重试。
- 版本校验、Mod 校验、Lobby 握手、错误处理继续沿用游戏原生流程。

## 后续开发与验证

### 仍需人工验证

- Windows 真机加载与构建。
- Win -> Win、Mac -> Mac、Win -> Mac、Mac -> Win 四组真实联机。
- 大厅 overlay 在实际 UI 中的布局和焦点行为。
- 控制通道在长时间在线和异常断线下的清理行为。
- 如需“短时中继兜底”，还需单独补 UDP/ENet 数据面。

### 明确不做

- 自动扫描局域网房间
- IPv6
- NAT 穿透“必成功”承诺
- 与其他多人 MOD 的兼容承诺
