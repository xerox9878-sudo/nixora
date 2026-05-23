# PointPal — Documentation Package

This folder is the **native Android + Firebase** blueprint that accompanies the
PointPal web app. Lovable cannot build or compile native Android code, so the
material here is meant to be opened in **Android Studio** and **Firebase
Console** by you (or a developer).

## Contents

| File | What it covers |
|---|---|
| [`01-android-blueprint.md`](./01-android-blueprint.md) | Android Studio project layout, Gradle dependencies, screens, and Kotlin skeleton |
| [`02-firebase-setup.md`](./02-firebase-setup.md) | Click-by-click Firebase console setup (Auth, Firestore, Functions, AdMob) |
| [`03-firestore-schema.md`](./03-firestore-schema.md) | Collections, fields, indexes |
| [`04-security-rules.md`](./04-security-rules.md) | Firestore security rules — copy-paste ready |
| [`05-cloud-functions/`](./05-cloud-functions/) | Node.js Cloud Functions for rewardAd, referralReward, withdraw |
| [`06-admob-integration.md`](./06-admob-integration.md) | AdMob setup and rewarded-ad implementation |
| [`07-growth-plan.md`](./07-growth-plan.md) | Launch + first 1,000 users playbook |
| [`08-compliance.md`](./08-compliance.md) | AdMob policy compliance — what to say and what to avoid |

## How this maps to the web app

The PointPal web app you can preview in Lovable is the **same product** with
the same data model. The Firebase setup mirrors what's already live in the
Lovable Cloud (Supabase) backend — tables, RPCs, and rules are 1:1 with the
Firestore collections and rules described here.

You can ship either or both:
- **Web (this repo)** — installable PWA, uses Google AdSense.
- **Native Android (this docs folder)** — uses Google AdMob (much higher RPM).
