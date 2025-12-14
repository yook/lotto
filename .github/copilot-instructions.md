# Melody Roulette Jukebox - AI Coding Instructions

## Project Overview

A Russian-language music roulette web application where users spin to randomly select and play music tracks. Built as a static DeepSite v3 project for HuggingFace deployment.

## Architecture & Key Files

### Core Components

- **[index.html](../index.html)**: Main roulette interface with Tailwind CSS styling
- **[script.js](../script.js)**: Game logic, localStorage persistence, audio playback
- **[settings.html](../settings.html)**: Configuration page for song count (10-200 range)
- **[about.html](../about.html)**: Project information page
- **[style.css](../style.css)**: Custom animations (numberChange, winnerPulse, fade-in)
- **[components/navbar.js](../components/navbar.js)**: Empty placeholder for web component (not implemented)

### Music Integration

- Songs stored in `songs/` directory (currently: 1.mp3, 2.mp3)
- [script.js](../script.js#L40-L44) creates virtual library mapping IDs to placeholder URLs
- Actual audio files should be added to `songs/` and referenced by ID

## Critical Patterns & Conventions

### State Management

**localStorage is the single source of truth**:

- `playedNumbers`: JSON array of used track IDs
- `currentNumber`: Active track ID
- `songCount`: Configurable library size (default: 100)

State persists across sessions. [script.js](../script.js#L10-L30) loads on `DOMContentLoaded`.

### Russian Language

All UI text is in Russian (Cyrillic). Maintain this for:

- HTML content
- Alert/confirm messages
- Comments in code
- Variable naming uses English

### Audio Playback Flow

1. User clicks spin → 30 rapid number iterations (50ms intervals)
2. Final number selected from unplayed pool
3. Audio autoplay attempted with promise-based error handling
4. Fallback shows manual controls if autoplay blocked

See [script.js](../script.js#L87-L121) for implementation.

### Tailwind CSS Usage

- CDN-loaded (no build step)
- Gradient backgrounds: `bg-gradient-to-br from-indigo-900 to-purple-800`
- Glass morphism: `bg-white bg-opacity-10 backdrop-blur-lg`
- Feather Icons via CDN: `<i data-feather="icon-name"></i>` + `feather.replace()`

### Animation System

[style.css](../style.css) defines:

- `.number-change`: Scale/fade for number updates
- `.winner`: Pulsing highlight for latest played number (3 iterations, 0.5s each)
- Smooth transitions on hovers and state changes

## Development Workflow

### Testing Locally

Open `index.html` directly in browser (no build required). Changes to HTML/CSS/JS are immediate.

### Audio Testing

Currently uses SoundHelix placeholder MP3s. To add real audio:

1. Place files in `songs/` as `1.mp3`, `2.mp3`, etc.
2. Update [script.js](../script.js#L40-L44) music library to reference local files
3. Ensure count matches `songCount` setting

### Debugging

- Check browser console for audio playback errors
- Inspect localStorage in DevTools for state persistence
- Use Network tab to verify audio file loading

## External Dependencies

- **Tailwind CSS**: `https://cdn.tailwindcss.com`
- **Feather Icons**: `https://unpkg.com/feather-icons`
- **DeepSite Badge**: `https://huggingface.co/deepsite/deepsite-badge.js`

No npm/build tools required. All dependencies loaded via CDN.

## Common Tasks

### Changing Song Library Size

Modify range in [settings.html](../settings.html#L28) and update localStorage logic in both files.

### Adding New Pages

Follow pattern: Tailwind CDN + Feather Icons + same gradient background + glass morphism cards.

### Resetting Game State

Clear localStorage keys: `playedNumbers`, `currentNumber`. "New Game" button does this with confirmation.

## Known Gaps

- `components/navbar.js` is empty (no custom element implementation)
- Music library uses placeholder URLs instead of real audio files
- No backend/API integration (fully client-side)
