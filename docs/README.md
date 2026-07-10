# Documentation Directory Structure

This document defines the **directory structure and organization** for all documentation in `/docs`. It is the single source for **where** to put a doc and **what** to call it.

**For writing standards, template, and format rules, see:**

- **`.cursor/rules/documentation.mdc`** — file naming, length, markdown format, diagrams, cross-referencing

## Project Scope

**WIWOKDETOK** is a civic accountability prototype built around Promise Tracker, Bang Jaga AI, and Walk-o-Meter. Documentation should stay simple and practical.

- **Keep it simple** — Focus on how things work and implementation details.
- **Document what exists** — Not enterprise patterns or abstract designs.
- **Practical examples** — Code and usage, not design philosophy.
- **What to document:** Components, data structures, framework usage, features, file organization.
- **Out of scope:** Security docs, high-level architecture, scalability, production deployment.

## Directory Structure

```
docs/
├── .gitignore
├── README.md                     # This file — structure and rules
├── PRD.md                        # Product requirements (v1.1)
├── db-erd.md                     # Database entity-relationship diagram
├── asset-guide.md                # Image assets and placeholders
│
├── architecture/                 # System architecture, data flow
│   ├── README.md
│   └── arch-overview.md
│
├── data-model/                   # Data structures, TypeScript types
│   ├── README.md
│   └── data-types.md
│
├── frameworks/                   # Tech stack
│   ├── README.md
│   ├── fw-nextjs.md
│   └── fw-supabase.md
│
├── features/                     # Feature specs (canonical)
│   ├── README.md
│   ├── feat-promise-tracker.md
│   ├── feat-bang-jaga.md
│   ├── feat-walk-o-meter.md
│   ├── feat-auth.md
│   └── feat-profile.md
│
├── testing/                      # Test strategy, coverage
│   └── e2e-ac-coverage.md
│
├── feature-*.md                 # Legacy stubs → redirect to features/
└── temp/                         # Optional — temporary docs (not permanent)
```

## Canonical Feature Specs

Feature specifications live in `docs/features/` and use the `feat-*.md` naming convention.

- `docs/features/feat-promise-tracker.md`
- `docs/features/feat-bang-jaga.md`
- `docs/features/feat-walk-o-meter.md`
- `docs/features/feat-auth.md`
- `docs/features/feat-profile.md`

The database ERD is at `docs/db-erd.md` (root). Legacy top-level files such as `docs/feature-promise-tracker.md` are compatibility stubs only.

## Directory Purposes and Naming

| Directory       | Purpose                                      | File prefix / naming   |
| --------------- | -------------------------------------------- | ---------------------- |
| `/architecture` | System architecture, components, data flow   | `arch-*.md`            |
| `/data-model`   | Types, interfaces, domain data structures    | `data-*.md`            |
| `/features`     | Feature docs and user flows                  | `feat-*.md`            |
| `/frameworks`   | Tech stack (Next.js, Supabase, etc.)        | `fw-*.md`              |
| `/testing`      | Test strategy, coverage, flow docs           | `test-*.md`, `flow-*.md` |
| `/temp`         | Temporary analysis/planning (deletable)      | `analysis-`, `planning-`, `notes-`, `research-` |

Each directory has a **README.md** that repeats purpose, naming, and “when to add” — see that README before adding new files there.

## Quick Reference

| Content type   | Directory       | Example files           | Max lines |
| -------------- | --------------- | ----------------------- | --------- |
| System design | `/architecture` | `arch-overview.md`      | 200–400   |
| Data types    | `/data-model`   | `data-types.md`        | 200–400   |
| Tech stack    | `/frameworks`   | `fw-nextjs.md`, `fw-supabase.md` | 200–400 |
| Features      | `/features`     | `feat-<name>.md`       | 200–400   |
| Database      | (root)          | `db-erd.md`            | 200–400   |
| Testing       | `/testing`      | `e2e-ac-coverage.md`   | 200–400   |
| Temp          | `/temp`         | `analysis-*.md`        | N/A       |

Files under 200 lines are fine if the content is complete. For standards and template, see `.cursor/rules/documentation.mdc` in the main project.
