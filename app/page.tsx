"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import ThemeSettings from "@/src/components/home/ThemeSettings";

const entityCards = [
  {
    label: "Characters",
    title: "People who belong to the world",
    description:
      "Keep a character's details in one place instead of scattering them across notes. Record their age, health, distinctions, traits, mutations, status, and notes.",
    fields: ["Age", "Health", "Traits", "Status"],
  },
  {
    label: "Places",
    title: "Locations that persist across the story",
    description:
      "A place remains part of the world even when the chapter changes. Record its current status and where it last appeared.",
    fields: ["Status", "Last occurrence", "Book", "Chapter"],
  },
  {
    label: "Items",
    title: "Objects with their own history",
    description:
      "Keep important objects connected to the world. Track their status, power, and current wielder.",
    fields: ["Status", "Power", "Wielder"],
  },
];

const relationshipExamples = [
  { from: "Elena", to: "Marcus", type: "Family", value: 82 },
  { from: "Marcus", to: "Adrian", type: "Rival", value: 18 },
  { from: "Elena", to: "Valen Guard", type: "Member", value: 67 },
];

const faq = [
  {
    q: "What is a world in Pacific Aurora?",
    a: "A world is the persistent setting behind your stories. It can exist without a book and can contain characters, places, items, relationships, and custom entity types. Multiple books can then be connected to that same world.",
  },
  {
    q: "Can one world contain multiple books?",
    a: "Yes. A world has to exist before a book can be created, and every book belongs to one world. This lets multiple books share the same characters, places, items, relationships, and other world information.",
  },
  {
    q: "Can I create my own types of entities?",
    a: "Yes. Characters, places, and items are provided sections, but you can create custom sections for whatever your world needs. Custom entities can also participate in relationships.",
  },
  {
    q: "How does the system know what is already in my world?",
    a: "When you write, relevant writing, world entities, relationships, chapter important points, and character timeline important points can be connected to the story data so your world stays consistent.",
  },
  {
    q: "What happens when a character appears in different books?",
    a: "The character belongs to the world, while their timeline is maintained per book. This allows the same character to have different chapter-by-chapter events in different books.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-medium uppercase tracking-[0.28em] text-accent">
      {children}
    </p>
  );
}

