<div align="center">

# 🌊 DEEP BLUE
**A living aquarium in your browser — click anywhere to feed the fish, and watch a calming underwater world respond.**

An immersive, animated ocean scene with fish, bubbles, and shifting light, interactive, relaxing, and built entirely with front-end animation.

[![Live Demo](https://img.shields.io/badge/OPEN%20AQUARIUM-Live%20Demo-0B4F6C?style=for-the-badge)](https://deepblueaquarium.vercel.app/)
[![Interactive](https://img.shields.io/badge/Click%20to%20Feed-Interactive-01A7C2?style=for-the-badge)](https://deepblueaquarium.vercel.app/)
[![No Backend](https://img.shields.io/badge/No%20Backend-Pure%20Frontend-032B44?style=for-the-badge)](https://deepblueaquarium.vercel.app/)
[![Type](https://img.shields.io/badge/Type-Interactive%20Art-011627?style=for-the-badge)](https://deepblueaquarium.vercel.app/)

</div>

---

## About

DEEP BLUE is a **living aquarium simulation** built to bring the calm of an ocean scene to a web page, animated fish, floating bubbles, and gentle lighting, all reacting to you.

Click anywhere on the screen to feed the fish and watch them react, toggle the ambient sound, and switch into a darker night mode for a moodier underwater feel. It's less an "app" in the traditional sense and more a small, self-contained piece of interactive digital art.

> **Heads up:** this is a **self-contained front-end experience.** There's no backend and no database, everything (the fish, the animations, the interactions) runs entirely in the browser via HTML, CSS, and JavaScript. Open it, click around, and enjoy.

---

## Interaction Flow

```
Open the Aquarium        →  Ambient underwater scene loads and starts animating
    ↓
Click Anywhere             →  Feed the fish, triggering a reaction in the scene
    ↓
Toggle Sound                 →  Mute or unmute ambient audio
    ↓
Toggle Night Mode              →  Switch to a darker, moodier lighting scheme
    ↓
Just Watch                       →  Let the animation run as a calming background
```

---

## Features

- **Click-to-Feed Interaction** — Clicking anywhere feeds the fish and triggers a visible reaction
- **Animated Aquatic Life** — Fish, bubbles, and water effects in continuous motion
- **Ambient Sound Toggle** — Mute or unmute the underwater soundscape
- **Day / Night Mode** — Switch between a brighter ocean look and a darker night-time scene
- **Smooth, Lightweight Animation** — Fluid motion without heavy dependencies
- **Fully Responsive** — Works as a calming background on both desktop and mobile

---

## Built For

```
Purpose  → A calming, interactive ocean-themed visual experience
Backend  → None — pure front-end animation, no data persistence
Theme    → Deep blue and teal, underwater lighting
Status   → Complete, ready to run — no setup or configuration needed
Not For  → An actual aquarium/fish-keeping simulator with stats or progression
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Structure | HTML |
| Styling | CSS (`style.css`) — gradients, lighting, and transitions |
| Animation & Interaction | JavaScript (`aquarium.js`) |
| Deployment | Vercel (static hosting) |

---

## Project Structure

```
DeepBlueAquarium/
├── index.html      Page structure and scene container
├── aquarium.js       Fish behavior, feeding interaction, and animation loop
├── style.css          Ocean gradients, lighting, and visual effects
└── README.md
```

---

## Run Locally

No build step, no installation, no environment variables.

1. Clone the repository:
   ```
   git clone https://github.com/Paim41/DeepBlueAquarium.git
   cd DeepBlueAquarium
   ```
2. Open `index.html` directly in your browser, **or** serve it with any static file server, e.g.:
   ```
   npx serve .
   ```
3. Click anywhere on the scene to feed the fish, and use the toggles for sound and night mode

---

## Demo-Only Notice

This project has **no backend.** It's a purely visual, client-side experience, there's no account system, saved progress, or persistent data. Refreshing the page simply restarts the scene.

---

## Roadmap / Ideas

- [ ] More fish species and rare "catch" moments
- [ ] Saved aquarium state across sessions
- [ ] Custom fish colors or aquarium themes
- [ ] Ambient soundtrack variations
- [ ] Mobile touch-gesture interactions beyond tap-to-feed

---

<div align="center">

*DEEP BLUE — a living aquarium, one click away.*

[deepblueaquarium.vercel.app](https://deepblueaquarium.vercel.app/)

</div>
