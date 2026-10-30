# CC Switch「经典界面 + v4 功能」设计与实施方案

> 目标：保留 v3（以 v3.20.4 为准）的页面布局和视觉设计，同时具备 v4（截至 v4.0.22）的全部功能。
>
> 分析基准：
> - 上游仓库 `farion1231/cc-switch`，main 分支 `7569b27a`，2026-10-30
> - v3 基准 tag `v3.20.4`，2026-09-22
> - v4 基准 tag `v4.0.0`（2026-10-04）到 `v4.0.22`（2026-10-30）
>
> 分析范围：两个版本的 `src/`（前端）和 `src-tauri/`（Rust 后端）源码、CHANGELOG、`docs/release-notes/v4.0.*-zh.md`。
>
> 文中代号：**Classic** 指本方案要做的「经典界面 + v4 功能」版本。

---

## 目录

1. 结论速览
2. 两个版本到底差在哪
3. v3 设计规范（必须保留的部分）
4. v4 功能全景清单
5. 总体架构方案
6. 功能映射：v4 功能放进 v3 界面的什么位置
7. 设计令牌换肤方案
8. 兼容性：哪些东西会坏
9. 实施路线与工作量
10. 风险、数据安全与上游同步
11. 验收清单
12. 附录：关键文件索引

---

## 1. 结论速览

| 问题 | 结论 |
|---|---|
| 能不能拿 v3 代码往上加功能？ | **不建议**。v3.20.4 到 main 改了 1349 个文件，+30 万 / −7.5 万行。后端的配置写入机制整个重写了，等于重新实现一遍 v4。 |
| 推荐路线 | **以 v4 main 为基础，换回 v3 的外壳和皮肤**。后端（`src-tauri/`）和业务逻辑（hooks、api、presentation、表单）整体沿用 v4。只替换布局外壳（侧栏改回顶栏）、设计令牌（橙色主题改回蓝色主题）、UI 基础组件和少数视觉组件。 |
| 为什么这样更省事 | 后端与界面无关。v4 的业务组件大多是 L 级（可直接嵌入）或 M 级（需要一个薄适配层）。真正和侧栏绑死的 T 级只有 `App.tsx` 的导航和 `Sidebar.tsx`。 |
| 视觉还原手段 | 保留 v4 的 Tailwind 令牌名，把令牌**值**改成 v3 的配色。v4 组件不用改源码就能变成 v3 的蓝、白、灰和翡翠绿。关键视觉组件（ProviderCard、Header、AppSwitcher、FullScreenPanel、Settings 页签）用 v3 的原始实现重新接上 v4 的数据。 |
| 最大的设计难点 | v4 新增了「直连 / 路由 / 聚合」三态模式层，v3 只有「代理开关 + 故障转移开关」两个开关。需要设计一种 v3 风格的三态控件（见 §6.2）。 |
| 数据风险 | v4 数据库版本是 **24**，v3 是 19，v3 打不开 v4 的数据库。Classic 必须当作 v4 数据看待，不能和 v3 混用同一个数据目录。 |
| 工作量 | 1 名熟悉 React/Tauri 的开发者，约 **4 到 6 周**可以做到可发布（详见 §9）。 |

---

## 2. 两个版本到底差在哪

### 2.1 时间线

```
2025-08  CC Switch 发布
  …      v3.x 持续迭代（共 60+ 个 tag）
2026-09-22  v3.20.4  ← v3 最后一版（本方案的“界面基准”）
2026-10-04  v4.0.0   大版本：UI 重做 + 写入引擎重写 + 聚合模式 + 会话重写
2026-10-07  v4.0.4   正式版
2026-10-13  v4.0.10  深链接重做
2026-10-16  v4.0.13  Claude Desktop 三态模式
2026-10-20  v4.0.18  Antigravity CLI (agy)
2026-10-23  v4.0.19  Kimi Code
2026-10-24  v4.0.20  Oh My Pi
2026-10-26  v4.0.21  Claude 多订阅账号
2026-10-30  v4.0.22  DeepSeek Harness (dsh)  ← 本方案的“功能基准”
```

v4 在 26 天里发了 22 个补丁版本，平均一天多一个。这决定了 Classic 必须能**持续跟进上游**，不能做成一次性分叉（见 §10.3）。

### 2.2 改动规模

| 范围 | 改动文件数 | 增加 | 删除 |
|---|---|---|---|
| 全仓 | 1349 | +302,646 | −75,646 |
| `src/`（前端） | 505 | +101,302 | −31,914 |
| `src-tauri/`（后端） | 330 | +137,100 | −29,310 |

### 2.3 v4 的三类变化

1. **底层（与界面无关）**：
   - 关键字段写入引擎（`src-tauri/src/live/`）
   - 模式状态机（`src-tauri/src/mode/`）
   - 路由协议修复
   - 会话解析器改为结构化 blocks
   - 新增 4 个应用
   - 多账号体系
   - 数据库版本 19 → 24
2. **业务前端（可复用）**：
   - 模式层的逻辑：`presentation.ts`、`useModeActions`
   - 供应商表单：预设搜索、models.dev 补全、模型拉取、配置预览、冲突检测
   - 额度显示
   - 用量页、会话阅读器、MCP、Skills、提示词、深链接、应用页、授权中心、托盘面板、What's New
3. **视觉外壳（要换回 v3 的部分）**：
   - 侧栏布局
   - 52px 页头
   - 橙色主题与 v7 设计令牌
   - 重新设计的 UI 基础组件
   - 新的供应商卡片外观
   - 分组式设置页

**Classic 的做法**：第 1、2 类全拿，第 3 类换回 v3。

---

## 3. v3 设计规范（必须保留的部分）

> 本节是 Classic 的视觉验收依据。路径均以 v3.20.4 为准。

### 3.1 窗口与外壳

- 窗口默认 1000×650，最小 900×600，`titleBarStyle: "Overlay"`。
- **没有侧栏**，单列布局：
  ```
  ┌──────────────────────────────────────────────────────────────────────┐
  │ (macOS 28px 拖拽条 / Win·Linux 0px / Linux 自绘窗口按钮 32px)           │
  ├──────────────────────────────────────────────────────────────────────┤
  │ CC Switch ⚙ ⬆  │ [⦿代理 ◯][⇄故障转移 ◯] [📁项目▾] [Claude|Codex|Gemini…] [🔧📖🕘MCP] (+) │  ← 64px header
  ├──────────────────────────────────────────────────────────────────────┤
  │                                                                      │
  │   ┌ ProviderCard ────────────────────────────────────────────────┐   │
  │   │ ⋮⋮ [icon] 名称  [徽章…]                       额度/用量  [操作] │   │
  │   │          https://api.xxx.com                                 │   │
  │   └──────────────────────────────────────────────────────────────┘   │
  │   ┌ ProviderCard ……                                                  │
  └──────────────────────────────────────────────────────────────────────┘
  ```
- **Header**（`src/App.tsx`）：
  - 容器：`fixed z-50 w-full bg-background/80 backdrop-blur-md`，高 64px，内边距 `px-6`，整条可拖动窗口。
  - 子视图时，左侧显示 `outline` 样式的 ArrowLeft 返回按钮，加 `<h1 text-lg font-semibold>` 标题。
- **Main**：`flex-1 overflow-y-auto animate-fade-in`。
- 视图切换：framer-motion opacity 动画，0.2s。切换应用时 0.15s。

### 3.2 Header 元素（从左到右）

