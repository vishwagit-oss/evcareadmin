# EVCare – Security Action Items

Based on the security review feedback. Do these in order.

---

## 1. MUST FIX – Verify in AWS Console

### 1.1 EC2 security group – ports 80 and 443

**Check:** EC2 → Security Groups → **evcare-ec2-sg** → Inbound rules

| Port | Source must be |
|------|----------------|
| 80   | **evcare-alb-sg** (ALB security group) |
| 443  | **evcare-alb-sg** (ALB security group) |

If either rule uses **evcare-ec2-sg** or **0.0.0.0/0**, change it to **evcare-alb-sg**.

---

### 1.2 RDS publicly accessible

**Check:** RDS → Databases → **evcare-db** → Connectivity & security

- **Publicly accessible:** must be **No**

If it is **Yes**, recreate the instance or restore from snapshot with public access disabled.

---

### 1.3 S3 block public access

**Check:** S3 → **evcare-reports** → Permissions → Block public access

All four options should be **On**.

---

## 2. RECOMMENDED – Improve security

### 2.1 Scope S3 IAM permissions

**Action:** Replace `AmazonS3FullAccess` with a custom policy:

1. IAM → Roles → **evcare-ec2-role**
2. Remove **AmazonS3FullAccess**
3. Add inline policy with:
   - Effect: Allow
   - Actions: `s3:PutObject`, `s3:GetObject`
   - Resource: `arn:aws:s3:::evcare-reports/*`

---

### 2.2 RDS encryption at rest

**Check:** RDS → evcare-db → Configuration

- **Storage encryption:** Enabled (for new instances)

Existing instances cannot be encrypted in place; would require a snapshot and restore.

---

## 3. OPTIONAL – Hardening

| Item | Effort | Benefit |
|------|--------|---------|
| DB credentials in Secrets Manager | Medium | Stronger secrets handling |
| EC2 in private subnet + NAT | High | Extra network isolation |
| WAF in front of ALB | Medium | DDoS / OWASP protection |
| Restrict EC2 outbound rules | Medium | Tighter egress control |

---

## 4. Quick checklist

- [ ] evcare-ec2-sg: ports 80 and 443 sourced from **evcare-alb-sg**
- [ ] RDS: publicly accessible = **No**
- [ ] S3: block public access = **On**
- [ ] IAM: S3 policy scoped to evcare-reports (optional)
- [ ] RDS: encryption at rest enabled (optional for new DBs)
