# Connect to EC2 and Run EVCare (Windows)

## 1. What you need

- **EC2 instance** (Amazon Linux 2 or Ubuntu).
- **Key pair (.pem file)** you downloaded when you created the instance.  
  If you lost it, you must create a new instance or add a new key pair to the instance (e.g. via AWS Console → EC2 → Key Pairs, then associate it).
- **Public IP or DNS** of the instance: EC2 → Instances → select instance → “Public IPv4 address” or “Public IPv4 DNS”.

---

## 2. SSH from Windows (PowerShell or CMD)

Windows 10/11 usually have OpenSSH. Use **PowerShell** or **Command Prompt**.

### Set key permissions (one-time)

The `.pem` file must not be readable by others. In PowerShell:

```powershell
# Replace with your key path
icacls "C:\Users\vishw\Downloads\your-key.pem" /inheritance:r
icacls "C:\Users\vishw\Downloads\your-key.pem" /grant:r "$($env:USERNAME):R"
```

### Connect

Use the correct **user** for your AMI:

| AMI           | User        |
|---------------|-------------|
| Amazon Linux 2 / 2023 | `ec2-user` |
| Ubuntu        | `ubuntu`    |

```powershell
# Replace: path-to-key.pem, ec2-user (or ubuntu), and your EC2 public IP or DNS
ssh -i "C:\path\to\your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP
```

Example:

```powershell
ssh -i "C:\Users\vishw\Downloads\evcare-key.pem" ec2-user@3.145.22.100
```

First time you may see “Are you sure you want to continue connecting?” → type `yes`.

---

## 3. If SSH is not installed (Windows)

1. Settings → Apps → Optional features → Add a feature.
2. Find **OpenSSH Client** → Install.
3. Restart PowerShell and try the `ssh` command again.

---

## 4. Using PuTTY (alternative)

If you prefer PuTTY:

1. Install **PuTTY** and **PuTTYgen**.
2. In PuTTYgen: Conversions → Load → select your `.pem` → Save private key (e.g. `evcare-key.ppk`).
3. In PuTTY:
   - Host: `ec2-user@YOUR_EC2_PUBLIC_IP` (or `ubuntu@...` for Ubuntu).
   - Connection → SSH → Auth → Browse → select the `.ppk` file.
   - Open and log in.

---

## 5. Security group (if connection refused)

If `ssh` says “Connection refused” or times out:

- EC2 → Security groups → group attached to your instance.
- Inbound rules: add **SSH (port 22)** from your IP (or `0.0.0.0/0` only for testing).
- Save and try again.

---

## 6. Run EVCare on EC2 (after you’re connected)

Once you’re in with `ssh`:

### A. Install Node.js (if not installed)

**Amazon Linux 2:**

```bash
sudo yum update -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v
```

**Ubuntu:**

```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
```

### B. Copy the app to EC2

From your **Windows machine** (new PowerShell window, project folder):

```powershell
cd C:\Users\vishw\evcare-admin

# Replace with your key, user, and EC2 IP
scp -i "C:\path\to\your-key.pem" -r . ec2-user@YOUR_EC2_PUBLIC_IP:~/evcare-admin
```

Or use **git** on EC2:

```bash
# On EC2
git clone YOUR_REPO_URL evcare-admin
cd evcare-admin
```

### C. On EC2: env, build, run

```bash
cd ~/evcare-admin

# Create production env (use your real values)
nano .env.production
# Paste from .env.production.example and fill DATABASE_URL, Cognito IDs, etc. Save: Ctrl+O, Enter, Ctrl+X.

# Install and build
npm ci
npm run build

# Run with PM2 (install PM2 if needed: npm i -g pm2)
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # run the command it prints so app starts on reboot
```

### D. Optional: Nginx in front

```bash
sudo yum install -y nginx    # Amazon Linux
# or: sudo apt install -y nginx   # Ubuntu

# Copy your nginx config
sudo nano /etc/nginx/conf.d/evcare.conf
# Paste contents of nginx-evcare.conf from the project, save.

sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
```

Then open **http://YOUR_EC2_PUBLIC_IP** in the browser (port 80 must be allowed in the security group).

---

## 7. Quick reference

| Step            | Command / action |
|-----------------|------------------|
| SSH (Windows)   | `ssh -i "path\to\key.pem" ec2-user@EC2_IP` |
| User (Amazon Linux) | `ec2-user` |
| User (Ubuntu)   | `ubuntu` |
| Copy project to EC2 | `scp -i "path\to\key.pem" -r . ec2-user@EC2_IP:~/evcare-admin` |
| Run app         | `npm run build` then `pm2 start ecosystem.config.js` |

If you tell me your AMI (Amazon Linux or Ubuntu) and whether you use the built-in OpenSSH or PuTTY, I can give you one exact command to connect.
