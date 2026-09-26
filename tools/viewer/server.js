import { createServer } from "node:http";
import {
  readFile,
  writeFile,
  rename,
  unlink,
  stat,
  realpath,
} from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { dirname, basename, join, resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
const hash = (text) => createHash("sha256").update(text).digest("hex");
export async function createFileStore(path) {
  const file = await realpath(path);
  if (!(await stat(file)).isFile()) throw new Error("Open a Markdown file.");
  let queue = Promise.resolve();
  const read = async () => {
    const info = await stat(file);
    if (info.size > 1000000)
      throw new Error("Choose a file smaller than 1 MB.");
    const content = await readFile(file, "utf8");
    return { name: basename(file), content, version: hash(content) };
  };
  return {
    read,
    save(content, version) {
      const task = queue.then(async () => {
        if (typeof content !== "string" || Buffer.byteLength(content) > 1000000)
          throw new Error("Save must contain less than 1 MB of Markdown.");
        const current = await read();
        if (current.version !== version) {
          const error = new Error(
            "The file changed outside the viewer. Download your edits or reopen the file before saving.",
          );
          error.status = 409;
          throw error;
        }
        const temp = join(
          dirname(file),
          "." + basename(file) + "." + randomUUID() + ".tmp",
        );
        try {
          const mode = (await stat(file)).mode;
          await writeFile(temp, content, { mode, flag: "wx" });
          if ((await read()).version !== version) {
            const e = new Error(
              "The file changed while saving. Your edits were not written.",
            );
            e.status = 409;
            throw e;
          }
          await rename(temp, file);
        } finally {
          await unlink(temp).catch(() => {});
        }
        return { name: basename(file), content, version: hash(content) };
      });
      queue = task.catch(() => {});
      return task;
    },
  };
}
export async function startServer({
  file,
  port = 5174,
  dist = join(dirname(fileURLToPath(import.meta.url)), "dist"),
} = {}) {
  const store = file ? await createFileStore(file) : null,
    token = randomUUID(),
    root = resolve(dist);
  const server = createServer(async (req, res) => {
    const address = server.address();
    const host = req.headers.host;
    const origin = `http://${host}`;
    const allowed =
      host === `127.0.0.1:${address.port}` ||
      host === `localhost:${address.port}`;
    const json = (status, body) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(body));
    };
    if (!allowed || (req.headers.origin && req.headers.origin !== origin))
      return json(403, {
        error: "Open this editor on its own localhost address.",
      });
    try {
      const url = new URL(req.url, origin);
      if (url.pathname === "/api/document") {
        if (!store)
          return json(404, {
            error:
              "No file attached. Use Open Markdown or launch Node with a file path.",
          });
        if (req.method === "GET")
          return json(200, { ...(await store.read()), token });
        if (req.method === "PUT") {
          if (
            req.headers["x-issue-tree-token"] !== token ||
            !req.headers["content-type"]?.startsWith("application/json")
          )
            return json(403, { error: "Invalid save request." });
          let raw = "";
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 1100000)
              return json(413, { error: "Document too large." });
          }
          const { content, version } = JSON.parse(raw);
          return json(200, { ...(await store.save(content, version)), token });
        }
        return json(405, { error: "Method not allowed." });
      }
      if (req.method !== "GET" && req.method !== "HEAD")
        return json(405, { error: "Method not allowed." });
      const name =
        decodeURIComponent(url.pathname) === "/"
          ? "index.html"
          : decodeURIComponent(url.pathname).slice(1);
      const path = resolve(root, name);
      if (path !== root && !path.startsWith(root + sep))
        return json(403, { error: "Not available." });
      const data = await readFile(path);
      const types = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".svg": "image/svg+xml",
      };
      res.writeHead(200, {
        "Content-Type": types[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (e) {
      json(e.status || 400, {
        error:
          e.code === "ENOENT"
            ? "Build the viewer first with npm run build."
            : e.message,
      });
    }
  });
  await new Promise((ok, bad) => {
    server.once("error", bad);
    server.listen(port, "127.0.0.1", ok);
  });
  return server;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const server = await startServer({
    file: process.argv[2],
    port: Number(process.env.PORT || 5174),
  });
  console.log(
    `Issue Trees: http://127.0.0.1:${server.address().port}${process.argv[2] ? " — " + basename(process.argv[2]) : ""}`,
  );
}
