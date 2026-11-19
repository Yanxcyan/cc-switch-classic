# GitHub Copilot CLI 接入

GitHub Copilot CLI 是独立应用，应用 ID 为 `copilot`（兼容 `copilot-cli`、`github-copilot`），对应 npm 包 `@github/copilot`、命令 `copilot`。数据目录为 `~/.copilot`，设置 `COPILOT_HOME` 后全部跟随该目录（CC Switch 进程需要继承这个环境变量）。

## 使用方式

1. 在「应用」页安装 GitHub Copilot CLI，或选择现有安装。
2. 在经典顶栏选择 **Copilot CLI**，打开「添加供应商」。
3. 使用官方登录时，创建官方卡并从卡片打开终端。可指定本次会话的模型和推理强度，也可以绑定授权中心的 GitHub 账号。
4. 使用自己的 API Key 时，在自带模型卡填写接口、地址、凭据和模型，保存后点击「添加」。供应商及其模型将写入 Copilot 原生的 `providers.json`。在 Copilot 的 `/model` 中选择 `<卡片 ID>/<模型 ID>`，或从已添加的卡片打开终端。

多张自带模型卡可以共存。「移除」只清理属于该卡的供应商和模型条目。写入前会校验合并后的配置；已有文件格式有误时，界面会提示修正。自带模型的凭据随原生配置保存在本机。官方卡绑定账号时通过当前进程的环境变量传递登录令牌。

## 配置与能力

| 能力       | 原生位置 / 行为 |
| --- | --- |
| 供应商     | 官方卡从终端启动；自带模型卡写入 `providers.json` |
| 官方账号   | Copilot CLI 自己的登录；或绑定授权中心 GitHub 账号，经 `COPILOT_GITHUB_TOKEN` / `COPILOT_GH_HOST` 传入 |
| 官方额度   | 卡片显示 GitHub Copilot 的 Premium 额度，在卡片「更多 → 配置用量查询」里开关（只有 Copilot 额度一种模板）。绑了授权中心账号的卡默认打开并查该账号；没绑的卡默认关闭，打开后读 `~/.copilot/config.json` 的 `lastLoggedInUser`，按用户名和域名在授权中心找对应账号来查；找不到或 Copilot CLI 未登录时卡片上提示原因 |
| MCP        | `~/.copilot/mcp-config.json`：stdio 写为 `"type": "local"`，另有 `http`、`sse`；新条目带 `"tools": ["*"]`，已有条目的 `tools`、`timeout` 保留。停用时移除条目；导入时 `settings.json` 的 `disabledMcpServers` 记为未启用 |
| Skills     | `~/.copilot/skills/`，与 Kimi 相同的原生目录保护（同名外部目录不覆盖、不删除） |
| 全局提示词 | `~/.copilot/copilot-instructions.md`（`copilot instruction list` 中的 Personal instructions） |
| 会话       | `~/.copilot/session-state/<id>/events.jsonl` 与 `workspace.yaml`；旧版本没有 `workspace.yaml` 时退回 `session.start` |
| 恢复会话   | `copilot --resume=<id>` |
| 用量       | 导入 `session.usage_record`（新版本才写出）；按项目价格表估算费用 |
| 连通性检查 | 自带模型卡检查 `provider.baseUrl`；官方卡不提供 |
| 深链接     | `resource=provider&app=copilot`，`apiFormat` 支持 `openai_chat`、`openai_responses`、`anthropic`；`config` 可为 `{env:{…}}` 或扁平 `COPILOT_*`，只取地址、Key、模型；导入后只保存，不启用。MCP 用 `apps=copilot` |

## 会话与 Token 语义

- 主会话只展示 `user.message`、`assistant.message`（含 `reasoningText`、`toolRequests`）、`tool.execution_complete` 和压缩摘要；带 `parentToolCallId` 的子代理内部消息不进主会话，`report_intent` 意图标签不作为工具调用显示。
- `session.usage_record` 在对应回复之前写出，会话里挂到下一条回复上。`inputTokens` 包含缓存命中：新输入取 `copilotUsage.tokenDetails` 的 `input`，没有时用 `inputTokens − cacheReadTokens − cacheWriteTokens`。耗时、首字时间取 `duration`、`timeToFirstTokenMs`。
- 用量按 `copilot:<会话>:<事件 ID>` 去重，去重账本与明细同事务提交；未变化的文件按大小和修改时间跳过，写到一半的尾行下次再读。旧版本只有汇总、没有逐次记录的会话不导入，不做估算。
- Copilot 订阅按 Premium 请求 / AI Credits 计费，表中费用是按 token 价格表的估算；缺少价格时为 0，不代表免费。
- 会话删除在 Copilot CLI 中完成，以保持 `session-store.db` 与会话目录一致。
