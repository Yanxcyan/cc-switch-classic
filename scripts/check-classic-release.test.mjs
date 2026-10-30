import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  checkConfiguration,
  generateManifest,
  requiredArtifacts,
  verifyUpdaterSignature,
  UPDATE_ENDPOINT,
} from "./check-classic-release.mjs";

// Public test vector from minisign-verify 0.2.5 (the verifier used by Tauri).
// It signs the four bytes "test", including the authenticated trusted comment.
const PUBLIC_KEY = Buffer.from(
  "untrusted comment: test public key\nRWQf6LRCGA9i53mlYecO4IzT51TGPpvWucNSCh1CBM0QTaLn73Y7GFO3\n",
).toString("base64");
const SIGNATURE_TEXT =
  "untrusted comment: signature from minisign secret key\nRUQf6LRCGA9i559r3g7V1qNyJDApGip8MfqcadIgT9CuhV3EMhHoN1mGTkUidF/z7SrlQgXdy8ofjb7bNJJylDOocrCo8KLzZwo=\ntrusted comment: timestamp:1556193335\tfile:test\ny/rUw2y8/hOUYjZU71eHp/Wo1KZ40fGy2VJEDl34XMJM+TX48Ss/17u3IvIfbVR1FkZZSNCisQbuQY+bHwhEBg==\n";
const SIGNATURE = Buffer.from(SIGNATURE_TEXT).toString("base64");
const VERSION = "4.0.23";
const metadata = { version: VERSION, pubkey: PUBLIC_KEY };

