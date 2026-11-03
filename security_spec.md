# Security Specification (`security_spec.md`)

## 1. Data Invariants

1. **Global Default-Deny**: All paths not explicitly matched (`/{document=**}`) deny all read and write access (`if false`).
2. **Path Variable Hardening**: Every single-document target (`get`, `create`, `update`, `delete`) validates its path ID using `isValidId(id)` (`id is string && id.size() >= 1 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
3. **PII Isolation (`/users/{userId}`)**: User documents contain `email` and subscription state. `get` is strictly limited to `isOwner(userId) || isAdmin()`. `list` is strictly limited to `isAdmin()`. Blanket `isSignedIn()` reads on `/users` are prohibited.
4. **Privilege Escalation Prevention**: Regular users creating their `/users/{userId}` document must set `role == 'user'` and `plan == 'free'` unless `isAdmin()` is true. Users cannot self-assign `role: 'admin'` on creation or update.
5. **CV Ownership & Relational Sync (`/cvs/{cvId}`)**:
   - A CV document can only be created if `incoming().userId == request.auth.uid`, `incoming().id == cvId`, and `exists(/databases/$(database)/documents/users/$(request.auth.uid))` is true.
   - `get` is restricted to `existing().userId == request.auth.uid || isAdmin()`.
   - `list` enforces `resource.data.userId == request.auth.uid || isAdmin()` without any `get()` or `exists()` calls inside `allow list`.
   - `update` requires `incoming().userId == existing().userId`, `incoming().id == existing().id`, `incoming().createdAt == existing().createdAt`, and `incoming().updatedAt == request.time`.
6. **Template Governance (`/templates/{templateId}`)**:
   - Authenticated users can `get` and `list` templates (`resource.data.id is string && resource.data.id.size() <= 64`).
   - Only `isAdmin()` can `create`, `update`, or `delete` templates, or seed initial templates if the template meets strict schema validation and user is admin.
7. **Temporal Integrity**: All `create` operations require `incoming().createdAt == request.time && incoming().updatedAt == request.time`. All `update` operations require `incoming().updatedAt == request.time && incoming().createdAt == existing().createdAt`.
8. **Total Array Guarding**: All array fields (`experience`, `education`, `skills`, `skillGroups`, `projects`, `languages`, `certifications`) enforce strict maximum `.size()` bounds and first-element type validation when non-empty.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Shadow Field Injection on User Creation**:
   `{ uid: "user_1", email: "u@example.com", displayName: "Ali", role: "user", plan: "free", pdfExportsUsed: 0, createdAt: SERVER_TIME, updatedAt: SERVER_TIME, isSuperAdmin: true }` -> Rejected by `hasOnly()`.
2. **Payload 2 — Self-Assigned Admin Role on User Registration**:
   `{ uid: "user_1", email: "u@example.com", displayName: "Ali", role: "admin", plan: "free", pdfExportsUsed: 0, createdAt: SERVER_TIME, updatedAt: SERVER_TIME }` -> Rejected because non-admin cannot set `role: "admin"`.
3. **Payload 3 — Unverified Admin Email Spoof**:
   Auth token has `email: "ZulqarnainShah25@gmail.com"`, `email_verified: false`. Attempts to list `/users` -> Rejected because `isAdmin()` requires `request.auth.token.email_verified == true`.
4. **Payload 4 — Cross-User PII Read on `/users/victim_uid`**:
   Authenticated as `attacker_uid`, performs `get(/users/victim_uid)` -> Rejected by `isOwner(userId) || isAdmin()`.
5. **Payload 5 — Blanket List Scraping on `/cvs`**:
   Authenticated as `attacker_uid`, executes `getDocs(collection(db, 'cvs'))` without `where('userId', '==', 'attacker_uid')` -> Rejected by `allow list` check `resource.data.userId == request.auth.uid`.
6. **Payload 6 — Identity Spoofing on CV Creation**:
   Authenticated as `attacker_uid`, creates `/cvs/cv_1` with `userId: "victim_uid"` -> Rejected by `incoming().userId == request.auth.uid`.
7. **Payload 7 — Orphaned CV Creation Without User Profile**:
   Authenticated as `new_uid` (no `/users/new_uid` doc exists), creates `/cvs/cv_1` -> Rejected by `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
8. **Payload 8 — Immutable Field Tampering (`createdAt` / `userId`) on CV Update**:
   Updates `/cvs/cv_1` changing `createdAt` or `userId` -> Rejected by `incoming().createdAt == existing().createdAt && incoming().userId == existing().userId`.
9. **Payload 9 — Client Timestamp Forgery**:
   Creates `/cvs/cv_1` with `createdAt: Timestamp.fromMillis(1000000)` instead of `serverTimestamp()` -> Rejected by `incoming().createdAt == request.time`.
10. **Payload 10 — Denial-of-Wallet Oversized String / ID Poisoning**:
    Creates `/cvs/invalid$id!` or sets `summary` to a 50,000-char string -> Rejected by `isValidId(cvId)` and `data.summary.size() <= 4000`.
11. **Payload 11 — Array Type Poisoning on CV Skills**:
    Updates `/cvs/cv_1` with `skills: [12345, true]` -> Rejected by `(data.skills.size() == 0 || data.skills[0] is string)`.
12. **Payload 12 — Unauthorized Template Modification by Non-Admin**:
    Regular user attempts `delete(/templates/modern)` or `update(/templates/modern)` -> Rejected by `isAdmin()`.
