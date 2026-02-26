# How to Find Everything in Your AWS Account (EVCare)

Use this to see what you have in AWS and where to find it.

---

## 1. Run the project’s checker script

From the project root:

```bash
node scripts/check-aws-resources.js
```

This uses your `.env.local` (or `.env`) and checks:

- S3 bucket exists
- SES account and verified email
- Secrets Manager secret (optional)
- CloudWatch log group/stream
- Cognito user pool and app client (if `@aws-sdk/client-cognito-identity-provider` is installed)

For Cognito without that package:

```bash
npm i @aws-sdk/client-cognito-identity-provider
node scripts/check-aws-resources.js
```

---

## 2. AWS Console – where to look

Use the same **region** as in your app (e.g. **us-east-2**). Switch region in the top-right of the Console.

| What you need | Console path |
|---------------|----------------|
| **Cognito User Pool** | **Cognito** → User pools → your pool (ID = `NEXT_PUBLIC_COGNITO_USER_POOL_ID`) |
| **Cognito App Client** | Same pool → **App integration** → App clients (ID = `NEXT_PUBLIC_COGNITO_CLIENT_ID`) |
| **RDS (PostgreSQL)** | **RDS** → Databases → your DB → **Connectivity & security** (endpoint, port) |
| **S3 bucket** | **S3** → Buckets → e.g. `evcare-reports` (`EVCARE_S3_BUCKET`) |
| **SES** | **Amazon SES** → **Verified identities** (email/domain for `EVCARE_ALERT_FROM`) |

### Battery alert email (SES) checklist

- **Region**: Must match your app (`AWS_REGION=us-east-2`). Your SES identity is in **US East (Ohio)**.
- **From address**: `EVCARE_ALERT_FROM` must be a **verified** SES identity (e.g. `vishwagohil21@gmail.com`). SES → Verified identities → the address must show **Verified**.
- **To address**: Alerts go to the logged-in user’s email from the Cognito token, or to `EVCARE_ALERT_EMAIL` if the token has no email. In SES **sandbox**, both From and To must be verified.
- **When it sends**: Only when you **update** a vehicle and battery health **crosses below 50%** (e.g. 55 → 45). It does not send again on every save below 50.
- **If no email arrives**: Run `node scripts/check-aws-resources.js` and fix any SES warning. Check server logs for “Battery alert skipped: no recipient email” or “SES send failed”.
| **Secrets Manager** | **Secrets Manager** → Secrets → e.g. `evcare/production/config` |
| **CloudWatch Logs** | **CloudWatch** → Log groups → e.g. `/evcare/admin` |
| **EC2 (app server)** | **EC2** → Instances → instance running Next.js |
| **Load balancer** | **EC2** → Load Balancers (or **Load Balancing** under **Load Balancers**) |

---

## 3. AWS CLI – list resources

Set your region (or use `--region` in each command):

```bash
export AWS_REGION=us-east-2
# Windows PowerShell:
# $env:AWS_REGION = "us-east-2"
```

Then run:

```bash
# Cognito user pools
aws cognito-idp list-user-pools --max-results 10 --region $AWS_REGION

# S3 buckets
aws s3 ls

# SES verified identities
aws ses list-identities --identity-type EmailAddress --region $AWS_REGION

# Secrets Manager (secret names)
aws secretsmanager list-secrets --region $AWS_REGION --query "SecretList[*].Name" --output table

# CloudWatch log groups
aws logs describe-log-groups --log-group-name-prefix "/evcare" --region $AWS_REGION --query "logGroups[*].logGroupName" --output table

# RDS instances
aws rds describe-db-instances --region $AWS_REGION --query "DBInstances[*].[DBInstanceIdentifier,Endpoint.Address]" --output table

# EC2 instances
aws ec2 describe-instances --region $AWS_REGION --query "Reservations[*].Instances[*].[InstanceId,State.Name,Tags[?Key=='Name'].Value|[0]]" --output table

# Load balancers
aws elbv2 describe-load-balancers --region $AWS_REGION --query "LoadBalancers[*].[LoadBalancerName,DNSName]" --output table
```

---

## 4. Match resources to your .env

| Env variable | What it is in AWS |
|--------------|--------------------|
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` | Cognito → User pool ID (e.g. `us-east-2_xxxxx`) |
| `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito → App client ID (pool → App integration) |
| `DATABASE_URL` | RDS endpoint, port, DB name, user, password; use `?sslmode=require` for RDS |
| `EVCARE_S3_BUCKET` | S3 bucket name |
| `EVCARE_ALERT_FROM` | SES verified email (or domain) |
| `EVCARE_SECRET_NAME` | Secrets Manager secret name |
| `EVCARE_LOG_GROUP` | CloudWatch log group name |
| `AWS_REGION` | Region where all these resources live (e.g. `us-east-2`) |

---

## 5. Credentials

- **Local:** AWS CLI profile or env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`), or `aws configure`.
- **EC2:** IAM role attached to the instance (no keys in `.env` on the server).

Check who you’re using:

```bash
aws sts get-caller-identity
```

---

## 6. Quick checklist

- [ ] Region is correct everywhere (Console + `.env`).
- [ ] Cognito user pool and app client IDs in `.env`.
- [ ] RDS endpoint and `DATABASE_URL`; DB and tables created (e.g. `npm run db:init`).
- [ ] S3 bucket exists and app’s IAM role/user can `s3:PutObject`.
- [ ] SES “from” identity verified.
- [ ] (Optional) Secret in Secrets Manager; app role has `GetSecretValue`.
- [ ] CloudWatch log group (or let the app create it).
- [ ] EC2 has an IAM role that can use S3, SES, Secrets Manager, CloudWatch (and Cognito if needed).

Using the script plus this doc, you can see how your AWS account lines up with what EVCare expects.
