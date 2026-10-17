# DoorRelay

A visible alert. A clear handoff. Someone on their way.

DoorRelay is a Ring-track hackathon prototype for a household resident and helper to see door activity, request assistance, accept a handoff, and mark a visit handled. This hosted edition runs React on Vinext/Cloudflare Workers with a D1 database. It builds on Amazon's MIT-licensed Ring hello-world integration.

## Latest submission source

The exact hosted edition is in **doorrelay-hosted-source.zip** (source commit `0dcad001fc89415fa8745573729bf9b40f029328`). Extract it and run the commands below inside `doorrelay-hosted/`. It includes source, assets, migrations, lockfile, license, verification script and local-development instructions. The files at this repository root are the earlier standalone Next.js edition; use the archive for the current deployment. Runtime secrets and database content are excluded.

## Open the hosted app

https://doorrelay.almond-mole-5052.chatgpt.site

This deployment is owner-private and requires the owner's ChatGPT sign-in. Do not change the audience to anonymous/public without implementing household authorization. Role selection demonstrates the workflow; it is not an identity or access-control system. Two tabs signed in as the owner share the same household.

1. Expand **Connect or reconnect Ring** in the camera card.
2. Generate an access token in [Ring Playground](https://developer.amazon.com/ring/console/playground) and paste it into the password field. Do not share it in chat or source code.
3. Click **Connect Ring**. The server validates device access before saving the token encrypted with AES-256-GCM. Click **Start camera view**.
4. For the coordination demo, open the app in two tabs, use Resident in one and Helper in the other. Open Demo controls and create a demo test visit. Request helper, accept in the helper tab, then mark handled.

Demo events are explicitly labeled and do not originate from Ring. Ring simulator video and local demo events are separate integrations. A successful video stream does not establish webhook delivery.

## What is implemented

- Real server-side calls to Ring `/v1/devices` and WHEP stream session endpoints; WebRTC playback in the browser.
- Durable D1 history capped at 200 visits and associated responses; updates polled every two seconds.
- Resident/helper handoff and 45-second unaccepted-request status. Status advances on the next server read; no background notifications.
- Optimistic database revision checks reject competing responses rather than silently overwrite them.
- Ring-token validation, encrypted server-side storage, replacement and deletion. No token-read API.
- Signed Ring webhook validation with HMAC-SHA256 and request/event deduplication.
- Responsive UI, keyboard-operable controls and live status announcements.

## Runtime configuration

The Sites manifest declares D1 binding `DB`. Runtime secrets must be configured outside source:

- `DOORRELAY_VAULT_KEY`: 64 lowercase hex characters, generated securely once; encrypts stored Ring tokens. Replacing this key requires reconnecting Ring.
- `DOORRELAY_ENABLE_TEST_EVENTS=true`: enables labeled demo controls. Set false for regular use.
- `RING_HMAC_SIGNING_KEY`: optional partner key for real webhook verification.

The private Sites access gate blocks unsolicited external webhook requests. Partner webhooks require an approved publicly reachable, HMAC-protected receiver and Ring partner configuration; that external delivery is not enabled or claimed for this private deployment. The route and validation are included for that integration work.

## Build and verification

Node 24 is recommended. This repository uses pnpm with `pnpm-lock.yaml`.

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm exec tsc --noEmit
node scripts/verify-store.mjs
corepack pnpm run build
```

The verification script executes the real storage, response, token, and webhook functions against an in-memory SQLite D1-compatible adapter. It tests concurrent helper acceptance, timeouts, retention, encryption, disconnect, cross-site rejection, test labeling and signed webhook fixtures. It does not prove live Ring access or browser media playback. Sites applies the committed schema migrations when deploying.

For local development, use the portable Sites execution profile and local D1 migrations described in `docs/LOCAL-DEVELOPMENT.md`. Never commit runtime tokens or database content.

## Limits

One private household per deployment. Resident/helper are demonstration roles, not separate authenticated accounts. No phone/background notifications, emergency dispatch, identity recognition, or door-unlock control. Ring Playground tokens can expire and require reconnecting. The owner confirmed hosted Ring simulator playback on October 17, 2026. Recheck playback before recording because Playground tokens can expire.

## Attribution

Ring API and WebRTC implementation adapted from https://github.com/AmazonAppDev/ring-api-helloworld. Original MIT license retained in LICENSE. DoorRelay-specific additions include coordination, persistence, secure token setup, and accessibility-focused presentation.
