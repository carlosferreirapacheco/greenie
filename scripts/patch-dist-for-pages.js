// Cloudflare Pages workaround: `wrangler pages deploy` silently skips
// any `node_modules` directory in the upload, but Expo's web export
// emits font/image assets under dist/assets/node_modules/... (their
// original package paths). Without this patch the deploy drops every
// font file and the live app falls back to system fonts.
//
// Fix: rename dist/assets/node_modules -> dist/assets/vendor and
// rewrite the references inside the exported JS bundles to match.
// Run after `expo export --platform web`, before `wrangler pages deploy`.

const fs = require("fs");
const path = require("path");

const dist = path.join(__dirname, "..", "dist");
const from = path.join(dist, "assets", "node_modules");
const to = path.join(dist, "assets", "vendor");

if (!fs.existsSync(from)) {
  console.log("patch-dist-for-pages: nothing to do (no dist/assets/node_modules)");
  process.exit(0);
}

fs.renameSync(from, to);

const jsDir = path.join(dist, "_expo", "static", "js", "web");
let patchedFiles = 0;
for (const file of fs.readdirSync(jsDir)) {
  const filePath = path.join(jsDir, file);
  const source = fs.readFileSync(filePath, "utf8");
  const patched = source.split("assets/node_modules/").join("assets/vendor/");
  if (patched !== source) {
    fs.writeFileSync(filePath, patched);
    patchedFiles++;
  }
}

console.log(`patch-dist-for-pages: renamed assets/node_modules -> assets/vendor, rewrote ${patchedFiles} bundle(s)`);
