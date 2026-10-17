# DoorRelay

**Tagline:** A visible alert. A clear handoff. Someone on their way.

## Inspiration
A door alert tells a household that something happened, but it does not tell everyone who will respond. DoorRelay explores a simple resident-to-helper handoff, particularly for people who may need assistance getting to the door.

## What it does
DoorRelay combines Ring simulator video with a shared visit-response workflow. A resident can answer, request a helper, or mark a visit handled. A helper can accept the request, and both views show the response. Unaccepted requests become “needs attention” after 45 seconds, on the next server read.

## How we built it
The project builds on Amazon's MIT-licensed Ring hello-world sample. Server routes call Ring device discovery and WHEP session APIs; the browser plays video through WebRTC. React and TypeScript provide the interface. The hosted edition uses Vinext on Cloudflare Workers and D1 for durable visit history and responses. Optimistic revision checks reject competing updates. Ring tokens are validated before encrypted server-side storage.

The webhook receiver validates HMAC-SHA256 signatures and deduplicates events. The private hosted deployment does not receive external Ring webhooks. Demonstration visits are clearly labeled local demo events, separate from Ring simulator footage. Video playback does not imply Ring notification delivery.

## Challenges
We resolved expired-token errors with a reconnect form, migrated process-local history to durable storage, and added conflict handling so two helpers cannot silently overwrite each other's response. We separated preview events, local demo events and Ring video to make the demonstration honest and understandable.

## Accomplishments
Hosted Ring simulator playback is working and was confirmed by the owner. The prototype includes durable coordination state, helper acceptance, timeout status and explicit event provenance. TypeScript and production builds pass. A verification script exercises storage, competing acceptance, encryption, disconnect, cross-site checks and signed webhook fixtures.

## What we learned
Creating a stream session, displaying video, and receiving webhook notifications are different milestones. Clear status and a named responder are as important to a handoff as the initial alert.

## What's next
Separate authenticated household accounts, a publicly reachable authenticated Ring webhook receiver, opt-in background notifications, and usability testing with residents and helpers.

## Scope and access
Primary track: Ring. No mini challenge claimed. New DoorRelay functionality was built during the hackathon using the existing Amazon sample as a foundation. The site is owner-private; the repository and video are the reviewer deliverables. This is a prototype, not an emergency-response or access-control service. Role selection demonstrates behavior and is not account authentication.
