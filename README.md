# Life in Accra

**Play:** https://desurfofficial-ship-it.github.io/lagos-life-ghana/

Single-player life simulation set in Accra with deep NPC friends, wallets, visiting, and money transfer.

---

## Current Features

- Character + wallet + needs system
- 10 Accra locations
- Careers with daily pay
- 5 friends with houses, routines, moods, personalities
- Visit friends, chat, hang out, eat together, deep talk, ask favors
- Send & receive money
- Friendship milestones
- Local save/load
- **Account foundation** (Guest or named account, persistent Player ID)

---

## Roadmap to Multiplayer

### Step 1 — Done (foundation)
- Single-player game with rich NPCs
- Account UI + Player ID
- Structured save format ready for cloud

### Step 2 — User accounts + Cloud save (next)
To enable real cloud saves across devices you need a backend.

**Recommended (easiest):**
1. Create a free [Firebase](https://console.firebase.google.com/) project
2. Enable **Authentication** (Email/Password or Anonymous)
3. Create a **Firestore** database
4. Add your Firebase config to the game
5. Uncomment/connect the cloud save functions

Alternative: [Supabase](https://supabase.com/) (similar free tier).

### Step 3 — Real friends list + visiting
Once accounts exist:
- Players can add each other by Player ID or username
- Visit another player's house (load their public house state)
- Basic presence (online/offline)

### Step 4 — Real-time chat & presence
- WebSockets or Firebase Realtime / Firestore listeners
- Live chat when visiting
- See who is online

---

## Tech

- Pure HTML/CSS/JS (no build step)
- localStorage for saves
- Architecture prepared for Firebase Auth + Firestore

---

## License

Open source. Built for Ghanaians.