| 元素 | 视觉要点 |
|---|---|
| `RoutingActivationBrand` | "CC Switch" 文字，`text-xl font-semibold`。直连时蓝色 `text-blue-500`，接管时翡翠绿 `text-emerald-500`。从直连切到接管时播放 980ms 光晕加 12 颗粒子的爆发动画（`useReducedMotion` 时不播放）。 |
| 设置齿轮 | `ghost icon`，lucide `Settings w-4 h-4` |
| `UpdateBadge` | 有更新时显示绿色 `ArrowUpCircle`，`rounded-full`，点击跳到设置的「关于」页签 |
| 用量按钮 | `BarChart2`，**v3 只在当前应用处于接管状态时显示** |
| Proxy / Failover 开关 | `h-8 rounded-lg bg-muted/50 px-1.5`，左边是图标（`Radio` 或 `Shuffle`），右边是 Switch。开启时图标为 `text-emerald-500` 并带 `status-heartbeat` 心跳闪烁 |
| `ProfileSwitcher` | `h-8 rounded-lg px-2.5`，内容为 FolderOpen、项目名、ChevronsUpDown，点击弹出 cmdk 列表 |
| `AppSwitcher` | 药丸条 `bg-muted rounded-xl p-1 gap-1`。**只显示图标（20px），不显示文字**。选中项为 `bg-background shadow-sm`。Claude Code 和 Claude Desktop 用右下角的 Terminal / Monitor 小角标区分。放不下的应用收进 `MoreHorizontal` 弹出层。 |
| 应用工具条 | 容器 `bg-muted rounded-xl p-1`，按钮 `w-8 ghost`。默认是 Skills（Wrench）、Prompts（Book）、Sessions（History）、MCP。Hermes 和 OpenClaw 有各自的按钮组。不支持的按钮用宽度动画收起，不直接移除。 |
| ➕ 添加 | `rounded-full w-8 h-8 bg-orange-500 shadow-lg shadow-orange-500/30`。**v3 主界面唯一的橙色元素** |

### 3.3 设计令牌（`src/index.css` 和 `tailwind.config.cjs`）

| 令牌 | Light | Dark |
|---|---|---|
| `--background` | `0 0% 100%` | `240 5% 12%` |
| `--foreground` | `240 10% 3.9%` | `0 0% 98%` |
| `--card` / `--popover` | `0 0% 100%` | `240 5% 16%` |
| **`--primary`** | **`210 100% 56%`（蓝）** | **`210 100% 54%`** |
| `--muted` / `--secondary` / `--accent` | `240 4.8% 95.9%` | `240 5% 18%` |
| `--muted-foreground` | `240 3.8% 46.1%` | `240 5% 64.9%` |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` |
| `--border` / `--input` | `240 5.9% 90%` | `240 5% 24%` |
| **`--ring`** | **`210 100% 56%`（蓝）** | `210 100% 54%` |
| `--radius` | `0.5rem` | |

Tailwind 配置：
- 调色板覆盖：
  - `blue` 400 `#409CFF`、500 `#0A84FF`、600 `#0060DF`（Apple 系统蓝）
  - `gray` 600 到 950 取 Apple 深灰：`#636366`、`#48484A`、`#3A3A3C`、`#2C2C2E`、`#1C1C1E`
- 圆角：`lg = .75rem`，`xl = .875rem`，都比 Tailwind 默认值大。
- 字体：`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto…`
- 动画：`fade-in 0.5s`、`slide-up`、`slide-down`、`slide-in-right`、`pulse-slow`。
- **没有** `tailwindcss-animate`，所以 Radix 浮层是直接出现的，没有入场动画。

全局特征：
- **全局隐藏滚动条**（`scrollbar-width:none`）。
- `focus-visible` 统一为 `outline-blue-500`。
- 毛玻璃类：`.glass`、`.glass-card`、`.glass-card-active`。
- 心跳闪烁类：`.status-heartbeat`。

### 3.4 基础组件外观（`src/components/ui/`）

| 组件 | v3 外观 |
|---|---|
| Button | `rounded-lg`。default 为**实心蓝** `bg-blue-500`。ghost 为 `text-gray-500 hover:bg-gray-100`。另有 `mcp` 变体（emerald）。尺寸：default h-9，sm h-8，icon h-9 |
| Tabs | 选中项为**蓝底白字** `bg-blue-500 text-white`，`min-w-[120px]` |
| Switch | `h-6 w-11`，开启为 **emerald-500**，关闭为 gray-200 |
| Dialog | 遮罩 `bg-black/50 backdrop-blur-sm`。头部和底部是 `bg-muted/20` 灰条，带边框 |
| Input | `h-9 rounded-md`，聚焦时 `ring-blue-500/20` |
| FullScreenPanel | 通过 portal 挂到 body，`fixed inset-0 z-[60]`，64px 头部（outline ArrowLeft 加 `text-lg` 标题），内容区 `px-6 py-6` |

### 3.5 业务组件外观

**ProviderCard**
- 外框：`rounded-xl border p-4 bg-card`，hover 时边框变为 primary 蓝。
- 当前供应商（直连）：`border-blue-500/60`，加 `from-blue-500/10` 左到右的渐变叠加层。
- 当前供应商（接管 / 故障转移）：同样的效果换成 `emerald`。
- 拖拽中：`scale-105 shadow-lg`。
- 操作区**只在 hover 时出现**。主按钮宽 `w-[4.5rem]`，各状态：使用中为灰底加 Check；启用为蓝色；接管状态下为翡翠绿。
- 图标按钮 `h-8 w-8`，依次为编辑、复制、测试、用量脚本、终端、删除。

**新增 / 编辑供应商**
- 用 FullScreenPanel 整屏打开。
- 预设以「胶囊网格」排列，`minmax(150px,1fr)`。选中项为蓝底白字，推荐项带琥珀渐变星标。

**设置页**
- 6 个页签，`grid-cols-6 glass`：通用 / 代理 / 认证 / 高级 / 使用统计 / 关于。
- 每个分区是手风琴，`rounded-xl glass-card`，配一个彩色图标。

**用量统计**
- 放在设置的「使用统计」页签里。
- 结构：Hero 卡片、recharts 面积图（input 蓝 / output 绿 / 缓存 橙·紫 / 费用 玫红）、底部三个页签（日志 / 供应商 / 模型）。

**会话**
- 两栏布局 `grid md:grid-cols-[320px_1fr]`。
- 消息气泡：用户消息 `bg-primary/5 ml-8`，助手消息 `bg-blue-500/5 mr-8`。

**MCP / Skills / Prompts**
- 页面结构：`AppCountBar(glass)`、搜索框、`ListItemRow` 列表、`AppToggleGroup`。
- 每个应用的开关用品牌色描边：Claude 橙、Codex 绿、Gemini 蓝、Grok 青……

**托盘**
- 原生菜单：「打开主界面 / 官网 / 每个应用一个子菜单（名称 · 当前供应商 · 用量 emoji）/ 项目 / 轻量模式 / 退出」。

---

## 4. v4 功能全景清单

> 只列相对 v3 新增或有实质变化的功能。「耦合」一列表示接入 v3 外壳的难度：
> - **L**：可以直接嵌入。
> - **M**：组件内部画了 v4 的 `AppPageHeader`，或依赖 `#content-area`，需要一个薄适配层。
> - **T**：和侧栏或导航模型绑死，需要重写。

### 4.1 核心机制

| # | 功能 | 说明 | 耦合 |
|---|---|---|---|
| F1 | **关键字段写入引擎** | 切换供应商时只改地址、凭据、模型、协议这几项，以及该供应商自己的开关；hooks、插件、MCP 等其他内容原样保留。TOML 和 dotenv 文件中未改动的行逐字节不变，JSON 文件保留其他键的值和顺序。写入前检查外部改动；多个文件一起写时先记下意图，崩溃后能自动补完；每个文件第一次写入前备份；含密钥的文件权限设为 0600 | 后端，界面无关 |
| F2 | **三态模式：直连 / 路由 / 聚合** | 每个应用单独设置，状态存在设备本地的 `~/.cc-switch/live-state.json`。支持应用：Claude Code、Codex、Gemini CLI、Grok Build、Claude Desktop；其中聚合只支持 Claude Code、Codex、Claude Desktop | 逻辑 L，视觉需要重新设计 |
| F3 | **聚合（Stack）** | 把多家供应商的模型放进 Claude Code `/model`、Codex 模型选择器、Desktop 的同一个列表。需要指定一家默认供应商。卡片上可以「添加 / 移除」。有精简表单。Codex 模型目录变化后提示重启，CLI 守护进程可以一键重启 | L/M |
| F4 | **配置预览与冲突检测** | 编辑器底部预览切换后的配置文件，在这里改的全局字段会写回文件；另有「不随切换生效的字段」面板；保存时如果文件被外部改过会弹冲突框 | L |
| F5 | 移除「通用配置片段」 | 共享设置直接留在客户端配置文件里。同时移除了成本倍率和连通性检查的高级设置 | 删减项 |

