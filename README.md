# DoorRelay

**Accessible doorbell activity and shared household responses.** Built by Chinaza Okereke for the Amazon Developer Hackathon, Ring track.

DoorRelay gives a resident and an invited household helper a shared view of who is answering the door. It combines Ring camera streaming, signed webhook ingestion, prominent text alerts, a timed help request, and a visit history. A helper accepts a handoff in their open dashboard. Unanswered help requests become “needs attention” after 45 seconds.

## Run on your Mac

Use Node.js 20 or later (tested here with Node 24) and npm.

```bash
npm ci
cp -n .env.example .env.local
npm run dev
```

Open http://localhost:3000 in Chrome. The dashboard works without Ring credentials for **clearly labeled local tests**. Open Demo controls, then Create local test visit. Open a second tab, choose Helper, enter a different name, and accept a Resident's Request helper action.

For camera video, generate a fresh token at https://developer.amazon.com/ring/console/playground, put it after `RING_ACCESS_TOKEN=` in `.env.local`, save, restart the server, and select Start camera view. Do not commit the token. The video is simulator footage with a Playground token. Camera configuration failures do not block the local household workflow.

## Verify

```bash
npm run build
node scripts/verify.mjs
```

Run the verification script with the dev server already running and Demo controls enabled. The script creates **local test data**. If the server uses a household password, also set `DOORRELAY_APP_PASSWORD` for the script process. Optional HMAC verification fixtures require the same `RING_HMAC_SIGNING_KEY` in the script and server; these are protocol tests, not Ring-originated events.

## Signed Ring webhooks

1. Register/configure a partner application in the Ring developer portal and obtain its HMAC signing key and account-linking credentials.
2. Set `RING_HMAC_SIGNING_KEY` to the issued key. It differs from a Playground access token.
3. Configure a public **HTTPS** webhook URL ending in `/api/webhook` through Ring partner setup.
4. Link the appropriate Ring/sandbox account, then trigger a supported event. The route verifies the HMAC-SHA256 `X-Signature` against the **raw request body**, validates the envelope, normalizes the event, persists it, and pushes it to open dashboards.
5. Duplicate event or request IDs already retained are ignored. Invalid signatures return 401. Missing key returns 503. A genuine signed arrival shows “SIGNED RING WEBHOOK.”

A Playground video session alone does not deliver a webhook to this local server. Configuring the receiver and partner account is a separate task. End-to-end Ring notification delivery has not yet been verified for this submission build.

Official references: https://developer.amazon.com/docs/ring/api-documentation.html and https://developer.amazon.com/docs/ring/configure.html.

## Shared responses and storage

Visit and response data are saved atomically in `.doorrelay/visits.json` by default. Set `DOORRELAY_DATA_DIR` to use a different persistent directory. Up to 200 events are retained. The two dashboards should use the **same running Node server**. Responses poll every two seconds; events use SSE with a local-store polling fallback. State survives server restarts on the same disk. Use one Node process. A database is required for multiple application instances or serverless hosting.

Name/role selection identifies participants for this household prototype. It is not individual account authentication. Shared access can be protected with `DOORRELAY_APP_PASSWORD`: browser username `household`, password from that environment variable. Production and non-loopback access require this password. Use HTTPS if sharing over the internet. Ring POST webhooks use signature verification rather than the household password.

Local test event creation is enabled in development and disabled in production unless `DOORRELAY_ENABLE_TEST_EVENTS=true`. If enabled for a production demo, it is behind the household password and remains labeled as test data.

## Scope

- No lock control, facial recognition, identity verification, or emergency monitoring.
- Helpers receive updates in an **open dashboard**. No email, SMS, phone push, or background notification is sent.
- The timeout changes the visit status; it does not contact an additional person.
- The app does not determine that it is safe to open a door.
- Webhook signature tests and local test visits do not establish that an event came from a real Ring device.
- Accessibility features include readable text, large controls, keyboard focus, live status text and responsive layout. Testing with Deaf/hard-of-hearing users is future work; no user study is claimed.

## Provenance and license

Based on Amazon's MIT-licensed starter: https://github.com/AmazonAppDev/ring-api-helloworld. Ring authentication and WebRTC/WHEP streaming hooks originated there. DoorRelay adds the household workflow, shared responses, persistence, signed ingestion, prototype access protection and submission documentation. The original MIT license is included in LICENSE. All source needed to build is included; do not include `.env.local`, `.doorrelay`, `.next`, or `node_modules` in the repository.

Submission text, observed friction and the under-three-minute recording outline are in `submission/`.
