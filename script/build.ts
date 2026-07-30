import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, writeFile } from "node:fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server (dev/local)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("bundling Vercel serverless function (api/index.js)...");
  await esbuild({
    entryPoints: ["src/serverless-entry.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: "api/index.js",
    // Node laadt api/index.js als ESM (package.json type=module). Behoud default export.
    banner: {
      js: [
        "import { createRequire } from 'node:module';",
        "import { fileURLToPath } from 'node:url';",
        "import { dirname as __esm_dirname } from 'node:path';",
        "const require = createRequire(import.meta.url);",
        "const __filename = fileURLToPath(import.meta.url);",
        "const __dirname = __esm_dirname(__filename);",
      ].join("\n"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Vercel installeert alle dependencies uit package.json, dus we mogen
    // node_modules-imports als externals houden. shared/ en server/ bundelen
    // we WEL in de output.
    external: [
      "@libsql/client",
      "@anthropic-ai/sdk",
      "express",
      "resend",
      "drizzle-orm",
      "drizzle-zod",
      "nanoid",
      "zod",
      "zod-validation-error",
    ],
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
