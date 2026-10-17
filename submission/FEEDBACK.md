# Product feedback and observed friction

These observations come from building with the Amazon Ring Hello World starter snapshot used for DoorRelay. No external user study or production deployment is claimed.

## Ring Partner API / Developer Playground
Purpose: device discovery and WebRTC/WHEP simulator playback without owning a physical Ring device.

Worked well: The Playground made it possible to begin on a Mac with a token and the official starter. We observed simulator footage playing in the local app. Device discovery and streaming have useful independent entry points.

Needs work: In longer development sessions, camera discovery returned 401 after the token was no longer accepted. The distinction between successful WHEP session creation and received video was not obvious in the original flow. We also had to distinguish Playground streaming from separately configured partner webhook delivery.

Onboarding: Quick start was approachable once the correct repository URL and token syntax were in place. Event delivery required a separate understanding of partner setup and public webhook routing.

Would use again: Yes, especially with a clearer connection checklist for token acceptance, device discovery, media reception and notification delivery.

## Amazon Ring Hello World sample
Purpose: starting point for Next.js authentication, device routes, video streaming and events.

Worked well: Small route handlers and composable hooks made the sample easy to extend.

Needs work: The access-token view hid the event panel. The hook's polling comments suggested Ring API polling, but the endpoint returned the local event store. The webhook schema's limited event enum did not include button_press in our snapshot, and the receiver authenticated an optional bearer secret rather than verifying the documented raw-body HMAC signature. DoorRelay changed those areas.

Would use again: Yes, with explicit test-vs-Ring event labels and stronger webhook defaults.

## Next.js / React / TypeScript / Tailwind / Zod
Purpose: responsive dashboard, backend routes, event validation and shared response views.

Worked well: A production build checks types and route compilation together. Shared state worked across two independent browser contexts, and the interface fits a narrow phone viewport.

Needs work: The original in-memory store required careful handling across route bundles and restarts. This prototype now saves to disk on a single server; a production deployment would need a database.

Would use again: Yes. The framework is appropriate for a prototype that combines UI and backend endpoints.

## Friction log

| Task | Expected vs observed | Severity | Workaround | Actionable suggestion |
|---|---|---|---|---|
| Keep camera access during a long build | Playback should be easy to recover; device discovery returned 401 after the token was no longer accepted | Medium | Generate a fresh Playground token, update .env.local and restart | Show token expiry and a clear reconnect path |
| Observe incoming activity | Expected an event view; access-token mode hid the panel | Medium | Add DoorRelay's always-visible history | Keep an event status view in every auth mode |
| Diagnose blank video | Session creation returned 201 while the panel was black | Medium | Compare the Playground and app, refresh credentials and observe actual playback | Distinguish session creation, connection and received frames |
| Understand polling | Hook comments suggested Ring API polling; the route read local webhook storage | Medium | Inspect the endpoint and correct the explanation | Name it local-store polling and document webhook setup separately |
| Receive button events | Expected normalized button_press; snapshot schema omitted that type | Medium | Accept validated JSON:API envelopes with a nonempty event type | Keep schemas aligned with current documented notifications |

## Feature requests
- Important: a simulator setup guide that explicitly covers video and notifications separately.
- Important: a connection-health view showing media received, not just session status.
- Nice-to-have: an official accessibility-focused example for household acknowledgments and helper handoffs.
