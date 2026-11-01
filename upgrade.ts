#!/usr/bin/env -S deno run -A
/**
 * 可复制的项目升级脚本。
 *
 * 适用同构架：dweb 多应用 + docker compose，源码挂进容器，
 * 宿主机 `deno task build:<服务名>` 产出 dist，容器执行 `dist/<服务>/server.js --start`。
 * 把本文件和 `post-merge` 拷到项目根目录后执行一次：
 *   deno run -A upgrade.ts --install-hook
 *
 * 服务从 compose 自动识别，一般不用改脚本：
 * - web：command 含 `dist/<应用>/server.js` 或 `.dist/<应用>/server.js`
 *   （`--start` 可有可无，生产包在构建时已经 start）
 *   → 删除该 dist → `deno task build:<服务名>` → restart
 * - static：command 含 `scripts/serve-*.ts`（如网页版）→ 不构建，只 restart
 * - console：command 含 `console/cli.ts` → 只 restart
 *
 * 可选 labels（写在对应 service 上）：
 * - dreamer.upgrade.kind: `web` | `console`
 * - dreamer.upgrade.dist: 如 `dist/backend`（web 升级前删除）
 * - dreamer.upgrade.buildTask: 如 `build:backend`（默认 `build:<服务名>`）
 * - dreamer.upgrade.paths: 额外监听的目录前缀，逗号分隔，如 `vendor/ui/`
 *
 * 只处理正在运行的容器。用 `runtime/logs/upgrade-state.json` 记录上次成功时的 commit，
 * 再和当前工作区做 diff，因此 tests、docs 之类的提交不会触发构建。
 *
 *   deno run -A upgrade.ts                  # 按变更升级正在运行的服务
 *   deno run -A upgrade.ts -f               # 强制升级全部正在运行的服务
 *   deno run -A upgrade.ts -f backend api   # 强制升级指定服务
 *   deno run -A upgrade.ts --dry-run        # 只打印将要做的事
 *   deno run -A upgrade.ts --install-hook   # 安装 .git/hooks/post-merge
 *
 * compose 文件：默认 `docker-compose.yml`。`-d` / `-p` 或环境变量
 * `UPGRADE_ENV=dev|prod` 改为 `docker-compose.dev.yml` / `docker-compose.prod.yml`。
 */

// 脚本会原样拷到其他项目，不能依赖那个项目 deno.json 里的 import map。
// deno-lint-ignore no-import-prefix
import { parse as parseYaml } from "jsr:@std/yaml@^1";

/** 升级状态、锁和日志目录（runtime 已忽略，不提交） */
const DATA_DIR = "runtime/logs";

/** 上次成功升级到的 commit */
const STATE_FILE = `${DATA_DIR}/upgrade-state.json`;

/** 升级日志 */
const LOG_FILE = `${DATA_DIR}/upgrade.log`;

/** 防止 post-merge 与手动升级叠在一起 */
const LOCK_FILE = `${DATA_DIR}/upgrade.lock`;

/** 脚本所在目录就是项目根，钩子的工作目录不一定是这里 */
const ROOT = import.meta.dirname ?? Deno.cwd();

const RED = "\x1b[0;31m";
const GREEN = "\x1b[0;32m";
const YELLOW = "\x1b[1;33m";
const NC = "\x1b[0m";

/** 可升级服务类型：web 要构建，static 和 console 只重启 */
type UpgradeServiceKind = "web" | "static" | "console";

/**
 * 从 compose 解析出的一个可升级服务
 */
interface UpgradeServiceConfig {
  /** compose 里的服务名 */
  name: string;
  /** web 清 dist 再构建；static 和 console 只重启 */
  kind: UpgradeServiceKind;
  /** web 构建前要删掉的目录，相对项目根 */
  distDir?: string;
  /** web 使用的 deno task，默认 build:<name> */
  buildTask?: string;
  /** 这些路径前缀下的文件变化会触发本服务升级 */
  watchPaths: string[];
}

/**
 * 记在 runtime/logs/upgrade-state.json 里的成功记录
 */
interface UpgradeState {
  /** 服务名 → 上次成功升级时的 HEAD */
  services: Record<string, { commit: string; updatedAt: string }>;
}

/**
 * 命令行解析结果
 */
interface CliArgs {
  /** "" 表示默认 compose；dev/prod 选择对应文件 */
  envType: "dev" | "prod" | "";
  /** 跳过 diff，升级全部或列出的服务 */
  force: boolean;
  /** -f 后面点名的服务；空表示全部 */
  forceServices: string[];
  /** 由 post-merge 调用 */
  hook: boolean;
  /** 只打印计划，不删 dist、不构建、不重启 */
  dryRun: boolean;
  /** 把 post-merge 装进 .git/hooks */
  installHook: boolean;
  help: boolean;
}

