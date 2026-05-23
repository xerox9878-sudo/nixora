# 07 — Growth Plan (First 1,000 Users)

## Phase 0 — MVP shipped
You have: auth, ads, balance, referral, withdrawals. Done. Don't add features
yet — push for distribution first.

## Phase 1 — Quality (week 1)
- Add Firebase Crashlytics and Analytics.
- Verify <2s cold start on a low-end Android (Tecno Spark 8).
- Cap rewarded ad cooldown at 15s — sweet spot for retention.
- Wire daily push notification ("Your daily tasks are ready").

## Phase 2 — First 100 users (week 2)
**Channels that actually work for rewards apps:**
1. **University WhatsApp / Telegram groups** — direct DM to admins offering
   them a $5 listing fee + first-user-boost referral code.
2. **TikTok/Reels** — 15–30s screen recording of a withdrawal hitting M-Pesa /
   Telebirr. Caption with the referral code.
3. **Local Facebook groups** — "side hustle" / "campus money" niches.

Track signups by **utm campaign** baked into the install link.

## Phase 3 — Viral loop (weeks 3–4)
- Referral leaderboard (top 10 of the week → $5 bonus).
- 7-day streak bonus (login each day → +$0.50 on day 7).
- "Boost hour": double rewards Friday 19:00–21:00 — share in your Telegram.

## Phase 4 — Retention (week 4+)
- Email/push if user inactive 3 days: "Your friend X just cashed out".
- Tier system silver/gold based on lifetime earnings — no monetary promise.

## Channels to AVOID
- **Paid Facebook/Google ads** — your CPI will exceed your AdMob LTV.
- **Reward-stacking forums** — they bring fraud, get you banned.
- **Sub-promising "guaranteed ROI"** — Play Store will pull your listing.

## Unit economics sanity check
- Average user watches 8 ads/day = $0.40 reward + ~$0.20 AdMob revenue.
- You lose ~$0.20/active user/day. Make it back through referrals
  (each referrer brings 1.5 users) and banner+interstitial ads.
- **Target**: LTV > $1.20 per user before week 4. If not, lower per-ad reward.

## Withdrawal hygiene
- Hold first withdrawal 7 days (fraud window).
- Manual review for any payout >$20.
- Reject duplicate device IDs (use Play Integrity API).
