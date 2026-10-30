import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const LOG_START = "<!-- agent-change-log:start -->";
export const LOG_END = "<!-- agent-change-log:end -->";
const LOG_FILE = "AGENTS.md";
const REQUIRED_FIELDS = ["改动", "涉及文件", "验证", "注意事项"];
const PLACEHOLDERS = new Set([
  "无",
  "略",
  "暂无",
  "暂缺",
  "待补充",
  "待填写",
  "待定",
  "待完善",
  "待验证",
  "未填写",
  "未记录",
  "未验证",
  "todo",
  "tbd",
  "na",
  "none",
  "null",
  "undefined",
  "placeholder",
]);

const normalizeLF = (text) => text.replace(/\r\n?/g, "\n");
const isPlaceholder = (text) => {
  const compact = text.toLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
  return !compact || PLACEHOLDERS.has(compact);
};

function logBody(text) {
  const normalized = normalizeLF(text);
  if (
    normalized.split(LOG_START).length !== 2 ||
    normalized.split(LOG_END).length !== 2
  ) {
    throw new Error(
      "AGENTS.md 必须包含且仅包含一组 agent-change-log 起止标记。",
    );
  }
  const lines = normalized.split("\n");
  const start = lines.indexOf(LOG_START);
  const end = lines.indexOf(LOG_END);
  if (start < 0 || end <= start)
    throw new Error("日志起止标记必须各占一行，且开始标记必须在结束标记之前。");
  return normalized.slice(
    normalized.indexOf(LOG_START) + LOG_START.length,
    normalized.indexOf(LOG_END),
  );
}

function validateTimestamp(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return (
    year >= 1000 &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day &&
    hour < 24 &&
    minute < 60
  );
}

export function validateRecords(body) {
  const lines = normalizeLF(body).trim().split("\n");
  const entries = [];
  let current;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      const match = line.match(
        /^### (\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) \+08:00 \| ([^|]+) \| ([^|]+)$/,
      );
      if (
        !match ||
        !validateTimestamp(match[1], match[2]) ||
        isPlaceholder(match[3]) ||
        isPlaceholder(match[4])
      ) {
        throw new Error(
          "日志标题须为有效的「### YYYY-MM-DD HH:mm +08:00 | agent标识 | 主题」。",
        );
      }
      current = new Map();
      entries.push(current);
    } else if (!current) {
      if (line.trim())
        throw new Error("日志块与追加内容只能以完整记录标题开始。");
    } else {
      const field = line.match(/^- (改动|涉及文件|验证|注意事项)：(.*)$/);
      if (field) {
        if (current.has(field[1]))
          throw new Error(`一条记录不能重复「${field[1]}」字段。`);
        if (isPlaceholder(field[2]))
          throw new Error(
            `「${field[1]}」须填写实际内容，不能留空或使用纯占位文字。`,
          );
        current.set(field[1], field[2]);
      } else if (/^#{1,6}\s/.test(line)) {
        throw new Error("日志块中只允许规定格式的三级记录标题。");
      }
    }
  }
  if (!entries.length) throw new Error("日志块必须至少包含一条完整记录。");
  for (const entry of entries)
    for (const field of REQUIRED_FIELDS) {
      if (!entry.has(field)) throw new Error(`日志记录缺少「${field}」字段。`);
    }
  return entries.length;
}

export function validateLogUpdate(previous, next) {
  if (next === null)
    throw new Error(
      "有文件变更时不能删除或缺少根目录 AGENTS.md；请追加完成记录。",
    );
  const body = logBody(next);
  validateRecords(body);
  if (previous === null)
    return { appended: validateRecords(body), bootstrap: true };
  const oldBody = logBody(previous);
  if (!body.startsWith(oldBody))
    throw new Error(
      "已有日志必须原样保留（仅允许换行符归一化）；更正请追加记录，不能删改历史。",
    );
  const appended = body.slice(oldBody.length);
  if (!appended.trim())
    throw new Error(
      "检测到文件变更，但 AGENTS.md 未追加新记录；只改正文也须追加记录。",
    );
  return { appended: validateRecords(appended), bootstrap: false };
}

function git(cwd, args, allowFailure = false) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error(`无法运行 Git：${result.error.message}`);
  if (result.status !== 0 && !allowFailure)
    throw new Error(
      `Git 检查失败：${result.stderr.trim() || "命令未成功完成"}`,
    );
  return result;
}

