# CC Switch Classic 开发说明

## 基线与结构

本独立仓库 [Yanxcyan/cc-switch-classic](https://github.com/Yanxcyan/cc-switch-classic) 使用 `main` 分支维护 Classic 版本，基于上游 `farion1231/cc-switch` 的 `7569b27af4f485172950fb6989f5643163842bd1`（v4.0.22）。视觉参考 `v3.20.4`，原 MIT 许可证保留。

- `src/main.tsx` 挂载 `src/classic/ClassicApp.tsx`；上游 `src/App.tsx` 保留供比对。
- `src/classic/` 管理顶栏、应用切换、模式条、六页签设置及主题覆盖。
- Vite、TypeScript、Vitest 使用相同的 `AppPageHeader` 适配路径；页面标题、操作与内部返回按钮通过 portal 进入 Classic 顶栏。
- v4 的 `presentation.ts`、表单保存、模式操作、会话解析、深链接和账户 API 保留。模式标签只浏览；实际切换仍由原 `ModeDialog` 确认。
- `FullScreenPanel` 默认挂载到 body；显式 host 仍可用。
- 设置目录草稿使用独立的未保存登记；自动保存开关不触发误报。
- Rust 业务沿用上游，仅将缺省托盘样式设为原生菜单；已保存的面板偏好仍被尊重。

## 本地检查

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build:renderer
pnpm test:unit --maxWorkers=2 --minWorkers=1 --testTimeout=30000
```

首次安装或多进程编译时，表单测试可能超过上游默认 5 秒；以上命令仅增加执行时间上限，不跳过断言。测试期间不要编辑源文件，避免 Vitest 转换缓存混入前后版本。

Windows 原生编译需先进入 Visual Studio x64 Native Tools 环境（本机已安装 Build Tools），再运行：

```sh
cargo test --manifest-path src-tauri/Cargo.toml native_tray_menu_defaults_on_and_keeps_a_saved_choice --lib -j 2
pnpm build
```

`pnpm dev:renderer` 可启动前端服务，但真实业务需要 Tauri；浏览器视觉检查中的模拟数据不是连接成功或原生功能验收的证据。

## 数据与发布边界

此应用使用本机 SQLite，没有引入 MySQL 连接。开发不会要求修改服务器数据库。

v4 数据库不可交给 v3 打开。实际运行 `pnpm dev` 前，应使用独立系统用户/测试数据环境，并准备独立的客户端配置与同步目标；只改 CC Switch 数据目录不足以隔离 Claude、Codex 等客户端文件。不要在日常配置上进行模式切换验收。

Classic v4.0.23 起使用独立产品名、应用标识、Windows 安装升级标识、更新签名与 GitHub 更新地址。发布流程见 [Classic 发布说明](classic-release.md)。仍保留 `ccswitch://` 深链接以及现有用户数据和客户端配置，独立安装标识不代表数据隔离。

## 本次验证记录（2026-10-30）

- `pnpm typecheck` 通过。
- `pnpm build:renderer` 通过；保留上游大体积 bundle 提示。
- Windows Rust 测试目标编译通过；`native_tray_menu_defaults_on_and_keeps_a_saved_choice` 测试通过，覆盖默认原生菜单及保留已有面板偏好。未运行其余 4215 项后端测试。
- 前端全量运行覆盖 272 文件、3462 测试：初次结果 3457 通过，5 项属于旧样式断言及冷启动时间限制。修正后单独重跑全部 3 个相关文件，32 项全部通过，其他 269 文件无需重跑。
- 浏览器以模拟 Tauri 数据检查 1000×650 / 900×600、浅色 / 深色及设置页，无页面异常或横向溢出；图片位于 `outputs/`。这不等同于真实 Tauri/账户/客户端写入验收。

## 发布前仍需完成

- 使用真实 v3 截图对所有页面逐项比对；当前预览只验证 Classic 本身的布局。
- macOS、Windows、Linux 的真实窗口/托盘、拖拽、缩放与辅助功能冒烟验证。
- 在隔离配置下验证真实模式切换、故障转移、聚合模型、OAuth、深链接冷启动、导入导出和云同步。
- 每次发布检查多平台构建、更新签名和 `latest.json` 完整性；前端构建成功不代表跨平台安装与升级已经实机验收。

后续合并上游时，优先检查 `navigation.ts`、`src/components/shell/` 新入口是否已映射到 Classic，再运行导航、模式和全量回归。
