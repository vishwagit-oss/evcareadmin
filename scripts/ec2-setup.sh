#!/bin/bash
# EVCare Admin - EC2 initial setup (run once on a fresh Amazon Linux 2 instance)
set -e

echo "=== Installing Node.js 20 ==="
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

echo "=== Installing PM2 ==="
sudo npm install -g pm2

echo "=== Installing Nginx ==="
sudo yum install -y nginx
sudo systemctl enable nginx

echo "=== Done. Next steps ==="
echo "1. Copy your app to /home/ec2-user/evcare-admin"
echo "2. Create /home/ec2-user/evcare-admin/.env.production with DATABASE_URL, Cognito, AWS vars"
echo "3. Run: cd /home/ec2-user/evcare-admin && npm ci && npm run build"
echo "4. Copy nginx-evcare.conf to /etc/nginx/conf.d/evcare.conf"
echo "5. Run: sudo nginx -t && sudo systemctl reload nginx"
echo "6. Run: pm2 start ecosystem.config.js && pm2 save && pm2 startup"