/**
 * 安装到 .git/hooks/post-merge 的脚本。
 * 仓库根目录的 post-merge 与这里保持同一份内容，方便只拷贝文件时直接当钩子用。
 */
const POST_MERGE_HOOK = `#!/bin/sh
# Git post-merge：pull / merge 成功后自动升级。
# 安装：在项目根目录执行 deno run -A upgrade.ts --install-hook
# 复制到同构架项目后，把 upgrade.ts 和本文件放在项目根，再执行一次安装命令。
# 使用 dev / prod compose 时取消下一行注释：
# UPGRADE_ENV=dev
# export UPGRADE_ENV

set -u
export PATH="\${HOME}/.deno/bin:/opt/homebrew/bin:/usr/local/bin:\${PATH:-/usr/bin:/bin}"

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT" || exit 0

if [ ! -f "$ROOT/upgrade.ts" ]; then
  echo "[upgrade] 未找到 upgrade.ts，跳过" >&2
  exit 0
fi

if ! command -v deno >/dev/null 2>&1; then
  echo "[upgrade] 未找到 deno，跳过自动升级" >&2
  exit 0
fi

exec deno run -A "$ROOT/upgrade.ts" --hook
`;

/**
 * 生成本地时间戳，写日志用
 * @returns YYYY-MM-DD HH:mm:ss
 */
