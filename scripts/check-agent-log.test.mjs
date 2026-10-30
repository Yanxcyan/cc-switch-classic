import assert from "node:assert/strict";
import { after, test } from "node:test";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  checkAgentLog,
  LOG_END,
  LOG_START,
  parseArguments,
  validateLogUpdate,
} from "./check-agent-log.mjs";
import { installAgentHooks } from "./install-agent-hooks.mjs";

// Isolate fixture repositories from the person's signing and hooks configuration.
const suiteRoot = mkdtempSync(path.join(tmpdir(), "classic-agent-log-tests-"));
const originalGlobal = process.env.GIT_CONFIG_GLOBAL;
const originalNoSystem = process.env.GIT_CONFIG_NOSYSTEM;
const globalConfig = path.join(suiteRoot, "global-config");
writeFileSync(globalConfig, "");
process.env.GIT_CONFIG_GLOBAL = globalConfig;
process.env.GIT_CONFIG_NOSYSTEM = "1";
after(() => {
  if (originalGlobal === undefined) delete process.env.GIT_CONFIG_GLOBAL;
  else process.env.GIT_CONFIG_GLOBAL = originalGlobal;
  if (originalNoSystem === undefined) delete process.env.GIT_CONFIG_NOSYSTEM;
  else process.env.GIT_CONFIG_NOSYSTEM = originalNoSystem;
  rmSync(suiteRoot, { recursive: true, force: true });
});

function record(topic = "实现日志检查", agent = "classic_shell") {
  return `### 2026-10-31 01:05 +08:00 | ${agent} | ${topic}\n\n- 改动：校验工作区、暂存区与提交范围的追加日志。\n- 涉及文件：scripts/check-agent-log.mjs。\n- 验证：运行相关 Node 回归测试并通过。\n- 注意事项：无新增限制，记录内容真实性仍需人工核对。\n\n`;
}
function document(records = record()) {
  return `# 维护交接\n\n当前状态：维护中。\n\n${LOG_START}\n\n${records}${LOG_END}\n`;
}
function append(text, addition = record("补充验证")) {
  return text.replace(LOG_END, `${addition}${LOG_END}`);
}
const initial = document();

