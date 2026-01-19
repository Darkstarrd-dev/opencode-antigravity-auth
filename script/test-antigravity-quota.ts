#!/usr/bin/env npx tsx
import { spawn } from "child_process";
import { ANTIGRAVITY_ENDPOINT, ANTIGRAVITY_ENDPOINT_FALLBACKS } from "../src/constants";
import { resolveModelForHeaderStyle, resolveModelWithTier } from "../src/plugin/transform/model-resolver";

interface Args {
  models: string[];
  prompt: string;
  timeout: number;
  runE2e: boolean;
  debug: boolean;
  help: boolean;
}

const DEFAULT_MODELS = [
  "google/antigravity-gemini-3-flash",
  "google/antigravity-gemini-3-pro-low",
  "google/antigravity-claude-sonnet-4-5-thinking-low",
];

const DEFAULT_PROMPT = "Reply with exactly one word: OK";
const DEFAULT_TIMEOUT_MS = 120_000;

function normalizeModel(model: string): string {
  return model.replace(/^google\//, "");
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const models: string[] = [];
  let prompt = DEFAULT_PROMPT;
  let timeout = DEFAULT_TIMEOUT_MS;
  let runE2e = false;
  let debug = false;
  let help = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--model") {
      const value = args[i + 1];
      if (value) {
        models.push(value);
        i += 1;
      }
      continue;
    }
    if (arg === "--prompt") {
      const value = args[i + 1];
      if (value) {
        prompt = value;
        i += 1;
      }
      continue;
    }
    if (arg === "--timeout") {
      const value = args[i + 1];
      if (value) {
        timeout = Number.parseInt(value, 10);
        i += 1;
      }
      continue;
    }
    if (arg === "--e2e") {
      runE2e = true;
      continue;
    }
    if (arg === "--debug") {
      debug = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
  }

  return {
    models: models.length > 0 ? models : DEFAULT_MODELS,
    prompt,
    timeout: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
    runE2e,
    debug,
    help,
  };
}

function printHelp(): void {
  console.log(`\nAntigravity 配额测试脚本\n\n用法:\n  npx tsx script/test-antigravity-quota.ts [选项]\n\n选项:\n  --model <model>     指定模型（可重复）\n  --prompt <text>     自定义提示词\n  --timeout <ms>      单次超时（默认 120000）\n  --e2e               执行真实请求测试\n  --debug             透传 OPENCODE_ANTIGRAVITY_DEBUG=1\n  --help, -h          显示帮助\n\n示例:\n  npx tsx script/test-antigravity-quota.ts\n  npx tsx script/test-antigravity-quota.ts --model google/antigravity-gemini-3-flash --e2e\n`);
}

function formatThinking(resolved: ReturnType<typeof resolveModelWithTier>): string {
  if (resolved.thinkingLevel) {
    return resolved.thinkingLevel;
  }
  if (resolved.thinkingBudget) {
    return String(resolved.thinkingBudget);
  }
  return "无";
}

function printRouting(models: string[]): void {
  console.log("\n[端点配置]");
  console.log(`主端点: ${ANTIGRAVITY_ENDPOINT}`);
  console.log(`Fallback: ${ANTIGRAVITY_ENDPOINT_FALLBACKS.join(" -> ")}`);

  console.log("\n[模型路由预览]");
  models.forEach((model) => {
    const normalized = normalizeModel(model);
    const resolved = resolveModelWithTier(normalized);
    const antigravity = resolveModelForHeaderStyle(normalized, "antigravity");
    const geminiCli = resolveModelForHeaderStyle(normalized, "gemini-cli");
    const quota = resolved.quotaPreference ?? "gemini-cli";

    console.log(`- ${model}`);
    console.log(`  quota=${quota} actual=${resolved.actualModel} thinking=${formatThinking(resolved)}`);
    console.log(`  antigravity -> ${antigravity.actualModel}`);
    console.log(`  gemini-cli  -> ${geminiCli.actualModel}`);
  });
}

async function runE2e(models: string[], prompt: string, timeoutMs: number, debug: boolean): Promise<number> {
  let failures = 0;

  for (const model of models) {
    process.stdout.write(`\n测试 ${model} ... `);
    const start = Date.now();

    const result = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const env = { ...process.env };
      if (debug) {
        env.OPENCODE_ANTIGRAVITY_DEBUG = "1";
      }

      const proc = spawn("opencode", ["run", prompt, "--model", model], {
        stdio: ["ignore", "pipe", "pipe"],
        env,
      });

      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        proc.kill("SIGKILL");
        resolve({ ok: false, error: `超时 ${timeoutMs}ms` });
      }, timeoutMs);

      proc.stdout?.on("data", (data) => { stdout += data.toString(); });
      proc.stderr?.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const message = stderr || stdout || `退出码 ${code}`;
          resolve({ ok: false, error: message.slice(0, 400) });
          return;
        }
        resolve({ ok: true });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({ ok: false, error: err.message });
      });
    });

    const duration = ((Date.now() - start) / 1000).toFixed(1);
    if (!result.ok) {
      failures += 1;
      console.log(`失败 (${duration}s)`);
      if (result.error) {
        console.log(`  ${result.error}`);
      }
    } else {
      console.log(`通过 (${duration}s)`);
    }
  }

  return failures;
}

async function main(): Promise<void> {
  const { models, prompt, timeout, runE2e: shouldRunE2e, debug, help } = parseArgs();

  if (help) {
    printHelp();
    return;
  }

  printRouting(models);

  if (!shouldRunE2e) {
    return;
  }

  const failures = await runE2e(models, prompt, timeout, debug);
  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
