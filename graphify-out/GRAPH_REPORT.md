# Graph Report - .  (2026-05-22)

## Corpus Check
- 33 files · ~195,906 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 114 nodes · 80 edges · 36 communities detected
- Extraction: 51% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.78)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Structure & Routing|App Structure & Routing]]
- [[_COMMUNITY_App Shell & UI Fonts|App Shell & UI Fonts]]
- [[_COMMUNITY_Home Feed Logic|Home Feed Logic]]
- [[_COMMUNITY_Visual Design Identity|Visual Design Identity]]
- [[_COMMUNITY_Video Card & Formatting|Video Card & Formatting]]
- [[_COMMUNITY_Data Fetching Hooks|Data Fetching Hooks]]
- [[_COMMUNITY_Content API & Pages|Content API & Pages]]
- [[_COMMUNITY_Spiritual Brand Identity|Spiritual Brand Identity]]
- [[_COMMUNITY_Admin CRUD API|Admin CRUD API]]
- [[_COMMUNITY_Streaming & Playback|Streaming & Playback]]
- [[_COMMUNITY_Audio Context|Audio Context]]
- [[_COMMUNITY_App Layout & Nav|App Layout & Nav]]
- [[_COMMUNITY_Admin UI|Admin UI]]
- [[_COMMUNITY_Playlist Page|Playlist Page]]
- [[_COMMUNITY_Search Page|Search Page]]
- [[_COMMUNITY_Player Page|Player Page]]
- [[_COMMUNITY_Theme & App Root|Theme & App Root]]
- [[_COMMUNITY_Mini Player|Mini Player]]
- [[_COMMUNITY_Audio Player Hook|Audio Player Hook]]
- [[_COMMUNITY_Recent Page|Recent Page]]
- [[_COMMUNITY_Favorites Page|Favorites Page]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_App Entry Point|App Entry Point]]
- [[_COMMUNITY_Vite Types|Vite Types]]
- [[_COMMUNITY_Tag Badge Component|Tag Badge Component]]
- [[_COMMUNITY_API Client|API Client]]
- [[_COMMUNITY_Settings Page|Settings Page]]
- [[_COMMUNITY_Settings Store|Settings Store]]
- [[_COMMUNITY_Queue Store|Queue Store]]
- [[_COMMUNITY_Recent Store|Recent Store]]
- [[_COMMUNITY_Favorites Store|Favorites Store]]
- [[_COMMUNITY_Player Store|Player Store]]
- [[_COMMUNITY_Warm Gradient|Warm Gradient]]
- [[_COMMUNITY_App Favicon|App Favicon]]

## God Nodes (most connected - your core abstractions)
1. `Spiritual Music App UI Mockup` - 4 edges
2. `Spirituality` - 3 edges
3. `Nature-Based Design Language` - 3 edges
4. `fmtCompactCount()` - 2 edges
5. `fmtReactionCount()` - 2 edges
6. `Music and Worship` - 2 edges
7. `Spiritual Reading Platform` - 2 edges
8. `Glowing Musical Note Icon` - 2 edges
9. `Open Book with Botanical Elements` - 2 edges
10. `Open Book` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Hyperedges (group relationships)
- **Video Playback Workflow** — feature_player, api_videos_detail, api_stream_audio, context_audio [0.9]
- **Search and Browse Workflow** — feature_search, feature_playlist_detail, api_videos_list, api_playlists_detail [0.9]
- **User Preferences Workflow** — feature_settings, feature_favorites, store_zustand, req_browser_storage [0.85]
- **Admin Content Management** — feature_admin, api_playlists_create, api_playlists_delete, api_videos_create, api_videos_delete [0.9]

## Communities

### Community 0 - "App Structure & Routing"
Cohesion: 0.14
Nodes (14): src/components/, src/hooks/, src/lib/, src/pages/, Selah - YouTube Hymn Player, Hash-Based Routing, Axios, React 18 (+6 more)

