# BetterTTS v0.7.0

[![Version](https://img.shields.io/badge/version-0.7.0-blue.svg)](#)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub%20Pages-24292f.svg)](#)

BetterTTS is a static text-to-speech studio built for GitHub Pages. It runs Kokoro 82M in the browser through `kokoro-js` and Transformers.js, then exports generated speech as WAV or MP3 files. If the model cannot run on a device, the app falls back to the browser Web Speech API for playback.

## Features

- Client-side Kokoro generation with no private TTS server.
- WAV and MP3 download with bitrate picker.
- Streaming playback — audio plays as each sentence generates.
- Web Worker inference for responsive UI during generation.
- Optional per-line generation with ZIP download.
- Dialog mode with per-speaker voice mapping.
- 28 English US and English British Kokoro voices with preview.
- SRT/VTT subtitle export from sentence-level timing.
- Persistent clip library backed by IndexedDB.
- Pitch control (±4 semitones) and background music mixing.
- Pronunciation override dictionary.
- Browser speech fallback for wide compatibility.
- Dark default UI with a light theme toggle.
- Installable offline PWA with service worker.
- Plain static build for GitHub Pages.

## Develop

```powershell
npm install
npm run dev
```

## Verify

```powershell
npm run test
npm run lint
npm run build
```

## Deploy To GitHub Pages

This project does not use GitHub Actions. Build locally and push the generated `dist` folder to a `gh-pages` branch:

```powershell
npm run build
git subtree push --prefix dist origin gh-pages
```

Then enable GitHub Pages in repository settings with:

- Source: deploy from a branch
- Branch: `gh-pages`
- Folder: `/`

## Model Notes

The active model path is `onnx-community/Kokoro-82M-v1.0-ONNX`. The first Kokoro run downloads model assets from Hugging Face and caches them in the browser. The app itself remains static and hostable on GitHub Pages.

Multilingual Kokoro expansion is planned as a follow-up because `kokoro-js` v1.2.1 exposes a reliable English voice set in its runtime voice map.
