# STS2 Lobby Service

`STS2 Lobby Service` 是 `STS2 LAN Connect` 的大厅服务端，负责：

- 房间目录
- 房间密码校验
- 房主心跳与僵尸房间清理
- 控制通道握手与广播
- 向客户端返回 `ENet` 直连优先的连接计划

它不负责：

- 战斗同步
- 账号系统
- 全程流量中继
- NAT 必成功穿透

## 一键部署

从仓库根目录执行：

```bash
sudo ./scripts/install-lobby-service-linux.sh --install-dir /opt/sts2-lobby
```

这个脚本会自动：

- 复制服务文件到 `/opt/sts2-lobby/lobby-service`
- 执行 `npm ci`
- 执行 `npm run build`
- 首次安装时生成 `.env`
- 生成 `/opt/sts2-lobby/start-lobby-service.sh`
- 在 systemd 可用且以 root 执行时，自动安装并启动 `sts2-lobby.service`

安装后健康检查：

```bash
curl http://127.0.0.1:8787/health
```

## 手动运行

```bash
cd /Users/mac/Desktop/STS2_Learner/lobby-service
npm ci
npm run build
npm start
```

默认监听：

- HTTP: `http://0.0.0.0:8787`
- WebSocket: `ws://0.0.0.0:8787/control`

## 打包分发

如果要把服务端单独打包给部署机器：

```bash
./scripts/package-lobby-service.sh
```

产物：

- `lobby-service/release/sts2_lobby_service/`
- `lobby-service/release/sts2_lobby_service.zip`

## 环境变量

- `HOST`
- `PORT`
- `HEARTBEAT_TIMEOUT_SECONDS`
- `TICKET_TTL_SECONDS`
- `WS_PATH`

示例见 [lobby-service/.env.example](/Users/mac/Desktop/STS2_Learner/lobby-service/.env.example)。

## API

- `GET /health`
- `GET /rooms`
- `POST /rooms`
- `POST /rooms/:id/join`
- `POST /rooms/:id/heartbeat`
- `DELETE /rooms/:id`
- `WS /control`

## 控制通道约定

查询参数：

- `roomId`
- `controlChannelId`
- `role=host|client`
- `token` 或 `ticketId`

当前实现包括：

- host/client 握手校验
- ping/pong 保活
- 同房间 peers 广播

这已经足够支撑当前大厅模式，但整体联机仍以游戏原生 `ENet` 直连为主。
