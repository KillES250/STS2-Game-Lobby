# STS2 LAN Connect 安装说明

这是 `STS2 LAN Connect` 的客户端发布包。

## 当前版本说明

- 大厅改为长条房间卡片列表，支持单击选中、双击加入
- 多人续局存档会自动和大厅房间绑定，房主重新进入续局时会自动重新发布
- 续局玩家加入时，如果存在多个可接管角色，会先选择角色槽位
- 加入房间过程中会显示加载中的阶段提示
- 加入时优先尝试直连；如果直连超时，会自动切到服务端 relay 兜底

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

## 大厅与续局使用要点

- 房间列表使用长条卡片布局。单击会选中房间，双击会直接加入。
- 进入多人续局存档后，房主对应的房间会自动重新出现在大厅里。
- 队友加入续局房间时，如果有多个空闲角色槽位，需要先选择要接管的角色。
- 加入时间较长时，界面会弹出加载中的进度提示。
- 公网环境下会先尝试直连，再自动切到 relay fallback；过程中不会额外弹出切换提示。
