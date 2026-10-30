# CC Switch Classic：Agent 维护交接与修改记录

本文件是本仓库所有 agent 的共同工作约定和交接入口。开始修改前先完整阅读；交接、提交或结束任务前，更新当前状态并在末尾追加自己的修改记录。用户在当前会话中的明确指示优先于本文件。

## 1. 必须遵守的记录规则

1. **每个实际修改文件的 agent 都必须追加记录**，包括代码、配置、依赖、图片、文档、构建及发布流程修改。纯只读分析无需记录。不能只由主 agent 写一句“多人完成”代替其他 agent 的记录。
2. 记录写入本文件末尾的“逐次修改记录”区域，至少说明修改原因与结果、涉及文件、实际验证结果、限制或后续事项。不要记录 API Key、令牌、密码、私钥、个人账号数据或未经脱敏的日志。
3. **已有记录只能追加，不能删除、改写或重新排序**。发现旧记录有误时，追加更正并指出原记录。上方的当前状态和维护约束可以更新，但同样要追加记录。
4. 每次提交都必须包含新的记录；记录必须一起暂存，不能只留在工作区。任务没有要求提交时，也必须在交付前完成记录。
5. 多 agent 并行时先分配文件范围。主 agent 协调各参与者错峰追加本文件，合并时保留每个参与者的独立记录。主 agent 核对实际参与者和记录是否一致。
6. 完成前运行 `pnpm agent:check`；提交前运行 `node scripts/check-agent-log.mjs --staged`。有修改但没有新记录、删除本文件、篡改旧日志、字段缺失时检查应失败。
7. 不得为了让检查通过而使用空话、伪造测试结果，或通过关闭 hook、`--no-verify`、修改检查器等方式绕过规则。用户明确要求调整维护机制时，应如实修改并记录调整原因。
8. 不覆盖用户或其他 agent 的未完成修改，不强制推送、不移动已发布标签。发生冲突时先阅读双方改动，保留双方有效工作。

### 记录格式

把以下模板填写完整，追加到日志区域结束标记之前。日期时间使用北京时间（Asia/Shanghai）；agent 标识写本次执行者的实际名称。

```markdown
### YYYY-MM-DD HH:mm +08:00 | agent 标识 | 本次主题

- 改动：修改的原因、实际结果及必要的取舍。
- 涉及文件：列出本次修改的文件或明确目录。
- 验证：实际运行的命令与结果；没有运行时写明原因，失败或未完成的检查必须说明。
- 注意事项：影响范围、尚未完成事项，或明确说明无新增限制。
```

### 检查的范围与限制

- `scripts/install-agent-hooks.mjs` 为本地 Git 仓库配置 `.githooks`，由 `pnpm install` 的 `prepare` 脚本调用，也可手动执行。已有自定义 hook 配置不能被悄悄覆盖。
- `.githooks/pre-commit` 检查暂存版本；GitHub 的 `Agent change log` 工作流检查推送或 PR 的变更。新克隆首次开发前应安装依赖，或先手动安装 hook。
- 自动检查验证“是否新增了合规记录”和“是否保留旧日志”，不能证明模型身份、阅读行为或记录内容的真实性。主 agent 仍需核对每个实际参与修改的 agent。
- GitHub 检查失败会显示失败状态；除非仓库另行配置必需状态检查，它本身不会撤销已发生的直接推送。不要声称这能绝对阻止拥有仓库写权限的人绕过规则。

## 2. 当前项目状态

- 对外仓库：<https://github.com/Yanxcyan/cc-switch-classic>，开发分支为 `main`。这是独立仓库；原项目是 `farion1231/cc-switch`。
- 业务基线为上游 v4.0.22（`7569b27af4f485172950fb6989f5643163842bd1`），界面参考 v3.20.4。主要策略是沿用 v4 业务及 Rust 后端，恢复经典顶栏、布局和配色。
- 当前已发布版本为 **v4.0.24**，支持 Windows x64/ARM64、macOS Intel/Apple Silicon 通用包、Linux x64/ARM64。后续发布后须同步更新此处。
- v4.0.23 构建已取消，没有发布安装包；不要把它当作可下载版本，也不要重写现有标签。
- 继续保留上游作者署名与 MIT 许可证。项目链接、安装包及更新来源指向 Classic 仓库；历史上游引用不应一律替换。

## 3. 已完成的主要修改

