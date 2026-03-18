using System;
using System.IO;
using System.Reflection;
using Godot;

namespace Sts2LanConnect.Scripts;

internal static class LanConnectPaths
{
    public static string ResolveModDirectory()
    {
        string? assemblyLocation = Assembly.GetExecutingAssembly().Location;
        string? assemblyDirectory = string.IsNullOrWhiteSpace(assemblyLocation) ? null : Path.GetDirectoryName(assemblyLocation);
        if (!string.IsNullOrWhiteSpace(assemblyDirectory) && Directory.Exists(assemblyDirectory))
        {
            return assemblyDirectory;
        }

        return Path.Combine(AppContext.BaseDirectory, "mods", "sts2_lan_connect");
    }

    public static string ResolveWritableDataDirectory()
    {
        string userDataRoot = ProjectSettings.GlobalizePath("user://");
        if (!string.IsNullOrWhiteSpace(userDataRoot))
        {
            return Path.Combine(userDataRoot, "sts2_lan_connect");
        }

        return ResolveModDirectory();
    }
}