function timestamp(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${
    pad(date.getDate())
  } ${pad(date.getHours())}:${pad(date.getMinutes())}:${
    pad(date.getSeconds())
  }`;
}

/**
 * 追加一行升级日志；目录或磁盘失败时只打到终端，不中断升级
 * @param level INFO / WARN / ERROR
 * @param message 已去掉颜色的正文
 */
async function writeLog(level: string, message: string): Promise<void> {
  try {
    await Deno.mkdir(`${ROOT}/${DATA_DIR}`, { recursive: true });
    await Deno.writeTextFile(
      `${ROOT}/${LOG_FILE}`,
      `[${timestamp()}] [${level}] ${message}\n`,
      { append: true },
    );
  } catch (error) {
    console.error(
      `写入日志失败: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * 打印信息并写入日志
 * @param message 正文
 */
async function logInfo(message: string): Promise<void> {
  console.log(`${GREEN}[INFO]${NC} ${message}`);
  await writeLog("INFO", message);
}

/**
 * 打印警告并写入日志
 * @param message 正文
 */
async function logWarn(message: string): Promise<void> {
  console.log(`${YELLOW}[WARN]${NC} ${message}`);
  await writeLog("WARN", message);
}

/**
 * 打印错误并写入日志
 * @param message 正文
 */
async function logError(message: string): Promise<void> {
  console.log(`${RED}[ERROR]${NC} ${message}`);
  await writeLog("ERROR", message);
}

/**
 * 在项目根执行命令并取回文本输出，不继承到终端（避免把 compose 解析结果打出来）
 * @param bin 可执行文件
 * @param args 参数
 * @returns 退出码与标准输出、标准错误
 */
async function capture(
  bin: string,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const command = new Deno.Command(bin, {
    args,
    cwd: ROOT,
    stdout: "piped",
    stderr: "piped",
  });
  const { code, stdout, stderr } = await command.output();
  const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  return { code, stdout: decode(stdout), stderr: decode(stderr) };
}

/**
 * 在项目根执行命令，输出直接打到当前终端（构建、重启需要看过程）
 * @param bin 可执行文件。构建时传 Deno.execPath()，避免钩子 PATH 里找不到 deno
 * @param args 参数
 * @returns 退出码；进程起不来时返回 1
 */
async function runInherit(bin: string, args: string[]): Promise<number> {
  try {
    const command = new Deno.Command(bin, {
      args,
      cwd: ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await command.output();
    return code;
  } catch (error) {
    await logError(
      `${bin} 执行失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return 1;
  }
}

/**
 * 执行 git，工作目录固定为项目根
 * @param args git 子命令
 * @returns 退出码与输出
 */
function git(
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  return capture("git", args);
}

/**
 * 解析参数。Git 把 post-merge 做成可执行文件直接调用时，会多传一个 squash 标志 0 或 1，这里丢掉。
 * @returns 环境、是否强制、服务名，以及钩子 / 干跑 / 安装选项
 */
function parseArgs(): CliArgs {
  const result: CliArgs = {
    envType: "",
    force: false,
    forceServices: [],
    hook: false,
    dryRun: false,
    installHook: false,
    help: false,
  };

  const fromEnv = Deno.env.get("UPGRADE_ENV")?.trim();
  if (fromEnv === "dev" || fromEnv === "prod") {
    result.envType = fromEnv;
  }

  const args = Deno.args;
  let index = 0;
  while (index < args.length) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      result.help = true;
      index++;
    } else if (arg === "--dev" || arg === "-d") {
      result.envType = "dev";
      index++;
    } else if (arg === "--prod" || arg === "-p") {
      result.envType = "prod";
      index++;
    } else if (arg === "--hook") {
      result.hook = true;
      index++;
    } else if (arg === "--dry-run") {
      result.dryRun = true;
      index++;
    } else if (arg === "--install-hook") {
      result.installHook = true;
      index++;
    } else if (arg === "0" || arg === "1") {
      // post-merge 的 squash 标志，不是服务名
      result.hook = true;
      index++;
    } else if (arg === "--force" || arg === "-f") {
      result.force = true;
      index++;
      while (index < args.length) {
        const next = args[index];
        if (next.startsWith("-") || next === "0" || next === "1") break;
        if (next !== "all") result.forceServices.push(next);
        index++;
      }
    } else {
      console.log(`${RED}[ERROR]${NC} 未知参数: ${arg}`);
      result.help = true;
      break;
    }
  }

  return result;
}

/**
 * 打印用法
 */
function showUsage(): void {
  console.log(`用法:
  deno run -A upgrade.ts                         按变更升级正在运行的服务
  deno run -A upgrade.ts --dev|-d|--prod|-p       指定 compose 文件
  deno run -A upgrade.ts --force|-f [服务名...]   跳过 diff，强制升级
  deno run -A upgrade.ts --dry-run                只打印计划
  deno run -A upgrade.ts --install-hook           安装 post-merge 钩子

环境变量 UPGRADE_ENV=dev|prod 与 -d / -p 相同。
post-merge 在 git pull / merge 成功后执行本脚本（--hook）。

自动识别:
  web      command 含 dist/.../server.js 或 .dist/.../server.js（--start 可选）
  static   command 含 scripts/serve-*.ts，只重启，不构建
  console  command 含 console/cli.ts
  labels   dreamer.upgrade.kind / dist / buildTask / paths
`);
}

/**
 * 选出本次使用的 compose 文件
 * @param envType 空字符串用默认文件；dev/prod 用对应变体
 * @returns 相对项目根的文件名
 */
async function resolveComposeFile(
  envType: "dev" | "prod" | "",
): Promise<string> {
  const named = envType === "" ? null : `docker-compose.${envType}.yml`;
  if (named) {
    try {
      await Deno.stat(`${ROOT}/${named}`);
      return named;
    } catch {
      throw new Error(`找不到 ${named}`);
    }
  }

  for (
    const file of [
      "docker-compose.yml",
      "docker-compose.dev.yml",
      "docker-compose.prod.yml",
    ]
  ) {
    try {
      await Deno.stat(`${ROOT}/${file}`);
      return file;
    } catch {
      // 继续找下一个常见文件名
    }
  }
  throw new Error(
    "找不到 docker-compose.yml、docker-compose.dev.yml 或 docker-compose.prod.yml",
  );
}

/**
 * 把 compose command（字符串或数组）收成一行，便于匹配入口文件
 * @param command compose 的 command 字段
 * @returns 用空格拼起来的命令
 */
function flattenCommand(command: unknown): string {
  if (typeof command === "string") return command;
  if (Array.isArray(command)) {
    return command.map((part) => flattenCommand(part)).join(" ");
  }
  return "";
}

/**
 * 读取 compose labels。兼容 map 和 `- key=value` 列表
 * @param raw service.labels
 * @returns 字符串 map
 */
function readLabels(raw: unknown): Record<string, string> {
  const labels: Record<string, string> = {};
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== "string") continue;
      const eq = item.indexOf("=");
      if (eq === -1) labels[item] = "";
      else labels[item.slice(0, eq)] = item.slice(eq + 1);
    }
    return labels;
  }
  if (raw && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw)) {
      labels[key] = value == null ? "" : String(value);
    }
  }
  return labels;
}

/**
 * 默认要盯住的源码路径。src/<服务名> 与 src/common 是这套工程的公共布局
 * @param name 服务名
 * @param kind web 或 console
 * @param extra labels 里追加的前缀
 * @returns 以 / 结尾的目录前缀
 */
function defaultWatchPaths(
  name: string,
  kind: UpgradeServiceKind,
  extra: string[],
): string[] {
  const own = kind === "console" ? ["src/console/"] : [`src/${name}/`];
  // 静态网页不编译 src/common，避免公共代码一改就重启网页容器。
  const paths = kind === "static"
    ? [...own, ...extra]
    : [...own, "src/common/", ...extra];
  return paths.map((path) => {
    if (path.endsWith("/") || path.includes(".")) return path;
    return `${path}/`;
  });
}

/**
 * 从单个 service 判断它是不是要升级的应用
 * @param name 服务名
 * @param service compose services 下的对象
 * @returns 配置；数据库、缓存这类服务返回 null
 */
function parseUpgradeService(
  name: string,
  service: Record<string, unknown>,
): UpgradeServiceConfig | null {
  const labels = readLabels(service.labels);
  const extra = (labels["dreamer.upgrade.paths"] ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const command = flattenCommand(service.command);
  const labelKind = labels["dreamer.upgrade.kind"];

  // dist/backend/server.js 与旧布局 .dist/dapp/server.js 都认。
  // 生产构建产物自己会 start，compose 里可以不写 --start。
  const distMatch = command.match(
    /(?:^|\s)((?:\.?dist)\/[^\s'"]+\/server\.(?:js|ts))(?:\s|$)/,
  );
  const isConsole = command.includes("console/cli.ts");
  const staticScript = command.match(/scripts\/serve-[\w-]+\.ts/);

  let kind: UpgradeServiceKind | null = null;
  if (labelKind === "web" || labelKind === "console" || labelKind === "static") {
    kind = labelKind;
  } else if (distMatch) {
    kind = "web";
  } else if (isConsole) {
    kind = "console";
  } else if (staticScript) {
    kind = "static";
  }
  if (!kind) return null;

  const config: UpgradeServiceConfig = {
    name,
    kind,
    watchPaths: defaultWatchPaths(name, kind, extra),
  };

  if (kind === "web") {
    const fromCommand = distMatch
      ? distMatch[1].replace(/\/server\.(?:js|ts)$/, "")
      : undefined;
    config.distDir = labels["dreamer.upgrade.dist"] || fromCommand ||
      `dist/${name}`;
    config.buildTask = labels["dreamer.upgrade.buildTask"] || `build:${name}`;
  }
  if (kind === "static" && staticScript) {
    config.watchPaths.push(staticScript[0]);
  }

  return config;
}

/**
 * 用 docker compose config 解析最终 command（能展开 YAML 锚点）。
 * 只保留 command 和 labels，不记录、不打印其余字段。
 * @param composeFile compose 文件名
 * @returns services 映射；失败时返回 null，交给直接读文件
 */
async function loadServicesViaComposeConfig(
  composeFile: string,
): Promise<Record<string, Record<string, unknown>> | null> {
  const { code, stdout } = await capture("docker", [
    "compose",
    "-f",
    composeFile,
    "config",
    "--format",
    "json",
  ]);
  if (code !== 0 || !stdout.trim()) return null;

  try {
    const doc = JSON.parse(stdout) as {
      services?: Record<string, Record<string, unknown>>;
    };
    const slim: Record<string, Record<string, unknown>> = {};
    for (const [name, service] of Object.entries(doc.services ?? {})) {
      slim[name] = {
        command: service.command,
        labels: service.labels,
      };
    }
    return slim;
  } catch {
    return null;
  }
}

/**
 * 直接读 compose 文件。config 失败（例如还没有 .env）时用这条路径
 * @param composeFile compose 文件名
 * @returns services 映射
 */
async function loadServicesViaYaml(
  composeFile: string,
): Promise<Record<string, Record<string, unknown>>> {
  const text = await Deno.readTextFile(`${ROOT}/${composeFile}`);
  const doc = parseYaml(text) as {
    services?: Record<string, Record<string, unknown>>;
  };
  return doc.services ?? {};
}

/**
 * 加载当前 compose 里全部可升级服务
 * @param composeFile compose 文件名
 * @returns 识别结果，顺序与文件中一致
 */
async function loadUpgradeServices(
  composeFile: string,
): Promise<UpgradeServiceConfig[]> {
  const fromConfig = await loadServicesViaComposeConfig(composeFile);
  const services = fromConfig ?? await loadServicesViaYaml(composeFile);
  if (!fromConfig) {
    await logWarn(`docker compose config 不可用，改为直接解析 ${composeFile}`);
  }

  const found: UpgradeServiceConfig[] = [];
  for (const [name, service] of Object.entries(services)) {
    const config = parseUpgradeService(name, service);
    if (config) found.push(config);
  }
  return found;
}

/**
 * 打印识别结果，方便复制到新项目时确认有没有认错服务
 * @param composeFile 当前 compose
 * @param services 识别出的服务
 */
async function logDiscovered(
  composeFile: string,
  services: UpgradeServiceConfig[],
): Promise<void> {
  if (services.length === 0) {
    await logWarn(`${composeFile} 里没有可升级的 web / console 服务`);
    return;
  }
  await logInfo(`从 ${composeFile} 识别到 ${services.length} 个可升级服务:`);
  for (const service of services) {
    if (service.kind === "web") {
      await logInfo(
        `  • ${service.name} [web] dist=${service.distDir} task=${service.buildTask}`,
      );
    } else if (service.kind === "static") {
      await logInfo(`  • ${service.name} [static] 只重启`);
    } else {
      await logInfo(`  • ${service.name} [console] 只重启`);
    }
  }
}

/**
 * 读取 deno.json 里的 task 名，构建前确认 task 存在
 * @returns task 名集合；读不到文件时为空集合
 */
async function loadDenoTaskNames(): Promise<Set<string>> {
  try {
    const raw = await Deno.readTextFile(`${ROOT}/deno.json`);
    const json = JSON.parse(raw) as { tasks?: Record<string, string> };
    return new Set(Object.keys(json.tasks ?? {}));
  } catch {
    return new Set();
  }
}

/**
 * 列出正在运行的 compose 服务名
 * @param composeFile compose 文件名
 * @returns 运行中的服务名；docker 调用失败时返回 null
 */
async function listRunningServices(
  composeFile: string,
): Promise<Set<string> | null> {
  const { code, stdout, stderr } = await capture("docker", [
    "compose",
    "-f",
    composeFile,
    "ps",
    "--format",
    "json",
  ]);
  if (code !== 0) {
    await logError(
      `无法查看容器状态: ${stderr.trim() || "docker compose ps 失败"}`,
    );
    return null;
  }

  const text = stdout.trim();
  if (!text) return new Set();

  let rows: unknown[] = [];
  try {
    if (text.startsWith("[")) {
      const parsed = JSON.parse(text) as unknown;
      if (Array.isArray(parsed)) rows = parsed;
    } else {
      rows = text.split("\n").filter((line) => line.trim()).map((line) =>
        JSON.parse(line)
      );
    }
  } catch (error) {
    await logError(
      `解析 docker compose ps 输出失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }

  const running = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as { Service?: string; State?: string; Status?: string };
    const up = item.State === "running" ||
      (item.Status ?? "").toLowerCase().startsWith("up");
    if (up && item.Service) running.add(item.Service);
  }
  return running;
}

/**
 * 读取升级状态。文件不存在或损坏时当作从未升级过
 * @returns 状态对象
 */
async function readState(): Promise<UpgradeState> {
  try {
    const text = await Deno.readTextFile(`${ROOT}/${STATE_FILE}`);
    const parsed = JSON.parse(text) as UpgradeState;
    if (!parsed.services || typeof parsed.services !== "object") {
      return { services: {} };
    }
    return parsed;
  } catch {
    return { services: {} };
  }
}

/**
 * 把某个服务标记为已经成功升到指定 commit
 * @param state 内存中的状态，会就地更新并写盘
 * @param service 服务名
 * @param commit HEAD；非 git 仓库时为空字符串
 */
async function markUpgraded(
  state: UpgradeState,
  service: string,
  commit: string,
): Promise<void> {
  state.services[service] = {
    commit,
    updatedAt: new Date().toISOString(),
  };
  await Deno.mkdir(`${ROOT}/${DATA_DIR}`, { recursive: true });
  await Deno.writeTextFile(
    `${ROOT}/${STATE_FILE}`,
    JSON.stringify(state, null, 2) + "\n",
  );
}

/**
 * 当前 HEAD。不在 git 仓库里时返回 null，调用方会升级所有正在运行的服务
 * @returns 完整 commit，或 null
 */
async function gitHead(): Promise<string | null> {
  const { code, stdout } = await git(["rev-parse", "HEAD"]);
  if (code !== 0) return null;
  const head = stdout.trim();
  return head || null;
}

/**
 * 上次成功 commit 到当前工作区之间变更的文件（含未暂存改动和未跟踪文件）
 * @param since 上次 commit；空表示没有基线
 * @returns 相对路径列表；无法比较时返回 null，表示应当升级
 */
async function changedFilesSince(
  since: string | undefined,
): Promise<string[] | null> {
  if (!since) return null;

  const exists = await git(["cat-file", "-e", `${since}^{commit}`]);
  if (exists.code !== 0) return null;

  const diff = await git(["diff", "--name-only", since]);
  if (diff.code !== 0) return null;

  const untracked = await git([
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const files = `${diff.stdout}\n${
    untracked.code === 0 ? untracked.stdout : ""
  }`
    .split("\n")
    .map((line) => line.trim().replaceAll("\\", "/"))
    .filter(Boolean);
  return [...new Set(files)];
}

/**
 * 源码、依赖清单变化时需要重新 build
 * @param service 服务配置
 * @param files changedFilesSince 的结果；null 表示基线不可用
 * @returns 需要构建（console 则是需要重启）时返回 true
 */
function sourceChanged(
  service: UpgradeServiceConfig,
  files: string[] | null,
): boolean {
  if (files === null) return true;
  const shared = new Set(["deno.json", "deno.lock", "import_map.json"]);
  for (const file of files) {
    if (shared.has(file)) return true;
    if (service.watchPaths.some((prefix) => file.startsWith(prefix))) {
      return true;
    }
  }
  return false;
}

/**
 * 镜像、compose、环境变量变化时要重建容器，restart 不会重新读 env_file
 * @param files 变更列表；null 表示没有 diff（首次运行只 restart，不重建镜像）
 * @param composeFile 当前 compose 文件名
 * @returns 需要 force-recreate 时返回 true
 */
function runtimeChanged(
  files: string[] | null,
  composeFile: string,
): boolean {
  if (!files) return false;
  return files.some((file) =>
    file === ".env" ||
    file === composeFile ||
    file === "Dockerfile" ||
    file.endsWith("/Dockerfile")
  );
}

/**
 * 确认 dist 目录落在项目内的 dist 或 .dist 下，避免标签写错删到别的路径
 * @param distDir 配置里的目录
 * @returns 规范化后的相对路径；不安全时返回 null
 */
function safeDistDir(distDir: string | undefined): string | null {
  if (!distDir) return null;
  const normalized = distDir.replaceAll("\\", "/").replace(/^\.\//, "");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    normalized.split("/").includes("..") ||
    !/^(?:\.?dist)\//.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

/**
 * 删除 web 服务的旧构建产物
 * @param service 服务配置
 * @param dryRun 为 true 时只打印
 * @returns 可以继续构建时返回 true
 */
async function cleanDist(
  service: UpgradeServiceConfig,
  dryRun: boolean,
): Promise<boolean> {
  const distDir = safeDistDir(service.distDir);
  if (!distDir) {
    await logError(
      `服务 ${service.name} 的 dist 目录不安全，已跳过: ${service.distDir}`,
    );
    return false;
  }
  if (dryRun) {
    await logInfo(`[dry-run] 将删除 ${distDir}`);
    return true;
  }

  await logInfo(`清理 ${service.name} 的构建产物: ${distDir}`);
  try {
    await Deno.remove(`${ROOT}/${distDir}`, { recursive: true });
    await logInfo(`已删除 ${distDir}`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await logInfo(`${distDir} 不存在，跳过清理`);
      return true;
    }
    await logError(
      `清理 ${distDir} 失败: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return false;
  }
  return true;
}

/**
 * 执行 deno task 构建 web 服务
 * @param service 服务配置
 * @param tasks deno.json 中的 task 名
 * @param dryRun 为 true 时只打印
 * @returns 构建成功返回 true
 */
async function buildWeb(
  service: UpgradeServiceConfig,
  tasks: Set<string>,
  dryRun: boolean,
): Promise<boolean> {
  const taskName = service.buildTask ?? `build:${service.name}`;
  if (!tasks.has(taskName)) {
    await logError(
      `deno.json 中没有 task「${taskName}」。请加上该 task，或设置 label dreamer.upgrade.buildTask`,
    );
    return false;
  }
  if (dryRun) {
    await logInfo(`[dry-run] 将执行 deno task ${taskName}`);
    return true;
  }

  await logInfo(`构建 ${service.name}: deno task ${taskName}`);
  const code = await runInherit(Deno.execPath(), ["task", taskName]);
  if (code !== 0) {
    await logError(`服务 ${service.name} 构建失败 (exit ${code})`);
    return false;
  }
  await logInfo(`服务 ${service.name} 构建成功`);
  return true;
}

/**
 * 让容器跑上当前 dist。runtime 变更时重建容器，否则 restart 即可
 * @param composeFile compose 文件名
 * @param service 服务名
 * @param recreate 是否 --force-recreate --build
 * @param dryRun 为 true 时只打印
 * @returns docker 成功返回 true
 */
async function reloadService(
  composeFile: string,
  service: string,
  recreate: boolean,
  dryRun: boolean,
): Promise<boolean> {
  const args = recreate
    ? [
      "compose",
      "-f",
      composeFile,
      "up",
      "-d",
      "--no-deps",
      "--force-recreate",
      "--build",
      service,
    ]
    : ["compose", "-f", composeFile, "restart", service];

  if (dryRun) {
    await logInfo(`[dry-run] 将执行 docker ${args.join(" ")}`);
    return true;
  }

  await logInfo(
    recreate ? `重建并启动容器: ${service}` : `重启容器: ${service}`,
  );
  const code = await runInherit("docker", args);
  if (code !== 0) {
    await logError(`服务 ${service} 重载失败 (exit ${code})`);
    return false;
  }
  await logInfo(`服务 ${service} 已重载`);
  return true;
}

/**
 * 判断 pid 是否还在。锁文件里的进程已经退出时，锁可以清掉
 * @param pid 进程号
 * @returns 仍在运行返回 true
 */
async function isPidAlive(pid: number): Promise<boolean> {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  const { code } = await capture("kill", ["-0", String(pid)]);
  return code === 0;
}

/**
 * 取得升级锁。已有升级在跑时返回 false，调用方应直接结束（exit 0），避免钩子把 pull 打失败
 * @returns 拿到锁返回 true
 */
async function acquireLock(): Promise<boolean> {
  await Deno.mkdir(`${ROOT}/${DATA_DIR}`, { recursive: true });
  /** 独占创建锁文件并写入当前 pid。文件已存在时抛 AlreadyExists */
  const writeLock = async (): Promise<void> => {
    const file = await Deno.open(`${ROOT}/${LOCK_FILE}`, {
      createNew: true,
      write: true,
    });
    await file.write(new TextEncoder().encode(String(Deno.pid)));
    file.close();
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await writeLock();
      return true;
    } catch (error) {
      if (!(error instanceof Deno.errors.AlreadyExists)) throw error;
    }

    let pid = 0;
    try {
      pid = Number((await Deno.readTextFile(`${ROOT}/${LOCK_FILE}`)).trim());
    } catch {
      pid = 0;
    }
    if (await isPidAlive(pid)) {
      await logInfo(`已有升级在运行 (pid ${pid})，本次跳过`);
      return false;
    }

    await logWarn(`清理失效的升级锁 (pid ${pid || "未知"})`);
    try {
      await Deno.remove(`${ROOT}/${LOCK_FILE}`);
    } catch {
      // 另一个进程已经把锁清掉
    }
  }

  await logWarn("升级锁竞争失败，本次跳过");
  return false;
}

/**
 * 释放升级锁。只删除本进程写下的锁
 */
async function releaseLock(): Promise<void> {
  try {
    const pid = Number(
      (await Deno.readTextFile(`${ROOT}/${LOCK_FILE}`)).trim(),
    );
    if (pid === Deno.pid) await Deno.remove(`${ROOT}/${LOCK_FILE}`);
  } catch {
    // 锁已经没了就不用处理
  }
}

/**
 * 把 post-merge 写到仓库根目录和 .git/hooks
 * 钩子目录由 git 给出，兼容工作树和普通仓库
 */
async function installHook(): Promise<void> {
  const hookPath = `${ROOT}/post-merge`;
  await Deno.writeTextFile(hookPath, POST_MERGE_HOOK);
  await Deno.chmod(hookPath, 0o755);

  const gitPath = await git(["rev-parse", "--git-path", "hooks"]);
  if (gitPath.code !== 0) {
    await logWarn(
      "当前目录不是 git 仓库，已写 post-merge，但没有安装到 .git/hooks",
    );
    return;
  }

  const hooksDir = gitPath.stdout.trim();
  const absoluteHooks = hooksDir.startsWith("/")
    ? hooksDir
    : `${ROOT}/${hooksDir}`;
  await Deno.mkdir(absoluteHooks, { recursive: true });
  const dest = `${absoluteHooks}/post-merge`;
  await Deno.writeTextFile(dest, POST_MERGE_HOOK);
  await Deno.chmod(dest, 0o755);
  await logInfo(`已安装钩子: ${dest}`);
  await logInfo("之后 git pull / merge 成功会自动执行 upgrade.ts --hook");
}

/**
 * 对当前 HEAD 做一轮升级
 * @param cli 命令行选项
 * @param composeFile compose 文件名
 * @param head 本轮开始时的 HEAD，成功后写入状态
 * @returns 全部目标都成功（或没有目标）返回 true
 */
async function upgradeOnce(
  cli: CliArgs,
  composeFile: string,
  head: string | null,
): Promise<boolean> {
  const services = await loadUpgradeServices(composeFile);
  await logDiscovered(composeFile, services);
  if (services.length === 0) return true;

  const running = await listRunningServices(composeFile);
  if (!running) return false;

  const byName = new Map(services.map((service) => [service.name, service]));
  const requested = cli.force && cli.forceServices.length > 0
    ? cli.forceServices
    : services.map((service) => service.name);
  const targets: string[] = [];
  for (const name of requested) {
    if (byName.has(name)) {
      targets.push(name);
      continue;
    }
    await logWarn(
      `未知服务「${name}」，可升级服务: ${
        services.map((service) => service.name).join(", ")
      }`,
    );
  }

  // dry-run 也读状态，这样打印的计划和真实升级一致；成功后才写回
  const state = await readState();
  const tasks = await loadDenoTaskNames();
  let failed = 0;
  let updated = 0;

  for (const name of targets) {
    const service = byName.get(name);
    if (!service) continue;

    if (!running.has(name)) {
      await logInfo(`服务 ${name} 没在运行，跳过`);
      continue;
    }

    const since = cli.force ? undefined : state.services[name]?.commit;
    const files = cli.force ? null : await changedFilesSince(since);
    const source = sourceChanged(service, files);
    const runtime = runtimeChanged(files, composeFile);
    if (!source && !runtime) {
      await logInfo(`服务 ${name} 无相关变更，跳过`);
      continue;
    }

    await logInfo(
      `升级 ${name} [${service.kind}]${cli.force ? "（强制）" : ""}${
        runtime ? "，并重建容器" : ""
      }`,
    );

    let ok = true;
    if (service.kind === "web" && source) {
      ok = await cleanDist(service, cli.dryRun) &&
        await buildWeb(service, tasks, cli.dryRun);
    }
    if (ok) {
      ok = await reloadService(composeFile, name, runtime, cli.dryRun);
    }

    if (!ok) {
      failed++;
      continue;
    }

    updated++;
    if (!cli.dryRun && head) {
      await markUpgraded(state, name, head);
    }
  }

  await logInfo(`本轮结束：更新 ${updated} 个，失败 ${failed} 个`);
  return failed === 0;
}

/**
 * 入口。安装钩子、打印帮助，或在锁内按变更升级。
 * 升级过程中如果又进来新的 commit，最多再跟两轮，避免 post-merge 撞车时漏掉后一次拉取。
 */
async function main(): Promise<void> {
  const cli = parseArgs();
  if (cli.help) {
    showUsage();
    if (Deno.args.some((arg) => arg !== "--help" && arg !== "-h")) {
      Deno.exit(1);
    }
    return;
  }

  Deno.chdir(ROOT);

  if (cli.installHook) {
    await installHook();
    return;
  }

  const locked = await acquireLock();
  if (!locked) return;

  let failed = false;
  try {
    const composeFile = await resolveComposeFile(cli.envType);
    await logInfo(
      `${cli.hook ? "post-merge " : ""}开始升级 [${composeFile}]${
        cli.dryRun ? " (dry-run)" : ""
      }`,
    );

    try {
      const docker = await capture("docker", ["--version"]);
      if (docker.code !== 0) {
        await logError("Docker 不可用");
        failed = true;
        return;
      }
    } catch {
      await logError("Docker 不可用");
      failed = true;
      return;
    }

    for (let pass = 1; pass <= 3; pass++) {
      const head = await gitHead();
      const ok = await upgradeOnce(cli, composeFile, head);
      if (!ok) {
        failed = true;
        break;
      }
      const headNow = await gitHead();
      if (!head || headNow === head) break;
      if (pass < 3) {
        await logInfo("升级期间 HEAD 变了，按最新代码再升一次");
      }
    }
  } finally {
    await releaseLock();
  }

  if (failed) Deno.exit(1);
  await logInfo(`日志: ${LOG_FILE}`);
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    await logError(
      `升级失败: ${error instanceof Error ? error.message : String(error)}`,
    );
    await releaseLock();
    Deno.exit(1);
  }
}