### 4.2 供应商与账号

| # | 功能 | 耦合 |
|---|---|---|
| F6 | 新的预设选择：支持中文名、别名、域名搜索；分类为模型厂商 / 第三方 / 云服务商 / 本地 / 账号登录；同一家的不同套餐和地区合并成一行。统一供应商并入添加页的一个页签 | L |
| F7 | models.dev 自动补全上下文窗口、输出上限、推理档位、输入类型；拉取模型列表后用弹窗勾选；Codex 模型目录可以拖动排序，可设置子代理模型 | L |
| F8 | 额度显示：显示「剩余」量和重置倒计时 ⏱；多档额度合并成两行；可选显示剩余或已用；新增 Claude、Antigravity、Kimi 账号的额度 footer | L |
| F9 | **授权中心多账号**：ChatGPT（浏览器 PKCE 或设备码）、Claude 订阅多账号（`CLAUDE_CONFIG_DIR`）、Copilot、xAI、Kimi、DeepSeek、Antigravity（仅 macOS）；官方卡可以绑定账号，切卡就切号 | L |
| F10 | 自定义图标库（上传本地图片） | L |
| F11 | 「打开终端」：可以跳过权限确认、追加启动参数；Codex 卡片也能打开终端 | L |
| F12 | 深链接重做：冷启动时链接不丢；可选导入后立即切换；支持 `iconUrl`、`apiFormat` 参数；保留链接里完整的 `config.toml`；拒绝会被展开执行的值 | L（但事件协议变了，见 §8） |

### 4.3 新增应用（v3 有 10 个，v4 有 14 个）

| AppId | 名称 | 类型 | 版本 |
|---|---|---|---|
| `agy` | Antigravity CLI | 切换式，但卡片只有「打开终端」 | 4.0.18 |
| `kimi` | Kimi Code | 共存式（添加 / 移除） | 4.0.19 |
| `omp` | Oh My Pi | 共存式，属于 Pi 系 | 4.0.20 |
| `dsh` | DeepSeek Harness | 共存式，同时写 Web 和 Desktop 两份配置 | 4.0.22 |

Grok Build（`grokbuild`）和 MiniMax Code（`mcode`）在 v3 里已经有了。

### 4.4 全局功能页

| # | 功能 | 耦合 |
|---|---|---|
| F13 | **应用页**：每个工具的版本、安装位置、来源；安装、升级、批量升级、卸载；处理多处安装；拖动排序；控制是否显示 | M |
| F14 | **用量统计重建**：新增「全部」范围和 53 周热力图；请求日志 14 列可勾选（缓存写入、命中率、总耗时、状态码等）；分页；**不开路由也能从会话日志导入用量**（估算值带 ≈）；币种和汇率设置 | M |
| F15 | **会话阅读器重写**：支持 14 个客户端；每轮操作折叠成一行摘要；右侧对话目录，失败的轮次带红点；三种视图（全部 / 对话 / 改动）；会话内查找；在终端恢复会话；导出 Markdown；按项目或时间分组 | M |
| F16 | MCP：一次粘贴多个服务器配置（JSON、TOML、Codex、OpenCode 格式）；单个应用写入失败可以单独重试 | M |
| F17 | Skills：已安装和发现合并成一页；一键全部更新；同步方式可选；打开目录 / 复制名称 / 查看文档 | M |
| F18 | 提示词：12 个应用在同一页管理；可以复制到其他应用、导入已有文件、删除后撤销 | M |
| F19 | 整页编辑代替弹窗；离开页面前检查未保存的修改 | L |
| F20 | **托盘面板**：独立的 webview 面板（macOS 26 上是玻璃效果），每行显示「名称 · 模式 · 供应商 · 额度」；原生菜单保留为可选项 | L（独立窗口） |
| F21 | What's New：每个版本的更新摘要弹窗 | L |
| F22 | 设置重新分组为 通用 / 应用配置 / 本地路由 / 网络 / 数据 / 关于；新增备份位置管理、清除 WebDAV 配置、Codex 历史会话压缩 | 内容 L，外壳 T |
| F23 | 侧栏「今日」花费和 Token、侧栏收起、⌘\ 快捷键、新布局引导弹窗 | T（Classic 中删除或改造） |

---

## 5. 总体架构方案

### 5.1 分层

```
┌──────────────────────────────────────────────────────────────┐
│  Classic 外壳层  (新写，放在 src/classic/，尽量不碰 v4 文件)       │
│  ClassicApp · ClassicHeader · AppSwitcher · AppToolbar ·      │
│  ModeBar(三态) · ClassicSettings(6 tab) · RoutingBrand ·       │
│  UpdateBadge · 适配器 AppPageHeader/WindowControls             │
├──────────────────────────────────────────────────────────────┤
│  皮肤层  (改 v4 文件，但只改“值”)                                  │
│  index.css 令牌值 → v3 · tailwind.config 圆角/字号 → v3 ·        │
│  components/ui/* → v3 外观 + 兼容 v4 新增 variant                │
├──────────────────────────────────────────────────────────────┤
│  v4 业务前端  (原样沿用)                                          │
│  presentation.ts · hooks · lib/api · lib/query · forms ·      │
│  quota · usage · sessions/reader · mcp · skills · prompts ·   │
│  apps · auth · deeplink · whats-new · tray-panel              │
├──────────────────────────────────────────────────────────────┤
│  v4 后端 src-tauri/  (原样沿用，仅改 tauri.conf 少量项)            │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 三个关键决策

**决策 1：以 v4 main 为基础，不以 v3 为基础。**
- 原因：后端和业务逻辑的变化量是外壳变化量的十倍以上。另外上游几乎每天发版，以 v4 为基础才能 rebase 或 merge 跟进。

**决策 2：外壳代码放到独立目录 `src/classic/`。**
- `src/main.tsx` 改为渲染 `ClassicApp`。v4 的 `App.tsx`、`Sidebar.tsx` 保留但不挂载（或用构建开关切换）。
- 好处：跟进上游时，冲突集中在皮肤层的少数文件里。
- 可选扩展：做成设置项 `layout: "classic" | "sidebar"`，两种布局都能用。这样还有机会作为 PR 贡献给上游，但维护面会翻倍。

**决策 3：换肤优先改「令牌值」，不改「令牌名」。**
- v4 组件大量使用 `bg-subtle`、`text-fg-2`、`bg-action`、`rounded-control`、`text-body` 这类 v7 令牌。
- 把这些令牌的值映射到 v3 的配色和圆角（见 §7），几百个 v4 组件就自动变成 v3 风格，不用逐个改。
- 只有最显眼的几个组件用 v3 原实现重写：Header、AppSwitcher、ProviderCard 和它的操作按钮、FullScreenPanel、设置页签外壳。

### 5.3 适配层（让 M 级组件不改源码就能嵌入）

| 适配点 | v4 的行为 | Classic 的做法 |
|---|---|---|
| `AppPageHeader` | 页面内部自己画一条 52px 页头，里面有 icon、title、actions | 新写一个同名组件，通过 `ClassicHeaderContext` 把 `title` 送到 v3 header 的标题位置，把 `actions` 通过 portal 送进 header 右侧操作区。这样和 v3 一致：子视图的返回按钮、标题、操作按钮都在顶栏。具体做法：用 Vite alias 或 TS paths 把 `@/components/shell/AppPageHeader` 指向 `src/classic/AppPageHeaderAdapter.tsx` |
| `#content-area` | FullScreenPanel 会 portal 到这个元素 | v3 的面板是整窗覆盖。适配器让 FullScreenPanel 退回挂到 body，并恢复 v3 的 64px 头部 |
| `WindowControlsContext` | Windows 和 Linux 的自绘窗口按钮 | 继续提供，放在 v3 header 最右端（v3 在 Linux 上的做法） |
| `SwitchModePanel` 的 `statusSlot` | 把「模式 · 供应商」徽章 portal 到页头 | 指向 ModeBar 左侧的状态文字位置，或者不传 |
| `navigation.ts` 的 `View` | 包括 GlobalPage 和 SettingsSection | Classic 自己维护视图状态（见 §6.1），同时复用 `parseView` 和 `normalizeSettingsSection` |
| `useTrayNavigation` | 托盘发来的跳转：应用 / 设置分组 / 添加 / 需要路由 | 映射到 AppSwitcher、设置页签、FullScreenPanel |
| `hasUnsavedChanges()` | 侧栏导航前检查 | 接到 header 返回按钮、AppSwitcher、工具条、⌘, 快捷键上 |

