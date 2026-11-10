import { spawnSync } from "node:child_process";

// Workers Builds already receives locally tested, PR-reviewed commits.
// Its documented WORKERS_CI=1 separates release validation from local tests.
const tasks = ["format:check", "lint", "design-system:check", "typecheck"];
if (process.env.WORKERS_CI === "1") {
  console.log("Workers Builds: static checks and build only; tests run locally before push.");
} else {
  tasks.push("test");
}
tasks.push("build");
for (const task of tasks) {
  const result = spawnSync("yarn", [task], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
