import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStore } from "../server.js";
test("explicit file saves work and refuse stale content", async () => {
  const dir = await mkdtemp(join(tmpdir(), "issue-tree-test-"));
  try {
    const file = join(dir, "test.md");
    await writeFile(file, "# Test\n- Question?\n");
    const store = await createFileStore(file);
    const opened = await store.read();
    const saved = await store.save("# Test\n- Changed?\n", opened.version);
    assert.equal(await readFile(file, "utf8"), "# Test\n- Changed?\n");
    await writeFile(file, "External change");
    await assert.rejects(store.save("Overwrite", saved.version), /changed/);
    assert.equal(await readFile(file, "utf8"), "External change");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

import { saveToHandle } from "../src/persistence.js";
test("browser file adapter checks original before requesting a writer", async () => {
  let requested = false;
  const handle = {
    getFile: async () => ({ text: async () => "external" }),
    createWritable: async () => {
      requested = true;
    },
  };
  await assert.rejects(saveToHandle(handle, "original", "edited"), /changed/);
  assert.equal(requested, false);
});

import { startServer } from "../server.js";
test("HTTP editor serves only its attached file and checks origins and save tokens", async () => {
  const dir = await mkdtemp(join(tmpdir(), "issue-tree-http-"));
  let server;
  try {
    const path = join(dir, "tree.md");
    await writeFile(path, "- Test?\n");
    server = await startServer({ file: path, port: 0, dist: dir });
    const url = `http://127.0.0.1:${server.address().port}`;
    const initial = await (await fetch(url + "/api/document")).json();
    assert.equal(initial.content, "- Test?\n");
    const rejected = await fetch(url + "/api/document", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "- Bad?", version: initial.version }),
    });
    assert.equal(rejected.status, 403);
    const foreign = await fetch(url + "/api/document", {
      headers: { Origin: "https://example.com" },
    });
    assert.equal(foreign.status, 403);
    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Issue-Tree-Token": initial.token,
      },
      body: JSON.stringify({ content: "- Saved?\n", version: initial.version }),
    };
    const responses = await Promise.all([
      fetch(url + "/api/document", options),
      fetch(url + "/api/document", options),
    ]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
    assert.equal(await readFile(path, "utf8"), "- Saved?\n");
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await rm(dir, { recursive: true, force: true });
  }
});
