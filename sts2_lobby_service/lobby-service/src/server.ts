import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  LobbyStore,
  LobbyStoreError,
  type CreateRoomInput,
  type HeartbeatInput,
  type JoinRoomInput,
} from "./store.js";

const env = {
  host: process.env.HOST ?? "0.0.0.0",
  port: Number.parseInt(process.env.PORT ?? "8787", 10),
  heartbeatTimeoutMs: Number.parseInt(process.env.HEARTBEAT_TIMEOUT_SECONDS ?? "35", 10) * 1000,
  ticketTtlMs: Number.parseInt(process.env.TICKET_TTL_SECONDS ?? "120", 10) * 1000,
  wsPath: process.env.WS_PATH ?? "/control",
};

const store = new LobbyStore({
  heartbeatTimeoutMs: env.heartbeatTimeoutMs,
  ticketTtlMs: env.ticketTtlMs,
});

const app = express();
app.use(express.json({ limit: "32kb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    rooms: store.listRooms().length,
  });
});

app.get("/rooms", (_req, res) => {
  res.json(store.listRooms());
});

app.post("/rooms", (req, res, next) => {
  try {
    const body = req.body as Partial<CreateRoomInput> | undefined;
    const room = store.createRoom(
      {
        roomName: requiredString(body?.roomName, "roomName"),
        password: optionalString(body?.password),
        hostPlayerName: requiredString(body?.hostPlayerName, "hostPlayerName"),
        gameMode: requiredString(body?.gameMode, "gameMode"),
        version: requiredString(body?.version, "version"),
        modVersion: requiredString(body?.modVersion, "modVersion"),
        maxPlayers: positiveInt(body?.maxPlayers, "maxPlayers", 1, 8),
        hostConnectionInfo: {
          enetPort: positiveInt(body?.hostConnectionInfo?.enetPort, "hostConnectionInfo.enetPort", 1, 65535),
          localAddresses: Array.isArray(body?.hostConnectionInfo?.localAddresses)
            ? body?.hostConnectionInfo?.localAddresses
                .filter((value): value is string => typeof value === "string")
                .map((value) => value.trim())
            : [],
        },
      },
      requestIp(req),
    );

    res.status(201).json(room);
  } catch (error) {
    next(error);
  }
});

