"use client";

import { useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Character, Relationship } from "@/src/lib/api/generated";
import {
  button,
  Confirm,
  Dialog,
  field,
  Field,
  message,
  Notice,
  read,
  write,
} from "./shared";

export default function Relationships({ worldId }: { worldId: string }) {
  const cache = useQueryClient();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [editing, setEditing] = useState<Relationship>();
  const [removing, setRemoving] = useState<{
    nodeId?: string;
    relationship?: Relationship;
  }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["relationships", worldId],
    queryFn: async () => {
      const [characters, relationships] = await Promise.all([
        read<Character[]>(`/api/worlds/${worldId}/characters`),
        read<Relationship[]>(`/api/worlds/${worldId}/relationships`),
      ]);
      return { characters, relationships };
    },
  });
  useEffect(() => {
    if (!query.data) return;
    const { characters, relationships } = query.data;
    setNodes((previous) => {
      // A character deleted in the World section takes their nodes with them.
      const alive = new Set(
        characters.map((character) => character.entityId).filter(Boolean),
      );
      const kept = previous.filter((node) => alive.has(node.id));
      const wanted = new Set([
        ...kept.map((node) => node.id),
        ...relationships.flatMap((edge) => [edge.entityAId!, edge.entityBId!]),
      ]);
      return characters
        .filter(
          (character) => character.entityId && wanted.has(character.entityId),
        )
        .map((character, index) => ({
          id: character.entityId!,
          position: previous.find((node) => node.id === character.entityId)
            ?.position ?? {
            x: 100 + (index % 3) * 230,
            y: 80 + Math.floor(index / 3) * 150,
          },
          data: { label: character.name },
          style: { background: "var(--background-card)", color: "var(--foreground)", border: "1px solid var(--border-strong)" },
        }));
    });
  }, [query.data, setNodes]);
  if (query.isPending) return <Notice>Loading relationships...</Notice>;
  if (query.error)
    return <Notice error={query.error} retry={() => void query.refetch()} />;
  const edges: Edge[] = query.data.relationships.map((edge) => ({
    id: edge.id!,
    source: edge.entityAId!,
    target: edge.entityBId!,
    label: `${edge.relationshipType} (${edge.sentiment ?? 50})`,
    style: { stroke: "#2dd4bf", strokeWidth: 2 },
    labelStyle: { fill: "#e8f4f1" },
    labelBgStyle: { fill: "#08141f" },
  }));
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ["relationships", worldId] });
  return (
    <section className="ws-graph-layout">
      <div className="ws-graph">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          colorMode="dark"
          fitView
          style={{ background: "var(--background)" }}
          deleteKeyCode={null}
          onConnect={(connection) => {
            if (connection.source !== connection.target) {
              setError("");
              setEditing({
                entityAId: connection.source,
                entityBId: connection.target,
                sentiment: 50,
                relationshipType: "Friend",
              });
            }
          }}
          onEdgeClick={(_, edge) => {
            setError("");
            setEditing(
              query.data.relationships.find((item) => item.id === edge.id),
            );
          }}
          onNodeClick={(_, node) => setRemoving({ nodeId: node.id })}
        >
          <Background color="#243d46" gap={32} />
          <Controls />
        </ReactFlow>
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-x-6 top-10 text-center">
            <h2 className="font-serif text-2xl">Every story is connected</h2>
            <p className="mt-3 text-sm text-foreground-muted">
              Choose characters, then draw between their connection points.
            </p>
          </div>
        )}
      </div>
      <aside className="ws-graph-characters">
        <h2 className="mb-4 text-lg">Characters</h2>
        {query.data.characters.length === 0 && (
          <p className="text-sm text-foreground-muted">
            Add characters in World to begin.
          </p>
        )}
        <ul className="space-y-2">
          {query.data.characters.map((character) => (
            <li key={character.entityId}>
              <button
                className={`${button} w-full justify-start`}
                disabled={nodes.some((node) => node.id === character.entityId)}
                onClick={() =>
                  setNodes((previous) => [
                    ...previous,
                    {
                      id: character.entityId!,
                      position: {
                        x: 100 + (previous.length % 3) * 230,
                        y: 80 + Math.floor(previous.length / 3) * 150,
                      },
                      data: { label: character.name },
                      style: { background: "var(--background-card)", color: "var(--foreground)", border: "1px solid var(--border-strong)" },
                    },
                  ])
                }
              >
                {character.name}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {editing && (
        <Dialog
          title="Relationship"
          onClose={() => setEditing(undefined)}
          busy={busy}
        >
          <p className="mb-5 text-sm text-foreground-muted">
            {
              query.data.characters.find(
                (c) => c.entityId === editing.entityAId,
              )?.name
            }{" "}
            /{" "}
            {
              query.data.characters.find(
                (c) => c.entityId === editing.entityBId,
              )?.name
            }
          </p>
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await write(
                  editing.id
                    ? `/api/relationships/${editing.id}`
                    : `/api/worlds/${worldId}/relationships`,
                  editing.id ? "PATCH" : "POST",
                  editing,
                );
                await refresh();
                setEditing(undefined);
              } catch (err) {
                setError(message(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Relationship type">
              <input
                className={field}
                required
                list="relationship-types"
                value={editing.relationshipType ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, relationshipType: e.target.value })
                }
              />
              <datalist id="relationship-types">
                {["Partner", "Friend", "Teammate", "Family"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </datalist>
            </Field>
            <Field label={`Sentiment: ${editing.sentiment ?? 50}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={editing.sentiment ?? 50}
                onChange={(e) =>
                  setEditing({ ...editing, sentiment: Number(e.target.value) })
                }
              />
              <span className="flex justify-between text-xs">
                <span>Hate (0)</span>
                <span>Love (100)</span>
              </span>
            </Field>
            {error && <p role="alert">{error}</p>}
            <div className="flex justify-between gap-3">
              {editing.id && (
                <button
                  type="button"
                  className={button}
                  onClick={() => {
                    setRemoving({ relationship: editing });
                    setEditing(undefined);
                  }}
                >
                  Delete relationship
                </button>
              )}
              <button
                className={`${button} ws-primary`}
                disabled={busy || !editing.relationshipType?.trim()}
              >
                Save relationship
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {removing && (
        <Confirm
          title={removing.nodeId ? "Remove this node?" : "Delete relationship?"}
          detail={
            removing.nodeId
              ? "This removes the node and its connections from the graph. The character stays in your world."
              : "This permanently deletes this connection."
          }
          onClose={() => setRemoving(undefined)}
          onConfirm={async () => {
            const affected = removing.relationship
              ? [removing.relationship]
              : query.data.relationships.filter(
                  (edge) =>
                    edge.entityAId === removing.nodeId ||
                    edge.entityBId === removing.nodeId,
                );
            try {
              for (const edge of affected)
                await write(`/api/relationships/${edge.id}`, "DELETE");
              if (removing.nodeId)
                setNodes((previous) =>
                  previous.filter((node) => node.id !== removing.nodeId),
                );
            } finally {
              await refresh();
            }
          }}
        />
      )}
    </section>
  );
}
