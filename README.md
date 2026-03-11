# STS2 Game Lobby Releases

这个仓库用于分发《Slay the Spire 2》联机大厅相关发布产物。

当前发布内容：

- `sts2_lan_connect/`
  - 客户端 MOD 发布目录
  - 包含 macOS / Windows 一键安装或卸载切换脚本
  - 包含默认大厅绑定 `lobby-defaults.json`
  - 包含大厅与续局联机使用说明
- `sts2_lan_connect-release.zip`
  - 客户端压缩发布包
- `sts2_lobby_service/`
  - Linux 服务端发布目录
  - 包含一键部署脚本和服务端源码
- `sts2_lobby_service.zip`
  - 服务端压缩发布包

当前客户端特性：

- 游戏内大厅使用长条房间卡片列表，支持单击选中、双击加入
- 多人续局存档会和大厅房间绑定，房主重新进入续局时自动重新发布
- 队友加入续局房间时会按可接管角色槽位加入，不再依赖旧连接 ID
- 加入房间时会显示加载中的阶段提示
- 加入时优先尝试直连；如果超时，会自动切到服务端 relay fallback

使用说明：

- 客户端说明见 [sts2_lan_connect/README.md](./sts2_lan_connect/README.md)
- 客户端玩家手册见 [sts2_lan_connect/STS2_LAN_CONNECT_USER_GUIDE_ZH.md](./sts2_lan_connect/STS2_LAN_CONNECT_USER_GUIDE_ZH.md)
- 服务端说明见 [sts2_lobby_service/README.md](./sts2_lobby_service/README.md)

公网部署提醒：

- 大厅 API 需要放行 `8787/TCP`
- relay fallback 需要额外放行 `39000-39063/UDP`
