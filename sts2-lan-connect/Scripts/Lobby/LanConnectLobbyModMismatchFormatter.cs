using System.Collections.Generic;
using System.Linq;

namespace Sts2LanConnect.Scripts;

internal static class LanConnectLobbyModMismatchFormatter
{
    public static string FormatFromDetails(LobbyErrorDetails? details, string fallbackMessage)
    {
        if (details == null)
        {
            return fallbackMessage;
        }

        return BuildMessage(
            details.MissingModsOnLocal,
            details.MissingModsOnHost,
            details.RoomModVersion,
            details.RequestedModVersion,
            fallbackMessage);
    }

    public static string BuildMessage(
        IReadOnlyCollection<string>? missingModsOnLocal,
        IReadOnlyCollection<string>? missingModsOnHost,
        string? roomModVersion = null,
        string? requestedModVersion = null,
        string? fallbackMessage = null)
    {
        List<string> parts = new() { "MOD 不一致。" };
        if (missingModsOnLocal != null && missingModsOnLocal.Count > 0)
        {
            parts.Add($"你缺少：{string.Join("、", missingModsOnLocal)}。");
        }

        if (missingModsOnHost != null && missingModsOnHost.Count > 0)
        {
            parts.Add($"房主缺少：{string.Join("、", missingModsOnHost)}。");
        }

        if (!string.IsNullOrWhiteSpace(roomModVersion) &&
            !string.IsNullOrWhiteSpace(requestedModVersion) &&
            !string.Equals(roomModVersion, requestedModVersion))
        {
            parts.Add($"房间版本：{roomModVersion}；当前客户端版本：{requestedModVersion}。");
        }

        string formatted = string.Join(" ", parts.Where(static value => !string.IsNullOrWhiteSpace(value)));
        if (formatted == "MOD 不一致。" && !string.IsNullOrWhiteSpace(fallbackMessage))
        {
            return fallbackMessage;
        }

        return formatted;
    }
}