---

## 6. 功能映射：v4 功能放进 v3 界面的什么位置

这一节是本方案的设计核心。

### 6.1 视图与入口总表

v3 只有一个主视图（供应商列表），其他功能都是「返回按钮 + 标题」的子视图。Classic 沿用这个模型，把 v4 的全局页都挂成子视图。

| v4 页面 | Classic 入口 | 呈现方式 | 说明 |
|---|---|---|---|
| 应用 → 供应商 | 默认视图 | 主视图 | |
| 用量统计 | header 左侧的 `BarChart2` | 子视图 | **改为始终显示**，因为 v4 不开路由也能统计用量。也可以保留在设置的「使用统计」页签里，两个入口指向同一个组件 |
| 授权中心 | 设置 →「认证」页签 | 设置页签 | 与 v3 位置相同 |
| MCP | 工具条上的 MCP 图标 | 子视图 | 与 v3 相同 |
| Skills | 工具条上的 Wrench 图标 | 子视图 | 已安装和发现合并为一页，所以不再需要 `skillsDiscovery` 视图 |
| 提示词 | 工具条上的 Book 图标 | 子视图 | 打开时默认选中当前应用；v4 页内的应用切换保留，样式改成 v3 的 `AppToggleGroup` |
| 会话 | 工具条上的 History 图标 | 子视图 | 与 v3 相同 |
| **应用（工具管理）** | header 左侧新增一个 `Boxes` 图标，放在齿轮后面；AppSwitcher 的溢出菜单底部加「管理应用…」 | 子视图 | v3 没有这个页面。原来设置里的「应用可见性」也搬到这里 |
| 设置 | 齿轮 | 子视图，6 个页签 | 见 §6.6 |
| OpenClaw 配置 | 工具条（v3 有 Env / Tools / Agents 三个按钮） | 子视图 | v4 已经合并为 `openclawConfig`，页内用页签切换。Classic 保留 v3 的三个按钮，分别直接打开对应的页签 |
| Hermes 记忆 / WebUI | 工具条 | 与 v3 相同 | |
| Workspace | 工具条 | 与 v3 相同 | |

**新增 4 个应用后的 AppSwitcher**：一共 14 个图标。v3 的 AppSwitcher 本来就会测量可用宽度，放不下的收进 `⋯` 弹出层，不需要改结构。显示顺序和是否显示由应用页的拖动排序和「显示」开关决定（`settings.appOrder`、`visibleApps`）。

**新应用的工具条按钮**：

| 应用 | 工具条按钮 |
|---|---|
| kimi / dsh / omp | Skills · Prompts · Sessions · MCP（与默认组相同） |
| agy | Skills · Prompts · Sessions · MCP。卡片主按钮是「打开终端」，没有「启用」 |

### 6.2 三态模式层（重点设计）

**v3 的现状**：
- Header 上有两个独立的开关：「⦿ 代理」和「⇄ 故障转移」。
- 打开代理就是接管，品牌文字随之由蓝变绿，供应商卡片的高亮也从蓝变绿。

**v4 的语义**：
- 每个应用页顶部有三个标签：直连 / 路由 / 聚合。
- **点标签只切换「查看」的内容，不改配置**。真正切换模式要点专门的按钮，按钮会写明会发生什么，并弹 `ModeDialog` 确认。
- 路由标签里可以管理故障转移；聚合标签里可以管理成员和默认供应商。

**Classic 的设计**：在 header 下方加一条 v3 风格的「模式条」（ModeBar），只在支持模式的应用里显示。

```
┌ header 64px ───────────────────────────────────────────────────────────────┐
│ CC Switch ⚙ ▦ 📊        [📁项目▾] [Claude|Codex|…⋯]  [🔧📖🕘MCP] (+)          │
└────────────────────────────────────────────────────────────────────────────┘
┌ ModeBar 44px（仅 MODE_APP_IDS） ───────────────────────────────────────────────┐
│ [ 直连 • | 路由 | 聚合 ]    当前：直连 · Kimi For Coding     [⇄故障转移 ◯] [⚙] [🔍] │
└────────────────────────────────────────────────────────────────────────────┘
```

- **三段控件**：复用 AppSwitcher 的药丸样式（`bg-muted rounded-xl p-1`，每项 `h-8 px-3 rounded-md text-sm font-medium`，选中项为 `bg-background shadow-sm`）。
- **当前生效模式**：在文字后面加一个 6px 色点。直连为 `blue-500`，路由为 `emerald-500`，聚合为 `violet-500`。这和 v3 的「蓝 = 直连，绿 = 接管」语义一致，聚合是新加的紫色。
- **切换按钮**：当查看的标签不是当前生效的模式时，右侧出现一个按钮，例如「切换到路由」或「开启聚合」。
  - 按钮样式用 v3 的 default 蓝色按钮，或者和目标模式同色的实心按钮。
  - 点击后弹出 v4 的 `ModeDialog`（已换成 v3 皮肤），确认后执行。
- **故障转移**：只在「路由」标签里显示。直接复用 v3 `FailoverToggle` 的外观（`h-8 rounded-lg bg-muted/50` 加 Shuffle 图标加 Switch），后台调用 v4 的 `useSetAutoFailoverEnabled`。
- **设置按钮**：路由标签打开 `RouteSettingsSheet`（超时、重试、熔断）；Codex 的聚合标签打开 `StackSettingsSheet`（子代理模型等）。
- **搜索**：v4 新增 `showProviderSearch` 设置，提供一个常显的搜索入口。Classic 保留 v3 的 ⌘F 浮动搜索框，另在 ModeBar 上放一个 🔍 按钮作为入口。
- **品牌文字联动**：`RoutingActivationBrand` 的颜色改为跟随**当前生效**的模式，直连蓝、路由绿、聚合紫。爆发动画在由直连进入路由或聚合时播放，粒子颜色跟随目标模式。
- **不支持模式的应用**（共存式应用和 agy）：不显示 ModeBar，和 v3 一样。
- **Claude Desktop**：v3 用的是 `ClaudeDesktopRouteToggle`，Classic 统一改用 ModeBar。v4.0.13 起 Desktop 也有三态。

另一种做法（更省空间）：不加 ModeBar，把三段控件直接放进 header，替换原来的 Proxy 开关位置。缺点是 header 会更挤（AppSwitcher 有 14 个应用），故障转移和设置按钮也没地方放。**推荐用 ModeBar**。

