# Why am I not getting the low battery health email?

Use this checklist to find the cause.

---

## 1. When does the alert run?

- **When you add a vehicle:** If you set battery health **below 50%** on add, an email is sent (if recipient and SES are configured).
- **When you edit a vehicle:** An email is sent only when battery health **crosses below 50%** in that edit (e.g. 55 → 45 or 100 → 40). If it was already below 50% and you save again (e.g. 40 → 35), no second email.

**Quick test:** Add a vehicle with battery health **45%** and save — you should get one email. Or add with 100%, then edit to 45% and save — you should get one email.

---

## 2. No recipient email

The app sends to: **Cognito user’s email** from the token, or **`EVCARE_ALERT_EMAIL`** if the token has no email.

- Check `.env.production` (or `.env.local`) has:  
  `EVCARE_ALERT_EMAIL=vishwagohil21@gmail.com`
- If the token has no `email` and this is missing, the app logs:  
  **"Battery alert skipped: no recipient email"** and does not send.

**Fix:** Set `EVCARE_ALERT_EMAIL` to your email so you always get alerts even if the token lacks email.

---

## 3. `AWS_REGION` not set

- The alert block runs only when `process.env.AWS_REGION` is set (e.g. `us-east-2`).
- If it’s missing, no SES call is made.

**Fix:** In your env file add: `AWS_REGION=us-east-2`

---

## 4. SES: From address not verified

- **From** address is `EVCARE_ALERT_FROM` (e.g. `vishwagohil21@gmail.com`).
- This address must be **verified** in Amazon SES (Verified identities → Identity status: Verified).

**Fix:** In AWS Console → SES → Verified identities, verify the address you use in `EVCARE_ALERT_FROM`.

---

## 5. SES sandbox: To address must be verified

- In SES **sandbox**, you can only send **to** verified addresses.
- So the recipient (`auth.email` or `EVCARE_ALERT_EMAIL`) must also be verified in SES.

**Fix:** In SES → Verified identities, add and verify the email where you expect the alert (e.g. `vishwagohil21@gmail.com`). Request production access if you need to send to any address.

---

## 6. SES send failing (permissions / region)

- EC2 must have **IAM permission** `ses:SendEmail` (e.g. via `evcare-ec2-role`).
- SES client uses `AWS_REGION`; it must match the region where your identity is verified (e.g. `us-east-2`).

**Check:** On the server, look at logs when you trigger the alert. If SES fails you’ll see:  
**"SES send failed:"** followed by the error. Fix the error (e.g. wrong region, identity not in that region, or missing IAM permission).

---

## 7. Check server logs

When you edit a vehicle and set battery health below 50%, check:

- **"Battery alert sent"** (info) → email was sent (then check spam / SES).
- **"Battery alert skipped: no recipient email"** → set `EVCARE_ALERT_EMAIL` or fix Cognito email.
- **"SES send failed:"** → fix SES (verified identities, sandbox To, IAM, region).

On EC2 with PM2:

```bash
pm2 logs
# or
pm2 logs --lines 100
```

---

## 8. Run the AWS checker

From the project root (with the same env as the app):

```bash
node scripts/check-aws-resources.js
```

Fix any SES warning it reports (e.g. From address not verified).

---

## Summary table

| Cause | What to do |
|-------|------------|
| You **added** a vehicle with low battery | You should get an email on add. If not, check recipient email, AWS_REGION, and SES (see below). |
| On **edit**: vehicle was already &lt;50% and you saved again | Alert sends only when crossing below 50%. Edit a vehicle that’s currently ≥50% and set to &lt;50%. |
| No recipient email | Set `EVCARE_ALERT_EMAIL` in env. |
| `AWS_REGION` missing | Set `AWS_REGION=us-east-2` in env. |
| From address not verified | Verify `EVCARE_ALERT_FROM` in SES. |
| SES sandbox, To not verified | Verify the recipient email in SES or request production access. |
| SES error in logs | Fix IAM, region, or identity as indicated by the error. |
