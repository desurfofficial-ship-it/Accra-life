# Life in Accra

**Play:** https://desurfofficial-ship-it.github.io/Accra-life/

Life simulation set in Accra with NPC friends, wallets, visiting, money transfer, and **Firebase cloud save**.

Firebase project: `perse-504514`

---

## Final setup checklist

### 1. Enable Email/Password Auth
1. Open [Authentication](https://console.firebase.google.com/project/perse-504514/authentication/providers)
2. Enable **Email/Password**

### 2. Create Firestore (if not done)
1. Open [Firestore](https://console.firebase.google.com/project/perse-504514/firestore)
2. Create database (production mode is fine)
3. Go to **Rules** tab and paste the contents of `firestore.rules`, then **Publish**

### 3. Authorized domains
Authentication → Settings → Authorized domains — add:
- `localhost`
- `desurfofficial-ship-it.github.io`

---

## How to play with cloud save

1. Open the game
2. Click **Create Account (Email)**
3. Enter email + password + display name
4. Play and press **Save** — progress goes to Firestore
5. On another device: **Sign In** with the same email → cloud load

Guest mode still works fully offline (localStorage only).

---

## Features

- 10 Accra locations + careers
- 5 friends with houses, routines, moods, personalities
- Visit, chat, hang out, eat together, deep talk, ask favors, send money
- Friendship milestones
- Local + cloud save
- Account system with Firebase Auth

---

## Roadmap

| Step | Status |
|------|--------|
| Single-player + rich NPCs | Done |
| Firebase Auth + Cloud save | Done (enable Auth + Rules) |
| Real friends list + visiting | Next |
| Real-time chat & presence | Later |