### 6.3 供应商卡片（视觉用 v3，行为用 v4）

**数据驱动**：卡片显示什么按钮、什么徽章、什么高亮，全部由 v4 的 `providers/presentation.ts` 决定（940 行纯函数，包括 `buildSwitchSections` 等），Classic 原样调用。

**视觉映射**（基于 v3 的 `ProviderCard` 和 `ProviderActions`）：

| v4 状态 | Classic 外观 |
|---|---|
| 直连 · 使用中 | v3 蓝色高亮：`border-blue-500/60`，加 `from-blue-500/10` 渐变 |
| 路由 · 正在路由到这家 | v3 绿色高亮：emerald，渐变同上 |
| 聚合 · 默认供应商 | 紫色高亮：`border-violet-500/60`，加 `from-violet-500/10` 渐变，并带一个「默认」小徽章（`rounded-md px-1.5 text-[10px] font-semibold`，violet-100 底 violet-700 字） |
| 聚合 · 成员（非默认） | 不高亮，只加「聚合中」徽章（violet，v3 `ProviderStatusBadge` 的样式） |
| 故障转移队列中 | 沿用 v3 的 `P{n}` 徽章（emerald） |
| 额度 | v4 的 `QuotaLines` 和各种 `*QuotaFooter`，排版换成 v3 `UsageFooter` 的风格（右对齐，`text-xs tabular-nums`，更新时间加刷新按钮）。显示内容按 v4 规则：剩余百分比、⏱ 倒计时、低于 20% 橙色、用完红色 |

**主按钮**（`w-[4.5rem] size="sm"`）：

| 视图 | 按钮 |
|---|---|
| 直连 | 「启用」蓝色 / 「使用中」灰色加 ✓ |
| 路由 | 「路由到此」emerald 色 / 「路由中」灰色 |
| 聚合 | 「添加」violet 色实心 / 「移除」`bg-violet-100 text-violet-600`（参照 v3 共存式应用「添加 / 移除」的配色，换成紫色系）。默认供应商不能移除 |
| 共存式应用 | 与 v3 相同（添加为 emerald，移除为 orange-100） |
| agy | 「打开终端」 |

**图标按钮**：保留 v3 的顺序（编辑、复制、测试、用量脚本、终端、删除），只在 hover 时出现。v4 新增的操作放进一个 `⋯` 下拉菜单（v3 风格的 DropdownMenu）：
- 设为默认
- 加入或移出故障转移队列
- 打开终端（并带跳过权限确认、附加参数选项）
- OpenCode 设为默认模型

v4 把「打开终端」扩展到了 Codex 卡片，所以终端按钮在 claude、codex、agy 的卡片上都要显示。

### 6.4 供应商添加与编辑

- 外壳用 v3 的 FullScreenPanel：portal 到 body，64px 头部，ArrowLeft 返回，底部是取消和添加按钮。
- 内容用 v4 的 `ProviderForm` 全套（预设、表单、models.dev 补全、模型拉取弹窗、配置预览、冲突弹窗）。
- **预设选择器**：v4 改成了「左侧分类加列表行」。Classic 有两个选择：
  - **方案 A（推荐）**：保留 v4 的分类、搜索、套餐合并逻辑（`presetGroups.ts`、`presetFamilies.ts`、`presetSearchAliases.ts`），呈现方式改回 v3 的胶囊网格。分类作为网格上方的一行药丸筛选，选中为蓝底白字。合并的套餐或地区在选中胶囊后，用下方的 Select 选择。
  - 方案 B：沿用 v4 的列表样式，只换配色。工作量最小，但和 v3 观感差别明显。
- v4 已经去掉「推荐高亮」，Classic 跟随 v4，不显示 v3 的琥珀星标。如果想保留，也可以把星标挂在 `preset.isPartner` 上。
- **聚合精简表单**：当 ModeBar 停在「聚合」标签时，打开的添加或编辑面板使用 `variant="stack"`。方法是把 ModeBar 当前查看的标签作为 `modeView` 传给 ProviderForm。
- **统一供应商**：仍然是添加页里的第二个页签，与 v3 相同，使用 v3 蓝色页签样式。

### 6.5 用量、会话、MCP、Skills、提示词

| 页面 | 结构 | 换肤 |
|---|---|---|
| 用量 | v4 `UsageDashboard`：Hero、趋势图、热力图、请求日志、统计表 | 保持 v3 的 Hero 卡片风格（`bg-card/60 backdrop-blur-xl`）。趋势图颜色恢复 v3 配色（input `#3b82f6` / output `#22c55e` / cacheCreation `#f97316` / cacheRead `#a855f7` / cost `#f43f5e`）。热力图的四档颜色 `--heat-1..4` 改用蓝色系（`blue-100` → `blue-500`）。底部三个页签用 v3 `TabsList bg-muted/50` 的样式。设置抽屉（定价、币种）改用 v3 手风琴分区 |
| 会话 | v3 的两栏网格（`320px | 1fr`）。左栏用 v4 `SessionManagerPage` 的列表逻辑（分组、搜索、批量）配 v3 `SessionItem` 外观。右栏用 v4 的 `SessionReader`（不能退回 v3 的气泡：v4 后端返回的是 blocks，v3 的气泡渲染不了）。右侧对话目录 `SessionOutline` 作为第三栏，或者窄屏时收起 | reader 的各行样式（`rowStyles.tsx`、`agentStyles.ts`）映射到 v3 令牌：用户消息 `bg-primary/5`，助手消息 `bg-blue-500/5`，失败为 red-500，工具步骤为 muted |
| MCP | v4 逻辑（批量粘贴、启用矩阵、重试） | 外观换回 v3：`AppCountBar(glass)`、`ListItemRow`、品牌色 `AppToggleGroup`。v4 的 `AppMatrix` 改用 v3 的 `w-7 h-7 rounded-lg` 品牌色描边按钮。新增 4 个应用要在 `APP_ICON_MAP` 里补品牌色：kimi 用 sky，dsh 用 blue-700 或 indigo，agy 用 teal，omp 用 pink |
| Skills | v4 的合并页 | 已安装列表用 v3 `ListItemRow`；发现区的卡片恢复 v3 `SkillCard` 外观（`glass-card hover:shadow-lg`，绿色安装按钮）；header 右侧放 v3 的那组按钮（检查更新、恢复、ZIP、导入、发现），另加「全部更新」 |
| 提示词 | v4 `PromptPanel` 加 `PromptLibrary` | 列表项恢复 v3 的 `h-16 rounded-xl bg-muted/50`，加 Switch 开关（v4 删了 `PromptToggle`，需要用 v3 的样式补回） |

### 6.6 设置页（6 个页签，与 v3 的位置对应）

| Classic 页签 | 放入的 v4 内容 |
|---|---|
| 通用 | `GeneralSection`：语言（新增土耳其语 tr）、主题、窗口、终端、项目切换器、供应商搜索开关、启动时检查工具更新、**托盘样式（面板或菜单）**、**额度显示（剩余或已用）**。外观用 v3 的 `section` 加分段按钮组 |
| 代理 | `RoutingSection`（服务状态、监听地址、连接地址、故障转移、整流器、路由和聚合互切）加 `network`（全局代理）。外观用 v3 的手风琴，图标配色沿用：Server 绿、Activity 橙、Zap 紫、Globe 青 |
| 认证 | v4 `AuthCenterPanel`（多账号）加 `RefreshAllQuotaButton` |
| 高级 | `AppConfigSection`（配置目录、Codex 历史会话压缩、Codex 认证）加 `data`（导入导出、**备份位置管理**、WebDAV 及「清除配置」、日志及「打开日志」）。外观用 v3 手风琴，底部固定保存栏 |
| 使用统计 | 与 header 的 📊 入口共用同一个 `UsageDashboard` |
| 关于 | `AboutSection`：版本、更新、便携版下载。工具安装已经移到应用页，这里只放一个跳转链接 |