| 范围                 | 已实现的行为                                                                                          | 主要位置 / 参考提交                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 经典界面             | 经典顶栏、应用切换、直连/路由/聚合模式入口、六页签设置、浅深色主题；沿用 v4 业务组件                  | `src/classic/`、`src/main.tsx`；`c79b21e6`                                                                                |
| 启动入口             | Windows 双击启动时补齐已有 Node/pnpm/Rust/编译器环境，支持 `--check`；仅影响启动进程的环境            | `Start-Classic.bat`                                                                                                       |
| 仓库独立化           | Classic 在自己的 `main` 开发和发布，关于页及更新日志跳转自己的仓库                                    | `src/config/project.ts`、`AboutSection.tsx`、`src/lib/whatsNew.ts`；`6c7c89cd`、`6a179fe7`                                |
| 设置宽度             | 通用、代理、认证、高级、使用统计、关于统一使用较宽内容区，取消原来的窄版最大宽度限制                  | `src/components/settings/SettingsLayout.tsx`、`src/classic/ClassicSettings.tsx`；`818123d7`                               |
| README 赞助内容      | 四种语言 README 的赞助广告区已移除                                                                    | `README*.md`；`090a75e2`                                                                                                  |
| 供应商目录           | 添加列表保留 Packy、官方/大厂、云平台、本地服务及自建网关模板，隐藏其他中转平台预设；保留旧配置兼容性 | `src/config/providerCatalogPolicy.ts`、`ProviderPresetSelector.tsx`；`d564e39b`                                           |
| API Key 推广入口     | Packy 使用指定注册链接；其他赞助推广入口隐藏；普通云厂商控制台入口保留                                | `ApiKeySection.tsx`、`useApiKeyLink.ts`、各供应商预设；`d564e39b`                                                         |
| 自动更新和三平台发布 | 独立产品标识、更新公钥、更新地址、各架构安装包、完整签名校验后发布                                    | `.github/workflows/release.yml`、`scripts/check-classic-release.mjs`、`src-tauri/tauri.conf.json`；`e4134da2`、`cec348b2` |
| 截图                 | 四种语言 README 共用用户提供的主界面、应用页、聚合模式、用量统计四张截图，按两行两列排列              | `assets/screenshots/classic/`；`211e7c10`                                                                                 |
| 仓库整理             | 内部设计方案、旧需求稿、临时验收记录及 `outputs/` 只留本地；社区说明归入 `.github`                    | `.gitignore`、`.github/*.md`；`7e204a67`                                                                                  |

## 4. 修改时需要保持的约束

### 界面与业务

- Classic 的挂载入口是 `src/main.tsx` → `src/classic/ClassicApp.tsx`。`src/App.tsx` 保留作为上游结构参考，不要误切回上游侧栏布局。
- 顶栏页头通过 `src/classic/AppPageHeaderAdapter.tsx` 适配，Vite、TypeScript、Vitest 的映射需要一致。
- 点击模式页签仅切换浏览内容；实际启用直连、路由、聚合继续通过既有确认与业务流程，不要因界面调整绕过确认或配置写入逻辑。
- 六个设置页签保持一致的宽版布局与左右留白；窄窗口不能产生横向溢出。设置草稿和保存行为继续沿用既有业务逻辑。
- 不因界面或目录精简改写用户已保存的供应商、账户、模型和 API 配置，不移除对应的底层适配器。

### 供应商与推广策略

- 可见预设集中由 `src/config/providerCatalogPolicy.ts` 控制，避免各个表单另写一套筛选规则。
- **不要直接删除或重新排序原始预设数组**：旧配置识别、预设 ID、模型能力等仍会用到它们。只在展示入口筛选，并检查搜索、分组、版本切换和派生应用入口。
- 保留 PackyCode、官方和本地服务，以及七牛、Azure、NVIDIA、ModelScope、UCloud、PPIO、SiliconFlow、Hugging Face、Vercel、Groq 等当前白名单。完整名单以策略文件为准；后续增删应由用户需求驱动。
- Packy 的获取 API Key 链接固定为 `https://www.packyapi.ai/register?aff=VGGr`。这不等于把 API 请求地址改成注册链接。
- 其他赞助商的按钮和推广文字隐藏。历史预设可能只有 `aff`、`utm_*` 或 `channel=ccswitch` 参数而无赞助元数据，也需纳入识别。
- 编辑旧配置时要结合已有元数据和请求地址识别；用户主动选择新预设后，新预设信息应优先。不能误隐藏普通云厂商的 `apiKeyUrl`。