function git(cwd, ...args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  return result.stdout.trim();
}
function repo(t, { log = true, commit = true } = {}) {
  const dir = mkdtempSync(path.join(suiteRoot, "repo-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, "init", "-b", "main");
  git(dir, "config", "user.name", "Agent Log Fixture");
  git(dir, "config", "user.email", "agent-log-fixture@example.invalid");
  git(dir, "config", "commit.gpgsign", "false");
  git(dir, "config", "core.autocrlf", "false");
  writeFileSync(path.join(dir, "app.txt"), "baseline\n");
  if (log) writeFileSync(path.join(dir, "AGENTS.md"), initial);
  if (commit) {
    git(dir, "add", ".");
    git(dir, "commit", "-m", "fixture baseline");
  }
  return dir;
}

test("requires new records for code changes and body-only document changes", () => {
  assert.throws(() => validateLogUpdate(initial, initial), /未追加/);
  assert.throws(
    () => validateLogUpdate(initial, initial.replace("维护中", "已完成")),
    /未追加/,
  );
  assert.throws(() => validateLogUpdate(initial, null), /不能删除/);
});

test("accepts append-only entries, first-time documents, and CRLF normalization", () => {
  assert.deepEqual(validateLogUpdate(initial, append(initial)), {
    appended: 1,
    bootstrap: false,
  });
  assert.deepEqual(validateLogUpdate(null, initial), {
    appended: 1,
    bootstrap: true,
  });
  assert.equal(
    validateLogUpdate(initial.replaceAll("\n", "\r\n"), append(initial))
      .appended,
    1,
  );
  assert.equal(
    validateLogUpdate(initial, append(initial).replaceAll("\n", "\r\n"))
      .appended,
    1,
  );
});

test("rejects deletion, replacement, reordering, and formatting edits of old records", () => {
  const two = append(initial);
  assert.throws(() => validateLogUpdate(two, initial), /原样保留/);
  assert.throws(
    () =>
      validateLogUpdate(
        initial,
        append(initial.replace("校验工作区", "跳过工作区")),
      ),
    /原样保留/,
  );
  const reordered = document(record("补充验证") + record() + record("第三条"));
  assert.throws(() => validateLogUpdate(two, reordered), /原样保留/);
  assert.throws(
    () =>
      validateLogUpdate(
        initial,
        append(initial.replace("\n- 改动", "\n  - 改动")),
      ),
    /缺少|原样保留/,
  );
});

test("rejects incomplete or duplicate fields and placeholder-only values", () => {
  for (const placeholder of [
    "",
    "  ",
    "无",
    "略。",
    "**TODO**",
    "待补充",
    "N/A",
    "暂无",
  ]) {
    assert.throws(
      () =>
        validateLogUpdate(
          null,
          document(
            record().replace("运行相关 Node 回归测试并通过。", placeholder),
          ),
        ),
      /实际内容/,
    );
  }
  assert.throws(
    () =>
      validateLogUpdate(null, document(record().replace(/- 验证：.*\n/, ""))),
    /缺少「验证」/,
  );
  assert.throws(
    () =>
      validateLogUpdate(
        null,
        document(
          record().replace("- 验证：", "- 验证：第一次验证通过。\n- 验证："),
        ),
      ),
    /重复/,
  );
  assert.throws(
    () =>
      validateLogUpdate(
        initial,
        initial.replace(LOG_END, `补充了一句说明。\n${LOG_END}`),
      ),
    /完整记录标题/,
  );
});

test("requires unique standalone markers and valid timestamp, agent, and subject", () => {
  assert.throws(
    () => validateLogUpdate(null, initial.replace(LOG_END, "")),
    /一组/,
  );
  assert.throws(() => validateLogUpdate(null, initial + LOG_START), /一组/);
  assert.throws(
    () =>
      validateLogUpdate(
        null,
        initial.replace(LOG_START, `prefix ${LOG_START}`),
      ),
    /各占一行/,
  );
  for (const invalid of [
    "2026-02-30 01:05 +08:00",
    "2026-10-31 24:05 +08:00",
    "2026-10-31 01:60 +08:00",
    "2026-10-31 01:05 +00:00",
  ]) {
    assert.throws(
      () =>
        validateLogUpdate(
          null,
          initial.replace("2026-10-31 01:05 +08:00", invalid),
        ),
      /日志标题/,
    );
  }
  assert.throws(
    () => validateLogUpdate(null, document(record("TODO"))),
    /日志标题/,
  );
  assert.throws(
    () => validateLogUpdate(null, document(record("有效主题", " "))),
    /日志标题/,
  );
});

test("validates CLI modes instead of silently defaulting on invalid arguments", () => {
  assert.deepEqual(parseArguments([]), { mode: "worktree" });
  assert.deepEqual(parseArguments(["--staged"]), { mode: "staged" });
  assert.deepEqual(parseArguments(["--head", "HEAD", "--base", "main"]), {
    mode: "range",
    base: "main",
    head: "HEAD",
  });
  for (const args of [
    ["--staged", "--worktree"],
    ["--base", "main"],
    ["--unknown"],
    ["--base", "a", "--base", "b"],
  ])
    assert.throws(() => parseArguments(args), /请使用/);
});

test("no changes pass; untracked files count but ignored files do not", (t) => {
  const dir = repo(t);
  assert.equal(checkAgentLog({ cwd: dir }).changed, 0);
  writeFileSync(path.join(dir, "untracked.txt"), "new\n");
  assert.throws(() => checkAgentLog({ cwd: dir }), /未追加/);
  writeFileSync(path.join(dir, "AGENTS.md"), append(initial));
  assert.equal(checkAgentLog({ cwd: dir }).appended, 1);
  rmSync(path.join(dir, "untracked.txt"));
  writeFileSync(path.join(dir, "AGENTS.md"), initial);
  writeFileSync(path.join(dir, ".git", "info", "exclude"), "ignored.txt\n");
  writeFileSync(path.join(dir, "ignored.txt"), "local only\n");
  assert.equal(checkAgentLog({ cwd: dir }).changed, 0);
});

test("staged mode rejects a log left only in the working tree", (t) => {
  const dir = repo(t);
  writeFileSync(path.join(dir, "app.txt"), "changed\n");
  git(dir, "add", "app.txt");
  writeFileSync(path.join(dir, "AGENTS.md"), append(initial));
  assert.equal(checkAgentLog({ cwd: dir, mode: "worktree" }).appended, 1);
  assert.throws(() => checkAgentLog({ cwd: dir, mode: "staged" }), /未追加/);
  git(dir, "add", "AGENTS.md");
  assert.equal(checkAgentLog({ cwd: dir, mode: "staged" }).appended, 1);
  writeFileSync(path.join(dir, "AGENTS.md"), initial);
  assert.equal(checkAgentLog({ cwd: dir, mode: "staged" }).appended, 1);
  assert.throws(() => checkAgentLog({ cwd: dir, mode: "worktree" }), /未追加/);
});

test("blocks deleting AGENTS.md but allows documented source-file deletion", (t) => {
  const dir = repo(t);
  git(dir, "rm", "AGENTS.md");
  assert.throws(() => checkAgentLog({ cwd: dir, mode: "staged" }), /不能删除/);
  git(dir, "restore", "--staged", "AGENTS.md");
  writeFileSync(path.join(dir, "AGENTS.md"), append(initial));
  git(dir, "rm", "app.txt");
  git(dir, "add", "AGENTS.md");
  assert.equal(checkAgentLog({ cwd: dir, mode: "staged" }).appended, 1);
});

test("bootstraps a baseline without AGENTS.md and a genuinely unborn HEAD", (t) => {
  const dir = repo(t, { log: false });
  writeFileSync(path.join(dir, "new.txt"), "change\n");
  assert.throws(() => checkAgentLog({ cwd: dir }), /缺少/);
  writeFileSync(path.join(dir, "AGENTS.md"), initial);
  assert.equal(checkAgentLog({ cwd: dir }).bootstrap, true);
  const unborn = repo(t, { commit: false });
  assert.equal(checkAgentLog({ cwd: unborn }).bootstrap, true);
  git(unborn, "add", ".");
  assert.equal(checkAgentLog({ cwd: unborn, mode: "staged" }).bootstrap, true);
});

test("CI compares with merge-base and fails closed for invalid references", (t) => {
  const dir = repo(t);
  git(dir, "checkout", "-b", "feature");
  writeFileSync(path.join(dir, "app.txt"), "feature\n");
  writeFileSync(
    path.join(dir, "AGENTS.md"),
    append(initial, record("分支修改")),
  );
  git(dir, "add", ".");
  git(dir, "commit", "-m", "feature change");
  git(dir, "checkout", "main");
  writeFileSync(
    path.join(dir, "AGENTS.md"),
    append(initial, record("主分支进展")),
  );
  git(dir, "add", ".");
  git(dir, "commit", "-m", "main advanced");
  assert.equal(
    checkAgentLog({ cwd: dir, mode: "range", base: "main", head: "feature" })
      .appended,
    1,
  );
  assert.equal(
    checkAgentLog({ cwd: dir, mode: "range", base: "feature", head: "feature" })
      .changed,
    0,
  );
  assert.throws(
    () =>
      checkAgentLog({
        cwd: dir,
        mode: "range",
        base: "not-a-ref",
        head: "HEAD",
      }),
    /无法解析/,
  );
  assert.throws(
    () =>
      checkAgentLog({
        cwd: dir,
        mode: "range",
        base: "HEAD",
        head: "not-a-ref",
      }),
    /无法解析/,
  );
  assert.throws(
    () =>
      checkAgentLog({ cwd: dir, mode: "range", base: "--help", head: "HEAD" }),
    /无法解析/,
  );
});

test("CI rejects body-only changes and unrelated histories", (t) => {
  const dir = repo(t);
  const baseline = git(dir, "rev-parse", "HEAD");
  writeFileSync(
    path.join(dir, "AGENTS.md"),
    initial.replace("维护中", "已完成"),
  );
  git(dir, "add", ".");
  git(dir, "commit", "-m", "body without log");
  assert.throws(
    () =>
      checkAgentLog({ cwd: dir, mode: "range", base: baseline, head: "HEAD" }),
    /未追加/,
  );
  git(dir, "checkout", "--orphan", "unrelated");
  git(dir, "add", ".");
  git(dir, "commit", "-m", "independent root");
  assert.throws(
    () =>
      checkAgentLog({
        cwd: dir,
        mode: "range",
        base: "main",
        head: "unrelated",
      }),
    /共同祖先/,
  );
});

function launcher(dir) {
  mkdirSync(path.join(dir, ".githooks"), { recursive: true });
  mkdirSync(path.join(dir, "scripts"), { recursive: true });
  writeFileSync(
    path.join(dir, ".githooks", "pre-commit"),
    "#!/bin/sh\nexit 0\n",
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(dir, "scripts", "check-agent-log.mjs"),
    "// fixture\n",
  );
}

test("hook installation is local, idempotent, and requires the repository launcher", (t) => {
  const dir = repo(t);
  assert.throws(() => installAgentHooks(dir), /缺少/);
  launcher(dir);
  assert.equal(installAgentHooks(dir).installed, true);
  assert.equal(
    git(dir, "config", "--local", "--get", "core.hooksPath"),
    ".githooks",
  );
  assert.match(installAgentHooks(dir).message, /无需重复/);
  assert.equal(readFileSync(globalConfig, "utf8"), "");
});

test("hook installation preserves custom hook paths and existing pre-commit files", (t) => {
  const custom = repo(t);
  launcher(custom);
  git(custom, "config", "--local", "core.hooksPath", "custom-hooks");
  assert.equal(installAgentHooks(custom).installed, false);
  assert.equal(
    git(custom, "config", "--local", "--get", "core.hooksPath"),
    "custom-hooks",
  );
  const existing = repo(t);
  launcher(existing);
  const hook = path.join(existing, ".git", "hooks", "pre-commit");
  writeFileSync(hook, "#!/bin/sh\necho existing\n");
  assert.equal(installAgentHooks(existing).installed, false);
  assert.equal(readFileSync(hook, "utf8"), "#!/bin/sh\necho existing\n");
  for (const name of ["pre-push", "commit-msg"]) {
    const customOther = repo(t);
    launcher(customOther);
    writeFileSync(
      path.join(customOther, ".git", "hooks", name),
      "#!/bin/sh\necho preserved\n",
    );
    assert.equal(installAgentHooks(customOther).installed, false);
    assert.equal(
      spawnSync("git", ["config", "--local", "--get", "core.hooksPath"], {
        cwd: customOther,
      }).status,
      1,
    );
  }
});

test("hook installation skips archives and nested directories without touching parent configuration", (t) => {
  const archive = mkdtempSync(path.join(suiteRoot, "archive-"));
  assert.equal(installAgentHooks(archive).installed, false);
  const dir = repo(t);
  launcher(dir);
  const nested = path.join(dir, "nested");
  mkdirSync(nested);
  assert.match(installAgentHooks(nested).message, /上层仓库/);
  assert.equal(
    spawnSync("git", ["config", "--local", "--get", "core.hooksPath"], {
      cwd: dir,
    }).status,
    1,
  );
});

test("real Git commits require the new log to be staged with the source change", (t) => {
  const dir = repo(t);
  mkdirSync(path.join(dir, ".githooks"));
  mkdirSync(path.join(dir, "scripts"));
  writeFileSync(
    path.join(dir, ".githooks", "pre-commit"),
    readFileSync(new URL("../.githooks/pre-commit", import.meta.url)),
    { mode: 0o755 },
  );
  writeFileSync(
    path.join(dir, "scripts", "check-agent-log.mjs"),
    readFileSync(new URL("./check-agent-log.mjs", import.meta.url)),
  );
  assert.equal(installAgentHooks(dir).installed, true);
  writeFileSync(path.join(dir, "app.txt"), "changed source\n");
  git(dir, "add", ".githooks", "scripts", "app.txt");
  const commit = () =>
    spawnSync("git", ["commit", "-m", "guarded fixture change"], {
      cwd: dir,
      encoding: "utf8",
    });
  const missing = commit();
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /未追加/);
  writeFileSync(path.join(dir, "AGENTS.md"), append(initial));
  const unstaged = commit();
  assert.notEqual(unstaged.status, 0);
  assert.match(unstaged.stderr, /未追加/);
  git(dir, "add", "AGENTS.md");
  const complete = commit();
  assert.equal(complete.status, 0, complete.stderr);
  assert.equal(git(dir, "status", "--porcelain"), "");
});
