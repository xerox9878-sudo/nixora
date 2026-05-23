# 04 — Firestore Security Rules

Paste into Firestore Console → Rules tab.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isSelf(uid) { return isSignedIn() && request.auth.uid == uid; }
    function isAdmin() {
      return isSignedIn()
        && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // === USERS ===
    match /users/{userId} {
      // Read your own profile, or admins read all
      allow get: if isSelf(userId) || isAdmin();
      // Allow lookup by referralCode for any signed-in user
      allow list: if isSignedIn();

      // Users can update only displayName and (once) referredBy
      allow update: if isSelf(userId)
        && request.resource.data.diff(resource.data)
            .affectedKeys()
            .hasOnly(['displayName', 'referredBy'])
        && (resource.data.referredBy == null || request.resource.data.referredBy == resource.data.referredBy);

      // NEVER allow client to modify balance / totalEarned / referralCode
      allow create, delete: if false; // handled by Cloud Function on signup
    }

    // === EARNINGS (read-only for the user) ===
    match /earnings/{userId}/logs/{logId} {
      allow read: if isSelf(userId) || isAdmin();
      allow write: if false; // Cloud Functions only
    }

    // === WITHDRAWALS ===
    match /withdrawals/{wid} {
      allow read: if isSignedIn()
        && (resource.data.userId == request.auth.uid || isAdmin());

      // Client cannot create — must go through requestWithdrawal Cloud Function
      allow create: if false;

      // Only admins can update status
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data)
            .affectedKeys()
            .hasOnly(['status', 'notes', 'updatedAt']);

      allow delete: if false;
    }

    // === ADMINS ===
    match /admins/{uid} {
      allow read: if isAdmin();
      allow write: if false; // grant manually in console
    }

    // === PLATFORM ===
    match /platform/{doc} {
      allow read: if isAdmin();
      allow write: if false;
    }
  }
}
```

## Why this matters

- A malicious user with a debugger cannot do `firestore.doc('users/me').update({ balance: 1000000 })` — the rules reject it.
- All money movement goes through Cloud Functions, which run with admin privileges and enforce server-side validation.
- Withdrawal status can only be changed by an admin, preventing a user from marking their own withdrawal as `paid`.
