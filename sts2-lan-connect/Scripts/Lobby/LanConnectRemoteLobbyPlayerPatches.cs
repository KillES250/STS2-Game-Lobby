using Godot;
using MegaCrit.Sts2.Core.Nodes.Multiplayer;
using MegaCrit.Sts2.addons.mega_text;

namespace Sts2LanConnect.Scripts;

internal static class LanConnectRemoteLobbyPlayerPatches
{
    internal static void RefreshNameplate(NRemoteLobbyPlayer player)
    {
        if (!GodotObject.IsInstanceValid(player) || !player.IsInsideTree() || !player.IsNodeReady())
        {
            return;
        }

        string? resolvedName = LanConnectLobbyPlayerNameDirectory.TryGetPlayerName(player.PlayerId);
        if (string.IsNullOrWhiteSpace(resolvedName))
        {
            return;
        }

        MegaLabel? label = player.GetNodeOrNull<MegaLabel>("%NameplateLabel");
        if (label == null || string.Equals(label.Text, resolvedName, System.StringComparison.Ordinal))
        {
            return;
        }

        label.SetTextAutoSize(resolvedName);
    }
}
