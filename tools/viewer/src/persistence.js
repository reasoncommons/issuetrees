export async function saveToHandle(handle, original, content) {
  const current = await (await handle.getFile()).text();
  if (current !== original)
    throw new Error(
      "The file changed outside the viewer. Download your edits or reopen the file before saving.",
    );
  const writer = await handle.createWritable({ mode: "exclusive" });
  try {
    await writer.write(content);
    await writer.close();
  } catch (e) {
    await writer.abort().catch(() => {});
    throw e;
  }
}
export async function saveToServer(target, content) {
  const response = await fetch("/api/document", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Issue-Tree-Token": target.token,
    },
    body: JSON.stringify({ content, version: target.version }),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not save the document.");
  return result;
}
