# 03 — Firestore Schema

All money fields are `number` (stored as cents-friendly `double`). Use server-side
math; never trust client values.

## `users/{userId}`

```ts
{
  email: string;
  displayName: string;
  referralCode: string;       // unique, 7 chars
  referredBy?: string;        // userId of referrer
  balance: number;            // current redeemable balance
  totalEarned: number;        // lifetime
  lastRewardAt?: Timestamp;   // for cooldown
  createdAt: Timestamp;
}
```

## `earnings/{userId}/logs/{logId}`

```ts
{
  type: "rewarded_ad" | "daily_task" | "referral_bonus" | "signup_bonus";
  amount: number;
  meta?: { [k: string]: any };
  createdAt: Timestamp;
}
```

## `withdrawals/{withdrawalId}`

```ts
{
  userId: string;
  amount: number;
  method: "mobile_money" | "bank" | "paypal";
  accountDetails: string;
  status: "pending" | "approved" | "rejected" | "paid";
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## `admins/{userId}`

Mere presence of the doc grants admin (read in security rules with `exists()`).

```ts
{ grantedAt: Timestamp }
```

## `platform/revenue` (singleton)

```ts
{
  adRevenue: number;
  taskRevenue: number;
  total: number;
  updatedAt: Timestamp;
}
```

## Required composite indexes

Create these in **Firestore → Indexes**:

| Collection | Fields | Used by |
|---|---|---|
| `withdrawals` | `userId ASC`, `createdAt DESC` | wallet history |
| `earnings/{uid}/logs` | (auto) `createdAt DESC` | earnings history |