**删除的设置项**（v4 已经移除）：成本倍率、连通性检查高级配置、通用配置片段编辑器。

### 6.7 托盘

- **默认使用原生菜单**（`native_tray_menu = true`），最接近 v3。v4 的原生菜单内容已经包含模式和额度信息，结构与 v3 基本一致。
- 托盘面板保留为可选项（设置 → 通用 → 托盘样式）。面板是独立页面（`src/tray-panel/*`，自己的 CSS），把 `tray-panel.css` 里的变量改成 v3 配色即可：强调色改蓝，切换开关改 emerald。
- 托盘跳转事件（`tray-navigate`）通过 `useTrayNavigation` 映射到 Classic 的视图。

### 6.8 提醒与通知

| v4 机制 | Classic 位置 |
|---|---|
| 侧栏应用项的提醒点（`useSidebarStatus`，例如登录过期、需要重启） | AppSwitcher 图标右上角的 `h-2 w-2 rounded-full` 圆点，琥珀色或红色（参照 v3 Skills 导入按钮的小绿点） |
| 侧栏「设置」上的更新绿点 | 恢复 v3 的 `UpdateBadge` |
| 侧栏「今日」花费和 Token | 去掉，或者放到 📊 按钮的 tooltip 里 |
| `CodexStaleClientsNotice` 重启横幅 | ModeBar 下方，用 v3 告警条样式（`rounded-lg border-amber-500/30 bg-amber-500/10`） |
| 启动时没接上路由、已退回直连（`take_startup_attach_failures`） | 同上 |
| `NewLayoutDialog`（新布局引导） | **删除**，把 `newLayoutNoticeConfirmed` 视为 true |
| What's New | 保留 `WhatsNewDialog`，换成 v3 dialog 皮肤。4.0.0 条目中关于「侧栏」的描述改写成 Classic 的说法 |

---

## 7. 设计令牌换肤方案

### 7.1 shadcn 基础变量：全部恢复 v3 的值

v4 的这些变量值与 v3 不同，Classic 全部改回 §3.3 表中的 v3 值：
- light 和 dark 的 `--primary`（v4 是近黑和近白）
- `--ring`（v4 是橙色）
- dark 模式的 `--background`、`--foreground`、`--card`
- `--muted`、`--border`

### 7.2 v7 新增令牌到 v3 值的映射（写在 `index.css` 的 `:root` 和 `.dark` 中）

| v7 令牌 | 用途 | Classic Light | Classic Dark |
|---|---|---|---|
| `--bg-app` | 应用底色 | `= --background`（#fff） | `hsl(240 5% 12%)` |
| `--bg-sidebar` | 侧栏 | 不用；为安全起见设为 `--background` | 同左 |
| `--bg-subtle` | 浅底（ghost hover、分段控件底） | `= --muted`（240 4.8% 95.9%） | `hsl(240 5% 18%)` |
| `--bg-selected` | 选中行 | `hsl(210 100% 56% / .10)`（primary/10） | `hsl(210 100% 54% / .15)` |
| `--bg-card` / surface | 卡片 | `#fff` | `hsl(240 5% 16%)` |
| `--text-1` | 正文 | `240 10% 3.9%` | `0 0% 98%` |
| `--text-2` | 次要文字 | `240 3.8% 46.1%` | `240 5% 64.9%` |
| `--text-3` | 弱化文字 | `240 3.8% 46.1% / .7` | `240 5% 64.9% / .7` |
| **`--action-bg`** | 主按钮、选中页签、开关开启 | **`#0A84FF`**（v3 blue-500） | **`#0060DF`**（v3 dark 用 blue-600） |
| `--action-hover` | | `#0060DF` | `#0A84FF` |
| `--action-text` | | `#fff` | `#fff` |
| `--action-soft` | | `rgba(10,132,255,.10)` | `rgba(10,132,255,.15)` |
| `--direct-*` | 直连色 | blue-500 系列 | 同左 |
| `--route-*` | 路由色 | **emerald-500 系列**（v3 的接管绿） | 同左 |
| `--stack-*` | 聚合色 | violet-500 系列 | 同左 |
| `--success` / `--warning` / `--danger` | | emerald-500 / amber-500 / red-500 | 同左 |
| `--control-off` | 开关关闭 | gray-200 `#e4e4e7` | gray-900 `#2C2C2E` |
| `--overlay` | 遮罩 | `rgb(0 0 0 / .5)`，另加 blur-sm | 同左 |
| `--heat-1..4` | 热力图 | blue-100 / 300 / 400 / 500 | blue-900 / 700 / 500 / 400 |
| `--chart-*` | 图表 | 恢复 v3 配色（见 §6.5） | 同左 |
| `--shadow-sm/md/lg` | | 与 Tailwind 默认相同（v3 值） | 同左 |

**特别注意开关颜色**：v3 的开关开启是 emerald，主按钮是 blue，两者颜色不同；v4 两者都用 `bg-action`。所以 `switch.tsx` 必须单独写死 emerald（直接用 v3 的 `switch.tsx`），不能跟随 `--action-bg`。

### 7.3 `tailwind.config.cjs`

- **保留** v4 新增的所有键（颜色、`fontSize` 的 badge 到 metric、`borderRadius` 的 control / panel / dialog、shadow v7-\*），否则 v4 组件编译后类名无效。
- 把这些键的**值**改成接近 v3：

| 键 | v4 值 | Classic 值 | 对应 v3 |
|---|---|---|---|
| `rounded-control` | 6px | `0.5rem` | md |
| `rounded-panel` | 10px | `0.75rem` | lg / xl，卡片 |
| `rounded-dialog` | 14px | `0.75rem` | sm:rounded-lg |
| `text-body` | 13px | 14px | text-sm |
| `text-caption` | 12px | 12px | text-xs |
| `text-badge` | 11px | 10px | text-[10px] |

- 字体栈：v4 加入了 PingFang SC 和 Microsoft YaHei，对中文渲染更好，**建议保留**，与 v3 观感基本一致。
- `tailwindcss-animate`：v4 的 Sheet 抽屉依赖它。Classic 保留这个插件，同时去掉 `dialog`、`popover`、`dropdown` 上的 `animate-in` 类，恢复 v3 的「直接出现」。或者接受轻微的淡入效果，这一点交给你决定。

### 7.4 全局 CSS

- 恢复全局隐藏滚动条：`* { scrollbar-width: none }`。
  - 例外：会话阅读器、请求日志这类长列表，可以局部用 `.scroll-overlay` 显示细滚动条，以免长内容无法定位。是否要这个例外由你决定。
- `focus-visible` 改为 `outline-blue-500`。可以保留 v4 的「只在键盘操作时显示」（`html[data-keyboard]`），这一点比 v3 更好。
- 拖拽区规则恢复对所有平台生效（v4 改成了只对 `.is-mac`），但要沿用 v3 在 Linux 上返回空对象的规避写法。

### 7.5 UI 基础组件（`src/components/ui/*`）

做法：**以 v3 文件为底，补上 v4 的 API**。