async function directory(t) {
  const dir = await mkdtemp(path.join(tmpdir(), "classic-release-test-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}
async function assets(t) {
  const dir = await directory(t);
  for (const { name } of requiredArtifacts(VERSION)) {
    await writeFile(path.join(dir, name), "test");
    await writeFile(path.join(dir, `${name}.sig`), SIGNATURE);
  }
  for (const suffix of [
    "macOS.dmg",
    "macOS.zip",
    "Windows-Portable.zip",
    "Windows-arm64-Portable.zip",
  ])
    await writeFile(
      path.join(dir, `CC-Switch-Classic-v${VERSION}-${suffix}`),
      "test",
    );
  return dir;
}
async function config(t, version = VERSION) {
  const dir = await directory(t);
  await mkdir(path.join(dir, "src-tauri"));
  await writeFile(path.join(dir, "package.json"), JSON.stringify({ version }));
  await writeFile(
    path.join(dir, "src-tauri/Cargo.toml"),
    `[package]\nname = "cc-switch"\nversion = "${version}"\n`,
  );
  const tauri = {
    version,
    productName: "CC Switch Classic",
    identifier: "com.yanxcyan.ccswitch.classic",
    bundle: { createUpdaterArtifacts: true },
    plugins: { updater: { pubkey: PUBLIC_KEY, endpoints: [UPDATE_ENDPOINT] } },
  };
  await writeFile(
    path.join(dir, "src-tauri/tauri.conf.json"),
    JSON.stringify(tauri),
  );
  return { dir, tauri };
}

test("verifies the upstream Minisign test vector and rejects tampered content and comment", async (t) => {
  const dir = await directory(t);
  const file = path.join(dir, "payload");
  await writeFile(file, "test");
  await verifyUpdaterSignature(file, SIGNATURE, PUBLIC_KEY);
  await assert.rejects(
    verifyUpdaterSignature(
      file,
      Buffer.from(SIGNATURE_TEXT.replace("file:test", "file:other")).toString(
        "base64",
      ),
      PUBLIC_KEY,
    ),
    /verification failed/,
  );
  await writeFile(file, "Test");
  await assert.rejects(
    verifyUpdaterSignature(file, SIGNATURE, PUBLIC_KEY),
    /verification failed/,
  );
});

test("requires a matching independent release identity and separates stable from beta", async (t) => {
  const stable = await config(t);
  assert.equal(
    (await checkConfiguration(stable.dir, { tag: "v4.0.23" })).prerelease,
    false,
  );
  const beta = await config(t, "4.0.24-beta.1");
  assert.equal(
    (await checkConfiguration(beta.dir, { tag: "v4.0.24-beta.1" })).prerelease,
    true,
  );
  await assert.rejects(
    checkConfiguration(stable.dir, { tag: "v4.0.24" }),
    /tag does not match/,
  );
  await assert.rejects(
    checkConfiguration(stable.dir, { repository: "farion1231/cc-switch" }),
    /repository must be/,
  );
  stable.tauri.plugins.updater.endpoints.push(
    "https://dl.ccswitch.io/latest.json",
  );
  await writeFile(
    path.join(stable.dir, "src-tauri/tauri.conf.json"),
    JSON.stringify(stable.tauri),
  );
  await assert.rejects(
    checkConfiguration(stable.dir),
    /independent Classic update endpoint/,
  );
});

test("generates all ten targets with universal macOS and independently signed Linux packages", async (t) => {
  const manifest = await generateManifest(
    await assets(t),
    metadata,
    "2026-10-30T00:00:00Z",
  );
  assert.equal(Object.keys(manifest.platforms).length, 10);
  assert.deepEqual(
    manifest.platforms["darwin-aarch64"],
    manifest.platforms["darwin-x86_64"],
  );
  assert.match(
    manifest.platforms["linux-aarch64-deb"].url,
    /Yanxcyan\/cc-switch-classic\/releases\/download\/v4\.0\.23\/CC-Switch-Classic-v4\.0\.23-Linux-arm64\.deb$/,
  );
});

test("refuses a partial platform release or a missing portable build", async (t) => {
  const dir = await assets(t);
  const missing = path.join(
    dir,
    `CC-Switch-Classic-v${VERSION}-Windows-arm64.msi.sig`,
  );
  await rm(missing);
  await assert.rejects(
    generateManifest(dir, metadata),
    /Missing or empty release artifact/,
  );
  await writeFile(missing, SIGNATURE);
  await rm(
    path.join(dir, `CC-Switch-Classic-v${VERSION}-Windows-Portable.zip`),
  );
  await assert.rejects(generateManifest(dir, metadata), /Windows-Portable.zip/);
});

test("rejects an artifact signed with a different public key or replaced after signing", async (t) => {
  const dir = await assets(t);
  const keyText = Buffer.from(PUBLIC_KEY, "base64").toString();
  const lines = keyText.trim().split("\n");
  const record = Buffer.from(lines[1], "base64");
  record[2] ^= 1;
  lines[1] = record.toString("base64");
  await assert.rejects(
    generateManifest(dir, {
      ...metadata,
      pubkey: Buffer.from(lines.join("\n")).toString("base64"),
    }),
    /different signing key/,
  );
  await writeFile(
    path.join(dir, `CC-Switch-Classic-v${VERSION}-Linux-arm64.rpm`),
    "tampered",
  );
  await assert.rejects(generateManifest(dir, metadata), /verification failed/);
});

test("workflow gates publish after all builds and never publishes manual runs", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /needs: \[whats-new-check, release, macos-release\]/);
  assert.match(
    workflow,
    /name: Publish complete release\s+id: upload-release\s+if: github.event_name == 'push' && github.ref_type == 'tag'/,
  );
  assert.match(workflow, /prerelease:.*outputs.prerelease == 'true'/);
  assert.match(workflow, /make_latest:.*outputs.prerelease == 'false'/);
  assert.match(workflow, /draft: true/);
  assert.match(
    workflow,
    /name: Publish uploaded draft and select latest channel\s+if: github.event_name == 'push' && github.ref_type == 'tag'/,
  );
  assert.match(workflow, /RELEASE_ID:.*steps.upload-release.outputs.id/);
  assert.match(
    workflow,
    /gh api --method PATCH "repos\/\$GH_REPO\/releases\/\$RELEASE_ID"/,
  );
  assert.match(workflow, /echo "APPLE_SIGNING_IDENTITY=-"/);
  assert.match(
    workflow,
    /name: Notarize macOS DMG\s+if: steps.apple-signing.outputs.mode == 'notarized'/,
  );
  assert.doesNotMatch(workflow, /唯一官方网站|Only Official Website/);
});

test("draft publication sends boolean prerelease and string make_latest for each channel", async (t) => {
  const workflow = await readFile(
    new URL("../.github/workflows/release.yml", import.meta.url),
    "utf8",
  );
  const script = workflow
    .match(
      /node --input-type=module <<'NODE'\r?\n([\s\S]*?)\r?\n          NODE/,
    )[1]
    .replace(/^          /gm, "");
  const dir = await directory(t);
  for (const prerelease of [false, true]) {
    const tag = prerelease ? "v4.0.24-beta.1" : "v4.0.23";
    const result = spawnSync(process.execPath, ["--input-type=module", "-"], {
      input: script,
      encoding: "utf8",
      env: {
        ...process.env,
        RUNNER_TEMP: dir,
        RELEASE_ID: "12345",
        RELEASE_TAG: tag,
        RELEASE_PRERELEASE: String(prerelease),
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(dir, "publish-classic-release.json"), "utf8"),
      ),
      {
        tag_name: tag,
        draft: false,
        prerelease,
        make_latest: prerelease ? "false" : "true",
      },
    );
  }
});
