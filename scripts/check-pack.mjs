import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const packages = [
  { directory: "packages/core", name: "@redrixx/projectname" },
  { directory: "packages/react", name: "@redrixx/projectname-react" },
];

const required = [
  "package.json",
  "README.md",
  "LICENSE",
  "NOTICE",
  "dist/index.js",
  "dist/index.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
];

for (const pkg of packages) {
  const output = execSync("npm pack --dry-run --json --ignore-scripts", {
    cwd: path.join(root, pkg.directory),
    encoding: "utf8",
  });
  const [manifest] = JSON.parse(output);
  const files = new Set(manifest.files.map((file) => file.path));

  for (const expected of required) {
    if (!files.has(expected)) {
      throw new Error(`${pkg.name}: packed tarball is missing ${expected}`);
    }
  }

  const forbidden = [...files].filter(
    (file) =>
      file.startsWith("src/") ||
      file.includes(".test.") ||
      file.includes("type-test") ||
      file.endsWith("tsconfig.json"),
  );
  if (forbidden.length > 0) {
    throw new Error(
      `${pkg.name}: unexpected packed files: ${forbidden.join(", ")}`,
    );
  }

  const packageRoot = path.join(root, pkg.directory);
  const read = (file) => readFileSync(path.join(packageRoot, file), "utf8");
  if (!/Apache License\s+Version 2\.0/.test(read("LICENSE"))) {
    throw new Error(`${pkg.name}: packaged license is not Apache-2.0`);
  }
  if (!read("NOTICE").includes(pkg.name)) {
    throw new Error(
      `${pkg.name}: packaged notice does not identify the package`,
    );
  }
  const readme = read("README.md");
  if (!readme.includes("ESM-only") || !readme.includes(pkg.name)) {
    throw new Error(
      `${pkg.name}: packaged README lacks package identity or ESM support`,
    );
  }
  if (!read("dist/index.d.ts").includes("export")) {
    throw new Error(`${pkg.name}: declaration entry point has no exports`);
  }
  JSON.parse(read("dist/index.js.map"));
  JSON.parse(read("dist/index.d.ts.map"));

  console.log(`${pkg.name}: ${files.size} packed files verified`);
}