### 发布与安全

- 产品名 `CC Switch Classic`，应用标识 `com.yanxcyan.ccswitch.classic`；Windows WiX upgradeCode 为 `0686eca2-6787-4d6f-91cf-d76518970c35`。不要随意更换这些值。
- 更新地址固定指向本仓库：`https://github.com/Yanxcyan/cc-switch-classic/releases/latest/download/latest.json`。更新公钥必须与现有签名私钥配套，不能随意重新生成。
- 私钥、签名密码及 GitHub 凭据只在仓库外的安全存储和 GitHub Secrets 中保存；本文件只能记录凭据名称和维护方法，不能写入实际值。
- 版本号需同步修改 `package.json`、`src-tauri/tauri.conf.json`、`src-tauri/Cargo.toml` 和 `src-tauri/Cargo.lock` 中本应用的版本。
- 发布需新增四语言 `src/whats-new/<version>.json` 和中英日发布说明。详细流程见 [Classic 发布说明](docs/classic-release.md)。
- 普通代码推送不会发布安装包；推送 `v*` 标签触发正式发布；手动运行发布工作流只做构建验证。
- 所有平台成功且更新签名验证通过后，才将附件齐全的草稿转成公开 Release。不要放开单平台失败后仍发布的限制。
- macOS 当前使用 ad-hoc 签名，没有 Apple 公证；Tauri 更新签名与 Apple Developer 签名是两回事。
- 首次使用 Classic 需手动安装；旧上游版本不会自动转入 Classic。Windows 便携版通过下载 ZIP 手动替换程序。
- Classic 仍使用用户现有的 `.cc-switch`、客户端配置和 `ccswitch://` 协议。独立安装标识不意味着数据隔离。真实写入验收需明确隔离配置与影响范围。
- 应用使用 SQLite，本任务没有引入 MySQL。不要将其他项目的数据库、SSH 或生产环境配置混入此仓库。

### 文档和本机环境

- README 的四种语言版本需同步维护；截图使用 `assets/screenshots/classic/`。发布说明和用户手册被应用/README 引用，不能因为 Markdown 文件多就整批删除。
- 贡献、安全、行为规范、帮助说明在 `.github/`；移动文档时要修正相对链接。
- 内部设计方案、旧需求稿、临时日志和 `outputs/` 已被忽略，不要重新强行加入 Git。用户明确要求共享的本文件是维护入口，不要再另建重复的交接稿。
- 先确认正在运行的应用/编译属于谁。不要为了释放构建锁而结束用户正在运行的 Tauri、Cargo 或开发服务器。
- 复用仓库现有工具链，版本以 `packageManager`、`.node-version`、`rust-toolchain.toml` 为准；不要为了运行单次检查无关升级依赖。

## 5. 如何验证

根据实际改动选择验证，不要每次文档改动都运行整套应用测试，也不要为了赶进度省略相关检查。

| 修改类型            | 应执行的检查                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 每次修改            | `pnpm agent:check`，提交前检查暂存版本；`git diff --check`                                                                                      |
| 文档/图片           | 检查相对链接和图片是否存在，必要时预览；确认没有泄露本地敏感信息                                                                                |
| 前端逻辑/界面       | `pnpm typecheck`、相关 Vitest 测试、必要的前端构建与界面检查；按仓库要求执行 `pnpm format:check`                                                |
| 供应商目录/推广链接 | `ProviderCatalog`、`ApiKeySection`、`useApiKeyLink` 及涉及表单的测试，覆盖新增、搜索、编辑旧配置与普通云厂商链接                                |
| Rust                | `cargo fmt --check --manifest-path src-tauri/Cargo.toml`，相关测试；CI 执行 Clippy、nextest 和跨平台检查                                        |
| 发布流程/更新       | `node scripts/check-classic-release.mjs --config`、`node --test scripts/check-classic-release.test.mjs`，再检查真实构建产物、签名和公开更新地址 |
| 维护记录检查机制    | `node --test scripts/check-agent-log.test.mjs`，验证缺日志、改旧日志、暂存/工作区不同步时确实失败                                               |

较大前端测试可使用 `pnpm exec vitest run <相关测试文件> --maxWorkers=1 --fileParallelism=false` 控制本机资源。不要一边运行类型检查/测试一边修改它正在读取的文件。

