"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash,
  PencilSimple,
  Users,
  MapPin,
  Diamond,
} from "@phosphor-icons/react";
import type {
  Book,
  Chapter,
  Character,
  Place,
  Item,
  CustomEntity,
  CustomEntityType,
  CustomEntityAttribute,
} from "@/src/lib/api/generated";
import CharacterHistory from "./CharacterHistory";
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
import { touchSection } from "@/src/lib/sectionRecency";

type Kind = "characters" | "places" | "items" | "custom-entities";
type Entity = Character & Place & Item & CustomEntity;
interface Selection {
  kind: Kind;
  entity?: Entity;
  type?: CustomEntityType;
}
export interface ChapterChoice extends Chapter {
  bookName: string;
}
interface WorldData {
  characters: Character[];
  places: Place[];
  items: Item[];
  custom: CustomEntity[];
  types: CustomEntityType[];
  books: Book[];
  chapters: ChapterChoice[];
}

async function loadWorld(worldId: string): Promise<WorldData> {
  const base = `/api/worlds/${worldId}`;
  const [characters, places, items, custom, types, books] = await Promise.all([
    read<Character[]>(`${base}/characters`),
    read<Place[]>(`${base}/places`),
    read<Item[]>(`${base}/items`),
    read<CustomEntity[]>(`${base}/custom-entities`),
    read<CustomEntityType[]>(`${base}/custom-entity-types`),
    read<Book[]>(`${base}/books`),
  ]);
  const chapters = (
    await Promise.all(
      books.map(async (book) =>
        (await read<Chapter[]>(`/api/books/${book.id}/chapters`)).map(
          (chapter) => ({ ...chapter, bookName: book.name ?? "Book" }),
        ),
      ),
    )
  ).flat();
  return { characters, places, items, custom, types, books, chapters };
}

