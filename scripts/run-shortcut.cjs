/**
 * Lanza el asistente de accesos directos según el SO (npm run shortcut).
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
process.chdir(root);

const ps1 = path.join(__dirname, "create-shortcut.ps1");
const sh = path.join(__dirname, "create-shortcut.sh");

if (process.platform === "win32") {
  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1],
    { stdio: "inherit" }
  );
  process.exit(r.status === null ? 1 : r.status);
}

const r = spawnSync("bash", [sh], { stdio: "inherit" });
process.exit(r.status === null ? 1 : r.status);
