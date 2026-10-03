# Life in Accra

**Play:** https://desurfofficial-ship-it.github.io/lagos-life-ghana/

Single-player life simulation in Accra with deep NPC friends, wallets, visiting, and money transfer.
Now with **Firebase Auth + Cloud Save** foundation.

---

## Firebase Setup (Project: `perse-504514`)

### 1. Get your Web app config
1. Open [Firebase Console](https://console.firebase.google.com/project/perse-504514/settings/general)
2. Scroll to **Your apps** → create a **Web** app if needed
3. Copy the `firebaseConfig` values
4. Paste them into `firebase-config.js` and set `FIREBASE_READY = true`

### 2. Enable Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable:
   - **Anonymous** (for guests who want cloud save later)
   - **Email/Password**

### 3. Create Firestore database
1. Go to **Firestore Database** → Create database
2. Start in **production mode**
3. Choose a location close to Ghana (e.g. `europe-west` or `us-east1`)
4. Deploy the security rules from `firestore.rules`:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use perse-504514
npx -y firebase-tools@latest deploy --only firestore:rules
```

Or paste the rules manually in the Console under Firestore → Rules.

### 4. Authorized domains
Under Authentication → Settings → Authorized domains, make sure these are listed:
- `localhost`
- `desurfofficial-ship-it.github.io`
- `perse-504514.firebaseapp.com`

---

## Features

- Character + wallet + needs
- 10 Accra locations + careers
- 5 friends with houses, routines, moods, personalities
- Visit, chat, hang out, eat, deep talk, ask favors, send money
- Friendship milestones
- Local save (always works)
- Cloud save (when Firebase is configured)
- Account system with Player ID

---

## Roadmap

| Step | Status |
|------|--------|
| Single-player + rich NPCs | ✅ Done |
| Account foundation + local save | ✅ Done |
| Firebase Auth + Cloud save | 🔸 Code ready — needs your config |
| Real friends list + visiting | Next |
| Real-time chat & presence | Later |

---

## License

Open source. Built for Ghanaians.
