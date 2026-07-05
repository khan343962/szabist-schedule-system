#!/bin/bash

echo "🚀 Student Registration System VPS Deployment Script"
echo "=================================================="

# VPS Configuration
VPS_IP="172.86.116.3"
VPS_USER="root"
VPS_PASSWORD="2R9mjj7DoD4VGm"
PROJECT_NAME="student-registration-system"

echo "📦 Step 1: Preparing deployment package..."

# Create deployment directory
mkdir -p deployment-package
cd deployment-package

# Copy all necessary files (excluding node_modules and local configs)
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='deployment-package' \
          --exclude='*.log' \
          --exclude='.DS_Store' \
          ../ ./

echo "✅ Deployment package prepared!"

echo "📤 Step 2: Uploading to VPS..."
echo "Note: You'll need to run the following commands manually:"

echo ""
echo "1. First, create a tarball of your project:"
echo "   tar -czf ${PROJECT_NAME}.tar.gz -C deployment-package ."

echo ""
echo "2. Upload to VPS using scp:"
echo "   scp ${PROJECT_NAME}.tar.gz root@${VPS_IP}:/root/"

echo ""
echo "3. Upload database backup:"
echo "   scp -r ../database-backup root@${VPS_IP}:/root/"

echo ""
echo "4. SSH into VPS and run setup:"
echo "   ssh root@${VPS_IP}"

echo ""
echo "🔧 After connecting to VPS, run these commands:"
echo "================================================"

cat > vps-setup.sh << 'EOF'
#!/bin/bash

echo "🔧 Setting up Student Registration System on VPS..."

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Start and enable MongoDB
systemctl start mongod
systemctl enable mongod

# Install PM2 for process management
npm install -g pm2

# Create project directory
cd /root
mkdir -p /opt/student-registration
cd /opt/student-registration

# Extract project files
tar -xzf /root/student-registration-system.tar.gz -C .

# Install dependencies
npm install

# Restore database
mongorestore --db student_registration /root/database-backup/student_registration/

# Create production environment file
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/student_registration
ENVEOF

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PMEOF'
module.exports = {
  apps: [{
    name: 'student-registration-system',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
PMEOF

# Set up firewall
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# Start the application
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Setup complete!"
echo "🌐 Your application should be available at: http://172.86.116.3:3000"
echo "📱 Admin panel: http://172.86.116.3:3000/admin.html"
echo ""
echo "🔍 To check application status:"
echo "   pm2 status"
echo "   pm2 logs student-registration-system"
echo ""
echo "🔄 To restart application:"
echo "   pm2 restart student-registration-system"

EOF

chmod +x vps-setup.sh

echo "✅ Setup script created as vps-setup.sh"
echo ""
echo "📋 MANUAL STEPS REQUIRED:"
echo "========================"
echo "1. Create tarball: tar -czf ${PROJECT_NAME}.tar.gz -C deployment-package ."
echo "2. Upload project: scp ${PROJECT_NAME}.tar.gz root@${VPS_IP}:/root/"
echo "3. Upload database: scp -r ../database-backup root@${VPS_IP}:/root/"
echo "4. Upload setup script: scp vps-setup.sh root@${VPS_IP}:/root/"
echo "5. SSH to VPS: ssh root@${VPS_IP}"
echo "6. Run setup: chmod +x /root/vps-setup.sh && /root/vps-setup.sh"
echo ""
echo "🎯 Final URL: http://172.86.116.3:3000"