/**
 * PointPal Cloud Functions
 * Place at: functions/src/index.ts
 *
 * Deploy: firebase deploy --only functions
 */
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { beforeUserCreated } from "firebase-functions/v2/identity";
import { FieldValue } from "firebase-admin/firestore";

admin.initializeApp();
const db = admin.firestore();

const REWARD_AD = 0.05;          // USD per ad
const REWARD_TASK = 0.25;
const REWARD_REFERRAL = 0.20;
const SIGNUP_BONUS = 0.10;
const MIN_WITHDRAWAL = 5;
const AD_COOLDOWN_MS = 15_000;   // 15 seconds

function genReferralCode(): string {
  return Math.random().toString(36).substring(2, 9).toUpperCase();
}

// ──────────────────────────────────────────────────────────────────
// Auth trigger — create user profile + signup bonus + referral credit
// ──────────────────────────────────────────────────────────────────
export const onUserCreate = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);

  // Generate unique referral code
  let code = genReferralCode();
  for (let i = 0; i < 5; i++) {
    const dup = await db.collection("users").where("referralCode", "==", code).limit(1).get();
    if (dup.empty) break;
    code = genReferralCode();
  }

  await userRef.set({
    email: user.email ?? "",
    displayName: user.displayName ?? (user.email?.split("@")[0] ?? "user"),
    referralCode: code,
    balance: SIGNUP_BONUS,
    totalEarned: SIGNUP_BONUS,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection("earnings").doc(user.uid).collection("logs").add({
    type: "signup_bonus",
    amount: SIGNUP_BONUS,
    createdAt: FieldValue.serverTimestamp(),
  });
});

// ──────────────────────────────────────────────────────────────────
// rewardAd — called from client after a rewarded ad completes
// ──────────────────────────────────────────────────────────────────
export const rewardAd = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first");

  return db.runTransaction(async (tx) => {
    const ref = db.collection("users").doc(uid);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "User missing");

    const last = snap.get("lastRewardAt") as admin.firestore.Timestamp | undefined;
    if (last && Date.now() - last.toMillis() < AD_COOLDOWN_MS) {
      throw new HttpsError("resource-exhausted", "Cooldown active");
    }

    tx.update(ref, {
      balance: FieldValue.increment(REWARD_AD),
      totalEarned: FieldValue.increment(REWARD_AD),
      lastRewardAt: FieldValue.serverTimestamp(),
    });
    tx.set(db.collection("earnings").doc(uid).collection("logs").doc(), {
      type: "rewarded_ad",
      amount: REWARD_AD,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { newBalance: (snap.get("balance") ?? 0) + REWARD_AD };
  });
});

// ──────────────────────────────────────────────────────────────────
// claimReferralBonus — called by client after signup with a code
// ──────────────────────────────────────────────────────────────────
export const claimReferralBonus = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first");

  const code = (req.data?.code ?? "").toString().toUpperCase().trim();
  if (!code) throw new HttpsError("invalid-argument", "code required");

  const userSnap = await db.collection("users").doc(uid).get();
  if (userSnap.get("referredBy")) {
    throw new HttpsError("already-exists", "Referral already claimed");
  }

  const referrer = await db.collection("users").where("referralCode", "==", code).limit(1).get();
  if (referrer.empty) throw new HttpsError("not-found", "Code invalid");
  const refDoc = referrer.docs[0];
  if (refDoc.id === uid) throw new HttpsError("invalid-argument", "Cannot refer self");

  const batch = db.batch();
  batch.update(userSnap.ref, { referredBy: refDoc.id });
  batch.update(refDoc.ref, {
    balance: FieldValue.increment(REWARD_REFERRAL),
    totalEarned: FieldValue.increment(REWARD_REFERRAL),
  });
  batch.set(db.collection("earnings").doc(refDoc.id).collection("logs").doc(), {
    type: "referral_bonus",
    amount: REWARD_REFERRAL,
    meta: { referredUser: uid },
    createdAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  return { ok: true };
});

// ──────────────────────────────────────────────────────────────────
// requestWithdrawal — debits balance and creates a pending payout
// ──────────────────────────────────────────────────────────────────
export const requestWithdrawal = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Sign in first");

  const amount = Number(req.data?.amount);
  const method = String(req.data?.method ?? "");
  const account = String(req.data?.account ?? "");

  if (!Number.isFinite(amount) || amount < MIN_WITHDRAWAL) {
    throw new HttpsError("invalid-argument", `Minimum is ${MIN_WITHDRAWAL}`);
  }
  if (!method || !account) {
    throw new HttpsError("invalid-argument", "method and account required");
  }

  return db.runTransaction(async (tx) => {
    const ref = db.collection("users").doc(uid);
    const snap = await tx.get(ref);
    const bal = (snap.get("balance") ?? 0) as number;
    if (bal < amount) throw new HttpsError("failed-precondition", "Insufficient balance");

    tx.update(ref, { balance: FieldValue.increment(-amount) });

    const wRef = db.collection("withdrawals").doc();
    tx.set(wRef, {
      userId: uid,
      amount,
      method,
      accountDetails: account,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { withdrawalId: wRef.id };
  });
});
