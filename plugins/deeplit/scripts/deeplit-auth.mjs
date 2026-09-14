#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";

const SERVICE = "ai.deeplit.mcp";
const ACCOUNT = userInfo().username;
const ACTIONS = new Set(["set", "get", "remove", "status"]);
const action = process.argv[2] ?? "status";

function requireValidAction() {
  if (!ACTIONS.has(action)) {
    throw new Error("Usage: deeplit-auth.mjs <set|get|remove|status>");
  }
}

function validateApiKey(value) {
  const apiKey = value.trim();
  if (!apiKey.startsWith("dk_core_")) {
    throw new Error("The API key must start with dk_core_.");
  }
  return apiKey;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) {
    throw new Error(`${command} is required but was not found.`);
  }
  return result;
}

function requireSuccess(result, message) {
  if (result.status !== 0) {
    const detail = result.stderr?.trim();
    throw new Error(detail || message);
  }
  return result.stdout?.trim() ?? "";
}

function printHeader(apiKey) {
  process.stdout.write(`${JSON.stringify({ "X-API-Key": apiKey })}\n`);
}

async function promptSecret() {
  if (!process.stdin.isTTY) {
    throw new Error("Run this command in an interactive terminal.");
  }
  process.stdout.write("deeplit platform API key (dk_core_...): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => collectSecret(resolve, reject));
}

function collectSecret(resolve, reject) {
  let value = "";
  let finished = false;
  const finish = (error) => {
    if (finished) return;
    finished = true;
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write("\n");
    error ? reject(error) : resolve(value);
  };
  process.stdin.on("data", (chunk) => {
    for (const character of chunk) {
      if (character === "\u0003") return finish(new Error("Credential entry cancelled."));
      if (character === "\r" || character === "\n") return finish();
      if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
      else value += character;
    }
  });
}

function runWindows() {
  const script = fileURLToPath(new URL("./deeplit-auth.ps1", import.meta.url));
  const args = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, action];
  const stdio = action === "get" ? ["ignore", "pipe", "inherit"] : "inherit";
  const output = requireSuccess(run("powershell.exe", args, { stdio }), "Credential command failed.");
  if (action === "get") process.stdout.write(`${output}\n`);
}

function readMacCredential() {
  const result = run("security", ["find-generic-password", "-a", ACCOUNT, "-s", SERVICE, "-w"]);
  return result.status === 0 ? result.stdout.trim() : "";
}

async function runMac() {
  if (action === "get") return printHeader(validateApiKey(readMacCredential()));
  if (action === "status") return printStatus(Boolean(readMacCredential()));
  if (action === "remove") {
    run("security", ["delete-generic-password", "-a", ACCOUNT, "-s", SERVICE]);
    return process.stdout.write("deeplit credential removed.\n");
  }
  const apiKey = validateApiKey(await promptSecret());
  const result = run("security", ["add-generic-password", "-U", "-a", ACCOUNT, "-s", SERVICE, "-w", apiKey]);
  requireSuccess(result, "Could not store the credential in macOS Keychain.");
  process.stdout.write("deeplit credential stored in macOS Keychain.\n");
}

function readLinuxCredential() {
  const args = ["lookup", "service", SERVICE, "account", ACCOUNT];
  const result = run("secret-tool", args);
  return result.status === 0 ? result.stdout.trim() : "";
}

async function runLinux() {
  if (action === "get") return printHeader(validateApiKey(readLinuxCredential()));
  if (action === "status") return printStatus(Boolean(readLinuxCredential()));
  if (action === "remove") {
    run("secret-tool", ["clear", "service", SERVICE, "account", ACCOUNT]);
    return process.stdout.write("deeplit credential removed.\n");
  }
  const apiKey = validateApiKey(await promptSecret());
  const args = ["store", "--label=deeplit MCP API key", "service", SERVICE, "account", ACCOUNT];
  requireSuccess(run("secret-tool", args, { input: `${apiKey}\n` }), "Could not store the credential.");
  process.stdout.write("deeplit credential stored in the system Secret Service.\n");
}

function printStatus(configured) {
  const state = configured ? "configured" : "not configured";
  process.stdout.write(`deeplit credential is ${state}.\n`);
}

async function main() {
  requireValidAction();
  if (process.platform === "win32") return runWindows();
  if (process.platform === "darwin") return runMac();
  if (process.platform === "linux") return runLinux();
  throw new Error(`Unsupported operating system: ${process.platform}`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
