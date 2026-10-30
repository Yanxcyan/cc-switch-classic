import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function git(cwd, args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}
function isFile(filename) {
  try {
    return lstatSync(filename).isFile();
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

export function installAgentHooks(cwd = process.cwd()) {
  const directory = path.resolve(cwd);
  const rootResult = git(directory, ["rev-parse", "--show-toplevel"]);
  if (rootResult.error?.code === "ENOENT" || rootResult.status !== 0)
    return {
      installed: false,
      message: "源码目录不是可用 Git 工作区，跳过本地钩子安装。",
    };
  if (rootResult.error) throw rootResult.error;
  const root = path.resolve(rootResult.stdout.trim());
  if (root !== directory)
    return {
      installed: false,
      message: "当前源码目录不是 Git 仓库根目录，保留上层仓库的钩子配置。",
    };
  if (
    !isFile(path.join(root, ".githooks", "pre-commit")) ||
    !isFile(path.join(root, "scripts", "check-agent-log.mjs"))
  )
    throw new Error(
      "本仓库缺少 .githooks/pre-commit 或日志检查脚本，未修改钩子配置。",
    );

  const configured = git(root, ["config", "--get", "core.hooksPath"]);
  if (configured.error) throw configured.error;
  if (configured.status === 0) {
    if (configured.stdout.trim() === ".githooks")
      return {
        installed: true,
        message: "Agent 日志钩子已启用，无需重复安装。",
      };
    return {
      installed: false,
      message:
        "检测到已有自定义 core.hooksPath，已保留；请在现有 pre-commit 中接入 node scripts/check-agent-log.mjs --staged。",
    };
  }
  if (configured.status !== 1)
    throw new Error("无法读取 core.hooksPath，未修改配置。");
  const oldHookResult = git(root, ["rev-parse", "--git-path", "hooks"]);
  if (oldHookResult.status !== 0)
    throw new Error("无法定位现有 Git 钩子，未修改配置。");
  const oldHooks = path.resolve(root, oldHookResult.stdout.trim());
  try {
    // hooksPath replaces the entire hook directory, not just pre-commit.
    // Directory entries also include symlinks (including dangling ones).
    if (readdirSync(oldHooks).some((name) => !name.endsWith(".sample"))) {
      return {
        installed: false,
        message:
          "默认 hooks 目录中存在非示例自定义钩子，已保留全部钩子配置；请在现有 pre-commit 中接入 node scripts/check-agent-log.mjs --staged。",
      };
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const installed = git(root, [
    "config",
    "--local",
    "core.hooksPath",
    ".githooks",
  ]);
  if (installed.status !== 0)
    throw new Error("无法写入仓库本地 core.hooksPath 配置。");
  return {
    installed: true,
    message: "已为本仓库启用 .githooks；提交时校验暂存区 Agent 日志。",
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(installAgentHooks().message);
  } catch (error) {
    console.error(`Agent 钩子安装失败：${error.message}`);
    process.exitCode = 1;
  }
}
