# EVCare Admin – Phase 5 Deployment Guide

Deploy the Next.js app to EC2 behind an Application Load Balancer (ALB).

---

## Prerequisites

- EC2 instance (e.g. `evcare-app-server`) with evcare-ec2-role attached
- RDS PostgreSQL in private subnet (accessible from EC2)
- Cognito User Pool configured
- SSH key (e.g. `evcare-key.pem`)

---

## Part A: ALB + Target Group (AWS Console)

### 1. Create Target Group

1. EC2 → **Target Groups** → **Create target group**
2. **Target type:** Instances
3. **Target group name:** `evcare-targets`
4. **Protocol:** HTTP
5. **Port:** 80
6. **VPC:** evcare-vpc (or your VPC)
7. **Health check path:** `/` (or `/dashboard`)
8. **Health check protocol:** HTTP
9. Click **Next** → **Create target group**

### 2. Register EC2 Instance

1. Open the new target group → **Targets** tab
2. **Edit** → **Add pending targets**
3. Select your EC2 instance (evcare-app-server)
4. **Include as pending below** → **Save**

### 3. Create Application Load Balancer

1. EC2 → **Load Balancers** → **Create Load Balancer**
2. Choose **Application Load Balancer**
3. **Name:** `evcare-alb`
4. **Scheme:** Internet-facing
5. **IP address type:** IPv4
6. **Network mapping:** Select your VPC and **both** public subnets (e.g. 10.0.1.0/24, 10.0.2.0/24)
7. **Security group:** Create new or use `evcare-alb-sg` — allow **Inbound:** 80 (HTTP) from 0.0.0.0/0
8. **Listeners and routing:**
   - Listener: HTTP :80
   - Default action: Forward to `evcare-targets`
9. Click **Create load balancer**

### 4. Get ALB DNS Name

After creation, copy the **DNS name** (e.g. `evcare-alb-1234567890.us-east-2.elb.amazonaws.com`). This is your app URL.

---

## Part B: Deploy App to EC2

### 1. SSH into EC2

```bash
ssh -i evcare-key.pem ec2-user@<EC2_PUBLIC_IP>
```

### 2. Run One-Time Setup (if not done)

```bash
# Install Node 20, PM2, Nginx
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs nginx
sudo npm install -g pm2
sudo systemctl enable nginx
```

### 3. Copy App to EC2

From your local machine (new terminal):

```bash
# Option A: rsync (if you have it)
rsync -avz --exclude node_modules --exclude .next -e "ssh -i evcare-key.pem" ./ evcare-admin/ ec2-user@<EC2_IP>:/home/ec2-user/evcare-admin/

# Option B: scp a zip
# Zip locally, then:
scp -i evcare-key.pem evcare-admin.zip ec2-user@<EC2_IP>:/home/ec2-user/
# On EC2: unzip evcare-admin.zip
```

Or use Git: clone the repo on EC2 if it's in GitHub.

### 4. Create .env.production on EC2

SSH into EC2, then:

```bash
cd /home/ec2-user/evcare-admin
nano .env.production
```

Add (replace with your values):

```
DATABASE_URL=postgresql://evcare_admin:PASSWORD@evcare-db.xxxx.us-east-2.rds.amazonaws.com:5432/evcare?sslmode=require
NEXT_PUBLIC_COGNITO_USER_POOL_ID=us-east-2_xxxxx
NEXT_PUBLIC_COGNITO_CLIENT_ID=your_client_id
AWS_REGION=us-east-2
EVCARE_S3_BUCKET=evcare-reports
EVCARE_ALERT_FROM=vishwagohil21@gmail.com
EVCARE_ALERT_EMAIL=vishwagohil21@gmail.com
EVCARE_LOG_GROUP=/evcare/admin
EVCARE_LOG_STREAM=api
```

**Note:** EC2 uses IAM role for AWS credentials — no `AWS_ACCESS_KEY_ID` needed. Ensure `evcare-ec2-role` has S3, SES, CloudWatch permissions.

### 5. Build and Start App

```bash
cd /home/ec2-user/evcare-admin
npm ci
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the command it prints
```

### 6. Configure Nginx

```bash
sudo cp /home/ec2-user/evcare-admin/nginx-evcare.conf /etc/nginx/conf.d/evcare.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Open Port 80 on EC2 Security Group

- EC2 → Security Groups → `evcare-ec2-sg`
- **Edit inbound rules** → Add: Type=HTTP, Port=80, Source=ALB security group (evcare-alb-sg) or 10.0.0.0/16

---

## Part C: Cognito Callback URL

1. Cognito → User pools → your pool → **App integration** → **App client**
2. Add **Allowed callback URL:** `http://<ALB_DNS_NAME>/`
3. Add **Allowed sign-out URL:** `http://<ALB_DNS_NAME>/`
4. Save

---

## Part D: Test

1. Open `http://<ALB_DNS_NAME>/` in a browser
2. Register / Login
3. Navigate Dashboard, Fleet, Battery, Analytics
4. Test S3 export and battery alert

---

## Quick Reference

| Item | Value |
|------|-------|
| App port | 3000 (Next.js) |
| Nginx | Proxies 80 → 3000 |
| PM2 | `pm2 start ecosystem.config.js` |
| Logs | `pm2 logs evcare-admin` |

---

## HTTPS (Optional)

1. Request ACM certificate for your domain (or use self-signed)
2. Add HTTPS listener (443) to ALB
3. Update Cognito callback URLs to `https://...`
