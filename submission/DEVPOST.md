# DoorRelay

## Elevator pitch
Accessible doorbell alerts that help households know someone is there—and who is answering.

## Inspiration
A doorbell sound does not reach everyone. For a Deaf or hard-of-hearing resident, and for households that share caregiving responsibilities, seeing activity is only part of the problem. Someone also needs to acknowledge it and make clear who is responding. DoorRelay explores that shared response.

## What it does
DoorRelay combines a Ring camera view with visible activity cards and a resident/helper dashboard. A resident can say “I’ll answer” or request a household helper. The helper accepts the handoff in their open dashboard, and both views show the response. If no helper accepts within 45 seconds, the visit is marked “needs attention.” Completed visits remain in the history across restarts on the same server disk.

## How we built it
The prototype extends Amazon's Ring API Hello World starter with Next.js, React and TypeScript. Ring API device discovery and WebRTC/WHEP video streaming run through backend routes so credentials stay on the server. The webhook receiver verifies Ring's raw-body HMAC-SHA256 signature, validates the payload and rejects retained duplicates before distributing events over Server-Sent Events. A shared response API coordinates the handoff; responses poll every two seconds. Bounded JSON storage persists up to 200 events and their response status on a single Node server.

The local demo controls are explicitly labeled and kept distinct from signed webhook arrivals. They allow the household workflow to be tested independently of Ring account setup.

## Challenges
A working Ring video session did not mean event delivery was configured. The starter's access-token view hid its event panel, and its events endpoint read a local webhook store rather than polling Ring. We exposed those differences in the interface and documentation. Short-lived Playground tokens also interrupted camera discovery during longer build sessions. The app now keeps household controls available when the camera needs a fresh token.

## Accomplishments
We built and production-compiled the prototype, verified response transitions and duplicate handling, and tested a resident/helper handoff in two independent browser sessions. The helper's acceptance and resolution appeared in the resident's view, and reloading retained the response. The mobile layout was checked at a 390px viewport.

## What we learned
Integrations need separate evidence for authentication, video playback, incoming events and shared state. Clear test-data labels make a prototype easier to evaluate honestly.

## What's next
Validate the interaction with Deaf and hard-of-hearing residents, add individual household membership, move storage to a database for multiple server instances, and add opt-in background notifications. Ring partner webhook delivery must be verified in the target account before claiming automatic device-to-helper alerts.

## Submission fields
- Primary track: Ring
- AWS Builder mini challenge: Not entered in this build; no AWS integration claimed.
- Open Source mini challenge: Not claimed without an additional qualifying contribution and its URL.
- Built with: Next.js, React, TypeScript, Node.js, Ring Partner API, WebRTC/WHEP, Server-Sent Events, Tailwind CSS, Zod.
- Source attribution: https://github.com/AmazonAppDev/ring-api-helloworld (MIT).
- New work: DoorRelay dashboard, shared household responses, help timeout, persistence, signed webhook handling, access protection and documentation built during the hackathon.

## Finish before posting
1. Replace this checklist with the actual GitHub repository URL and public English YouTube/Vimeo demo URL.
2. Record the submitted build showing actual Ring Playground playback (or a Ring device) and the shared workflow. Say explicitly when a visit is locally generated.
3. Do not describe partner webhook delivery as verified unless the target Ring account has actually delivered an event to this receiver.
4. Attach product feedback. If using a private repo, add testing@devpost.com and the named Amazon reviewers from the rules at submission time.
