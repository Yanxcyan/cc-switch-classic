# Classic 发布与自动更新

发布仓库：[Yanxcyan/cc-switch-classic](https://github.com/Yanxcyan/cc-switch-classic)。应用更新仅从这个仓库的最新正式 Release 获取 `latest.json`，不再连接原作者的更新服务器。

## 用户如何更新

首次使用需从 Releases 下载 Classic 安装包。旧版使用原作者的签名和更新地址，不能自动迁移到 Classic。

- Windows 安装版：在“关于”检查更新，下载并安装新版。
- Windows 便携版：按钮下载对应架构的 ZIP，退出程序后替换程序文件。
- macOS：首次手动安装 Classic；以后通过内置更新器升级。
- Linux：提供 AppImage、deb、rpm 及对应的更新信息。原地安装是否需要权限取决于安装方式。

Classic 的产品名是 `CC Switch Classic`，应用标识为 `com.yanxcyan.ccswitch.classic`，Windows 升级标识固定在 `src-tauri/tauri.conf.json`。不要在后续版本中更换这些标识。

Classic 继续使用当前用户的 `.cc-switch` 和客户端配置，并保留 `ccswitch://` 兼容性。数据没有自动复制或隔离；首次运行前备份现有配置，避免同时运行两种版本。

## 发布新版本

1. 在 `main` 完成修改和测试。
2. 同步提升 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 和 `src-tauri/Cargo.lock` 中应用自身的版本号。
3. 添加 `src/whats-new/<版本>.json` 和 `docs/release-notes/v<版本>-zh.md`、`-en.md`、`-ja.md`。
4. 提交后推送对应版本标签，例如 `v4.0.25`。标签和配置版本必须一致。
5. 等待 [Release 工作流](https://github.com/Yanxcyan/cc-switch-classic/actions/workflows/release.yml) 完成全部平台打包、签名和更新信息生成。
6. 检查 Releases 中的安装包、签名及 `latest.json`。普通版本标签生成正式版本；带预发布后缀的标签不进入稳定更新通道。

手动运行 Release 工作流只做构建验证，产物保存在 Actions，不创建公开 Release。推送普通代码到 `main` 也不会发布安装包。

## 签名与凭据

GitHub Actions 使用仓库 Secrets 中的 `TAURI_SIGNING_PRIVATE_KEY` 和 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`。应用只包含公钥。私钥和密码不得进入源码、日志或发布附件；本地密钥备份必须保存在仓库之外。

首次配置的本机备份目录为 `%USERPROFILE%\.config\cc-switch-classic\signing`。`updater.key` 由随机密码加密，`password.dpapi` 由当前 Windows 用户保护。迁移到其他电脑前，应安全导出并保存密码，单独复制 DPAPI 文件不能保证在其他账户或电脑上恢复。保留同一签名密钥，后续版本才能被已安装的 Classic 信任。

macOS 的 Apple Developer 签名/公证与上述更新签名是两回事。未配置 Apple 凭据时使用 ad-hoc 签名，不能宣称经过 Apple 公证；用户首次安装可能需要在“系统设置 → 隐私与安全性”中允许。以后配置工作流要求的 Apple 证书与公证凭据后，可启用正式签名和公证。

## 发布验收

确认 `latest.json` 仅引用 Classic 仓库，覆盖 Windows x64/ARM64、macOS Intel/Apple Silicon、Linux x64/ARM64，所有安装包签名都存在。首次安装成功后，至少在各系统验证一次从前一版到新版的实际升级。打包成功、下载成功和实机安装成功是不同的验收项。
