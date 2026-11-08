# NIGHT SHIFT: WARD 09

A Phaser 3 / Vite surveillance-horror game. JavaScript only.

## Run on Fedora / Linux

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite. To create a production build:

```bash
npm run build
```

## Controls

- **F** — flashlight on/off
- **Mouse** — aim the flashlight over the active monitor
- Camera buttons — switch camera feed
- **Report Anomaly** — report a dangerous change
- **Confirm Normal** — dismiss a harmless change
- **SPACE** — timing input while the recharge minigame is active
- **ESC** — pause

## Main systems

- A dangerous anomaly appears roughly every 3.6–4.4 seconds, when a camera slot is free.
- Feeds are fully obscured unless the flashlight is on. The anomaly and entity art are drawn underneath that darkness layer, so they are never visible without the light.
- The handheld flashlight cell drains at 2.35 percentage points per second while illuminated, both at the desk and during patrol. It does not drain while switched off. Camera switching, false reports, and sealing the office door do not consume cell charge.
- The recharge test uses three timing hits. Three hits restore 28%, two restore 17%, one restores 7%; zero hits fail.
- The Patient advances exactly one stage for every false report, incorrect normal confirmation, missed dangerous anomaly, or bad intercom response. Time alone never advances it.
- Later stages use the same creature image at progressively closer camera positions and larger scales. Stage four triggers the office-door sequence.
- The lights-flicker anomaly switches between the lit and unlit emergency-light sprites. Object anomalies use the supplied pack's doors, placards, pipes, spills, warning decals, and equipment props.

## Audio

See [`AUDIO_SOURCES.md`](./AUDIO_SOURCES.md) for creator credits, licenses, source pages, and the optional local crying WAV setup. Recorded sound effects are used instead of procedural WebAudio voice/noise effects. Remote OpenGameArt audio streams need an internet connection. The crier's local `crying.wav` file must be added separately as described there.

## Project notes

- The uploaded facility art and four camera photos were preserved.
- The old hand-drawn rectangular anomaly overlays were replaced with layered object sprites where the supplied pack has a matching prop.
- The browser game has been syntax-checked. Run `npm run build` locally after `npm install` to validate the installed dependency versions in your environment.
