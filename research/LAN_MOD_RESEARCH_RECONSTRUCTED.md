# STS2 LAN Connect 反编译记录（重建版）

## 已确认的关键链路

### Join 页面

`MegaCrit.Sts2.Core.Nodes.Screens.MainMenu.NJoinFriendScreen`

- `_Ready()` 会抓这些节点：
  - `%ButtonContainer`
  - `%LoadingOverlay`
  - `%LoadingIndicator`
  - `%NoFriendsText`
  - `%RefreshButton`
- `JoinGameAsync(IClientConnectionInitializer)` 已经完整处理：
  - `JoinFlow.Begin(...)`
  - Lobby/LoadedLobby 分支跳转
  - `ClientConnectionFailedException`
  - `NErrorPopup` 展示

### Fast MP 现成入口

`NJoinFriendScreen.FastMpJoin()`

- 在无 Steam 或带 `fastmp` 参数时，游戏本身就会做：
  - `new ENetClientConnectionInitializer(netId, "127.0.0.1", 33771)`

这证明：

- IP 直连不是额外发明，而是游戏里本来就有调试/快速联机链路。

### Host 页面

`MegaCrit.Sts2.Core.Nodes.Screens.MainMenu.NMultiplayerHostSubmenu`

- 原始 `StartHostAsync(...)` 在 Steam 初始化成功时走 `StartSteamHost(4)`。
- 非 Steam 时直接走 `StartENetHost(33771, 4)`。
- 成功后按 `GameMode` 推到：
  - `NCharacterSelectScreen.InitializeMultiplayerAsHost(...)`
  - `NDailyRunScreen.InitializeMultiplayerAsHost(...)`
  - `NCustomRunScreen.InitializeMultiplayerAsHost(...)`

### ENet 连接初始化器

`MegaCrit.Sts2.Core.Multiplayer.Connection.ENetClientConnectionInitializer`

- 构造签名：
  - `(ulong netId, string ip, ushort port)`
- `Connect(...)` 内部：
  - `gameService.Initialize(eNetClient, PlatformType.None)`
  - `eNetClient.ConnectToHost(_netId, _ip, _port, cancelToken)`

### Host 端默认端口

`MegaCrit.Sts2.Core.Multiplayer.Transport.ENet.ENetHost`

- `StartHost(ushort port, int maxClients)`
- `CreateHostBound("0.0.0.0", port, maxClients)`

当前已确认 V1 端口使用：

- `33771`

### 调试页面

`MegaCrit.Sts2.Core.Nodes.Debug.Multiplayer.NMultiplayerTest`

- `HostButtonPressed()` -> `StartHost(steam: false)`
- `SteamHostButtonPressed()` -> `StartHost(steam: true)`
- `JoinButtonPressed()` -> `new ENetClientConnectionInitializer(netId, ip, 33771)`

这进一步证明：

- ENet Host/Join 全链路在正式游戏代码里现成存在。

## 直接影响实现的结论

- Join 页只需要新增一个 IP 输入 UI，并把结果传给 `JoinGameAsync(...)`。
- Host 页只需要新增一个可见入口，并在该入口下强制走 ENet host 分支。
- 不需要自定义网络协议，不需要改 `JoinFlow` 的核心逻辑。
- `.pck` 级全量反编译目前不是必须项，`sts2.dll` 已足够支持 V1。
