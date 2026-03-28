# Astra Path

**The World's First Universal Bridge for Human Potential.**

An AI-powered educational guidance platform that serves as an Educational Psychologist, Financial Advisor, and Protective Guardian. Built with Vanilla HTML, CSS, and JavaScript — zero server-side dependencies, zero npm packages. Deployed at: **https://astrapath.netlify.app**

---

## Google Services Integrated

| Service | Purpose |
|---------|---------|
| **Firebase Authentication** | Secure user login (Email/Password + Google OAuth) |
| **Gemini 2.5 Flash (Generative AI)** | Multimodal analysis of images, audio, PDFs |
| **Gemini Google Search Grounding** | Real-time school search using Google Reviews |
| **Google Fonts** | Premium typography (Outfit, Inter) |
| **Web Speech API** | Text-to-speech for voice-first accessibility |

---

## Features

- **Multimodal AI Analysis:** Upload report cards (images), voice memos (audio), or school brochures (PDFs). Gemini 2.5 Flash processes all modalities simultaneously.
- **Structured JSON Output:** Uses `response_mime_type` and `response_schema` to guarantee consistent output format with child superpower, traffic light guide, and actionable steps.
- **School Matcher with Google Grounding:** Searches real schools via Google, reads their reviews, filters by budget and child personality.
- **10-Year Career Horizon:** AI-generated career trajectory projection based on detected strengths.
- **Voice-First Navigation:** Uses SpeechSynthesis API to read action instructions aloud for parents who may prefer listening.
- **Firebase Auth Security:** Email/Password registration, Google Sign-In, persistent session management, and secure logout.

---

## Architecture

```
auth.html  →  Firebase Auth  →  index.html  →  Gemini API
     ↓                              ↓               ↓
  auth.js                        app.js        Google Search
     ↓                              ↓           Grounding
  style.css  ←  Shared Premium Dark Theme  →  style.css
```

**Zero dependencies.** No Node.js, no npm, no build step. Opens directly in any browser.

---

## How to Run

1. **Open `auth.html`** in your browser (Chrome/Edge/Firefox).
2. **Sign in** with Google or create an account with email/password.
3. **Upload** a report card, drawing, or voice note.
4. **Add context** (e.g., "My son loves sports but struggles in math").
5. Click **Discover Their Potential** — the AI analyzes the files and generates a structured roadmap.
6. Enter **Budget** and **City** to find matching schools with verified Google Reviews.
7. Click **Listen to Instruction** on any action card to hear it spoken aloud.

---

## File Structure

| File | Purpose | Lines |
|------|---------|-------|
| `auth.html` | Login/Register page with Firebase Auth | ~117 |
| `auth.js` | Firebase Authentication logic | ~156 |
| `index.html` | Main application interface | ~172 |
| `app.js` | Core logic: file handling, API calls, rendering | ~443 |
| `style.css` | Premium dark-mode UI with glassmorphism | ~830 |
| `README.md` | Documentation | — |

---

## Security Practices

- **Firebase Authentication** for all user session management
- **No sensitive data in localStorage** except session tokens
- **API key hardcoded** — not exposed to user input (eliminates key injection)
- **Input validation** on all form fields (email format, password length, file types)
- **`rel="noopener noreferrer"`** on all external links
- **Content rendered via `textContent`** where possible to prevent XSS

---

## Accessibility

- Semantic HTML5 elements (`<nav>`, `<main>`, `<section>`, `<form>`)
- ARIA labels on interactive elements (`aria-label`, `aria-live`, `role`)
- Keyboard-navigable upload area (`tabindex="0"`)
- High-contrast dark theme with readable color ratios
- Web Speech API for voice-first interaction
- Responsive design with mobile breakpoints