function commitRef(cwd, ref) {
  const result = git(
    cwd,
    ["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`],
    true,
  );
  if (result.status !== 0)
    throw new Error(
      "无法解析比较用的 Git 引用；请获取完整历史并检查 --base/--head，不能把失效引用当作首次建档。",
    );
  return result.stdout.trim();
}

function currentHead(cwd) {
  const result = git(cwd, ["rev-parse", "--verify", "HEAD^{commit}"], true);
  if (result.status === 0) return result.stdout.trim();
  const symbolic = git(cwd, ["symbolic-ref", "-q", "HEAD"], true);
  if (symbolic.status === 0) {
    const branch = symbolic.stdout.trim();
    const exists = git(cwd, ["show-ref", "--verify", "--quiet", branch], true);
    if (exists.status === 1) return null; // A newly initialized repository, before its first commit.
  }
  throw new Error("无法读取 HEAD；仅尚无首次提交的新仓库允许空基线。");
}

function readTreeLog(cwd, tree) {
  if (tree === null) return null;
  const entry = git(cwd, ["ls-tree", "-z", tree, "--", LOG_FILE]).stdout;
  if (!entry) return null;
  const match = entry.match(/^(100644|100755) blob ([a-f0-9]+)\tAGENTS\.md\0$/);
  if (!match)
    throw new Error("根目录 AGENTS.md 必须是普通文件，不能是链接或目录。");
  return git(cwd, ["cat-file", "blob", match[2]]).stdout;
}

function readIndexLog(cwd) {
  const entry = git(cwd, ["ls-files", "--stage", "-z", "--", LOG_FILE]).stdout;
  if (!entry) return null;
  const match = entry.match(/^(100644|100755) ([a-f0-9]+) 0\tAGENTS\.md\0$/);
  if (!match) throw new Error("暂存区 AGENTS.md 必须是已解决冲突的普通文件。");
  return git(cwd, ["cat-file", "blob", match[2]]).stdout;
}

function readWorktreeLog(cwd) {
  const filename = path.join(cwd, LOG_FILE);
  try {
    if (!lstatSync(filename).isFile())
      throw new Error("根目录 AGENTS.md 必须是普通文件，不能是链接或目录。");
    return readFileSync(filename, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export function checkAgentLog({
  cwd = process.cwd(),
  mode = "worktree",
  base,
  head,
} = {}) {
  const root = git(cwd, ["rev-parse", "--show-toplevel"]).stdout.trim();
  let previous;
  let next;
  let changed;
  if (mode === "range") {
    const baseCommit = commitRef(root, base);
    const headCommit = commitRef(root, head);
    const common = git(root, ["merge-base", baseCommit, headCommit], true);
    if (common.status !== 0 || !common.stdout.trim())
      throw new Error("比较引用没有可用共同祖先；请获取所需历史后再检查。");
    const ancestor = common.stdout.trim();
    changed = git(root, [
      "diff",
      "--no-ext-diff",
      "--no-renames",
      "--name-only",
      "-z",
      ancestor,
      headCommit,
      "--",
    ]).stdout;
    if (!changed) return { changed: 0, appended: 0 };
    previous = readTreeLog(root, ancestor);
    next = readTreeLog(root, headCommit);
  } else {
    const baseline = currentHead(root);
    if (mode === "staged") {
      changed = git(root, [
        "diff",
        "--no-ext-diff",
        "--no-renames",
        "--cached",
        "--name-only",
        "-z",
        ...(baseline ? [baseline] : []),
        "--",
      ]).stdout;
      if (!changed) return { changed: 0, appended: 0 };
      next = readIndexLog(root);
    } else if (mode === "worktree") {
      const tracked = baseline
        ? git(root, [
            "diff",
            "--no-ext-diff",
            "--no-renames",
            "--name-only",
            "-z",
            baseline,
            "--",
          ]).stdout
        : git(root, ["ls-files", "-z"]).stdout;
      changed =
        tracked +
        git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).stdout;
      if (!changed) return { changed: 0, appended: 0 };
      next = readWorktreeLog(root);
    } else throw new Error("未知检查模式。");
    previous = readTreeLog(root, baseline);
  }
  const update = validateLogUpdate(previous, next);
  return {
    changed: new Set(changed.split("\0").filter(Boolean)).size,
    ...update,
  };
}

export function parseArguments(args) {
  if (!args.length) return { mode: "worktree" };
  if (args.length === 1 && ["--worktree", "--staged"].includes(args[0]))
    return { mode: args[0].slice(2) };
  if (args.length === 4) {
    const values = {};
    for (let index = 0; index < args.length; index += 2) {
      const flag = args[index];
      if (
        !["--base", "--head"].includes(flag) ||
        values[flag] ||
        !args[index + 1]
      )
        throw new Error(
          "请使用 --worktree、--staged 或 --base <ref> --head <ref>。",
        );
      values[flag] = args[index + 1];
    }
    if (values["--base"] && values["--head"])
      return { mode: "range", base: values["--base"], head: values["--head"] };
  }
  throw new Error("请使用 --worktree、--staged 或 --base <ref> --head <ref>。");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = checkAgentLog(parseArguments(process.argv.slice(2)));
    console.log(
      result.changed
        ? `Agent 日志检查通过：${result.changed} 个文件变更，新增 ${result.appended} 条记录。`
        : "Agent 日志检查通过：没有文件变更。",
    );
  } catch (error) {
    console.error(`Agent 日志检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