### Community 1 - "App Shell & UI Fonts"
Cohesion: 0.22
Nodes (9): Favorites, Settings, Noto Sans KR, Noto Serif KR, HTML Root Document, Viewport Configuration, Browser Storage, Gesture Prevention (+1 more)

### Community 2 - "Home Feed Logic"
Cohesion: 0.25
Nodes (0): 

### Community 3 - "Visual Design Identity"
Cohesion: 0.33
Nodes (7): Open Book with Botanical Elements, Leaf and Plant Visual Elements, Glowing Musical Note Icon, Nature-Based Design Language, Left Navigation Sidebar with Icons, Spiritual Music App UI Mockup, Warm Golden Lighting Aesthetic

### Community 4 - "Video Card & Formatting"
Cohesion: 0.4
Nodes (2): fmtCompactCount(), fmtReactionCount()

### Community 5 - "Data Fetching Hooks"
Cohesion: 0.33
Nodes (0): 

### Community 6 - "Content API & Pages"
Cohesion: 0.33
Nodes (6): GET /api/playlists/:id, GET /api/playlists, GET /api/videos, Home Feed, Playlist Detail, Search

### Community 7 - "Spiritual Brand Identity"
Cohesion: 0.33
Nodes (6): Music and Worship, Musical Note, Open Book, Plant/Leaf Elements, Spiritual Reading Platform, Spirituality

### Community 8 - "Admin CRUD API"
Cohesion: 0.4
Nodes (5): POST /api/playlists, DELETE /api/playlists/:id, POST /api/videos, DELETE /api/videos/:id, Admin Panel

### Community 9 - "Streaming & Playback"
Cohesion: 0.5
Nodes (4): GET /api/videos/:id/stream, GET /api/videos/:id, AudioContext, Audio/Video Player

### Community 10 - "Audio Context"
Cohesion: 0.67
Nodes (0): 

### Community 11 - "App Layout & Nav"
Cohesion: 0.67
Nodes (0): 

### Community 12 - "Admin UI"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Playlist Page"
Cohesion: 0.67
Nodes (0): 

### Community 14 - "Search Page"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Player Page"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Theme & App Root"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Mini Player"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Audio Player Hook"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Recent Page"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Favorites Page"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Tailwind Config"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Vite Config"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "App Entry Point"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Vite Types"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Tag Badge Component"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "API Client"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Settings Page"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Settings Store"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Queue Store"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Recent Store"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Favorites Store"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Player Store"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Warm Gradient"
Cohesion: 1.0
Nodes (1): Warm Gradient Colors

### Community 35 - "App Favicon"
Cohesion: 1.0
Nodes (1): App Favicon

## Knowledge Gaps
- **8 isolated node(s):** `Open Book`, `Musical Note`, `Plant/Leaf Elements`, `Warm Gradient Colors`, `App Favicon` (+3 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Theme & App Root`** (2 nodes): `ThemeApplicator()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Mini Player`** (2 nodes): `fmtTime()`, `MiniPlayer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Audio Player Hook`** (2 nodes): `useAudioPlayer.ts`, `useAudioPlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recent Page`** (2 nodes): `handlePlay()`, `RecentPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Favorites Page`** (2 nodes): `handlePlay()`, `FavoritesPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tailwind Config`** (1 nodes): `tailwind.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Config`** (1 nodes): `vite.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Entry Point`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Types`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Tag Badge Component`** (1 nodes): `TagBadge.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Client`** (1 nodes): `api.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Page`** (1 nodes): `SettingsPage.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Settings Store`** (1 nodes): `settingsStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Queue Store`** (1 nodes): `queueStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recent Store`** (1 nodes): `recentStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Favorites Store`** (1 nodes): `favoritesStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Player Store`** (1 nodes): `playerStore.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Warm Gradient`** (1 nodes): `Warm Gradient Colors`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Favicon`** (1 nodes): `App Favicon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `Open Book`, `Musical Note`, `Plant/Leaf Elements` to the rest of the system?**
  _8 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Structure & Routing` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._