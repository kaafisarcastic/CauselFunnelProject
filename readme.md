# Causalfunnel Task Application

This repository contains a lightweight analytics application with a small frontend tracker and a Next.js admin API that stores session events in MongoDB.

## Overview

- `frontend/` — simple static tracker (index.html + script.js).
- `react-admin/` — Next.js app providing the `/api/sessions` API and an admin UI.

## API (react-admin/app/api/sessions)

The API accepts and returns JSON. It stores session documents in a MongoDB collection named `sessions`.

Environment variables (common):
- `MONGODB_URI` — MongoDB connection string
- `MONGODB_DB`  — database name (default: `analytics`)

Endpoints:
- `OPTIONS /api/sessions` — CORS preflight support.
- `POST /api/sessions` — Create/append events to a session.
  - Body example:
    {
      "sessionId": "s_abc123",
      "device": "desktop",
      "events": [ { "type": "click", "x": 100, "y": 50, "selector": "#btn" } ]
    }
  - The API upserts the session document (sets `startTime` on insert) and pushes events into `devices.<deviceKey>`.

- `PUT /api/sessions` — Append events to an existing session (body similar to POST). The route will upsert if missing.

- `GET /api/sessions` — List recent sessions (optional `limit`) or fetch a single session with `?sessionId=<id>`.

Stored event schema (normalized by the API):
- event_type (string), position_x, position_y, rel_x, rel_y, selector, device, timestamp (Date), meta, x, y

CORS: the API returns permissive CORS headers (`Access-Control-Allow-Origin: *`) so the frontend tracker can post from any origin.

## Frontend: CSS notes

- The simple `frontend/` site currently does not include a dedicated stylesheet file. It uses the browser default styles and the HTML in `frontend/index.html`.
- The `react-admin` Next.js app uses `app/globals.css` for global admin UI styling.
- To add tracker-specific CSS, create `frontend/styles.css` and include it in `frontend/index.html`.

Example (add to `frontend/index.html`):
<link rel="stylesheet" href="/styles.css">

## How `frontend/script.js` sends session data

Key points of the tracker implementation (see `frontend/script.js`):

1. Session ID
   - A persistent session id is stored in `localStorage` under the key `analytics_session_id`.
   - If missing, the script generates a UUID-like id (uses `crypto.randomUUID()` when available).

2. Device detection
   - The script detects `mobile` vs `desktop` from the user agent.

3. Create session on load
   - On load the script calls `POST http://localhost:3000/api/sessions` with payload `{ sessionId, device, events: [] }` to ensure the session exists on the server.

4. Event sending
   - Clicks are captured via a delegated document click listener. Each click event includes:
     - type (`click`), x/y coordinates, a CSS selector string for the target, timestamp and device.
   - Events are sent with `PUT http://localhost:3000/api/sessions` with a body like `{ sessionId, device, events: [ ... ] }`.
   - The script provides `window.__analytics.sendEvent(evt)` to send custom events programmatically.

5. Unload handling and reliable delivery
   - On page unload it tries `navigator.sendBeacon()` to reliably deliver a final `unload` event.
   - If sendBeacon is unavailable or fails, it falls back to a synchronous XHR as a best-effort.

6. Configuration
   - The BASE_URL is defined at the top of `frontend/script.js` (`http://localhost:3000/api/sessions`). Change it if your admin API is hosted elsewhere.

## Examples

Send an event via curl:

curl -X PUT "http://localhost:3000/api/sessions" \
  -H "Content-Type: application/json" \
  -d '{ "sessionId": "s_abc123", "device": "desktop", "events": [{ "type": "click", "x": 123, "y": 45, "selector": "#btn" }] }'

Fetch a session:

curl "http://localhost:3000/api/sessions?sessionId=s_abc123"