### 已有验证证据与仍需注意的限制

- v4.0.24 的 [完整 CI](https://github.com/Yanxcyan/cc-switch-classic/actions/runs/41083420596) 和 [三平台发布](https://github.com/Yanxcyan/cc-switch-classic/actions/runs/41083429313) 已运行成功。
- 供应商相关的 11 文件 222 项回归通过；最后补丁另跑 3 文件 51 项通过。新条目、旧配置、推广链接和云控制台均有覆盖。
- 发布后验证了公开 `latest.json` 的 10 个系统/安装格式目标，以及 13 个安装/下载文件返回正常；发布工作流逐一验证更新签名。
- README 四张截图逐字节保留用户原图，已渲染检查；文档整理后检查了 24 处社区文档链接。
- 以上不代表在三种真实设备上完成安装及“旧版本→新版本”升级验收；真实 OAuth、模式切换、托盘、同步等也不能用模拟浏览器预览代替实机验证。后续报告必须区分检查范围。
- 历史验证只说明当时提交，不代表后来新增的修改自动通过。

## 6. 逐次修改记录（只追加）

<!-- agent-change-log:start -->

### 2026-10-31 00:40 +08:00 | /root | 汇总既有开发与发布交接

- 改动：按用户要求将此前经典界面、独立仓库、设置宽度、供应商精简、推广链接、三平台发布、截图和仓库整理工作集中记录到本文件，建立逐 agent 追加规则。
- 涉及文件：`AGENTS.md`；上方表格列明历史改动的关键文件与已存在提交，未将本地内部设计稿重新公开。
- 验证：对照当前源码、Git 提交记录、发布说明和既有验证结果整理；本条不宣称维护检查器已经启用，其实现与测试由后续记录说明。
- 注意事项：公开记录不能包含任何实际凭据；历史验证与真实安装/升级验收的边界已注明。后续每个修改 agent 都必须追加自己的记录。

### 2026-10-31 00:47 +08:00 | /root/classic_shell | 实现逐 agent 追加日志检查与本地提交钩子

- 改动：实现工作区、暂存区及基于 merge-base 的 CI 日志检查，保留既有日志的严格前缀并校验完整记录；安装器仅写本仓库配置，遇到自定义 hooksPath 或默认目录内任何非示例钩子时保留原配置。
- 涉及文件：scripts/check-agent-log.mjs、scripts/check-agent-log.test.mjs、scripts/install-agent-hooks.mjs、.githooks/pre-commit；按主 agent 分工在 AGENTS.md 追加本条记录。
- 验证：node --test scripts/check-agent-log.test.mjs 的 16 项测试全部通过；真实临时 Git 仓库中，无新记录及记录未暂存的提交均被拒绝，记录一起暂存后成功；相关脚本 Prettier、git diff --check 和本仓库工作区日志检查通过。
- 注意事项：检查不能证明 agent 身份或记录真实性，也不能替代每个修改者的独立记录；失效引用及缺少共同历史会失败，CI 须获取完整所需历史；主 agent 负责以 100755 模式暂存钩子并验证 CI、提交，不覆盖既有自定义钩子。

### 2026-10-31 00:48 +08:00 | /root | 接入统一交接规则与提交检查

- 改动：将维护交接固定为根目录 AGENTS.md，允许该文件进入版本库；接入 pnpm prepare 自动安装本地提交钩子、agent:check 命令、PR 检查清单及 main 推送/PR 的 GitHub 记录检查；钩子使用 LF 和可执行文件模式。
- 涉及文件：AGENTS.md、.gitignore、.gitattributes、package.json、.github/pull_request_template.md、.github/workflows/agent-change-log.yml；审核协作 agent 实现的检查器、测试与钩子。
- 验证：协作 agent 的 16 项检查器及真实 Git 提交测试通过；本机执行 pnpm run prepare、pnpm agent:check、相关文件 Prettier 和 git diff --check 均通过，core.hooksPath 已为 .githooks。未重复运行应用业务测试，本次未改应用业务代码；GitHub 首次运行将在推送后验证。
- 注意事项：自动检查按实际变更检查记录，不能证明 agent 身份或文字真实性；未配置 GitHub 分支保护，CI 失败不会撤销直接推送。每位修改者仍需独立登记，主 agent 负责核对。

<!-- agent-change-log:end -->
