# EVCare – AWS Setup for Phase 4

Run these steps to enable S3 exports, SES alerts, and CloudWatch logging. Requires AWS CLI configured (`aws configure`) with appropriate credentials.

---

## 1. S3 Bucket

```bash
aws s3 mb s3://evcare-reports --region us-east-2
```

Optional: block public access (recommended for reports)

```bash
aws s3api put-public-access-block \
  --bucket evcare-reports \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

Add to `.env.local`:

```
EVCARE_S3_BUCKET=evcare-reports
```

---

## 2. SES (Email Alerts)

### 2a. Verify sender email

In **AWS Console** → SES → Verified identities → Create identity:

- Identity type: **Email address**
- Email: `noreply@yourdomain.com` (or use the address you control)

After verification, set in `.env.local`:

```
EVCARE_ALERT_FROM=noreply@yourdomain.com
```

### 2b. Verify recipient (for sandbox)

In SES sandbox, you can only send to **verified** addresses. Add the recipient email as a verified identity (same steps as above).

Then set:

```
EVCARE_ALERT_EMAIL=your-verified-email@example.com
```

### 2c. Leave sandbox (optional, for production)

SES → Account dashboard → Request production access. Until approved, you can only send to verified addresses.

---

## 3. CloudWatch Logs

```bash
aws logs create-log-group --log-group-name /evcare/admin --region us-east-2
aws logs create-log-stream --log-group-name /evcare/admin --log-stream-name api --region us-east-2
```

Add to `.env.local` (optional; these are the defaults):

```
EVCARE_LOG_GROUP=/evcare/admin
EVCARE_LOG_STREAM=api
```

---

## 4. IAM permissions (EC2 / app role)

If the app runs on EC2, ensure the instance role has:

- **S3**: `s3:PutObject` on `arn:aws:s3:::evcare-reports/*`
- **SES**: `ses:SendEmail`
- **CloudWatch Logs**: `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents` on `/evcare/admin`

For local dev with AWS credentials in `~/.aws/credentials`, your configured profile needs the same permissions.

---

## Summary

| Service   | Command / Action                                   | Env var                |
|----------|-----------------------------------------------------|------------------------|
| S3       | `aws s3 mb s3://evcare-reports --region us-east-2`  | `EVCARE_S3_BUCKET`     |
| SES      | Verify sender + recipient in SES console            | `EVCARE_ALERT_FROM`, `EVCARE_ALERT_EMAIL` |
| CloudWatch | `aws logs create-log-group` + `create-log-stream` | `EVCARE_LOG_GROUP`, `EVCARE_LOG_STREAM` |
