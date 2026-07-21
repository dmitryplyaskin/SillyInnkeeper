import { spawn } from "node:child_process";
import path from "node:path";

type SpawnResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

function spawnAndCapture(
  command: string,
  args: string[],
  opts?: { env?: NodeJS.ProcessEnv }
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      windowsHide: true,
      env: {
        ...process.env,
        ...(opts?.env ?? {}),
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code, signal) => {
      resolve({ code, signal, stdout, stderr });
    });
  });
}

function spawnFireAndForget(command: string, args: string[]): void {
  const child = spawn(command, args, {
    shell: false,
    windowsHide: true,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

export class ExplorerUnsupportedPlatformError extends Error {
  constructor(public readonly platform: NodeJS.Platform) {
    super(`Unsupported platform: ${platform}`);
    this.name = "ExplorerUnsupportedPlatformError";
  }
}

export class ExplorerDialogNotAvailableError extends Error {
  constructor(public readonly platform: NodeJS.Platform) {
    super(`Folder picker dialog not available on: ${platform}`);
    this.name = "ExplorerDialogNotAvailableError";
  }
}

export class ExplorerCommandFailedError extends Error {
  constructor(
    public readonly command: string,
    public readonly args: string[],
    public readonly result: SpawnResult
  ) {
    super(
      `Command failed: ${command} ${args.join(" ")} (code=${String(
        result.code
      )}, signal=${String(result.signal)})`
    );
    this.name = "ExplorerCommandFailedError";
  }
}

function ensureOk(command: string, args: string[], result: SpawnResult): void {
  if (result.code === 0) return;
  throw new ExplorerCommandFailedError(command, args, result);
}

export async function showFolder(folderPath: string): Promise<void> {
  const platform = process.platform;

  if (platform === "win32") {
    // Starting Explorer directly is sometimes flaky from Node.
    // cmd.exe + start is more reliable for GUI apps and does not block.
    spawnFireAndForget("cmd.exe", [
      "/c",
      "start",
      "",
      "explorer.exe",
      folderPath,
    ]);
    return;
  }

  if (platform === "darwin") {
    const cmd = "open";
    const args = [folderPath];
    const res = await spawnAndCapture(cmd, args);
    ensureOk(cmd, args, res);
    return;
  }

  if (platform === "linux") {
    const cmd = "xdg-open";
    const args = [folderPath];
    const res = await spawnAndCapture(cmd, args);
    ensureOk(cmd, args, res);
    return;
  }

  throw new ExplorerUnsupportedPlatformError(platform);
}

export async function showFile(filePath: string): Promise<void> {
  const platform = process.platform;

  if (platform === "win32") {
    // Note: explorer expects `/select,` as a single arg.
    spawnFireAndForget("cmd.exe", [
      "/c",
      "start",
      "",
      "explorer.exe",
      "/select,",
      filePath,
    ]);
    return;
  }

  if (platform === "darwin") {
    const cmd = "open";
    const args = ["-R", filePath];
    const res = await spawnAndCapture(cmd, args);
    ensureOk(cmd, args, res);
    return;
  }

  if (platform === "linux") {
    // Best-effort: open parent directory (universal "select file" is not available).
    const dir = path.dirname(filePath);
    const cmd = "xdg-open";
    const args = [dir];
    const res = await spawnAndCapture(cmd, args);
    ensureOk(cmd, args, res);
    return;
  }

  throw new ExplorerUnsupportedPlatformError(platform);
}

function escapeAppleScriptString(value: string): string {
  // Escape backslashes and double quotes for use inside "...".
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function pickFolder(opts?: {
  title?: string;
}): Promise<{ path: string | null; cancelled: boolean }> {
  const platform = process.platform;
  const title = (opts?.title ?? "").trim();

  if (platform === "win32") {
    const envTitle = title || "Select folder";
    const cmd = "powershell.exe";
    const script = [
      "$ErrorActionPreference='Stop';",
      "Add-Type -AssemblyName System.Windows.Forms;",
      "$dlg = New-Object System.Windows.Forms.FolderBrowserDialog;",
      `$dlg.Description = $env:SILLY_FOLDER_PICKER_TITLE;`,
      "$dlg.ShowNewFolderButton = $true;",
      "$res = $dlg.ShowDialog();",
      "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;",
      "if ($res -eq [System.Windows.Forms.DialogResult]::OK) {",
      "  Write-Output $dlg.SelectedPath;",
      "} else {",
      "  Write-Output '';",
      "}",
    ].join(" ");

    const args = [
      "-NoProfile",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script,
    ];

    const res = await spawnAndCapture(cmd, args, {
      env: { SILLY_FOLDER_PICKER_TITLE: envTitle },
    });
    ensureOk(cmd, args, res);

    const picked = res.stdout.trim();
    if (!picked) return { path: null, cancelled: true };
    return { path: picked, cancelled: false };
  }

  if (platform === "darwin") {
    const prompt = escapeAppleScriptString(title || "Select folder");
    const cmd = "osascript";
    const args = [
      "-e",
      `POSIX path of (choose folder with prompt "${prompt}")`,
    ];
    const res = await spawnAndCapture(cmd, args);
    // Cancel in osascript is exit code 1 with message; treat as cancelled.
    if (res.code === 1) return { path: null, cancelled: true };
    ensureOk(cmd, args, res);

    const p = res.stdout.trim();
    if (!p) return { path: null, cancelled: true };
    // AppleScript часто возвращает путь с завершающим "/"
    const normalized = p.length > 1 ? p.replace(/\/$/, "") : p;
    return { path: normalized, cancelled: false };
  }

  if (platform === "linux") {
    const titleArg = title || "Select folder";

    // 1) zenity
    try {
      const cmd = "zenity";
      const args = ["--file-selection", "--directory", `--title=${titleArg}`];
      const res = await spawnAndCapture(cmd, args);
      // Cancel: exit code 1
      if (res.code === 1) return { path: null, cancelled: true };
      ensureOk(cmd, args, res);
      const p = res.stdout.trim();
      if (!p) return { path: null, cancelled: true };
      return { path: p, cancelled: false };
    } catch (err: any) {
      if (!err || err.code !== "ENOENT") {
        // If zenity exists but failed, bubble up.
        throw err;
      }
    }

    // 2) kdialog
    try {
      const cmd = "kdialog";
      const args = ["--getexistingdirectory", ".", "--title", titleArg];
      const res = await spawnAndCapture(cmd, args);
      if (res.code === 1) return { path: null, cancelled: true };
      ensureOk(cmd, args, res);
      const p = res.stdout.trim();
      if (!p) return { path: null, cancelled: true };
      return { path: p, cancelled: false };
    } catch (err: any) {
      if (!err || err.code !== "ENOENT") throw err;
    }

    throw new ExplorerDialogNotAvailableError(platform);
  }

  throw new ExplorerUnsupportedPlatformError(platform);
}