export default function WorldEntities({
  worldId,
  bookId,
}: {
  worldId: string;
  bookId?: string;
}) {
  const cache = useQueryClient();
  const data = useQuery({
    queryKey: ["world-entities", worldId],
    queryFn: () => loadWorld(worldId),
  });
  const [selected, setSelected] = useState<Selection>();
  const [deleting, setDeleting] = useState<Selection>();
  const [typeEdit, setTypeEdit] = useState<{ id?: string; name: string }>();
  const [typeDelete, setTypeDelete] = useState<CustomEntityType>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: ["world-entities", worldId] });
    await cache.invalidateQueries({ queryKey: ["relationships", worldId] });
  };
  if (data.isPending) return <Notice>Loading world details...</Notice>;
  if (data.error)
    return <Notice error={data.error} retry={() => void data.refetch()} />;
  const sections: {
    kind: Kind;
    name: string;
    rows: Entity[];
    type?: CustomEntityType;
  }[] = [
    {
      kind: "characters",
      name: "Characters",
      rows: data.data.characters as Entity[],
    },
    { kind: "places", name: "Places", rows: data.data.places as Entity[] },
    { kind: "items", name: "Items", rows: data.data.items as Entity[] },
    ...data.data.types.map((type) => ({
      kind: "custom-entities" as const,
      name: type.name ?? "Custom section",
      rows: data.data.custom.filter(
        (entity) => entity.entityTypeId === type.id,
      ) as Entity[],
      type,
    })),
  ];
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">
          World details
        </h2>
        <button
          className={button}
          disabled={data.data.types.length >= 10}
          onClick={() => {
            setError("");
            setTypeEdit({ name: "" });
          }}
        >
          <Plus />
          Custom section ({data.data.types.length}/10)
        </button>
      </div>
      <div className="ws-entity-grid">
        {sections.map((section) => (
          <section
            key={section.type?.id ?? section.kind}
            className="ws-entity-section"
          >
            <div className="mb-5 flex items-center gap-3">
              {section.kind === "characters" ? (
                <Users size={19} />
              ) : section.kind === "places" ? (
                <MapPin size={19} />
              ) : (
                <Diamond size={19} />
              )}
              <h3 className="min-w-0 flex-1 break-words text-lg">
                {section.name}
              </h3>
              {section.type && (
                <>
                  <button
                    className={button}
                    aria-label={`Rename ${section.name}`}
                    onClick={() => {
                      setError("");
                      setTypeEdit({ id: section.type!.id, name: section.name });
                    }}
                  >
                    <PencilSimple size={14} />
                  </button>
                  <button
                    className={button}
                    aria-label={`Delete ${section.name} section`}
                    onClick={() => setTypeDelete(section.type)}
                  >
                    <Trash size={14} />
                  </button>
                </>
              )}
              <button
                className={button}
                aria-label={`New ${section.name} entry`}
                onClick={() =>
                  setSelected({ kind: section.kind, type: section.type })
                }
              >
                <Plus size={16} />
                New
              </button>
            </div>
            {section.rows.length === 0 && (
              <p className="py-5 text-sm text-foreground-muted">
                Nothing here yet.
              </p>
            )}
            <ul className="space-y-1">
              {section.rows.map((entity) => (
                <li
                  key={entity.entityId}
                  className="flex items-center gap-2 border-b border-border/60 py-2"
                >
                  <button
                    className="min-w-0 flex-1 py-2 text-left hover:text-accent"
                    onClick={() => {
                      touchSection(
                        worldId,
                        section.type
                          ? `custom:${section.type.id}`
                          : section.kind,
                      );
                      setSelected({
                        kind: section.kind,
                        entity,
                        type: section.type,
                      });
                    }}
                  >
                    <span className="block truncate">{entity.name}</span>
                    {section.kind === "places" && entity.lastChapterId && (
                      <span className="text-xs text-foreground-muted">
                        {data.data.chapters
                          .filter((c) => c.id === entity.lastChapterId)
                          .map((c) => `${c.bookName}: ${c.name}`)
                          .join("")}
                      </span>
                    )}
                  </button>
                  <button
                    className={button}
                    aria-label={`Delete ${entity.name}`}
                    onClick={() => setDeleting({ kind: section.kind, entity })}
                  >
                    <Trash size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {selected && (
        <EntityForm
          selection={selected}
          worldId={worldId}
          bookId={bookId}
          data={data.data}
          onClose={() => setSelected(undefined)}
          onSaved={refresh}
        />
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting.entity?.name}?`}
          detail={
            deleting.kind === "characters"
              ? "This permanently deletes the character, their timelines, and their relationships. Items they wield will have no wielder."
              : "This permanently deletes the entry and its relationships. This cannot be undone."
          }
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await write(
              `/api/${deleting.kind}/${deleting.entity?.entityId}`,
              "DELETE",
            );
            await refresh();
          }}
        />
      )}
      {typeDelete && (
        <Confirm
          title={`Delete ${typeDelete.name}?`}
          detail="This permanently deletes this custom section and all of its entries."
          onClose={() => setTypeDelete(undefined)}
          onConfirm={async () => {
            await write(`/api/custom-entity-types/${typeDelete.id}`, "DELETE");
            await refresh();
          }}
        />
      )}
      {typeEdit && (
        <Dialog
          title={
            typeEdit.id ? "Rename custom section" : "Create custom section"
          }
          onClose={() => setTypeEdit(undefined)}
          busy={busy}
        >
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await write(
                  typeEdit.id
                    ? `/api/custom-entity-types/${typeEdit.id}`
                    : `/api/worlds/${worldId}/custom-entity-types`,
                  typeEdit.id ? "PATCH" : "POST",
                  { name: typeEdit.name.trim() },
                );
                await refresh();
                setTypeEdit(undefined);
              } catch (err) {
                setError(message(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Section name">
              <input
                className={field}
                autoFocus
                required
                value={typeEdit.name}
                onChange={(e) =>
                  setTypeEdit({ ...typeEdit, name: e.target.value })
                }
              />
            </Field>
            {error && <p role="alert">{error}</p>}
            <button
              className={`${button} ws-primary`}
              disabled={busy || !typeEdit.name.trim()}
            >
              Save section
            </button>
          </form>
        </Dialog>
      )}
    </section>
  );
}

function EntityForm({
  selection,
  worldId,
  bookId,
  data,
  onClose,
  onSaved,
}: {
  selection: Selection;
  worldId: string;
  bookId?: string;
  data: WorldData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { kind, entity, type } = selection;
  const [values, setValues] = useState<Record<string, unknown>>({
    ...entity,
    name: entity?.name ?? "",
    ...(kind === "characters" ? { status: entity?.status ?? "alive" } : {}),
  });
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    entity?.attributes ?? {},
  );
  const [wielderMode, setWielderMode] = useState(
    entity?.manualWielderName ? "manual" : "character",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const definitions = useQuery({
    queryKey: ["attributes", type?.id],
    queryFn: () =>
      read<CustomEntityAttribute[]>(
        `/api/custom-entity-types/${type!.id}/attributes`,
      ),
    enabled: !!type?.id,
  });
  const set = (key: string, value: unknown) =>
    setValues((previous) => ({ ...previous, [key]: value }));
  const textInput = (
    key: string,
    label: string,
    multiline = false,
    presets?: string[],
  ) => (
    <Field label={label} key={key}>
      {multiline ? (
        <textarea
          className={field}
          rows={3}
          value={String(values[key] ?? "")}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <>
          <input
            className={field}
            list={presets ? `presets-${key}` : undefined}
            value={String(values[key] ?? "")}
            onChange={(e) => set(key, e.target.value)}
          />
          {presets && (
            <datalist id={`presets-${key}`}>
              {presets.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          )}
        </>
      )}
    </Field>
  );
  return (
    <Dialog
      side
      title={
        entity
          ? (entity.name ?? "Edit entry")
          : `New ${type?.name ?? kind.replace(/s$/, "")}`
      }
      busy={busy}
      onClose={onClose}
    >
      <form
        className="space-y-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const payload: Record<string, unknown> = {
            name: String(values.name).trim(),
          };
          if (kind === "characters")
            for (const key of [
              "age",
              "health",
              "distinctions",
              "traits",
              "mutations",
              "status",
              "notes",
            ])
              payload[key] =
                values[key] === "" || values[key] === undefined
                  ? null
                  : values[key];
          if (kind === "places") {
            payload.status = values.status ?? null;
            payload.lastChapterId = values.lastChapterId || null;
          }
          if (kind === "items") {
            payload.status = values.status ?? null;
            payload.power = values.power ?? null;
            payload.wielderEntityId =
              wielderMode === "character"
                ? values.wielderEntityId || null
                : null;
            payload.manualWielderName =
              wielderMode === "manual"
                ? values.manualWielderName || null
                : null;
          }
          if (kind === "custom-entities") {
            payload.attributes = {
              ...Object.fromEntries(
                (definitions.data ?? [])
                  .filter((attribute) => attribute.fieldType === "boolean")
                  .map((attribute) => [attribute.id!, false]),
              ),
              ...attributes,
            };
            payload.entityTypeId = type?.id;
          }
          try {
            await write(
              entity
                ? `/api/${kind}/${entity.entityId}`
                : `/api/worlds/${worldId}/${kind}`,
              entity ? "PATCH" : "POST",
              payload,
            );
            await onSaved();
            onClose();
          } catch (err) {
            setError(message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Name">
          <input
            className={field}
            autoFocus
            required
            value={String(values.name ?? "")}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        {kind === "characters" && (
          <>
            <Field label="Age">
              <input
                className={field}
                type="number"
                min={0}
                step={1}
                value={String(values.age ?? "")}
                onChange={(e) =>
                  set(
                    "age",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </Field>
            {textInput("health", "Health")}
            {textInput("distinctions", "Distinctions", true)}
            {textInput("traits", "Traits", true)}
            {textInput("mutations", "Mutations", true)}
            <Field label="Status">
              <select
                className={field}
                value={String(values.status)}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="alive">Alive</option>
                <option value="dead">Dead</option>
              </select>
            </Field>
            {textInput("notes", "Notes", true)}
          </>
        )}
        {kind === "places" && (
          <>
            {textInput("status", "Status", false, [
              "Booming",
              "Abandoned",
              "Burned down",
            ])}
            <Field label="Last chapter occurrence">
              <select
                className={field}
                value={String(values.lastChapterId ?? "")}
                onChange={(e) => set("lastChapterId", e.target.value)}
              >
                <option value="">None</option>
                {data.chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.bookName}: {chapter.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {kind === "items" && (
          <>
            {textInput("status", "Status", false, [
              "Functional",
              "Non functional",
            ])}
            {textInput("power", "Power", true)}
            <Field label="Wielder">
              <select
                className={field}
                value={wielderMode}
                onChange={(e) => setWielderMode(e.target.value)}
              >
                <option value="character">World character</option>
                <option value="manual">Someone else</option>
              </select>
            </Field>
            {wielderMode === "character" ? (
              <Field label="Character">
                <select
                  className={field}
                  value={String(values.wielderEntityId ?? "")}
                  onChange={(e) => set("wielderEntityId", e.target.value)}
                >
                  <option value="">No wielder</option>
                  {data.characters.map((character) => (
                    <option key={character.entityId} value={character.entityId}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              textInput("manualWielderName", "Wielder name")
            )}
          </>
        )}
        {type && (
          <>
            {definitions.isPending ? (
              <p role="status">Loading fields...</p>
            ) : definitions.error ? (
              <p role="alert">
                {message(definitions.error)}{" "}
                <button
                  type="button"
                  onClick={() => void definitions.refetch()}
                >
                  Retry
                </button>
              </p>
            ) : (
              definitions.data.map((attribute) => (
                <AttributeInput
                  key={attribute.id}
                  attribute={attribute}
                  value={attributes[attribute.id!]}
                  onChange={(value) =>
                    setAttributes((previous) => ({
                      ...previous,
                      [attribute.id!]: value,
                    }))
                  }
                />
              ))
            )}
          </>
        )}
        {error && (
          <p role="alert" className="calm-notice p-3 text-sm">
            {error}
          </p>
        )}
        <button
          className={`${button} ws-primary w-full`}
          disabled={
            busy || !String(values.name).trim() || (!!type && !definitions.data)
          }
        >
          {busy ? "Saving..." : "Save entry"}
        </button>
      </form>
      {type && <AttributeCreator typeId={type.id!} />}
      {kind === "characters" && entity?.entityId && (
        <CharacterHistory
          entityId={entity.entityId}
          books={data.books}
          chapters={data.chapters}
          initialBookId={bookId}
        />
      )}
    </Dialog>
  );
}

function AttributeInput({
  attribute,
  value,
  onChange,
}: {
  attribute: CustomEntityAttribute;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const common = { className: field, required: attribute.required };
  if (attribute.fieldType === "boolean")
    return (
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {attribute.name}
      </label>
    );
  if (attribute.fieldType === "select" || attribute.fieldType === "multiselect")
    return (
      <Field label={attribute.name ?? "Field"}>
        <select
          {...common}
          multiple={attribute.fieldType === "multiselect"}
          value={
            attribute.fieldType === "multiselect"
              ? Array.isArray(value)
                ? (value as string[])
                : []
              : String(value ?? "")
          }
          onChange={(e) =>
            onChange(
              attribute.fieldType === "multiselect"
                ? Array.from(e.target.selectedOptions, (option) => option.value)
                : e.target.value,
            )
          }
        >
          {attribute.fieldType === "select" && (
            <option value="">Choose...</option>
          )}
          {attribute.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </Field>
    );
  return (
    <Field
      label={`${attribute.name}${attribute.required ? " (required)" : ""}`}
    >
      <input
        {...common}
        type={
          attribute.fieldType === "number"
            ? "number"
            : attribute.fieldType === "date"
              ? "date"
              : "text"
        }
        step="any"
        value={String(value ?? "")}
        onChange={(e) =>
          onChange(
            attribute.fieldType === "number" && e.target.value !== ""
              ? Number(e.target.value)
              : e.target.value,
          )
        }
      />
    </Field>
  );
}

function AttributeCreator({ typeId }: { typeId: string }) {
  const cache = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("text");
  const [options, setOptions] = useState("");
  const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <details className="mt-8 border-t border-border pt-5">
      <summary className="cursor-pointer text-sm">
        Add a field to this section
      </summary>
      <form
        className="mt-5 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await write(
              `/api/custom-entity-types/${typeId}/attributes`,
              "POST",
              {
                name: name.trim(),
                fieldType: kind,
                required,
                options: ["select", "multiselect"].includes(kind)
                  ? options
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : null,
              },
            );
            await cache.invalidateQueries({ queryKey: ["attributes", typeId] });
            setName("");
            setOptions("");
          } catch (err) {
            setError(message(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Field name">
          <input
            className={field}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Type">
          <select
            className={field}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {["text", "number", "boolean", "date", "select", "multiselect"].map(
              (value) => (
                <option key={value}>{value}</option>
              ),
            )}
          </select>
        </Field>
        {["select", "multiselect"].includes(kind) && (
          <Field label="Options, separated by commas">
            <input
              className={field}
              required
              value={options}
              onChange={(e) => setOptions(e.target.value)}
            />
          </Field>
        )}
        <label className="flex gap-3 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
          />
          Required
        </label>
        {error && <p role="alert">{error}</p>}
        <button className={button} disabled={busy}>
          Add field
        </button>
      </form>
    </details>
  );
}
