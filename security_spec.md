# Security Specification — Life in Accra

## 1. Data Invariants

1. **Default-Deny Catch-All**: All paths not explicitly matched under `/databases/{database}/documents` are unconditionally denied (`allow read, write: if false;`).
2. **Verified Identity**: Every authenticated read/write operation requires `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Document IDs `{userId}` must satisfy `isValidId(userId)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Private User Saves (`/users/{userId}`)**:
   - Strictly isolated to the owner (`request.auth.uid == userId`). Non-owners cannot `get`, `list`, `create`, `update`, or `delete` another user's private save.
   - `list` is strictly forbidden on `/users`.
   - `ownerId` in payload must equal `request.auth.uid` and is immutable on update.
   - `createdAt` must equal `request.time` on create and is immutable on update (`incoming().createdAt == existing().createdAt`).
   - `updatedAt` must equal `request.time` on both create and update.
   - All keys must strictly match the `UserSave` schema (`hasAll` and `hasOnly`), preventing shadow fields.
   - `recentLogs` is bounded (`size() >= 1 && size() <= 20`) with string length enforcement (`recentLogs[0] is string && recentLogs[0].size() <= 200`).
5. **Public Resident Profiles (`/publicProfiles/{userId}`)**:
   - Contains zero PII (only game persona fields: `ownerId`, `playerId`, `displayName`, `houseName`, `career`, `day`, `status`, `createdAt`, `updatedAt`).
   - `get` is allowed for any signed-in, email-verified user with a valid `userId` path parameter.
   - `list` is strictly forbidden to prevent bulk scraping.
   - `create`, `update`, and `delete` are strictly restricted to the owner (`request.auth.uid == userId`) and validated by `isValidPublicProfile(incoming())`.
   - Updates must preserve immutable fields (`ownerId`, `playerId`, `createdAt`) and use explicit `affectedKeys().hasOnly(...)` action gates.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Identity Spoofing on UserSave Create**: Authenticated user `user_A` attempts to create `/users/user_A` with `ownerId: "user_B"`.
2. **Payload 2 — Cross-Tenant Save Overwrite**: Authenticated user `user_A` attempts to write to `/users/user_B`.
3. **Payload 3 — Unverified Email Spoof**: Authenticated user `user_A` with `email_verified: false` attempts to create `/users/user_A`.
4. **Payload 4 — Shadow / Ghost Field Injection on Create**: Payload for `/users/user_A` includes an undeclared field `"isAdmin": true`.
5. **Payload 5 — Shadow / Ghost Field Injection on Update**: Update payload for `/users/user_A` injects `"vipBonus": 999999`.
6. **Payload 6 — Value Poisoning on Whitelisted Key**: Update payload for `/users/user_A` sets `money: "infinite_gold"` (string instead of integer) or negative `money: -500`.
7. **Payload 7 — Resource / String Size Exhaustion (Denial of Wallet)**: Payload for `/users/user_A` sets `name` to a 5,000-character string (exceeding `maxLength: 32`).
8. **Payload 8 — Unbounded Array / Type Poisoning**: Payload for `/users/user_A` sets `recentLogs` to an array of 50 items (exceeding max 20) or `recentLogs: [12345]`.
9. **Payload 9 — Immutable Field Tampering (`ownerId` / `createdAt`)**: Update payload for `/users/user_A` modifies `createdAt` or `ownerId`.
10. **Payload 10 — Forged Client Timestamp**: Create or update payload for `/users/user_A` supplies a past/future timestamp instead of `request.time`.
11. **Payload 11 — Unauthorized Private Save Read (PII / Private State Leak)**: Authenticated user `user_B` attempts `get` on `/users/user_A`.
12. **Payload 12 — Unauthorized Collection Listing (Scraping Attack)**: Authenticated user `user_A` attempts `list` on `/users` or `/publicProfiles`.

---

## 3. Red Team Conflict Report

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Validation Helper in Update | Value Poisoning |
|---|---|---|---|---|---|
| `/users/{userId}` | Blocked (`isOwner(userId)` + `data.ownerId == request.auth.uid` + immutable check) | Blocked (`affectedKeys().hasOnly(...)` + enum checks on `career` & `location`) | Blocked (`isValidId(userId)` + `.size()` on every string & list) | Enforced (`isValidUserSave(incoming())` wraps entire `allow update`) | Blocked (`is int` + min/max bounds on all numeric stats) |
| `/publicProfiles/{userId}` | Blocked (`isOwner(userId)` + `data.ownerId == request.auth.uid` + immutable check) | Blocked (`affectedKeys().hasOnly(...)` + enum check on `career`) | Blocked (`isValidId(userId)` + `.size()` on all strings) | Enforced (`isValidPublicProfile(incoming())` wraps entire `allow update`) | Blocked (`is string` / `is int` + length/range bounds) |