function EntityPreview({
  label,
  title,
  description,
  fields,
}: {
  label: string;
  title: string;
  description: string;
  fields: string[];
}) {
  return (
    <div className="group border border-border bg-background-elevated/70 p-6 backdrop-blur-sm transition duration-300 hover:border-accent/30 hover:bg-background-elevated/80">
      <div className="mb-7 flex items-center justify-between">
        <span className="border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-accent">
          {label}
        </span>

        <span className="text-xs text-foreground-muted">world entity</span>
      </div>

      <h3 className="text-xl font-serif text-foreground">{title}</h3>

      <p className="mt-3 text-sm leading-7 text-foreground-muted">
        {description}
      </p>

      <div className="mt-6 space-y-2">
        {fields.map((field) => (
          <div
            key={field}
            className="flex items-center justify-between border border-border bg-surface-wash px-3 py-2.5"
          >
            <span className="text-xs text-foreground-muted">{field}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-accent/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductMockup() {
  return (
    <div className="overflow-hidden border border-border bg-background-elevated/95 shadow-2xl shadow-black/30">
      <div className="flex h-11 items-center border-b border-border px-4">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-surface-wash-strong" />
          <span className="h-2 w-2 rounded-full bg-surface-wash-strong" />
          <span className="h-2 w-2 rounded-full bg-surface-wash-strong" />
        </div>

        <div className="mx-auto border border-border bg-surface-wash px-8 py-1 text-[9px] tracking-wider text-foreground-muted">
          pacific-aurora / emberfall
        </div>
      </div>

      <div className="grid min-h-[520px] grid-cols-[180px_1fr] md:grid-cols-[210px_1fr]">
        <aside className="border-r border-border bg-black/10 p-4">
          <div className="mb-7">
            <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
              Books
            </p>

            <div className="mt-3 bg-accent/10 px-3 py-2.5">
              <p className="text-xs text-accent">Emberfall</p>
              <p className="mt-1 text-[9px] text-foreground-muted">4 chapters</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
                Worlds
              </p>
              <span className="text-xs text-accent">+</span>
            </div>

            <div className="mt-3 border border-border px-3 py-2.5">
              <p className="text-xs text-foreground-muted">Aurora</p>
              <p className="mt-1 text-[9px] text-foreground-muted">
                12 entities
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-1.5">
            {["Characters", "Places", "Items", "Custom"].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between px-3 py-2 text-[10px] text-foreground-muted"
              >
                <span>{item}</span>
                <span className="text-foreground-muted">›</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex items-center gap-5 border-b border-border px-5 py-3 text-[10px] uppercase tracking-widest">
            <span className="border-b border-accent pb-3 text-accent">
              Writer
            </span>
            <span className="text-foreground-muted">World</span>
            <span className="text-foreground-muted">Relationships</span>
            <span className="text-foreground-muted">Timeline</span>
          </div>

          <div className="grid min-h-[465px] grid-cols-[1fr_235px]">
            <div className="border-r border-border p-6 md:p-8">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
                    Chapter 3
                  </p>
                  <h3 className="mt-1 font-serif text-lg text-foreground">
                    The Return
                  </h3>
                </div>

                <span className="text-[9px] text-foreground-muted">
                  1,842 words
                </span>
              </div>

              <div className="space-y-4 font-serif text-sm leading-7 text-foreground-muted">
                <p>
                  Marcus returned to Valen before the city lights came alive.
                  The old gates were still standing, but everything behind
                  them had changed.
                </p>

                <p>
                  He carried the Ashen Blade beneath his coat. Elena had told
                  him never to bring it back.
                </p>

                <p className="text-foreground">
                  He knew he had already broken that promise.
                </p>
              </div>

              <div className="mt-8 border border-accent/15 bg-accent/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-[9px] uppercase tracking-[0.18em] text-accent">
                    Writing
                  </span>
                </div>

                <p className="mt-2 text-[10px] leading-5 text-foreground-muted">
                  Keep your manuscript connected to the world while you write.
                </p>
              </div>
            </div>

            <aside className="bg-black/10 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[9px] uppercase tracking-[0.18em] text-foreground-muted">
                  World information
                </p>
              </div>

              <div className="mt-5 border border-border bg-surface-wash p-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-accent">
                  Item
                </p>

                <p className="mt-2 text-xs text-foreground">
                  Ashen Blade
                </p>

                <p className="mt-2 text-[10px] leading-5 text-foreground-muted">
                  Existing world item referenced in the chapter.
                </p>
              </div>

              <div className="mt-3 border border-border bg-surface-wash p-4">
                <p className="text-[9px] uppercase tracking-[0.15em] text-foreground-muted">
                  Character
                </p>
                <p className="mt-2 text-xs text-foreground">Marcus</p>
                <p className="mt-2 text-[10px] leading-5 text-foreground-muted">
                  Character timeline.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function RelationshipGraph() {
  return (
    <div className="relative min-h-[390px] overflow-hidden border border-border bg-background-elevated/80 p-6">
      <div className="absolute inset-0 opacity-30">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative">
        <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
          World relationships
        </p>

        <div className="relative mx-auto mt-8 h-[280px] max-w-[600px]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 600 280"
            fill="none"
          >
            <line
              x1="160"
              y1="115"
              x2="420"
              y2="75"
              stroke="rgba(45,212,191,.4)"
              strokeWidth="1"
            />
            <line
              x1="160"
              y1="115"
              x2="300"
              y2="225"
              stroke="rgba(255,255,255,.15)"
              strokeWidth="1"
            />
            <line
              x1="420"
              y1="75"
              x2="300"
              y2="225"
              stroke="rgba(255,255,255,.15)"
              strokeWidth="1"
            />
          </svg>

          <div className="absolute left-[18%] top-[30%] -translate-x-1/2">
            <div className="border border-accent/30 bg-background-elevated px-5 py-4 shadow-lg shadow-[#2dd4bf]/5">
              <p className="text-xs text-foreground">Elena</p>
              <p className="mt-1 text-[9px] text-accent">Character</p>
            </div>
          </div>

          <div className="absolute left-[70%] top-[15%] -translate-x-1/2">
            <div className="border border-border bg-background-elevated px-5 py-4">
              <p className="text-xs text-foreground">Marcus</p>
              <p className="mt-1 text-[9px] text-foreground-muted">Character</p>
            </div>
          </div>

          <div className="absolute left-[50%] top-[70%] -translate-x-1/2">
            <div className="border border-border bg-background-elevated px-5 py-4">
              <p className="text-xs text-foreground">Valen Guard</p>
              <p className="mt-1 text-[9px] text-foreground-muted">Custom entity</p>
            </div>
          </div>

          <div className="absolute left-[42%] top-[18%] border border-accent/10 bg-background-elevated px-2 py-1 text-[8px] text-accent">
            Family · 82
          </div>

          <div className="absolute left-[30%] top-[53%] border border-border bg-background-elevated px-2 py-1 text-[8px] text-foreground-muted">
            Member · 67
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelinePreview() {
  const chapters = [
    {
      name: "Introduction",
      point: "Marcus arrives in Valen.",
    },
    {
      name: "Chapter 2",
      point: "The old alliance is revealed.",
    },
    {
      name: "Chapter 3",
      point: "Marcus returns with the Ashen Blade.",
    },
    {
      name: "Chapter 4",
      point: "Elena discovers what he brought back.",
    },
  ];

  return (
    <div className="border border-border bg-background-elevated/80 p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
            Character timeline
          </p>
          <h3 className="mt-2 font-serif text-2xl text-foreground">
            Marcus · Emberfall
          </h3>
        </div>

        <button className="border border-border px-3 py-2 text-[9px] uppercase tracking-wider text-foreground-muted">
          Add chapter
        </button>
      </div>

      <div className="mt-8 space-y-3">
        {chapters.map((chapter, index) => (
          <div
            key={chapter.name}
            className="grid grid-cols-[22px_1fr] gap-4 border border-border bg-surface-wash p-4"
          >
            <div className="relative flex justify-center">
              {index !== chapters.length - 1 && (
                <span className="absolute top-3 h-full w-px bg-surface-wash-strong" />
              )}
              <span className="relative mt-1 h-2 w-2 rounded-full bg-accent" />
            </div>

            <div>
              <p className="text-xs text-foreground">{chapter.name}</p>
              <p className="mt-1 text-xs leading-5 text-foreground-muted">
                {chapter.point}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs leading-6 text-foreground-muted">
        Character timelines belong to a specific book. The character itself
        remains part of the shared world.
      </p>
    </div>
  );
}

export default function LandingPage() {
  const { scrollY } = useScroll();

  const heroY = useTransform(scrollY, [0, 700], [0, 110]);
  const heroOpacity = useTransform(scrollY, [0, 450], [1, 0.35]);
  const heroScale = useTransform(scrollY, [0, 700], [1, 0.96]);

  return (
    <main className="landing-page relative min-h-screen overflow-hidden px-5 py-5 text-foreground sm:px-10 sm:py-8">
      <div className="fixed bottom-4 right-4 z-20">
        <ThemeSettings compact />
      </div>

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.22em] text-foreground-muted"
        >
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_14px_rgba(45,212,191,.5)]" />
          Pacific Aurora
        </Link>

        <nav className="flex items-center gap-3 sm:gap-7">
          <a
            href="#how-it-works"
            className="hidden text-xs uppercase tracking-[0.16em] text-foreground-muted transition hover:text-foreground sm:block"
          >
            How it works
          </a>

          <Link
            href="/signin"
            className="text-xs uppercase tracking-[0.16em] text-foreground-muted transition hover:text-foreground"
          >
            Sign in
          </Link>

          <Link
            href="/signup"
            className="rounded-full bg-accent px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground transition hover:bg-accent-dim sm:px-5"
          >
            Start writing
          </Link>

        </nav>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-6xl flex-col items-center justify-center pb-20 pt-20 text-center">
        <motion.div
          style={{
            y: heroY,
            opacity: heroOpacity,
            scale: heroScale,
          }}
        >
          <p className="mb-7 text-[10px] uppercase tracking-[0.35em] text-accent">
            A world for your stories
          </p>

          <h1 className="font-serif text-5xl leading-[1.02] text-foreground sm:text-7xl md:text-8xl">
            Write the story.
            <br />
            <span className="italic text-accent">
              Keep the world alive.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-base leading-8 text-foreground-muted sm:text-lg">
            Pacific Aurora gives your fiction a persistent world behind it.
            Build characters, places, items, relationships, and your own
            custom kinds of entities. Create books inside that world, write
            their chapters, and keep everything connected as the story grows.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-accent px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground transition hover:bg-accent-dim"
            >
              Start writing
            </Link>

            <a
              href="#how-it-works"
              className="rounded-full border border-border bg-surface-wash px-8 py-4 text-xs uppercase tracking-[0.16em] text-foreground-muted transition hover:border-border hover:bg-surface-wash hover:text-foreground"
            >
              Understand the workflow
            </a>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-x-0 bottom-4 -z-10 flex justify-center">
          <div className="h-40 w-[70%] rounded-full bg-accent/5 blur-3xl" />
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <SectionLabel>The application</SectionLabel>

        <div className="mb-8 max-w-3xl">
          <h2 className="font-serif text-3xl leading-tight text-foreground sm:text-5xl">
            Your book and the world behind it live together.
          </h2>

          <p className="mt-5 text-sm leading-7 text-foreground-muted sm:text-base">
            The world, its entities, the books that belong to it, the chapters
            you write, and the information connected to your writing are all
            part of the same system.
          </p>
        </div>

        <ProductMockup />
      </section>

      <section
        id="how-it-works"
        className="relative z-10 mx-auto max-w-7xl scroll-mt-20 pb-28"
      >
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <SectionLabel>Start with a world</SectionLabel>

            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              A world exists before the story does.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              A world can exist completely on its own. It does not need a book,
              characters, or any other entities to exist. When you are ready to
              write, a book is created inside an existing world.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              That separation matters when one fictional universe contains
              more than one story. The same world can have multiple books while
              the entities belonging to that world remain shared.
            </p>
          </div>

          <div className="border border-border bg-background-elevated/75 p-6 md:p-8">
            <div className="flex items-center justify-center">
              <div className="w-full max-w-2xl">
                <div className="border border-accent/20 bg-background-elevated p-5">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-accent">
                    World
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-foreground">
                    Aurora
                  </h3>

                  <div className="my-6 h-px bg-surface-wash-strong" />

                  <div className="grid gap-3 sm:grid-cols-3">
                    {["Characters", "Places", "Items"].map((item) => (
                      <div
                        key={item}
                        className="border border-border bg-surface-wash p-4"
                      >
                        <p className="text-xs text-foreground">{item}</p>
                        <p className="mt-2 text-[9px] text-foreground-muted">
                          Part of Aurora
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 border border-dashed border-accent/20 bg-accent/[0.025] p-4">
                    <p className="text-xs text-accent">
                      + Create a custom entity type
                    </p>
                    <p className="mt-1 text-[9px] text-foreground-muted">
                      Define the kind of thing your world needs.
                    </p>
                  </div>

                  <div className="mt-6 border border-border bg-black/10 p-4">
                    <p className="text-[9px] uppercase tracking-[0.18em] text-foreground-muted">
                      Books in this world
                    </p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {["The Beginning", "Emberfall"].map((book) => (
                        <div
                          key={book}
                          className="border border-border px-3 py-3"
                        >
                          <p className="text-xs text-foreground">{book}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <SectionLabel>Inside the world</SectionLabel>

        <div className="max-w-3xl">
          <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            The things in your story become actual parts of its world.
          </h2>

          <p className="mt-5 text-sm leading-7 text-foreground-muted sm:text-base">
            Characters, places, and items have their own information instead
            of existing only as words buried inside a chapter. Their details
            can then be referenced by the rest of the world and by the books
            connected to it.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {entityCards.map((card) => (
            <EntityPreview key={card.label} {...card} />
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Custom entities</SectionLabel>

            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Your world does not have to fit our categories.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              Characters, places, and items are only the starting point. If
              your world has factions, species, kingdoms, organizations,
              vehicles, creatures, or something completely different, create a
              custom section for it.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              You define the entity type and its attributes. Pacific Aurora
              stores that structure as part of your world rather than forcing
              you to reduce everything to a generic note.
            </p>
          </div>

          <div className="border border-border bg-background-elevated/80 p-6 md:p-8">
            <div className="border border-dashed border-accent/25 bg-background-elevated p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
                    Custom entity
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-foreground">
                    Faction
                  </h3>
                </div>

                <span className="bg-accent/10 px-3 py-1 text-[9px] text-accent">
                  custom
                </span>
              </div>

              <div className="mt-7 space-y-3">
                {[
                  ["Leader", "Elena"],
                  ["Government", "Council"],
                  ["Population", "42,000"],
                  ["Territory", "Northern Valen"],
                  ["Hostile", "No"],
                ].map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between border border-border bg-surface-wash px-4 py-3"
                  >
                    <span className="text-xs text-foreground-muted">{key}</span>
                    <span className="text-xs text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              <button className="mt-4 w-full border border-dashed border-border py-3 text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                + Add attribute
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <SectionLabel>Relationships</SectionLabel>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <RelationshipGraph />

          <div>
            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Your entities can have relationships, too.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              Relationships belong to the world. Connect two entities, give
              the connection a type, and define its sentiment on a scale from
              0 to 100.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              A relationship is not locked forever. If two characters start
              as enemies and later become family, the relationship can be
              updated rather than creating a contradictory second relationship
              between the same pair.
            </p>

            <div className="mt-7 space-y-3">
              {relationshipExamples.map((relationship) => (
                <div
                  key={`${relationship.from}-${relationship.to}`}
                  className="flex items-center justify-between border border-border bg-surface-wash px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-foreground">
                      {relationship.from}{" "}
                      <span className="text-foreground-muted">→</span>{" "}
                      {relationship.to}
                    </p>
                    <p className="mt-1 text-[9px] text-foreground-muted">
                      {relationship.type}
                    </p>
                  </div>

                  <span className="text-xs text-accent">
                    {relationship.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <div className="border border-border bg-background-elevated/60 p-7 md:p-12">
          <SectionLabel>Books</SectionLabel>

          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
                One world can hold more than one story.
              </h2>

              <p className="mt-6 text-sm leading-7 text-foreground-muted">
                A book is always connected to a world, but a world does not
                belong to a single book. Create another book inside the same
                universe when the next part of the story begins.
              </p>

              <p className="mt-4 text-sm leading-7 text-foreground-muted">
                That means the same character, place, item, faction, or other
                custom entity can remain part of the shared world while each
                book contains its own writing and book-specific events.
              </p>
            </div>

            <div className="border border-border bg-background-elevated p-5">
              <div className="border border-accent/20 bg-background-elevated p-5">
                <p className="text-[9px] uppercase tracking-[0.2em] text-accent">
                  World
                </p>
                <h3 className="mt-1 font-serif text-2xl text-foreground">
                  Aurora
                </h3>
              </div>

              <div className="ml-8 mt-3 space-y-3 border-l border-border pl-5">
                {[
                  ["Book 1", "The Beginning", "6 chapters"],
                  ["Book 2", "Emberfall", "12 chapters"],
                  ["Book 3", "The Drift", "Not started"],
                ].map(([number, name, chapters]) => (
                  <div
                    key={number}
                    className="border border-border bg-surface-wash p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-[0.16em] text-foreground-muted">
                        {number}
                      </span>
                      <span className="text-[9px] text-foreground-muted">
                        {chapters}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-foreground">{name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <SectionLabel>The writer</SectionLabel>

        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Then write the actual book.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              Open a book and the Writer view is the default workspace. Each
              book starts with an Introduction chapter when it has no chapters
              yet. From there, create, rename, reorder, open, or delete
              chapters as the manuscript develops.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              The writing itself happens in the TipTap editor. The world is
              still there when you need it, but the writing remains the focus
              while you work.
            </p>
          </div>

          <div className="border border-border bg-background-elevated/80 p-6 md:p-8">
            <div className="flex items-center justify-between border-b border-border pb-5">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-foreground-muted">
                  Emberfall
                </p>
                <h3 className="mt-1 font-serif text-xl text-foreground">
                  Chapter 3 · The Return
                </h3>
              </div>

              <span className="text-[9px] text-foreground-muted">1,842 words</span>
            </div>

            <div className="mt-7 space-y-5 font-serif text-sm leading-8 text-foreground-muted">
              <p>
                Marcus returned to Valen before the city lights came alive.
                The old gates were still standing, but everything behind them
                had changed.
              </p>

              <p>
                Elena had warned him not to bring the Ashen Blade back. He
                carried it beneath his coat anyway.
              </p>

              <p className="text-foreground">
                This time, he knew exactly what it could do.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {["Writer", "World", "Relationships", "Timeline"].map(
                (tab, index) => (
                  <span
                    key={tab}
                    className={`px-3 py-1.5 text-[9px] uppercase tracking-wider ${
                      index === 0
                        ? "bg-accent/10 text-accent"
                        : "border border-border text-foreground-muted"
                    }`}
                  >
                    {tab}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <TimelinePreview />

          <div>
            <SectionLabel>Book-specific timelines</SectionLabel>

            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Track what happens to a character, chapter by chapter.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              Character timelines belong to a particular book. Important
              points can be attached to individual chapters, keeping a clear
              record of what happens to each character as the manuscript
              develops.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              The same character can therefore have a different sequence of
              events in another book while remaining the same character inside
              the shared world.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <div className="border border-accent/10 bg-background-elevated/70 p-7 md:p-12">
          <div className="max-w-3xl">
            <SectionLabel>Stay connected</SectionLabel>

            <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
              Keep the information around your writing connected to the story.
            </h2>

            <p className="mt-6 text-sm leading-7 text-foreground-muted sm:text-base">
              Pacific Aurora keeps your world entities, relationships, books,
              chapters, and character timelines connected as you write.
            </p>

            <p className="mt-4 text-sm leading-7 text-foreground-muted sm:text-base">
              The result is a writing workspace where the manuscript and the
              fictional world behind it remain part of the same system.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-5">
            {[
              ["01", "Build", "Create your world and its entities."],
              ["02", "Connect", "Link entities through relationships."],
              ["03", "Write", "Create books and write chapters."],
              ["04", "Track", "Keep important events with the right chapter."],
              ["05", "Grow", "Let the world develop alongside the story."],
            ].map(([number, title, description], index) => (
              <div
                key={number}
                className={`relative border p-5 ${
                  index === 4
                    ? "border-accent/25 bg-accent/5"
                    : "border-border bg-surface-wash"
                }`}
              >
                <span className="text-[9px] tracking-[0.2em] text-accent">
                  {number}
                </span>

                <h3 className="mt-5 text-sm font-medium text-foreground">
                  {title}
                </h3>

                <p className="mt-2 text-xs leading-5 text-foreground-muted">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl pb-28">
        <SectionLabel>The complete picture</SectionLabel>

        <div className="max-w-3xl">
          <h2 className="font-serif text-4xl leading-tight text-foreground sm:text-5xl">
            The pieces are connected because the story is connected.
          </h2>

          <p className="mt-5 text-sm leading-7 text-foreground-muted sm:text-base">
            Pacific Aurora is designed around the relationship between your
            world and the books you write inside it.
          </p>
        </div>

        <div className="mt-10 overflow-hidden border border-border bg-background-elevated/80 p-6 md:p-10">
          <div className="grid gap-4 md:grid-cols-7 md:items-center">
            {[
              ["World", "Characters\nPlaces\nItems\nCustom entities"],
              ["Relationships", "World-level\nconnections"],
              ["Book", "Belongs to\none world"],
              ["Chapters", "Ordered\nwriting"],
              ["Timeline", "Book-specific\nevents"],
              ["Writing", "TipTap\neditor"],
              ["World data", "Connected\ninformation"],
            ].map(([title, description], index) => (
              <div key={title} className="flex items-center gap-3 md:block">
                <div
                  className={`flex-1 border p-5 ${
                    index === 0
                      ? "border-accent/20 bg-accent/5"
                      : "border-border bg-surface-wash"
                  }`}
                >
                  <p className="text-sm text-foreground">{title}</p>
                  <p className="mt-2 whitespace-pre-line text-[10px] leading-5 text-foreground-muted">
                    {description}
                  </p>
                </div>

                {index < 6 && (
                  <span className="hidden text-accent md:mt-5 md:block md:text-center">
                    ↓
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 border border-dashed border-accent/20 bg-accent/[0.025] p-5 text-center">
            <p className="text-xs text-accent">
              Create your world → build its entities → create a book → write
              chapters → keep the world and story connected.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl pb-28">
        <SectionLabel>Questions</SectionLabel>

        <h2 className="font-serif text-4xl text-foreground sm:text-5xl">
          Before you begin.
        </h2>

        <div className="mt-10 space-y-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group border border-border bg-surface-wash"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-5 text-sm text-foreground marker:hidden">
                <span>{item.q}</span>

                <span className="text-xl font-light text-foreground-muted transition group-open:rotate-45">
                  +
                </span>
              </summary>

              <div className="border-t border-border px-5 pb-5 pt-4">
                <p className="text-sm leading-7 text-foreground-muted">
                  {item.a}
                </p>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl pb-16 text-center">
        <div className="border border-border bg-background-elevated/60 px-6 py-16 md:px-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent">
            Begin with a blank world
          </p>

          <h2 className="mt-5 font-serif text-4xl text-foreground sm:text-6xl">
            Build the world behind your story.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-foreground-muted">
            Create a world, add what belongs in it, create your first book,
            and start writing. The rest can grow with the story.
          </p>

          <Link
            href="/signup"
            className="mt-8 inline-flex rounded-full bg-accent px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground transition hover:bg-accent-dim"
          >
            Start writing
          </Link>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5 border-t border-border py-8 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.22em] text-foreground-muted"
        >
          Pacific Aurora
        </Link>

        <div className="flex gap-5 text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
          <Link href="/signin" className="transition hover:text-foreground-muted">
            Sign in
          </Link>
          <Link href="/signup" className="transition hover:text-foreground-muted">
            Start writing
          </Link>
          <Link href="/privacy" className="transition hover:text-foreground-muted">
            Privacy Policy
          </Link>
          <Link href="/terms" className="transition hover:text-foreground-muted">
            Terms and Conditions
          </Link>
        </div>

        <p className="text-[10px] text-foreground-muted">
          © 2026 Pacific Aurora
        </p>
      </footer>
    </main>
  );
}
