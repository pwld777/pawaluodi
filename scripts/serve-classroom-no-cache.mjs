import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { networkInterfaces } from "node:os";

const root = resolve(".");
const port = Number(process.argv[2] ?? 4188);
const classroomQuery = "?classroom=qq-safe-25";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".webp": "image/webp"
};

function safePath(url) {
  const pathname = decodeURIComponent(new URL(url, `http://localhost:${port}`).pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const fullPath = resolve(join(root, normalize(relativePath)));

  if (fullPath !== root && !fullPath.startsWith(`${root}${sep}`)) {
    return null;
  }

  return fullPath;
}

function classroomUrls() {
  const urls = [];
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const item of interfaces ?? []) {
      if (item.family !== "IPv4" || item.internal) {
        continue;
      }
      urls.push(`http://${item.address}:${port}/${classroomQuery}`);
    }
  }
  return urls;
}

function setNoCacheHeaders(response) {
  response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
}

const server = createServer((request, response) => {
  const filePath = safePath(request.url ?? "/");
  setNoCacheHeaders(response);

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath).pipe(response);
});

server.listen(port, "::", () => {
  console.log(`No-cache classroom server running on port ${port}`);
  for (const url of classroomUrls()) {
    console.log(`- ${url}`);
  }
});
