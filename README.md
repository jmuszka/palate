# Palate

Every word has a journey. **Palate** is an interactive etymology explorer and language atlas — trace the roots, meanings, and geographic paths of English words. [EtymoMap](https://etymomap.com) is the live deployment.

## Features

- **Etymology tree** — Interactive graph visualization showing a word's ancestral lineage, built with React Flow and ELK.js. Click any node to explore that word's own etymology.
- **Language family sunburst chart** — See the proportional breakdown of a word's linguistic heritage (Germanic, Latin, Greek, etc.).
- **Interactive map** — MapLibre-powered globe renders the geographic regions where each ancestor language was spoken.
- **IPA pronunciation** — Phonetic transcription for each word.
- **Prose history** — Readable etymology narrative sourced from Etymonline.
- **Autocomplete search** — Search any of over 100,000 English words with instant prefix matching.
- **Responsive layout** — Draggable split between map and content; adapts from desktop to mobile.

## Tech Stack

| Layer                | Technology                     |
| -------------------- | ------------------------------ |
| Framework            | React 19                       |
| Build tool           | Vite 8                         |
| Language             | TypeScript 6                   |
| Routing              | React Router v7                |
| Styling              | Tailwind CSS v4                |
| Graph rendering      | @xyflow/react (React Flow)     |
| Graph layout         | ELK.js (Eclipse Layout Kernel) |
| Maps                 | MapLibre GL JS                 |
| Charts               | Nivo (sunburst)                |
| Linting & formatting | oxlint + oxfmt                 |
| CI                   | GitHub Actions (Bun)           |

## Project Structure

```
src/
├── main.tsx              # App entry point & route definitions
├── App.tsx               # Home page: search, suggestions, intro
├── WordPage.tsx          # Word detail: etymology tree, pie chart, map, IPA, history
├── EtymologyTree.tsx     # React Flow + ELK.js graph visualization
├── FamilySunburst.tsx    # Language family sunburst chart
├── Map.tsx               # MapLibre GL map with GeoJSON overlays
├── Layout.tsx            # Responsive split layout with draggable divider
├── Header.tsx            # Site header with responsive navigation
├── ContentPanel.tsx      # Scrollable content wrapper & context provider
├── ComingSoon.tsx        # Placeholder for About, Blog, Games pages
├── Attributions.tsx      # Data source attributions
├── index.css             # Tailwind imports & global styles
└── hooks/
    └── useIsMobile.ts    # Responsive breakpoint hook
```

## Routes

| Path             | Component      | Description                                 |
| ---------------- | -------------- | ------------------------------------------- |
| `/`              | `App`          | Home page with word search                  |
| `/words/:word`   | `WordPage`     | Word detail (supports `?lang=` query param) |
| `/about`         | `ComingSoon`   | About page                                  |
| `/blog/articles` | `ComingSoon`   | Blog                                        |
| `/games`         | `ComingSoon`   | Games                                       |
| `/attributions`  | `Attributions` | Data source credits                         |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (recommended) or Node.js 20+
- A running instance of the [Larynx](https://github.com/anomalyco/larynx) backend API

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd palate

# Install dependencies
bun install

# Configure the backend URL
cp .env.example .env
# Edit .env and set VITE_SERVER_URL to your Larynx instance

# Start the dev server
bun run dev
```

The dev server starts at `http://localhost:5173` with HMR enabled.

### Build

```bash
bun run build      # Type-check + production build
bun run preview    # Preview the production build locally
```

### Linting & Formatting

```bash
bun run lint           # oxlint
bun run format:write   # oxfmt (write)
bun run format:check   # oxfmt (check only)
```

A pre-commit hook (Husky) runs linting and formatting automatically.

## API

Palate expects a backend API (referred to as **Larynx**) at the URL configured in `VITE_SERVER_URL`. The following endpoints are used:

| Endpoint                             | Used by                                      |
| ------------------------------------ | -------------------------------------------- |
| `GET /api/v1/words?prefix={query}`   | Search autocomplete                          |
| `GET /api/v1/words/{word}/etymology` | Etymology tree + family chart + map geometry |
| `GET /api/v1/words/{word}/ipa`       | IPA pronunciation                            |
| `GET /api/v1/words/{word}/history`   | Prose etymology                              |

All endpoints support an optional `?lang=` query parameter for language-specific results.

### Authentication

Every API request includes an `Authorization` header carrying a client-level bearer token:

```
Authorization: Bearer <token>
```

Set the token via the `VITE_BEARER_TOKEN` environment variable. The backend (Larynx) requires an approved bearer token on each request, so requests made without a valid token are rejected. This is a single, shared client credential — not per-user authentication — and it must be present on every call.

## Data Sources

- **Wiktionary** — Word database & etymological relationships
- **Etymonline** — Prose etymology narratives
- **Glottolog** — Language family hierarchy (Max Planck Institute)
- **Glottography** — GeoJSON spatial data for language regions
- **CARTO Positron** — Basemap tiles

See the [Attributions](/attributions) page for details.

## Environment Variables

| Variable            | Required | Description                            |
| ------------------- | -------- | -------------------------------------- |
| `VITE_SERVER_URL`   | Yes      | Base URL of the Larynx backend API     |
| `VITE_BEARER_TOKEN` | Yes      | Bearer token sent on every API request |
