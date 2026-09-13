# LuxStudio 2.0

A browser-based video editor purpose-built for churches and ministries to turn long teaching/sermon recordings into edited, captioned, and export-ready social media content — timeline editing, AI-assisted silence removal, auto captions, short-clip discovery, and church branding, all in one workspace.

This is a from-scratch React rewrite of LuxStudio (the original is a Flutter + FastAPI app in a separate repo). It runs as a single-page app with a small Express/Vite server that proxies a couple of AI-assist endpoints.

## What it does

- **Timeline editor** — multi-track (video / audio / captions) timeline with split, merge, delete, zoom, scrubbing, and drag-to-resize panels.
- **Auto silence removal** — detects silent pockets in the audio track and can auto-cut them into a "clean speech" edit, with one-click restore.
- **Captions** — a searchable caption list synced to playback, adjustable per-segment timing/text, and a style panel (font, color, animation, position, badges) with several built-in presets.
- **AI Short Clips** — surfaces candidate highlight moments (hook + rationale + virality score) from the sermon, ready to drop into a 9:16 export.
- **Teaching Summary** — generates a title, summary, and exactly five hashtags for the sermon, with a live social-post preview.
- **Brand Kit** — one place to set the church name, address, service times, phone, and website, plus toggles for where that branding appears (lower-third, end card, social copy).
- **Export** — a simulated render flow (format, resolution, frame rate, caption burn-in, branding) that produces a shareable "export" with a completion celebration.
- **Video Player** — canvas-based preview with playback controls, aspect-ratio switching (9:16, 16:9, 4:3, 2:1, 3:4, 1:1), speed control, and fullscreen.

## How it's built

- **Frontend:** React 19 + TypeScript, Vite 6, Tailwind CSS 4, [lucide-react](https://lucide.dev/) icons, [canvas-confetti](https://www.npmjs.com/package/canvas-confetti) for the export celebration.
- **Server:** a small Express server (`server.ts`) that runs Vite in middleware mode during development and serves the built static app in production. It exposes three JSON endpoints under `/api/gemini/*` that call Google's Gemini API (`@google/genai`) for content generation, each with a deterministic fallback response when no `GEMINI_API_KEY` is configured — so the app is fully usable without an API key.
- **Rendering:** the video "player" draws to an HTML `<canvas>`. Without an uploaded file it renders a simulated sermon-stage background (animated speaker silhouette, pulpit, audio meter) so the UI has something to preview against; uploading a real file via the Upload modal or a track's file-select button switches the canvas to actually draw that video's frames.
- **Persistence:** none yet — all project state (tracks, captions, branding, AI results) lives in React state for the session, seeded from `src/sampleData.ts`. Nothing is saved to a database or disk.

## Project structure

```
LuxStudio2/
├── server.ts                     Express server: Vite middleware + /api/gemini/* endpoints
├── index.html                    HTML shell / fonts / meta tags
├── src/
│   ├── main.tsx                  React entry point
│   ├── App.tsx                   Top-level state, layout, and view routing
│   ├── types.ts                  Shared TypeScript types (Track, Clip, CaptionStyle, ChurchBranding, ...)
│   ├── sampleData.ts              Seed project: sample tracks, captions, silences, AI clips, branding defaults
│   ├── components/
│   │   ├── Header.tsx             Top bar: logo, undo/redo, upload, reset sample, export
│   │   ├── LeftNav.tsx            Views sidebar: Timeline Editor / AI Short Clips / Teaching Summary / Brand Kit
│   │   ├── VideoPlayer.tsx        Canvas preview + playback controls, ratio/speed/fullscreen
│   │   ├── TimelineEditor.tsx     Multi-track timeline: clips, waveform, silence markers, per-track file select
│   │   ├── CaptionsEditor.tsx     Caption list, style/template picker, transcript search
│   │   ├── AIClipsView.tsx        AI-suggested short-clip candidates
│   │   ├── TeachingSummaryView.tsx Generated title/summary/hashtags + social preview
│   │   ├── BrandSettingsView.tsx  Church identity, placement toggles, brand palette
│   │   ├── ExportModal.tsx        Export settings + simulated render flow
│   │   ├── UploadModal.tsx        Drag-and-drop video import
│   │   └── LuxLogo.tsx            Brand mark
│   └── utils/
│       ├── canvasRenderer.ts      Draws each video frame (background, captions) onto the canvas
│       └── formatters.ts         Timecode formatting helpers
└── dist/                          Production build output (generated)
```

## Getting started

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

The app runs at **http://localhost:3000**.

AI features (Teaching Summary, AI Short Clips) work out of the box using built-in fallback content. To use live Gemini generation instead, set `GEMINI_API_KEY` in a `.env.local` file at the project root.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server (Vite middleware + Express) on port 3000 |
| `npm run build` | Type-check-free production build: bundles the client with Vite and the server with esbuild into `dist/` |
| `npm start` | Run the production build (`dist/server.cjs`) |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run clean` | Remove `dist/` and `server.js` |

## Known limitations

- Export is simulated — it does not actually transcode or render a video file server-side.
- There's no backend persistence: refreshing the page resets the project to the sample data.
- The canvas background is a stylized placeholder when no real video is loaded; it's meant for laying out the editing chrome, not for previewing real footage until a file is imported.
