# STS2 LAN Connect 安装说明

这是 `STS2 LAN Connect` 的客户端发布包。

## 安装前

- 先关闭《Slay the Spire 2》
- 保证所有联机玩家使用同一版 MOD
- 如果发布包里已经包含 `lobby-defaults.json`，普通玩家不需要手动填写大厅地址

## 一键安装 / 卸载

macOS：

- 双击 `install-sts2-lan-connect-macos.command`
- 如果已安装 MOD，则自动卸载
- 如果未安装 MOD，则自动安装

Windows：

- 双击 `install-sts2-lan-connect-windows.bat`
- 如果已安装 MOD，则自动卸载
- 如果未安装 MOD，则自动安装

## 命令行强制安装

macOS：

```bash
./install-sts2-lan-connect-macos.sh --install --package-dir .
```

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File .\install-sts2-lan-connect-windows.ps1 -Action Install -PackageDir .
```

## 命令行强制卸载

macOS：

```bash
./install-sts2-lan-connect-macos.sh --uninstall --package-dir .
```

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File .\install-sts2-lan-connect-windows.ps1 -Action Uninstall -PackageDir .
```

## 切换行为

- 未安装时：
  - 复制 `sts2_lan_connect.dll`
  - 复制 `sts2_lan_connect.pck`
  - 如果存在 `lobby-defaults.json`，一并复制到游戏的 `mods/sts2_lan_connect/`
  - 执行一次从 vanilla 到 modded 的单向存档同步
- 已安装时：
  - 删除游戏的 `mods/sts2_lan_connect/`

如果你只想安装 MOD、不做存档同步，请改用命令行：

macOS：

```bash
./install-sts2-lan-connect-macos.sh --install --package-dir . --no-save-sync
```

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File .\install-sts2-lan-connect-windows.ps1 -Action Install -PackageDir . -NoSaveSync
```
