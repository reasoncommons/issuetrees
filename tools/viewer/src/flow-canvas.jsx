import React, { useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// The document/editor owns its DOM and state; React Flow owns the canvas.
function IssueNode({ data }) {
  const host = useRef(null);
  useLayoutEffect(() => {
    host.current.replaceChildren(data.element);
  }, [data.element]);
  return (
    <>
      {!data.root && (
        <Handle type="target" position={Position.Left} isConnectable={false} />
      )}
      <div ref={host} />
      {data.hasChildren && (
        <Handle type="source" position={Position.Right} isConnectable={false} />
      )}
    </>
  );
}
const nodeTypes = { issue: IssueNode };
export function createFlowCanvas(container, callbacks) {
  const root = createRoot(container);
  let instance,
    lastNodes = [],
    pendingViewport;
  function update(layout, elements, selected) {
    lastNodes = layout.nodes.map((n) => ({
      id: n.id,
      type: "issue",
      position: { x: n.x, y: n.y },
      className:
        "react-flow__node-default" + (n.id === "root" ? " inquiry-root" : ""),
      selected: n.id === selected,
      width: n.width,
      height: n.height,
      data: {
        element: elements.get(n.id),
        root: n.id === "root",
        hasChildren: n.children.length > 0,
      },
    }));
    const edges = layout.edges.map(({ from, to }) => ({
      id: from.id + "-" + to.id,
      source: from.id,
      target: to.id,
      type: "default",
    }));
    flushSync(() =>
      root.render(
        <ReactFlow
          nodes={lastNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={() => {}}
          nodesFocusable={false}
          edgesFocusable={false}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          deleteKeyCode={null}
          minZoom={0.2}
          maxZoom={2.5}
          onInit={(value) => {
            instance = value;
            if (pendingViewport) value.setViewport(pendingViewport);
          }}
          onMove={(_, value) => callbacks.onViewport(value)}
          onPaneClick={callbacks.onPaneClick}
          fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        >
          <Background gap={22} size={1} color="#d8dbe2" />
          <Controls showInteractive={false} />
        </ReactFlow>,
      ),
    );
  }
  return {
    update,
    setViewport(value) {
      pendingViewport = value;
      instance?.setViewport(value);
    },
    fit() {
      if (instance)
        requestAnimationFrame(() =>
          instance.fitView({ nodes: lastNodes, padding: 0.16, maxZoom: 1 }),
        );
    },
  };
}