app.post("/rooms/:id/join", (req, res, next) => {
  try {
    const body = req.body as Partial<JoinRoomInput> | undefined;
    const response = store.joinRoom(req.params.id, {
      playerName: requiredString(body?.playerName, "playerName"),
      password: optionalString(body?.password),
      version: requiredString(body?.version, "version"),
      modVersion: requiredString(body?.modVersion, "modVersion"),
    });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

app.post("/rooms/:id/heartbeat", (req, res, next) => {
  try {
    const body = req.body as Partial<HeartbeatInput> | undefined;
    const room = store.heartbeat(req.params.id, {
      hostToken: requiredString(body?.hostToken, "hostToken"),
      currentPlayers: positiveInt(body?.currentPlayers, "currentPlayers", 1, 8),
      status: requiredString(body?.status, "status"),
    });
    res.json({ ok: true, room });
  } catch (error) {
    next(error);
  }
});

app.delete("/rooms/:id", (req, res, next) => {
  try {
    const hostToken = requiredString((req.body as { hostToken?: string } | undefined)?.hostToken, "hostToken");
    store.deleteRoom(req.params.id, hostToken);
    closeRoomSockets(req.params.id, 4000, "room_deleted");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof LobbyStoreError) {
    res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof InputError) {
    res.status(400).json({
      code: "invalid_request",
      message: error.message,
    });
    return;
  }

  console.error("[lobby] unexpected request error", error);
  res.status(500).json({
    code: "internal_error",
    message: "大厅服务内部错误。",
  });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: env.wsPath });
const roomPeers = new Map<string, Set<ControlPeer>>();

wss.on("connection", (socket, req) => {
  try {
    const requestUrl = new URL(req.url ?? env.wsPath, `http://${req.headers.host ?? "127.0.0.1"}`);
    const roomId = requiredQuery(requestUrl, "roomId");
    const controlChannelId = requiredQuery(requestUrl, "controlChannelId");
    const role = requiredQuery(requestUrl, "role");

    if (role !== "host" && role !== "client") {
      throw new InputError("role 必须为 host 或 client。");
    }

    if (role === "host") {
      store.validateHostControl(roomId, controlChannelId, requiredQuery(requestUrl, "token"));
    } else {
      store.validateClientControl(roomId, controlChannelId, requiredQuery(requestUrl, "ticketId"));
    }

    const peer: ControlPeer = {
      socket,
      roomId,
      controlChannelId,
      role,
      lastSeenAt: Date.now(),
    };

    addPeer(peer);
    sendJson(socket, {
      type: "connected",
      roomId,
      controlChannelId,
      role,
    });

    socket.on("message", (payload) => {
      peer.lastSeenAt = Date.now();
      if (peer.role === "host") {
        store.touchHostSession(peer.roomId);
      }

      const parsed = parseEnvelope(payload);
      if (!parsed) {
        sendJson(socket, {
          type: "error",
          message: "无法解析控制通道消息。",
        });
        return;
      }

      if (parsed.type === "ping") {
        sendJson(socket, {
          type: "pong",
          roomId: peer.roomId,
          controlChannelId: peer.controlChannelId,
        });
        return;
      }

      if (parsed.type === "pong" || parsed.type === "host_hello" || parsed.type === "client_hello") {
        return;
      }

      broadcastToRoom(peer, {
        ...parsed,
        roomId: peer.roomId,
        controlChannelId: peer.controlChannelId,
        role: peer.role,
      });
    });

    socket.on("close", () => {
      removePeer(peer);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid control channel request";
    socket.close(1008, message);
  }
});

const cleanupInterval = setInterval(() => {
  const deletedRoomIds = store.cleanupExpired();
  for (const roomId of deletedRoomIds) {
    closeRoomSockets(roomId, 4001, "room_expired");
  }

  const staleThreshold = Date.now() - env.heartbeatTimeoutMs;
  for (const peers of roomPeers.values()) {
    for (const peer of peers) {
      if (peer.lastSeenAt < staleThreshold) {
        peer.socket.close(1001, "peer_timeout");
      } else {
        sendJson(peer.socket, {
          type: "ping",
          roomId: peer.roomId,
          controlChannelId: peer.controlChannelId,
        });
      }
    }
  }
}, 5000);

server.listen(env.port, env.host, () => {
  console.log(`[lobby] listening on http://${env.host}:${env.port} (ws path ${env.wsPath})`);
});

function addPeer(peer: ControlPeer) {
  let peers = roomPeers.get(peer.roomId);
  if (!peers) {
    peers = new Set();
    roomPeers.set(peer.roomId, peers);
  }

  peers.add(peer);
}

function removePeer(peer: ControlPeer) {
  const peers = roomPeers.get(peer.roomId);
  if (!peers) {
    return;
  }

  peers.delete(peer);
  if (peers.size === 0) {
    roomPeers.delete(peer.roomId);
  }
}

function closeRoomSockets(roomId: string, code: number, reason: string) {
  const peers = roomPeers.get(roomId);
  if (!peers) {
    return;
  }

  for (const peer of peers) {
    peer.socket.close(code, reason);
  }

  roomPeers.delete(roomId);
}

function broadcastToRoom(sender: ControlPeer, envelope: Record<string, unknown>) {
  const peers = roomPeers.get(sender.roomId);
  if (!peers) {
    return;
  }

  for (const peer of peers) {
    if (peer === sender || peer.socket.readyState !== peer.socket.OPEN) {
      continue;
    }

    sendJson(peer.socket, envelope);
  }
}

function sendJson(socket: WebSocket, payload: Record<string, unknown>) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function parseEnvelope(payload: WebSocket.RawData): Record<string, unknown> | null {
  try {
    const text = Buffer.isBuffer(payload) ? payload.toString("utf8") : String(payload);
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function requestIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]!.trim();
  }

  return req.socket.remoteAddress ?? "";
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new InputError(`${name} 不能为空。`);
  }

  return value.trim();
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function positiveInt(value: unknown, name: string, min: number, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new InputError(`${name} 必须是 ${min}-${max} 之间的整数。`);
  }

  return value;
}

function requiredQuery(url: URL, key: string) {
  const value = url.searchParams.get(key);
  if (!value || value.trim() === "") {
    throw new InputError(`缺少查询参数 ${key}。`);
  }

  return value.trim();
}

class InputError extends Error {}

interface ControlPeer {
  socket: WebSocket;
  roomId: string;
  controlChannelId: string;
  role: "host" | "client";
  lastSeenAt: number;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  clearInterval(cleanupInterval);
  wss.close();
  server.close(() => {
    process.exit(0);
  });
}