| 组件 | 处理 |
|---|---|
| `button.tsx` | 使用 v3 的变体样式，并补上 v4 新增的变体和尺寸，映射如下：<br>• `solid` → v3 default 蓝<br>• `neutral` → v3 outline<br>• `quiet` → v3 ghost<br>• `direct` 蓝 / `route` emerald / `stack` violet 实心<br>• 尺寸 `regular` → h-9，`icon-compact` → h-8 w-8<br>去掉 v4 的 `active:scale-[0.96]` |
| `tabs.tsx` | v3（蓝底白字，`min-w-[120px]`） |
| `switch.tsx` | v3（`h-6 w-11` emerald）。v4 的 `size="sm"` 映射为 `h-5 w-9` |
| `dialog.tsx` | v3（灰色头尾条，`backdrop-blur-sm` 遮罩），保留 v4 的 z-index 档位 |
| `input` / `select` / `textarea` / `checkbox` / `dropdown-menu` / `tooltip` / `badge` / `card` / `table` / `sonner` | v3 的外观，签名兼容 v4 的调用 |
| v4 新增：`segmented-control` | 改为 v3 AppSwitcher 的药丸样式 |
| v4 新增：`page-tabs` | 改为 v3 的 Tabs 样式 |
| v4 新增：`sheet` | 右侧抽屉，内容改为 v3 dialog 的头尾条样式 |
| v4 新增：`notice` | 改为 v3 的 amber / red / sky 告警条 |
| v4 新增：`search-field` | 改为 v3 的 `ManagementListSearch` |
| v4 新增：`help-tip` / `hover-tip` | 改为 v3 的 tooltip |
| v4 新增：`sliding-indicator` | 保留，颜色跟随令牌 |
| `common/FullScreenPanel.tsx` | v3 结构（portal、64px 头部），保留 v4 新增的 props，例如 `host`、unsaved 检查 |

---

## 8. 兼容性：哪些东西会坏

> 本节说明：如果有人直接拿 v3 前端去连 v4 后端，哪些地方会坏。Classic 的方案是沿用 v4 业务前端，所以这些问题大多不会出现。但在 v3 视觉组件重新接入 v4 数据时，要逐条核对。

### 8.1 后端删除的命令（6 个）

| 命令 | 处理 |
|---|---|
| `update_toml_common_config_snippet` | 删除对应界面 |
| `get_default_cost_multiplier` / `set_default_cost_multiplier` | 删除成本倍率设置 |
| `get_stream_check_config` / `save_stream_check_config` / `stream_check_all_providers` | 删除连通性检查高级设置和「全部测试」。单个供应商测试保留（`stream_check_provider`） |

### 8.2 签名或返回结构变化

| 命令 | 变化 |
|---|---|
| `check_skill_updates` | 返回值改为 `{ updates, failures }` |
| `discover_available_skills` | 返回值改为 `{ skills, failures }`，新增 `force_refresh` 参数 |
| `install_skills_from_zip` | 返回值改为 `{ installed, skipped }` |
| `update_pi_provider_usage_script` | 新增必填参数 `app` |
| `get_session_messages` | 有 blocks 时**不再输出 `content`**，v3 的气泡会显示空白 |
| `set_proxy_takeover_for_app` | 新增可选参数 `stack`、`route` |
| `open_provider_terminal` | 新增可选参数 `skipPermissions`、`extraArgs` |
| `switch_provider` | 路由模式下切换官方卡会被拒绝（`switch.official_blocked_by_proxy`） |
| 通用配置片段相关的 get / set | 命令还在，但**不再生效** |

### 8.3 事件协议

| 事件 | 变化 |
|---|---|
| 深链接 | `deeplink-import` 和 `deeplink-error` 已删除，改为 `deeplink-pending` 事件，前端收到后调用 `peek_pending_deeplink` 读取，再调用 `ack_pending_deeplink(id)` 确认。**直接用 v3 的 `DeepLinkImportDialog` 会永远收不到链接**。Classic 用 v4 的对话框，换成 v3 皮肤 |
| 新增事件 | `proxy-flags-changed`、`tray-navigate`、`tray-panel-show`、`tray-panel-changed` |

### 8.4 新错误码（需要给出友好提示）

- `mode.unsettled`：上一次模式操作没有收尾
- `switch.official_blocked_by_proxy`：路由模式下不能切换官方卡
- `LIVE_EDIT_CONFLICT`：配置文件被外部改过
- `live.parse_error` / `live.shape_error`：客户端配置文件格式有误，已停止写入

### 8.5 Tauri 配置

| 项 | 处理 |
|---|---|
| `tauri.conf.json` 的 `trafficLightPosition {x:14,y:16}` | 这是为侧栏布局设置的，**Classic 要删除**，恢复 v3 的默认位置，与 28px 拖拽条对齐 |
| `macOSPrivateApi: true` | 保留，托盘面板需要 |
| `tray-panel` 窗口、`capabilities/tray-panel.json`、vite 第二入口 `tray-panel.html` | 保留 |

---

## 9. 实施路线与工作量

> 估算基于 1 名熟悉 React、Tailwind、Tauri 的开发者。只是粗略估计，实际耗时取决于对还原度的要求。

| 阶段 | 内容 | 产出 | 预估 |
|---|---|---|---|
| **P0 准备** | fork 上游；新建 `classic` 分支，基于 v4 main；搭好 v3.20.4 对照环境（另一台机器或独立用户，避免数据库被升级）；截取 v3 每个页面的 light 和 dark 截图作为视觉基线 | 基线截图集 | 1 天 |
| **P1 皮肤层** | `index.css` 令牌映射（§7.1、§7.2）；tailwind 键值调整（§7.3）；全局 CSS（§7.4）；`ui/*` 重做（§7.5）。完成后用 v4 原外壳跑一遍，确认没有类名丢失、对比度问题 | v4 布局 + v3 配色 | 4 到 6 天 |
| **P2 外壳层** | `src/classic/`：ClassicApp（视图状态、localStorage、⌘,、未保存检查、托盘跳转）、ClassicHeader、RoutingActivationBrand、UpdateBadge、AppSwitcher（14 个应用、溢出、提醒点）、AppToolbar（按应用分组）、AppPageHeader 适配器、FullScreenPanel 回退；`tauri.conf` 去掉 trafficLightPosition；删除 NewLayoutDialog | v3 外观的主界面骨架，子页面可以打开 | 5 到 7 天 |
| **P3 模式层与卡片** | ModeBar（三段控件、切换按钮、故障转移、设置抽屉、搜索）；接入 `SwitchModePanel` 和 `useModeActions`；ProviderCard 和操作按钮按 v3 视觉重写，由 `presentation.ts` 驱动；额度 footer 排版；Codex 重启横幅和启动失败通知 | 三种模式完整可用 | 6 到 8 天 |
| **P4 页面换肤** | 设置 6 个页签的外壳（嵌入 v4 的 sections）；用量（配色、热力图）；会话（两栏加 reader 换肤）；MCP、Skills、提示词换回 v3 列表风格；应用页；添加供应商的预设胶囊网格（方案 A） | 所有页面都是 v3 观感 | 7 到 10 天 |
| **P5 外围** | 托盘默认原生菜单，面板换肤；What's New 文案；四种语言的 i18n 补齐（新增按钮、ModeBar 文案）；新应用的品牌色 | | 2 到 3 天 |
| **P6 验证** | 对照 v3 基线截图逐页比对；§11 验收清单；macOS、Windows、Linux 三端冒烟测试；`pnpm typecheck` 和 `vitest` 全部通过 | 可发布版本 | 3 到 5 天 |
| **合计** | | | **约 28 到 40 人日，即 4 到 6 周** |

**最小可用版本（MVP，约 2 周）**：只做 P1、P2、P3。各页面先用 v4 组件配 v3 配色，不重做排版，之后再逐页细化。

---

## 10. 风险、数据安全与上游同步

### 10.1 数据安全（务必先读）

1. **数据库不可降级**：v4 的 schema 是 24，v3 是 19。数据库被 v4.0.2 及以后的版本打开过，v3 就会以「数据库版本过新」拒绝启动。
   - 开发和测试 Classic 时，**不要在日常使用 v3 的机器上直接运行**。可以换一个系统用户，或者先备份 `~/.cc-switch/`。
2. **首写备份**：v4 第一次写入每个客户端配置文件前，会把原文件备份到 `~/.cc-switch/backups/live-first-write/`。出问题时可以从这里找回。
3. **设备本地状态**：`live-state.json`、`codex-login-stash.json`、`codex-catalog-history.json` 都只存在本机，不参与云同步。
4. **v3 的旧接管状态**：v4 启动时会把 v3 遗留的 `proxy_live_backup` 迁出数据库，放到 `~/.cc-switch/backups/proxy-live-backup/`。
5. **云同步（WebDAV / S3）**：Classic 和 v3 的设备**不要共用同一个同步目标**。

