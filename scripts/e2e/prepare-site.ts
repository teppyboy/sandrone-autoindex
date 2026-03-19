import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const tempRoot = path.resolve(projectRoot, ".e2e-temp");

export function prepareSite(): string {
  console.log("Preparing E2E test site...");

  // Remove existing temp directory
  if (fs.existsSync(tempRoot)) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }

  // Create temp root structure
  fs.mkdirSync(tempRoot, { recursive: true });
  const siteRoot = path.join(tempRoot, "site");
  const autoindexDest = path.join(siteRoot, "_autoindex");

  fs.mkdirSync(siteRoot, { recursive: true });
  fs.mkdirSync(autoindexDest, { recursive: true });

  // Copy fixture site content
  const fixtureSource = path.join(projectRoot, "tests/e2e/fixtures/site-root");
  copyDir(fixtureSource, siteRoot);

  // Copy built autoindex assets
  const distSource = path.join(projectRoot, "dist");
  if (!fs.existsSync(distSource)) {
    throw new Error(
      "dist/ directory not found. Run 'bun run build' before E2E tests."
    );
  }

  copyDir(distSource, autoindexDest);

  // Copy nginx config and htpasswd
  const nginxConfigTemplate = path.join(
    projectRoot,
    "tests/e2e/fixtures/nginx.conf.template"
  );
  const nginxConfigDest = path.join(tempRoot, "nginx.conf");
  const htpasswdSource = path.join(projectRoot, "tests/e2e/fixtures/htpasswd");
  const htpasswdDest = path.join(tempRoot, "htpasswd");

  fs.copyFileSync(nginxConfigTemplate, nginxConfigDest);
  fs.copyFileSync(htpasswdSource, htpasswdDest);

  console.log(`✓ Site prepared at ${tempRoot}`);

  return tempRoot;
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source directory not found: ${src}`);
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    prepareSite();
  } catch (error) {
    console.error("Failed to prepare site:", error);
    process.exit(1);
  }
}
