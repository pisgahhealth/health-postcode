import { run } from "./cli";
const r = run(process.argv.slice(2));
if (r.stdout) process.stdout.write(r.stdout + "\n");
if (r.stderr) process.stderr.write(r.stderr + "\n");
process.exit(r.exitCode);