### 10.2 技术风险

| 风险 | 影响 | 对策 |
|---|---|---|
| v4 组件内部写死了 v7 视觉（比如内联的 `bg-[#f97316]`、硬编码的尺寸） | 局部漏出橙色或尺寸不对 | 在 P1 结束时全局搜索 `orange`、`#f97316`、`#ea580c`、`action`，逐个排查 |
| 会话阅读器体量大（20 多个文件），换肤后细节多 | 工期 | 先只换令牌，不改结构；结构上只调整外层两栏布局 |
| header 拥挤（14 个应用、项目切换器、工具条） | 小窗口下溢出 | 依赖 AppSwitcher 已有的溢出机制；900px 最小宽度下实测；必要时窄屏把项目切换器收进 ⋯ |
| 托盘面板在 macOS 26 上的玻璃效果与 v3 风格不一致 | 观感 | 默认使用原生菜单 |
| ModeBar 增加 44px 高度 | 首屏能显示的卡片变少 | 可以接受；也可以只在 hover 或非直连时展开（不推荐，可发现性差） |

### 10.3 跟进上游

- 上游 v4 几乎每天发版。Classic 要做到每周 rebase 或 merge 一次。
- **冲突热点**：`src/components/ui/*`、`index.css`、`tailwind.config.cjs`、`ProviderCard.tsx`，以及被适配器替换的 `AppPageHeader`、`FullScreenPanel`。
- **降低冲突的办法**：
  - 外壳代码全部放在 `src/classic/`。
  - 皮肤改动尽量只改值，集中在一两个文件里（比如单独建 `src/classic/theme.css`，在 `index.css` 末尾覆盖）。
  - 用 alias 替换组件，而不是直接改原文件。
  - 每次合并上游后，检查 `src/components/shell/` 和 `src/lib/navigation.ts` 的变化，因为新功能的入口通常会在这两处出现。
- **新功能的入口规则**：上游在侧栏或全局页增加的新入口，统一按 §6.1 的规则映射：属于某个应用的进工具条，全局的进 header 左侧或设置页签。
- **许可证**：上游是 MIT 许可，可以 fork 和修改，需要保留原版权声明。发布时建议注明基于 CC Switch。

---

## 11. 验收清单

### 视觉（对照 v3.20.4 截图）

- [ ] 主界面没有侧栏；64px 毛玻璃 header；macOS 28px 拖拽条，红绿灯位置与 v3 一致
- [ ] 主色是蓝 `#0A84FF`；主界面上只有 ➕ 按钮是橙色
- [ ] 开关为 `h-6 w-11` emerald；页签选中为蓝底白字；dialog 有灰色头尾条
- [ ] 供应商卡片：`rounded-xl p-4`；直连为蓝色高亮加渐变，路由为绿色，聚合为紫色；操作区只在 hover 时出现
- [ ] "CC Switch" 品牌文字的颜色跟随模式，进入路由或聚合时播放爆发动画
- [ ] 全局隐藏滚动条；Light 和 Dark 两种主题都与 v3 一致
- [ ] 设置是 6 个页签加 glass-card 手风琴
- [ ] 全局搜索 `orange`、`#f97316` 等，只允许出现在 ➕ 按钮、品牌色（Claude 等）和告警场景

### 功能（v4 全量）

- [ ] 直连、路由、聚合在 Claude Code、Codex、Claude Desktop 上都能切换（Gemini、Grok 只有直连和路由）；退出时能恢复；切换前有确认框
- [ ] 聚合：添加或移除成员；设置默认供应商；Claude Code `/model` 和 Codex 模型选择器里能看到所有成员的模型；Codex 重启横幅可以一键重启
- [ ] 故障转移队列与开关可用
- [ ] 切换供应商后 hooks、MCP 等其他配置保持不变；编辑器预览和冲突检测可用
- [ ] 新增的 4 个应用（agy、kimi、omp、dsh）可以添加供应商，MCP、Skills、提示词、会话、用量都可用
- [ ] 授权中心：ChatGPT、Claude 多账号、Kimi、DeepSeek、Antigravity 可以登录；官方卡可以绑定账号
- [ ] 额度显示剩余量和倒计时
- [ ] 用量：不开路由也有数据；有「全部」范围和热力图；请求日志的列可以勾选
- [ ] 会话：14 个客户端都能读；有步骤摘要、对话目录、三种视图、查找、恢复会话、导出
- [ ] 应用页：安装、升级、卸载、排序、控制显示
- [ ] MCP 批量粘贴；Skills 一键全部更新；提示词复制到其他应用
- [ ] 深链接：冷启动时不丢；`iconUrl` 能显示
- [ ] 托盘：原生菜单和面板都能用；从托盘跳转到正确的视图
- [ ] 离开有未保存修改的页面时，header 返回、AppSwitcher、⌘, 都会弹出确认
- [ ] What's New 能弹出；新布局引导不出现
- [ ] `pnpm typecheck`、`pnpm test:unit` 通过；三个平台都能构建

---

## 12. 附录：关键文件索引

### A. Classic 新建

```
src/classic/
  ClassicApp.tsx              视图状态机（替代 v4 App.tsx 的导航）
  ClassicHeader.tsx           64px header
  AppSwitcher.tsx             从 v3 移植，补 14 个应用 + 提醒点
  AppToolbar.tsx              每个应用的工具条
  ModeBar.tsx                 三态模式条
  RoutingActivationBrand.tsx  从 v3 移植，增加 stack 紫色
  UpdateBadge.tsx             从 v3 移植
  ProviderCardClassic.tsx     v3 卡片视觉 + presentation.ts
  ClassicSettings.tsx         6 个页签外壳
  AppPageHeaderAdapter.tsx    替换 @/components/shell/AppPageHeader
  ClassicHeaderContext.tsx    标题和操作按钮的 portal
  theme.css                   v3 令牌覆盖
```

### B. 换肤（改 v4 文件）

```
src/index.css                 令牌值（或在末尾 import classic/theme.css）
tailwind.config.cjs           圆角、字号的值
src/components/ui/*.tsx       v3 外观 + v4 API
src/components/common/FullScreenPanel.tsx
src/tray-panel/tray-panel.css
src-tauri/tauri.conf.json     删除 trafficLightPosition
src/main.tsx                  挂载 ClassicApp
```

### C. 原样沿用的 v4 关键文件

```
src-tauri/**                                     后端整体
src/components/providers/presentation.ts         卡片行为模型
src/components/providers/mode/{ModeDialog,SwitchModePanel,RouteSettingsSheet,StackSettingsSheet}.tsx
src/hooks/useModeActions.ts、lib/query/*、lib/api/*
src/components/providers/forms/**                表单、预设、模型拉取、预览
src/components/quota/**、*QuotaFooter.tsx
src/components/usage/**、sessions/**、mcp/**、skills/**、prompts/**、apps/**
src/components/settings/auth/**、settings/sections/**
src/components/DeepLinkImportDialog.tsx、WhatsNewDialog.tsx、src/whats-new/*
src/tray-panel/**
src/lib/{navigation,unsavedChanges,whatsNew,modelsDev,toast}.ts
```

### D. 不挂载或删除

```
src/components/shell/Sidebar.tsx、NewLayoutDialog.tsx
src/hooks/useSidebarCollapsed.ts（useSidebarStatus 的数据改为给 AppSwitcher 的提醒点使用）
```

---

*本文档基于上游源码静态分析，没有实际编译运行 Classic。行号和文件规模以 commit `7569b27a` 为准。上游变化很快，开工前请重新核对 §8 的命令差异。*
