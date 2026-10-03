# Security Specification — Life in Accra

## 1. Data Invariants

1. **Default-Deny Catch-All**: The very first rule block inside `match /databases/{database}/documents` is `match /{document=**} { allow read, write: if false; }`.
2. **Verified Identity**: Every authenticated read/write operation requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Document IDs `{userId}` must satisfy `isValidId(userId)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Private Player Saves (`/players/{userId}`)**:
   - Strictly isolated to the owner (`request.auth.uid == userId`). Non-owners cannot `get`, `list`, `create`, `update`, or `delete` another player's private save.
   - `list` is strictly forbidden on `/players`.
   - `ownerId` in payload must equal `request.auth.uid` and is immutable on update.
   - `createdAt` must equal `request.time` on create and is immutable on update (`incoming().createdAt == existing().createdAt`).
   - `updatedAt` must equal `request.time` on both create and update.
   - All keys must strictly match the `Player` schema (`hasAll` and `hasOnly`), preventing shadow fields.
   - `recentLogs` is bounded (`size() >= 1 && size() <= 20`) with string length enforcement (`recentLogs[0] is string && recentLogs[0].size() <= 200`).
5. **Public Resident Profiles (`/profiles/{userId}`)**:
   - Contains zero PII (only game persona fields: `ownerId`, `playerId`, `displayName`, `houseName`, `career`, `day`, `status`, `createdAt`, `updatedAt`).
   - `get` is allowed for any signed-in, email-verified user with a valid `userId` path parameter.
   - `list` is strictly forbidden to prevent bulk scraping.
   - `create`, `update`, and `delete` are strictly restricted to the owner (`request.auth.uid == userId`) and validated by `isValidProfile(incoming())`.
   - Updates must preserve immutable fields (`ownerId`, `playerId`, `createdAt`) and use explicit `affectedKeys().hasOnly(...)` action gates.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Identity Spoofing on Player Create**: Authenticated user `user_A` attempts to create `/players/user_A` with `ownerId: "user_B"`.
2. **Payload 2 — Cross-Tenant Player Save Overwrite**: Authenticated user `user_A` attempts to write to `/players/user_B`.
3. **Payload 3 — Unverified Email Spoof**: Authenticated user `user_A` with `email_verified: false` attempts to create `/players/user_A`.
4. **Payload 4 — Shadow / Ghost Field Injection on Create**: Payload for `/players/user_A` includes an undeclared field `"isAdmin": true`.
5. **Payload 5 — Shadow / Ghost Field Injection on Update**: Update payload for `/players/user_A` injects `"vipBonus": 999999`.
6. **Payload 6 — Value Poisoning on Whitelisted Key**: Update payload for `/players/user_A` sets `money: "infinite_gold"` (string instead of integer) or negative `money: -500`.
7. **Payload 7 — Resource / String Size Exhaustion (Denial of Wallet)**: Payload for `/players/user_A` sets `name` to a 5,000-character string (exceeding `maxLength: 32`).
8. **Payload 8 — Unbounded Array / Type Poisoning**: Payload for `/players/user_A` sets `recentLogs` to an array of 50 items (exceeding max 20) or `recentLogs: [12345]`.
9. **Payload 9 — Immutable Field Tampering (`ownerId` / `createdAt`)**: Update payload for `/players/user_A` modifies `createdAt` or `ownerId`.
10. **Payload 10 — Forged Client Timestamp**: Create or update payload for `/players/user_A` supplies a past/future timestamp instead of `request.time`.
11. **Payload 11 — Unauthorized Private Save Read (PII / Private State Leak)**: Authenticated user `user_B` attempts `get` on `/players/user_A`.
12. **Payload 12 — Unauthorized Collection Listing (Scraping Attack)**: Authenticated user `user_A` attempts `list` on `/players` or `/profiles`.

---

## 3. Red Team Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Validation Helper in Update | Value Poisoning |
|---|---|---|---|---|---|
| `/players/{userId}` | Blocked (`isOwner(userId)` + `data.ownerId == request.auth.uid` + immutable check) | Blocked (`affectedKeys().hasOnly(...)` + enum checks on `career` & `location`) | Blocked (`isValidId(userId)` + `.size()` on every string & list) | Enforced (`isValidPlayer(incoming())` wraps entire `allow update`) | Blocked (`is int` + min/max bounds on all numeric stats) |
| `/profiles/{userId}` | Blocked (`isOwner(userId)` + `data.ownerId == request.auth.uid` + immutable check) | Blocked (`affectedKeys().hasOnly(...)` + enum check on `career`) | Blocked (`isValidId(userId)` + `.size()` on all strings) | Enforced (`isValidProfile(incoming())` wraps entire `allow update`) | Blocked (`is string` / `is int` + length/range bounds) |
