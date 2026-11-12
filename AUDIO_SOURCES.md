# WARD 09 — Audio credits & setup

This build does **not** synthesize voices, footsteps, or the jumpscare. The sound hooks use creator-submitted recordings from CC0 sources. The CC0 license allows reuse and modification; keep these source notes with the project anyway.

## Included as remote streams

- **Footsteps** — GboxMikeFozzy, “Footsteps” (OpenGameArt). The creator describes these as self-recorded subway footsteps, cleaned in Audacity. CC0. The game randomly selects among the six OGG variations.
  - Source: https://opengameart.org/content/footsteps-0
- **Door movement** — Oiboo, “Door Open SFX” (OpenGameArt). CC0.
  - Source: https://opengameart.org/content/door-open-sfx
- **Jumpscare scream** — WuxiaScrub, “Female high-pitched scream SFX” (OpenGameArt). Four human-voice scream pitches in an OGG file. CC0; no attribution required.
  - Source: https://opengameart.org/content/female-high-pitched-scream-sfx
- **Low horror ambience** — techiew, “Ambient horror” (OpenGameArt). CC0.
  - Source: https://opengameart.org/content/ambient-horror

The four sources above are requested directly from OpenGameArt at runtime. Internet access is needed for these remote streams. If the site blocks audio in your browser or network, download the files from their source pages and place them under `public/assets/audio/`; see the filename list in `src/systems/AudioManager.js`.

