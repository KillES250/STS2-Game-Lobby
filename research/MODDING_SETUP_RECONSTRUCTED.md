# STS2 MOD 开发环境（重建版）

当前仓库已经按本机的 Mac 安装路径配置好一个可运行的 STS2 MOD 模板工程：

- 模板工程目录：`/Users/mac/Desktop/STS2_Learner/sts2-lan-connect`
- 游戏目录：`/Users/mac/Library/Application Support/Steam/steamapps/common/Slay the Spire 2`
- Mac MOD 目录：`/Users/mac/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app/Contents/MacOS/mods/sts2_lan_connect`
- 本地 .NET SDK：`/Users/mac/.dotnet`
- Godot 4.5.1 .NET：`/Users/mac/Applications/Godot_mono.app`

## 已固定版本

- .NET SDK：`9.0.311`
- Godot：`4.5.1 .NET`

仓库根目录的 `global.json` 已固定到 `.NET 9.0.311`，避免误用 `.NET 10`。

## 常用命令

进入仓库后：

```bash
source ~/.zprofile
cd /Users/mac/Desktop/STS2_Learner
./scripts/build-sts2-lan-connect.sh
```

脚本会完成这些事：

1. 编译 `sts2_lan_connect.dll`
2. 用 Godot headless 打包 `sts2_lan_connect.pck`
3. 把 DLL 和 PCK 复制到 STS2 的 `mods/sts2_lan_connect/`

首次运行游戏时，还需要在游戏内确认一次模组警告，否则日志里会显示发现了 `.pck` 但跳过加载。

## VS Code

旧工作区曾带：

- `.vscode/extensions.json`
- `.vscode/tasks.json`

这些编辑器配置已经从根目录清掉；如果你后面仍需要，可以在新仓库里重新生成。

## Windows 覆盖方式

这个模板默认优先走本机 Mac 路径；在 Windows 上使用时，直接覆盖下面两个 MSBuild 属性即可：

- `Sts2Root`
- `Sts2DataDir`

例如：

```bash
dotnet build /p:Sts2Root="D:\\Steam\\steamapps\\common\\Slay the Spire 2"
```
