# EC2 environment checklist

Use this when setting up `.env.production` on your EC2 instance.

---

## File and location

- **Filename:** `.env.production` (Next.js loads this when `NODE_ENV=production`).
- **Path on EC2:** e.g. `/home/ec2-user/evcare-admin/.env.production`.

---

## Required variables

| Variable | Example | Notes |
|----------|---------|--------|
| `DATABASE_URL` | `postgresql://evcare_admin:PASSWORD@evcare-db.xxxx.us-east-2.rds.amazonaws.com:5432/evcare?sslmode=require` | RDS endpoint; **must** include `?sslmode=require` for RDS. |
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | `us-east-2_SNsFTVA6g` | From Cognito → User pools → your pool. |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Your app client ID | Same pool → App integration → App clients. |
| `AWS_REGION` | `us-east-2` | Must match RDS, SES, Cognito (US East Ohio). |

---

## Optional (S3, SES, logging)

| Variable | Example |
|----------|---------|
| `EVCARE_S3_BUCKET` | `evcare-reports` |
| `EVCARE_ALERT_FROM` | `vishwagohil21@gmail.com` (must be verified in SES) |
| `EVCARE_ALERT_EMAIL` | `vishwagohil21@gmail.com` (fallback for battery alerts) |
| `EVCARE_LOG_GROUP` | `/evcare/admin` |
| `EVCARE_LOG_STREAM` | `api` |

---

## Do **not** put AWS keys in EC2 .env

On EC2 you should **not** set:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

**Reason:** The app should use the **IAM role** attached to the EC2 instance (`evcare-ec2-role`). The AWS SDK picks up credentials from the instance metadata automatically. If you set env keys, they override the role and you risk leaking long‑lived keys.

**What to do:**

1. In AWS Console: **EC2 → Instances → select your instance → Actions → Security → Modify IAM role** → attach **evcare-ec2-role** (or your app role with S3, SES, CloudWatch, Secrets Manager).
2. On the EC2 box: ensure `.env.production` does **not** contain `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`.
3. Restart the app after changing the env or IAM role: `pm2 restart all`.

---

## Quick check

After editing `.env.production` on EC2:

```bash
# Should NOT appear in the file
grep -E "AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY" .env.production && echo "Remove these from .env on EC2"

# Required vars (no output = missing)
grep -E "DATABASE_URL|NEXT_PUBLIC_COGNITO_USER_POOL_ID|NEXT_PUBLIC_COGNITO_CLIENT_ID|AWS_REGION" .env.production
```

Then rebuild and restart:

```bash
npm run build
pm2 restart all
```
