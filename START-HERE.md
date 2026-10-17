# Install the completed prototype update

1. Download `doorrelay-ready.zip` on your Mac. Leave it in Downloads.
2. In the currently running app's VS Code terminal, press Control+C once to stop it.
3. Run these commands separately:

```bash
unzip -o ~/Downloads/doorrelay-ready.zip -d ~/doorrelay
cd ~/doorrelay
npm ci
npm run dev
```

This archive contains no `.env.local`, so your existing local tokens are preserved. It includes the full source, build configuration, MIT license, README, and submission materials. Your `.git` folder is also preserved.

4. Open http://localhost:3000 in Chrome.
5. Open Demo controls → Create local test visit. In a second tab, choose Helper. In the Resident tab choose Request helper; in Helper choose I can help, then Mark handled. This is a clearly labeled local workflow test.
6. For the Ring-track recording, generate a fresh token in the official Ring Playground, replace the value after `RING_ACCESS_TOKEN=` in `.env.local`, save and restart the server. Start camera view and confirm actual video playback.
7. Record the real screen using the outline in `submission/DEMO_SCRIPT.md`. Publish the English video under three minutes on YouTube or Vimeo. The file `submission/DEVPOST.md` contains the submission draft; `submission/FEEDBACK.md` contains product feedback and observed friction.

Keep the terminal running while using DoorRelay. No API key or password should be pasted into chat, committed to GitHub or shown in the recording.
