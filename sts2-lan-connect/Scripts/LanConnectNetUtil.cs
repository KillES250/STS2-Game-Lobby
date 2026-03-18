using System;
using System.Linq;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Collections.Generic;

namespace Sts2LanConnect.Scripts;

internal static class LanConnectNetUtil
{
    public static bool TryParseEndpoint(string raw, out string ip, out ushort port, out string error)
    {
        ip = string.Empty;
        port = LanConnectConstants.DefaultPort;
        error = string.Empty;

        string input = raw.Trim();
        if (string.IsNullOrWhiteSpace(input))
        {
            error = "请输入 IPv4 地址，格式为 192.168.1.20 或 192.168.1.20:33771。";
            return false;
        }

        if (string.Equals(input, "localhost", StringComparison.OrdinalIgnoreCase))
        {
            ip = "127.0.0.1";
            return true;
        }

        if (input.Count(static c => c == ':') > 1)
        {
            error = "V1 只支持 IPv4 地址，不支持 IPv6。";
            return false;
        }

        int colonIndex = input.LastIndexOf(':');
        string ipPart = input;
        if (colonIndex >= 0)
        {
            ipPart = input[..colonIndex].Trim();
            string portPart = input[(colonIndex + 1)..].Trim();
            if (!ushort.TryParse(portPart, out port))
            {
                error = "端口格式无效，请输入 1-65535 之间的数字。";
                return false;
            }
        }

        if (!IPAddress.TryParse(ipPart, out IPAddress? address) || address.AddressFamily != AddressFamily.InterNetwork)
        {
            error = "请输入有效的 IPv4 地址。";
            return false;
        }

        ip = address.ToString();
        return true;
    }

    public static string GetPrimaryLanAddress()
    {
        IPAddress? bestMatch = GetLanAddresses().FirstOrDefault();

        return bestMatch?.ToString() ?? "127.0.0.1";
    }

    public static IReadOnlyList<string> GetLanAddressStrings()
    {
        return GetLanAddresses()
            .Select(static address => address.ToString())
            .Distinct(StringComparer.Ordinal)
            .ToArray();
    }

    public static ulong GenerateClientNetId()
    {
        Span<byte> bytes = stackalloc byte[8];
        RandomNumberGenerator.Fill(bytes);
        ulong value = BitConverter.ToUInt64(bytes);
        return value <= 1 ? value + 2 : value;
    }

    private static IEnumerable<IPAddress> GetLanAddresses()
    {
        return NetworkInterface.GetAllNetworkInterfaces()
            .Where(static nic => nic.OperationalStatus == OperationalStatus.Up)
            .Where(static nic => nic.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(static nic => nic.GetIPProperties().UnicastAddresses)
            .Select(static info => info.Address)
            .Where(static address => address.AddressFamily == AddressFamily.InterNetwork)
            .OrderByDescending(ScoreAddress);
    }

    private static int ScoreAddress(IPAddress address)
    {
        byte[] bytes = address.GetAddressBytes();
        if (bytes[0] == 192 && bytes[1] == 168)
        {
            return 3;
        }

        if (bytes[0] == 10)
        {
            return 2;
        }

        if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31)
        {
            return 1;
        }

        return 0;
    }
}
