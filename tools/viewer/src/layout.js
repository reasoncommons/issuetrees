/** Compact bilateral tree. Labels supply their own measured width and height. */
export function layoutTree(
  root,
  sizes,
  { gapX = 42, gapY = 14, bilateral = true, sides = new Map() } = {},
) {
  const dimensions = (n) => {
    const s = sizes.get(n.id);
    return typeof s === "number"
      ? { width: 240, height: s }
      : s || { width: 160, height: 30 };
  };
  const spans = new Map(),
    nodes = [],
    edges = [];
  function measure(n) {
    const child =
      (n.children || []).reduce((sum, c) => sum + measure(c), 0) +
      Math.max(0, n.children.length - 1) * gapY;
    const span = Math.max(dimensions(n).height, child);
    spans.set(n.id, span);
    return span;
  }
  measure(root);
  const rs = dimensions(root),
    center = {
      ...root,
      x: -rs.width / 2,
      y: -rs.height / 2,
      ...rs,
      side: 0,
      branch: 0,
      depth: 0,
    };
  nodes.push(center);
  const groups = [[], []];
  let totals = [0, 0];
  root.children.forEach((n, i) => {
    const g = sides.has(n.id)
      ? sides.get(n.id)
      : bilateral && totals[0] > totals[1]
        ? 1
        : 0;
    sides.set(n.id, g);
    groups[g].push({ n, branch: i });
    totals[g] += spans.get(n.id) + gapY;
  });
  function place(n, parent, side, top, branch, depth) {
    const size = dimensions(n);
    const p = {
      ...n,
      ...size,
      x:
        side === 1
          ? parent.x + parent.width + gapX
          : parent.x - gapX - size.width,
      y: top + (spans.get(n.id) - size.height) / 2,
      side,
      branch,
      depth,
    };
    nodes.push(p);
    edges.push({ from: parent, to: p });
    const ch =
      n.children.reduce((s, c) => s + spans.get(c.id), 0) +
      Math.max(0, n.children.length - 1) * gapY;
    let cursor = top + (spans.get(n.id) - ch) / 2;
    n.children.forEach((c) => {
      place(c, p, side, cursor, branch, depth + 1);
      cursor += spans.get(c.id) + gapY;
    });
  }
  groups.forEach((group, g) => {
    let cursor = -(totals[g] - gapY) / 2;
    group.forEach(({ n, branch }) => {
      place(n, center, g === 0 ? 1 : -1, cursor, branch, 1);
      cursor += spans.get(n.id) + gapY;
    });
  });
  const minX = Math.min(...nodes.map((n) => n.x)),
    minY = Math.min(...nodes.map((n) => n.y)),
    maxX = Math.max(...nodes.map((n) => n.x + n.width)),
    maxY = Math.max(...nodes.map((n) => n.y + n.height));
  return { nodes, edges, minX, minY, width: maxX - minX, height: maxY - minY };
}
