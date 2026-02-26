# EVCare – Security Audit & Recommendations

Deep review of network, security groups, IAM, and configuration for production-grade security.

---

## 1. Current Setup vs. Ideal

### 1.1 Network Architecture

| Component | Current | Ideal | Status |
|-----------|---------|-------|--------|
| **RDS** | Private subnet, no public IP | Private subnet, no public IP | ✅ Correct |
| **EC2** | Public subnet | Private subnet + NAT (or keep public if cost-sensitive) | ⚠️ Acceptable |
| **ALB** | Public subnet | Public subnet | ✅ Correct |
| **RDS "Publicly accessible"** | Must be **No** | No | ⚠️ Verify |

**RDS check:** EC2 → RDS → Connectivity & security. Ensure **Publicly accessible = No**.

---

## 2. Security Groups – Detailed Audit

### 2.1 evcare-alb-sg (ALB)

| Rule | Port | Source | Status | Recommendation |
|------|------|--------|--------|----------------|
| HTTP | 80 | 0.0.0.0/0 | ✅ Needed | For public web app |
| HTTPS | 443 | 0.0.0.0/0 | ✅ Needed | For HTTPS when configured |

**Verdict:** ✅ Correct for internet-facing ALB.

**Optional:** Add AWS WAF in front of ALB for OWASP rules and DDoS protection.

---

### 2.2 evcare-ec2-sg (EC2)

| Rule | Port | Source | Status | Recommendation |
|------|------|--------|--------|----------------|
| SSH | 22 | Your IP only (e.g. 174.94.45.99/32) | ✅ Good | Keep restricted to admin IP(s) |
| HTTP | 80 | evcare-alb-sg | ✅ Good | Only ALB can reach app |
| HTTPS | 443 | evcare-alb-sg | ✅ Good | Only ALB can reach app (must be ALB SG, not EC2 SG) |

**Verdict:** ✅ Correct. App is not directly exposed to the internet; only ALB can reach it.

**Critical:** SSH must stay limited to known IPs. Avoid 0.0.0.0/0 for port 22.

---

### 2.3 evcare-rds-sg (RDS)

| Rule | Port | Source | Status | Recommendation |
|------|------|--------|--------|----------------|
| PostgreSQL | 5432 | evcare-ec2-sg only | ✅ Good | Only EC2 can reach DB |

**Verdict:** ✅ Correct. RDS is reachable only from EC2.

---

### 2.4 Outbound Rules

| Security Group | Default | Status | Recommendation |
|----------------|---------|--------|----------------|
| evcare-alb-sg | All traffic to 0.0.0.0/0 | ✅ Normal | ALB needs to reach targets |
| evcare-ec2-sg | All traffic to 0.0.0.0/0 | ⚠️ Broad | Restrict for hardening |
| evcare-rds-sg | All traffic to 0.0.0.0/0 | ✅ Fine | RDS usually doesn’t initiate traffic |

**evcare-ec2-sg outbound – stricter setup:**

| Type | Port | Destination | Purpose |
|------|------|-------------|---------|
| PostgreSQL | 5432 | evcare-rds-sg | DB access |
| HTTPS | 443 | 0.0.0.0/0 | S3, SES, Cognito, Secrets Manager, CloudWatch (all over HTTPS) |

Alternative: allow HTTPS (443) outbound to 0.0.0.0/0 for AWS APIs, and remove broad "All traffic" if you want to lock down further. For most apps, HTTPS outbound is sufficient.

---

## 3. IAM – Least Privilege Audit

### 3.1 evcare-ec2-role

| Permission | Current | Ideal | Status |
|------------|---------|-------|--------|
| S3 | Full access or bucket-wide | s3:PutObject, s3:GetObject on evcare-reports/* | ⚠️ Scope to bucket |
| SES | ses:SendEmail | ses:SendEmail | ✅ OK |
| Secrets Manager | GetSecretValue on evcare/* | GetSecretValue on evcare/production/config | ✅ OK if scoped |
| CloudWatch Logs | CreateLogStream, PutLogEvents | Scoped to /evcare/admin | ✅ OK if scoped |

**Recommended S3 policy (replace AmazonS3FullAccess):**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::evcare-reports/*"
    }
  ]
}
```

**Verdict:** Prefer policies scoped to specific resources (bucket, secret, log group) instead of `*`.

---

## 4. Secrets & Credentials

| Item | Current | Ideal | Status |
|------|---------|-------|--------|
| AWS keys on EC2 | IAM role (no keys) | IAM role | ✅ Good |
| DB password | In .env.production | Secrets Manager at runtime | ⚠️ Improve |
| Cognito IDs | In .env | Env or Secrets Manager | ✅ Acceptable |

**Recommendation:** Load DATABASE_URL from Secrets Manager in production. Use `getSecrets()` in `db.ts` when running on EC2.

---

## 5. RDS Security

| Check | Expected | Action |
|-------|----------|--------|
| Publicly accessible | No | Verify in RDS console |
| SSL/TLS | Required | Use `sslmode=require` in connection string ✅ |
| Encryption at rest | Enabled | Enable in RDS if not already |
| Automated backups | Enabled | Enable 7-day retention |
| No public subnet | RDS only in private subnet | Verify |

---

## 6. S3 Bucket

| Check | Expected | Action |
|-------|----------|--------|
| Block public access | All 4 settings On | Verify in S3 console |
| Bucket policy | No public read/write | Verify |
| Encryption | SSE-S3 or SSE-KMS | Enable if not already |

---

## 7. Checklist – 100% Security Target

### Network
- [x] RDS in private subnet
- [x] RDS not publicly accessible
- [x] EC2 app ports (80/443) only from ALB
- [x] SSH only from admin IP
- [ ] Optional: EC2 in private subnet + NAT
- [ ] Optional: Restrict EC2 outbound to specific destinations

### Security Groups
- [x] ALB: 80, 443 from internet
- [x] EC2: 80, 443 from ALB only
- [x] EC2: 22 from admin IP only
- [x] RDS: 5432 from EC2 only
- [ ] Optional: Tighter EC2 outbound rules

### IAM
- [x] EC2 uses instance role (no long‑lived keys)
- [ ] S3 permissions scoped to evcare-reports bucket
- [ ] Secrets Manager scoped to evcare secret

### Application
- [x] DB over SSL
- [ ] DATABASE_URL from Secrets Manager in production
- [x] Cognito for auth
- [x] No credentials in source code

### AWS Services
- [ ] RDS encryption at rest
- [ ] S3 block public access
- [ ] Optional: WAF in front of ALB

---

## 8. Summary

| Area | Grade | Notes |
|------|-------|-------|
| Network isolation | A | RDS private, EC2 behind ALB |
| Security groups | A | Inbound rules are appropriate |
| IAM | B+ | Role used; policies could be more scoped |
| Secrets | B | DB in .env; prefer Secrets Manager |
| RDS | A | Private, DB-only access |

Overall the design is solid and aligned with common best practices. Main improvements: scope IAM policies, move DB credentials to Secrets Manager, and optionally harden EC2 placement and outbound rules.
