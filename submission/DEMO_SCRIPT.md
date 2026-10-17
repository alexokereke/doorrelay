# DoorRelay recording outline — target 2:35

Record the real app screen in English, with two browser windows: Resident and Helper. Do not show tokens or passwords. Keep the final video under three minutes and upload it publicly to YouTube or Vimeo.

## Before recording
- Run this exact build locally. Set a fresh Ring Playground token and restart it.
- Start Camera view and verify the Ring Playground footage actually plays. A blank panel or “session created” is not playback evidence.
- Set the resident name to Chinaza and the helper name to Household helper.
- Arrange the two windows side by side. Open Demo controls on Resident.
- Verify Request helper → I can help → Mark handled works once before recording.

## Narration and actions

0:00–0:20 — “A doorbell sound does not reach everyone. DoorRelay helps a resident see activity and coordinate with a household helper, with a shared answer to one question: who is handling the door?” Show the dashboard and names.

0:20–0:45 — “This camera view is connected to the official Ring Playground through Ring's device and streaming APIs. Here is the simulator footage playing inside DoorRelay.” Show the moving video and briefly point to the camera status. Do not claim a local file is a Ring stream.

0:45–1:15 — “For this household workflow demonstration, I’m creating a clearly labeled local test visit. This does not represent a Ring-originated notification.” Click Create local test visit. Show the LOCAL TEST EVENT label. Click Request helper in Resident.

1:15–1:40 — “The helper sees the request in their open dashboard and accepts. Both views now show who is responding.” Click I can help in Helper. Show both views, then Mark handled. Show history.

1:40–2:00 — “The response is saved on the server, so it remains after a reload.” Reload Resident. Show the handled status. If showing the timeout, use a separate unanswered request, wait 45 seconds, and edit out the wait with a visible “45 seconds later” label.

2:00–2:20 — “The backend also implements signature verification for Ring partner webhooks. We tested the verification and duplicate-delivery logic with protocol fixtures. We have not yet verified a partner notification from our target Ring account.” Only replace the last sentence if you actually verify that account.

2:20–2:35 — “This prototype supports open-dashboard coordination. Next we want to test it with Deaf and hard-of-hearing residents and add opt-in background notifications. DoorRelay makes the household response visible.”

## Required evidence
The final video must include actual Ring simulator/device playback or actual Ring event delivery. A recording containing only local test visits does not demonstrate the track integration. The code includes real Ring calls; the video must show them working too.
