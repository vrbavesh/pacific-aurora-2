"use client";

import { motion, useReducedMotion } from "motion/react";
import { CaretRight, Plus } from "@phosphor-icons/react";
import { selectVisibleSections } from "@/src/lib/sectionRecency";
import type {
  Character,
  CustomEntity,
  CustomEntityType,
  Item,
  Place,
  World,
} from "@/src/lib/api/generated";

export interface WorldDetails {
  characters: Character[];
  places: Place[];
  items: Item[];
  types: CustomEntityType[];
  customEntities: CustomEntity[];
}

interface WorldSectionsProps {
  status: "loading" | "ready" | "error";
  errorMessage: string;
  worldsCount: number;
  anchorWorld: World | null;
  details: WorldDetails | null;
  onRetry: () => void;
  onCreateWorld: () => void;
  onCreateCustomSection: () => void;
  onOpenEntity: (sectionKey: string) => void;
}

interface SectionModel {
  key: string;
  label: string;
  updatedAt?: string;
  entities: { id: string; name: string }[];
}

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5";

function newest(values: Array<string | null | undefined>): string | undefined {
  return values
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

function Skeleton() {
  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8" aria-hidden="true">
      <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-3 h-9 w-64 animate-pulse rounded bg-white/[0.05]" />
      <div className={`mt-7 ${GRID}`}>
        {[0, 1, 2, 3].map((cell) => (
          <div
            key={cell}
            className="min-h-[240px] animate-pulse border border-white/10 bg-white/[0.03]"
          />
        ))}
      </div>
    </div>
  );
}

export default function WorldSections({
  status,
  errorMessage,
  worldsCount,
  anchorWorld,
  details,
  onRetry,
  onCreateWorld,
  onCreateCustomSection,
  onOpenEntity,
}: WorldSectionsProps) {
  const reduce = useReducedMotion();

  if (status === "loading") return <Skeleton />;

  if (status === "error") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
        <div className="calm-notice w-full max-w-md p-6 text-center">
          <p className="text-sm leading-6 text-white/90">{errorMessage}</p>
          <button type="button" onClick={onRetry} className="btn btn-secondary mt-5 rounded-none">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // No worlds yet: the serene empty state, never an error.
  if (worldsCount === 0) {
    return (
      <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center"
        >
          <div className="h-64 w-[70%] max-w-2xl bg-[#2dd4bf]/[0.07] blur-3xl" />
        </div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-[16ch] text-balance font-serif text-4xl leading-[1.15] text-white/85 sm:text-5xl"
        >
          THE SCRATCHPAD IS EMPTY, LETS CREATE SOMETHING ON IT!
        </motion.h1>
        <motion.button
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.6,
            delay: reduce ? 0 : 0.15,
            ease: [0.16, 1, 0.3, 1],
          }}
          type="button"
          onClick={onCreateWorld}
          className="btn btn-primary shadow-glow relative mt-8 rounded-none"
        >
          Create a new world
        </motion.button>
      </div>
    );
  }

  if (!anchorWorld || !details) return <Skeleton />;

  // Section pool: the three fixed sections, then custom sections by position.
  const pool: SectionModel[] = [
    {
      key: "characters",
      label: "Characters",
      updatedAt: newest(details.characters.map((entity) => entity.updatedAt)),
      entities: details.characters.map((character) => ({
        id: character.entityId ?? "",
        name: character.name ?? "",
      })),
    },
    {
      key: "places",
      label: "Places",
      updatedAt: newest(details.places.map((entity) => entity.updatedAt)),
      entities: details.places.map((place) => ({
        id: place.entityId ?? "",
        name: place.name ?? "",
      })),
    },
    {
      key: "items",
      label: "Items",
      updatedAt: newest(details.items.map((entity) => entity.updatedAt)),
      entities: details.items.map((item) => ({
        id: item.entityId ?? "",
        name: item.name ?? "",
      })),
    },
    ...details.types
      .filter((type) => Boolean(type.id))
      .map((type) => ({
        key: `custom:${type.id}`,
        label: type.name ?? "Custom",
        updatedAt: newest([
          type.updatedAt,
          ...details.customEntities
            .filter((entity) => entity.entityTypeId === type.id)
            .map((entity) => entity.updatedAt),
        ]),
        entities: details.customEntities
          .filter((entity) => entity.entityTypeId === type.id)
          .map((entity) => ({ id: entity.entityId ?? "", name: entity.name ?? "" })),
      })),
  ];

  // At most 4 sections on the home screen, ordered by database recency.
  const visibleSections = selectVisibleSections(
    pool,
    (section) => section.updatedAt,
    4,
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-5 py-8 sm:px-8">
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6ee7d8]">
          Current world
        </p>
        <h1 className="mt-2 font-serif text-3xl text-white sm:text-4xl">
          {anchorWorld.name ?? ""}
        </h1>
      </motion.header>

      <div className={`mt-7 items-stretch ${GRID}`}>
        {visibleSections.map((section, index) => (
          <motion.section
            key={section.key}
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduce ? 0 : 0.5,
              delay: reduce ? 0 : 0.08 * index,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="flex min-h-[240px] flex-col border border-white/10 bg-[#061019]/70 backdrop-blur-sm transition-colors hover:border-white/[0.18]"
          >
            <div className="flex items-baseline justify-between gap-2 px-4 pt-4">
              <h2 className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {section.label}
              </h2>
              <span className="shrink-0 text-[10px] text-white/30">
                {section.entities.length}
              </span>
            </div>

            <div className="mt-2.5 flex-1 space-y-1 px-2 pb-3">
              {section.entities.length === 0 ? (
                <p className="px-2 py-3 text-xs italic text-white/30">Nothing here yet</p>
              ) : (
                section.entities.map((entity) => (
                  <button
                    key={entity.id || entity.name}
                    type="button"
                    onClick={() => onOpenEntity(section.key)}
                    className="group/row flex w-full items-center justify-between gap-2 border border-transparent px-3 py-2 text-left transition hover:border-white/10 hover:bg-white/[0.05]"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-white/70 transition group-hover/row:text-white">
                      {entity.name}
                    </span>
                    <CaretRight
                      size={12}
                      weight="bold"
                      className="shrink-0 text-white/25 transition group-hover/row:text-[#2dd4bf]"
                    />
                  </button>
                ))
              )}
            </div>
          </motion.section>
        ))}

        {/* Create a new custom section: same space, dotted boundary, low opacity */}
        <motion.button
          type="button"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: reduce ? 0 : 0.5,
            delay: reduce ? 0 : 0.08 * visibleSections.length,
            ease: [0.16, 1, 0.3, 1],
          }}
          onClick={onCreateCustomSection}
          className="group flex min-h-[240px] flex-col items-center justify-center gap-3 border border-dashed border-white/15 bg-white/[0.015] p-5 text-center transition hover:border-[#2dd4bf]/40 hover:bg-[#2dd4bf]/[0.04]"
        >
          <span className="flex h-9 w-9 items-center justify-center border border-white/15 text-white/40 transition group-hover:border-[#2dd4bf]/50 group-hover:text-[#2dd4bf]">
            <Plus size={16} weight="regular" />
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-white/45 transition group-hover:text-[#a9e8df]">
            Create a new custom section
          </span>
        </motion.button>
      </div>
    </div>
  );
}
