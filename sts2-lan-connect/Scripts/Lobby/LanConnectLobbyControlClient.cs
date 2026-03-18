using System;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MegaCrit.Sts2.Core.Logging;

namespace Sts2LanConnect.Scripts;

internal sealed class LobbyControlClient : IAsyncDisposable
{
    private readonly ClientWebSocket _socket = new();
    private string _role = "host";

    public bool IsConnected => _socket.State == WebSocketState.Open;

    public event Action<LobbyControlEnvelope>? EnvelopeReceived;

    public async Task ConnectHostAsync(Uri controlUri, string roomId, string controlChannelId, string playerName, CancellationToken cancellationToken)
    {
        _role = "host";
        await ConnectAsync(controlUri, new LobbyControlEnvelope
        {
            Type = "host_hello",
            RoomId = roomId,
            ControlChannelId = controlChannelId,
            Role = "host",
            PlayerName = playerName
        }, cancellationToken);
    }

    public async Task ConnectClientAsync(
        Uri controlUri,
        string roomId,
        string controlChannelId,
        string ticketId,
        string playerName,
        string playerNetId,
        CancellationToken cancellationToken)
    {
        _role = "client";
        await ConnectAsync(controlUri, new LobbyControlEnvelope
        {
            Type = "client_hello",
            RoomId = roomId,
            ControlChannelId = controlChannelId,
            Role = "client",
            TicketId = ticketId,
            PlayerName = playerName,
            PlayerNetId = playerNetId
        }, cancellationToken);
    }

    public async ValueTask DisposeAsync()
    {
        if (_socket.State == WebSocketState.Open || _socket.State == WebSocketState.CloseReceived)
        {
            try
            {
                await _socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "client_shutdown", CancellationToken.None);
            }
            catch
            {
            }
        }

        _socket.Dispose();
    }

    private async Task ReceiveLoopAsync(CancellationToken cancellationToken)
    {
        byte[] buffer = new byte[4096];
        ArraySegment<byte> segment = new(buffer);
        while (_socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
        {
            WebSocketReceiveResult result;
            try
            {
                result = await _socket.ReceiveAsync(segment, cancellationToken);
            }
            catch (Exception ex)
            {
                Log.Warn($"sts2_lan_connect lobby control channel receive loop stopped: {ex.Message}");
                break;
            }

            if (result.MessageType == WebSocketMessageType.Close)
            {
                break;
            }

            string payload = Encoding.UTF8.GetString(buffer, 0, result.Count);
            if (string.IsNullOrWhiteSpace(payload))
            {
                continue;
            }

            try
            {
                LobbyControlEnvelope? envelope = JsonSerializer.Deserialize<LobbyControlEnvelope>(payload, LanConnectJson.Options);
                if (envelope == null)
                {
                    continue;
                }

                if (envelope.Type == "ping")
                {
                    await SendAsync(new LobbyControlEnvelope
                    {
                        Type = "pong",
                        RoomId = envelope.RoomId,
                        ControlChannelId = envelope.ControlChannelId,
                        Role = _role
                    }, cancellationToken);
                    continue;
                }

                EnvelopeReceived?.Invoke(envelope);
            }
            catch (Exception ex)
            {
                Log.Warn($"sts2_lan_connect failed to parse control payload: {ex.Message}");
            }
        }
    }

    public Task SendAsync(LobbyControlEnvelope envelope, CancellationToken cancellationToken = default)
    {
        byte[] payload = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(envelope, LanConnectJson.Options));
        ArraySegment<byte> segment = new(payload);
        return _socket.SendAsync(segment, WebSocketMessageType.Text, true, cancellationToken);
    }

    private async Task ConnectAsync(Uri controlUri, LobbyControlEnvelope helloEnvelope, CancellationToken cancellationToken)
    {
        await _socket.ConnectAsync(controlUri, cancellationToken);
        await SendAsync(helloEnvelope, cancellationToken);
        _ = Task.Run(() => ReceiveLoopAsync(CancellationToken.None));
    }
}
