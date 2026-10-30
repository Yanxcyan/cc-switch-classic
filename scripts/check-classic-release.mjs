import { createHash, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";
import {
  appendFile,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPOSITORY = "Yanxcyan/cc-switch-classic";
export const UPDATE_ENDPOINT = `https://github.com/${REPOSITORY}/releases/latest/download/latest.json`;
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const UPSTREAM_KEY =
  "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEM4MDI4QzlBNTczOTI4RTMKUldUaktEbFhtb3dDeUM5US9kT0FmdGR5Ti9vQzcwa2dTMlpibDVDUmQ2M0VGTzVOWnd0SGpFVlEK";

function decodeBase64(text, label) {
  if (
    typeof text !== "string" ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(text) ||
    text.length % 4
  )
    throw new Error(`Invalid ${label} encoding`);
  const decoded = Buffer.from(text, "base64");
  if (decoded.toString("base64") !== text)
    throw new Error(`Invalid ${label} encoding`);
  return decoded;
}

function publicKeyRecord(encoded) {
  const lines = decodeBase64(encoded.trim(), "public key")
    .toString("utf8")
    .trim()
    .split(/\r?\n/);
  if (lines.length !== 2 || !lines[0].startsWith("untrusted comment:"))
    throw new Error("Invalid updater public key file");
  const record = decodeBase64(lines[1], "public key record");
  if (
    record.length !== 42 ||
    !["Ed", "ED"].includes(record.subarray(0, 2).toString())
  )
    throw new Error("Invalid updater public key record");
  return record;
}

export async function checkConfiguration(
  root,
  { repository = REPOSITORY, tag } = {},
) {
  if (repository.toLowerCase() !== REPOSITORY.toLowerCase())
    throw new Error(`Release repository must be ${REPOSITORY}`);
  const pkg = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const config = JSON.parse(
    await readFile(path.join(root, "src-tauri/tauri.conf.json"), "utf8"),
  );
  const cargo = await readFile(path.join(root, "src-tauri/Cargo.toml"), "utf8");
  const cargoVersion = cargo
    .split(/^\[/m)
    .find((section) => section.startsWith("package]"))
    ?.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if (
    !VERSION.test(pkg.version) ||
    pkg.version !== config.version ||
    pkg.version !== cargoVersion
  )
    throw new Error(
      "package.json, Cargo.toml and tauri.conf.json must have the same valid release version",
    );
  if (tag && tag !== `v${pkg.version}`)
    throw new Error("Release tag does not match the configured version");
  if (
    config.productName !== "CC Switch Classic" ||
    config.identifier !== "com.yanxcyan.ccswitch.classic"
  )
    throw new Error("Classic product identity is required");
  if (config.bundle?.createUpdaterArtifacts !== true)
    throw new Error("Updater artifacts must be enabled");
  if (
    JSON.stringify(config.plugins?.updater?.endpoints) !==
    JSON.stringify([UPDATE_ENDPOINT])
  )
    throw new Error(
      "Only the independent Classic update endpoint may be configured",
    );
  const key = publicKeyRecord(config.plugins?.updater?.pubkey ?? "");
  if (key.equals(publicKeyRecord(UPSTREAM_KEY)))
    throw new Error("Classic must use its own updater signing key");
  return {
    version: pkg.version,
    tag: `v${pkg.version}`,
    prerelease: pkg.version.includes("-"),
    pubkey: config.plugins.updater.pubkey,
  };
}

/** Match the Minisign Ed25519 / BLAKE2b verification used by Tauri's updater. */
export async function verifyUpdaterSignature(
  filename,
  encodedSignature,
  encodedPublicKey,
) {
  const publicRecord = publicKeyRecord(encodedPublicKey);
  const lines = decodeBase64(encodedSignature, "signature")
    .toString("utf8")
    .trim()
    .split(/\r?\n/);
  if (
    lines.length !== 4 ||
    !lines[0].startsWith("untrusted comment:") ||
    !lines[2].startsWith("trusted comment: ")
  )
    throw new Error("Invalid updater signature file");
  const record = decodeBase64(lines[1], "signature record");
  const globalSignature = decodeBase64(lines[3], "comment signature");
  if (
    record.length !== 74 ||
    globalSignature.length !== 64 ||
    !["Ed", "ED"].includes(record.subarray(0, 2).toString())
  )
    throw new Error("Invalid updater signature record");
  if (!record.subarray(2, 10).equals(publicRecord.subarray(2, 10)))
    throw new Error("Updater signature uses a different signing key");
  const key = createPublicKey({
    key: Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      publicRecord.subarray(10),
    ]),
    format: "der",
    type: "spki",
  });
  let message;
  if (record.subarray(0, 2).toString() === "ED") {
    const hash = createHash("blake2b512");
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    message = hash.digest();
  } else {
    message = await readFile(filename);
  }
  const signature = record.subarray(10);
  const comment = Buffer.concat([signature, Buffer.from(lines[2].slice(17))]);
  if (
    !verify(null, message, key, signature) ||
    !verify(null, comment, key, globalSignature)
  )
    throw new Error(
      `Updater signature verification failed: ${path.basename(filename)}`,
    );
}

export function requiredArtifacts(version) {
  const prefix = `CC-Switch-Classic-v${version}-`;
  return [
    {
      name: `${prefix}macOS.tar.gz`,
      platforms: ["darwin-aarch64", "darwin-x86_64"],
    },
    { name: `${prefix}Windows.msi`, platforms: ["windows-x86_64"] },
    { name: `${prefix}Windows-arm64.msi`, platforms: ["windows-aarch64"] },
    ...["x86_64", "arm64"].flatMap((arch) =>
      ["AppImage", "deb", "rpm"].map((format) => ({
        name: `${prefix}Linux-${arch}.${format}`,
        platforms: [
          `linux-${arch === "arm64" ? "aarch64" : arch}${format === "AppImage" ? "" : `-${format}`}`,
        ],
      })),
    ),
  ];
}

export async function generateManifest(
  directory,
  { version, pubkey, repository = REPOSITORY },
  pubDate = new Date().toISOString(),
) {
  if (
    !VERSION.test(version) ||
    repository.toLowerCase() !== REPOSITORY.toLowerCase()
  )
    throw new Error("Invalid release identity");
  const required = requiredArtifacts(version);
  const prefix = `CC-Switch-Classic-v${version}-`;
  const downloads = [
    "macOS.dmg",
    "macOS.zip",
    "Windows-Portable.zip",
    "Windows-arm64-Portable.zip",
  ].map((suffix) => prefix + suffix);
  const allowed = new Set([
    "latest.json",
    ...downloads,
    ...required.flatMap(({ name }) => [name, `${name}.sig`]),
  ]);
  for (const name of await readdir(directory))
    if (!allowed.has(name))
      throw new Error(`Unexpected release artifact: ${name}`);
  for (const name of [
    ...downloads,
    ...required.flatMap(({ name }) => [name, `${name}.sig`]),
  ]) {
    const file = await stat(path.join(directory, name)).catch(() => null);
    if (!file?.isFile() || file.size === 0)
      throw new Error(`Missing or empty release artifact: ${name}`);
  }
  const platforms = {};
  for (const { name, platforms: targets } of required) {
    const signature = (
      await readFile(path.join(directory, `${name}.sig`), "utf8")
    ).trim();
    await verifyUpdaterSignature(path.join(directory, name), signature, pubkey);
    for (const target of targets)
      platforms[target] = {
        signature,
        url: `https://github.com/${REPOSITORY}/releases/download/v${version}/${name}`,
      };
  }
  return {
    version,
    notes: `CC Switch Classic v${version}`,
    pub_date: pubDate,
    platforms,
  };
}

async function main() {
  const metadata = await checkConfiguration(process.cwd(), {
    repository: process.env.GITHUB_REPOSITORY ?? REPOSITORY,
    tag:
      process.env.GITHUB_EVENT_NAME === "push" &&
      process.env.GITHUB_REF_TYPE === "tag"
        ? process.env.GITHUB_REF_NAME
        : undefined,
  });
  if (process.env.GITHUB_OUTPUT)
    await appendFile(
      process.env.GITHUB_OUTPUT,
      `version=${metadata.version}\ntag=${metadata.tag}\nprerelease=${metadata.prerelease}\n`,
    );
  if (process.argv[2] === "--assets") {
    const directory = process.argv[3] ?? "release-assets";
    const manifest = await generateManifest(directory, metadata);
    await writeFile(
      path.join(directory, "latest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    console.log(
      `Verified every updater signature and generated latest.json for ${Object.keys(manifest.platforms).length} platform targets.`,
    );
  } else if (process.argv[2] && process.argv[2] !== "--config")
    throw new Error("Expected --config or --assets [directory]");
  else
    console.log(
      `Validated Classic release configuration ${metadata.tag} (${metadata.prerelease ? "prerelease" : "stable"}).`,
    );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
