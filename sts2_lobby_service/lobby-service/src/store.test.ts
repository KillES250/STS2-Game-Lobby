import test from "node:test";
import assert from "node:assert/strict";
import { LobbyStore, LobbyStoreError } from "./store.js";

const baseConfig = {
  heartbeatTimeoutMs: 35_000,
  ticketTtlMs: 120_000,
};

test("createRoom exposes room summary in listRooms", () => {
  const store = new LobbyStore(baseConfig);
  const created = store.createRoom(
    {
      roomName: "测试房间",
      hostPlayerName: "Host",
      gameMode: "standard",
      version: "1.2.3",
      modVersion: "0.1.0",
      maxPlayers: 4,
      hostConnectionInfo: {
        enetPort: 33771,
        localAddresses: ["192.168.1.10"],
      },
    },
    "203.0.113.10",
  );

  const rooms = store.listRooms();
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0]?.roomId, created.roomId);
  assert.equal(rooms[0]?.requiresPassword, false);
});

test("joinRoom returns direct candidates with public and lan addresses", () => {
  const store = new LobbyStore(baseConfig);
  const created = store.createRoom(
    {
      roomName: "可加入房间",
      hostPlayerName: "Host",
      password: "secret",
      gameMode: "standard",
      version: "1.2.3",
      modVersion: "0.1.0",
      maxPlayers: 4,
      hostConnectionInfo: {
        enetPort: 33771,
        localAddresses: ["192.168.1.10"],
      },
    },
    "203.0.113.10",
  );

  const joined = store.joinRoom(created.roomId, {
    playerName: "Guest",
    password: "secret",
    version: "1.2.3",
    modVersion: "0.1.0",
  });

  assert.equal(joined.connectionPlan.directCandidates.length, 2);
  assert.equal(joined.connectionPlan.directCandidates[0]?.ip, "203.0.113.10");
  assert.equal(joined.connectionPlan.directCandidates[1]?.ip, "192.168.1.10");
});

test("joinRoom rejects wrong password", () => {
  const store = new LobbyStore(baseConfig);
  const created = store.createRoom(
    {
      roomName: "加锁房间",
      hostPlayerName: "Host",
      password: "secret",
      gameMode: "standard",
      version: "1.2.3",
      modVersion: "0.1.0",
      maxPlayers: 4,
      hostConnectionInfo: {
        enetPort: 33771,
      },
    },
    "203.0.113.10",
  );

  assert.throws(
    () =>
      store.joinRoom(created.roomId, {
        playerName: "Guest",
        password: "bad",
        version: "1.2.3",
        modVersion: "0.1.0",
      }),
    (error: unknown) =>
      error instanceof LobbyStoreError &&
      error.code === "invalid_password" &&
      error.statusCode === 401,
  );
});

test("cleanupExpired deletes rooms after heartbeat timeout", () => {
  const store = new LobbyStore(baseConfig);
  const now = new Date("2026-03-10T00:00:00.000Z");
  const created = store.createRoom(
    {
      roomName: "会过期房间",
      hostPlayerName: "Host",
      gameMode: "standard",
      version: "1.2.3",
      modVersion: "0.1.0",
      maxPlayers: 4,
      hostConnectionInfo: {
        enetPort: 33771,
      },
    },
    "203.0.113.10",
    now,
  );

  const deleted = store.cleanupExpired(new Date(now.getTime() + 40_000));
  assert.deepEqual(deleted, [created.roomId]);
  assert.equal(store.listRooms().length, 0);
});
