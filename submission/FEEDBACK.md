# Product feedback

## Ring Playground and Ring API
Used for device discovery and WHEP/WebRTC simulator playback. Moving footage gave a useful hardware-free integration milestone. Device discovery, session creation and actual playback needed separate diagnostics: HTTP success alone did not prove video was visible. Token expiry caused 401 errors; DoorRelay now offers a reconnect form with validation before storage. I would build with it again, with clearer token-lifetime and media troubleshooting guidance.

## Amazon Ring hello-world sample
Used as the MIT-licensed integration foundation. The sample accelerated device discovery, streaming and event handling. We encountered process-local event storage and cleanup concerns, access-token UI limitations, and ambiguity between event polling and webhook-store reads. DoorRelay adds durable storage, clear provenance, helper coordination and HMAC fixture validation. A sample that explicitly distinguishes simulator video from notifications would improve onboarding.

## React, TypeScript, Vinext and Cloudflare D1
Used for the interface, typed server routes and durable hosted state. The build and type checks gave fast feedback. Migrating disk/process storage to D1 required deliberate handling of concurrent helper updates and local database setup. The current edition includes migrations and a source-level verification script. I would use this stack again, while adding real household authentication before public deployment.

## ChatGPT/Codex and Sites
Used for implementation assistance, code review, test preparation, deployment and documentation. Helpful for iterating from screenshots and producing a working hosted prototype. Local versus hosted configuration, browser-session access and secret-handling boundaries required explicit checks. AI output was reviewed and tested; no AI-generated app recording is presented as a real demonstration.

## AWS
No AWS runtime integration or AWS Builder claim is made.

## Friction log
| Task | Expected vs observed | Severity | Workaround and suggestion |
|---|---|---|---|
| Connect camera | Expected video; expired token produced 401 | High | Added reconnect UI; show token expiry and renewal guidance in Playground |
| Start stream | Session could succeed while video stayed blank | High | Inspect actual playback separately; add media-health diagnostics |
| Receive activity | Simulator video did not establish webhook delivery | Medium | Label local test events; document video and notification setup separately |
| Share response | Process-local state was unsuitable for hosted persistence | High | D1 storage with revision checks; include a durable sample workflow |
| Demonstrate helper coordination | Role changes are not authenticated household membership | Medium | Keep owner-private; add real household authorization before public release |

## Feature requests
Important: a simulator notification path with signed sample payloads and delivery health. Important: diagnostics separating authentication, session creation and media playback. Nice-to-have: an accessible household handoff sample.
