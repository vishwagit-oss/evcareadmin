# EVCare – AWS Architecture: IAM, Security Groups & Network Rules

---

## 1. Public vs Private Subnets

| Subnet | CIDR | Purpose | Resources |
|--------|------|---------|-----------|
| **Public subnet A** | 10.0.1.0/24 | Internet-facing | ALB, EC2 |
| **Public subnet B** | 10.0.2.0/24 | Multi-AZ ALB | ALB |
| **Private subnet** | 10.0.3.0/24 | Isolated, no internet | RDS PostgreSQL |

---

## 2. Security Groups – Inbound Rules

### evcare-alb-sg (Application Load Balancer)

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| HTTP | 80 | 0.0.0.0/0 | Allows internet traffic to ALB |
| HTTPS | 443 | 0.0.0.0/0 | Allows HTTPS to ALB |

**Protects:** ALB – receives traffic from the internet only on ports 80 and 443.

---

### evcare-ec2-sg (EC2 App Server)

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP (e.g. 174.94.45.99/32) | Admin SSH access |
| HTTP | 80 | evcare-alb-sg | ALB forwards HTTP to app (source must be ALB SG) |
| HTTPS | 443 | evcare-alb-sg | ALB forwards HTTPS to app (source must be ALB SG, not EC2 SG) |

**Protects:** EC2 – only the ALB can reach the app on 80/443. SSH limited to your IP.

---

### evcare-rds-sg (RDS PostgreSQL)

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| PostgreSQL | 5432 | evcare-ec2-sg | Only EC2 can connect to DB |

**Protects:** RDS – only the EC2 app server can access the database. No public access.

---

## 3. Security Groups – Outbound Rules

All security groups default: **All traffic** allowed outbound (e.g. 0.0.0.0/0).  
EC2 can reach RDS, S3, Cognito, SES, CloudWatch, etc.

---

## 4. IAM Roles

### evcare-ec2-role (attached to EC2)

| Service | Permissions | Purpose |
|---------|-------------|---------|
| **S3** | s3:PutObject, s3:GetObject | Upload reports, read/write S3 |
| **SES** | ses:SendEmail | Send battery alert emails |
| **Secrets Manager** | secretsmanager:GetSecretValue | Fetch DB URL, config |
| **CloudWatch Logs** | logs:CreateLogStream, logs:PutLogEvents | Write API logs |

**Used by:** EC2 instance (no hardcoded AWS keys – uses instance role).

---

## 5. Traffic Flow

```
Internet (User)
    │
    │ evcare-alb-sg: Inbound 80, 443 from 0.0.0.0/0
    ▼
Application Load Balancer (Public subnet)
    │
    │ evcare-ec2-sg: Inbound 80, 443 from evcare-alb-sg
    ▼
EC2 - Next.js App (Public subnet)
    │ evcare-ec2-role: S3, SES, Secrets Manager, CloudWatch
    │
    ├──► RDS (evcare-rds-sg: Inbound 5432 from evcare-ec2-sg)
    ├──► S3 (IAM: s3:PutObject)
    ├──► Cognito (public API, no IAM)
    ├──► SES (IAM: ses:SendEmail)
    └──► CloudWatch (IAM: logs:PutLogEvents)
```

---

## 6. Summary

| Component | Protects | Allows |
|-----------|----------|--------|
| **evcare-alb-sg** | ALB | Internet → ALB on 80, 443 |
| **evcare-ec2-sg** | EC2 | ALB → EC2 on 80, 443; Your IP → EC2 on 22 |
| **evcare-rds-sg** | RDS | EC2 → RDS on 5432 only |
| **evcare-ec2-role** | EC2 | App access to S3, SES, Secrets Manager, CloudWatch |
