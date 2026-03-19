import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import { prepareSite } from "./prepare-site";

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");
const tempRoot = path.resolve(projectRoot, ".e2e-temp");

const PORT = 38123;
const CONTAINER_NAME = "sandrone-autoindex-e2e";
const NGINX_IMAGE = "nginx:1.27-alpine";

interface NginxServerConfig {
  port: number;
  containerId: string;
}

async function checkDocker(): Promise<boolean> {
  try {
    await execAsync("docker --version");
    return true;
  } catch {
    return false;
  }
}

async function stopExistingContainer(): Promise<void> {
  try {
    const { stdout } = await execAsync(
      `docker ps -aq -f name=${CONTAINER_NAME}`
    );
    if (stdout.trim()) {
      console.log(`Stopping existing container ${CONTAINER_NAME}...`);
      await execAsync(`docker rm -f ${CONTAINER_NAME}`);
    }
  } catch (error) {
    // Ignore errors if container doesn't exist
  }
}

function replaceConfigPlaceholders(
  templatePath: string,
  outputPath: string,
  replacements: Record<string, string>
): void {
  let content = fs.readFileSync(templatePath, "utf-8");

  for (const [key, value] of Object.entries(replacements)) {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value);
  }

  fs.writeFileSync(outputPath, content);
}

async function startNginxContainer(
  tempRoot: string
): Promise<NginxServerConfig> {
  const siteRoot = path.join(tempRoot, "site");
  const nginxConfigTemplate = path.join(tempRoot, "nginx.conf");
  const nginxConfig = path.join(tempRoot, "nginx-generated.conf");
  const htpasswd = path.join(tempRoot, "htpasswd");
  const autoindexPath = path.join(siteRoot, "_autoindex");

  // Generate nginx config with placeholders replaced
  replaceConfigPlaceholders(nginxConfigTemplate, nginxConfig, {
    PORT: PORT.toString(),
    SITE_ROOT: "/usr/share/nginx/html",
    AUTOINDEX_PATH: "/usr/share/nginx/html/_autoindex",
    HTPASSWD_PATH: "/etc/nginx/htpasswd",
  });

  console.log(`Starting nginx container on port ${PORT}...`);

  // Pull image if needed
  console.log(`Pulling ${NGINX_IMAGE}...`);
  await execAsync(`docker pull ${NGINX_IMAGE}`);

  // Start container
  const dockerCmd = [
    "docker run -d",
    `--name ${CONTAINER_NAME}`,
    `-p ${PORT}:${PORT}`,
    `-v "${siteRoot}:/usr/share/nginx/html"`,
    `-v "${nginxConfig}:/etc/nginx/nginx.conf:ro"`,
    `-v "${htpasswd}:/etc/nginx/htpasswd:ro"`,
    NGINX_IMAGE,
  ].join(" ");

  const { stdout } = await execAsync(dockerCmd);
  const containerId = stdout.trim();

  console.log(`✓ Container started: ${containerId.substring(0, 12)}`);

  return {
    port: PORT,
    containerId,
  };
}

async function waitForNginx(port: number, maxAttempts = 30): Promise<void> {
  console.log("Waiting for nginx to be ready...");

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        method: "GET",
      });

      if (response.ok) {
        const html = await response.text();
        if (html.includes("Index of")) {
          console.log("✓ Nginx is serving autoindex pages");
          break;
        }
      }
    } catch (error) {
      // Server not ready yet
    }

    if (i === maxAttempts - 1) {
      throw new Error("Nginx failed to start within timeout period");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Verify critical endpoints
  console.log("Verifying E2E endpoints...");

  // Check assets
  const assetsResponse = await fetch(
    `http://127.0.0.1:${port}/_autoindex/assets/index.js`
  );
  if (!assetsResponse.ok) {
    throw new Error("Autoindex assets not accessible");
  }
  console.log("✓ Assets endpoint working");

  // Check auth-check endpoint (should return 401 without auth)
  const authCheckResponse = await fetch(
    `http://127.0.0.1:${port}/_autoindex/auth-check`,
    { method: "HEAD" }
  );
  if (authCheckResponse.status !== 401) {
    throw new Error(
      `Auth-check endpoint returned ${authCheckResponse.status}, expected 401`
    );
  }
  console.log("✓ Auth-check endpoint working");

  // Check WebDAV support headers
  const optionsResponse = await fetch(`http://127.0.0.1:${port}/`, {
    method: "OPTIONS",
  });
  const allow = optionsResponse.headers.get("Allow");
  const dav = optionsResponse.headers.get("DAV");

  if (!allow?.includes("PUT")) {
    console.warn(
      "⚠ Warning: PUT not advertised in Allow header, WebDAV UI may not appear"
    );
  } else {
    console.log("✓ WebDAV support detected");
  }

  console.log(`✓ Nginx ready at http://127.0.0.1:${port}/`);
}

export async function serveNginx(): Promise<NginxServerConfig> {
  // Check Docker availability
  const hasDocker = await checkDocker();
  if (!hasDocker) {
    throw new Error(
      "Docker is not available. Docker is required for E2E testing."
    );
  }

  // Stop any existing container
  await stopExistingContainer();

  // Prepare site
  const tempRootPath = prepareSite();

  // Start nginx container
  const config = await startNginxContainer(tempRootPath);

  // Wait for readiness
  await waitForNginx(config.port);

  return config;
}

export async function stopNginx(): Promise<void> {
  console.log("Stopping nginx container...");
  await stopExistingContainer();
  console.log("✓ Container stopped");
}

// Allow running directly - check if this is the main module
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('serve-nginx');

if (isMainModule) {
  serveNginx()
    .then((config) => {
      console.log(
        `\nNginx is running at http://127.0.0.1:${config.port}/`
      );
      console.log(
        `Container ID: ${config.containerId.substring(0, 12)}`
      );
      console.log(`\nPress Ctrl+C to stop`);

      // Keep process alive
      setInterval(() => {}, 1 << 30);

      process.on("SIGINT", async () => {
        console.log("\n\nShutting down...");
        await stopNginx();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        await stopNginx();
        process.exit(0);
      });
    })
    .catch((error) => {
      console.error("Failed to start nginx:", error);
      stopNginx().finally(() => process.exit(1));
    });
}
