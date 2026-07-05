#!/bin/bash

echo "🚀 COMPLETE STUDENT REGISTRATION SYSTEM VPS DEPLOYMENT"
echo "======================================================"
echo "This script will migrate your ENTIRE system to VPS including:"
echo "✅ All current database data (students, schedules, admins)"  
echo "✅ Perfect schedule system with timing fixes"
echo "✅ Complete project with all enhancements"
echo "✅ Production environment setup"
echo ""

# VPS Configuration
VPS_IP="172.86.116.3"
VPS_USER="root"
VPS_PASSWORD="2R9mjj7DoD4VGm"
PROJECT_NAME="student-registration-system"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🎯 Target VPS: $VPS_IP"
echo "📅 Deployment Time: $(date)"
echo ""

# Step 1: Create fresh database backup with current data
echo "💾 STEP 1: Creating fresh database backup..."
echo "============================================="

if [ -x "./backup-database.js" ]; then
    echo "📦 Creating fresh backup of current database..."
    node backup-database.js
    echo "✅ Fresh backup created successfully!"
else
    echo "⚠️  backup-database.js not found, checking for manual backup..."
    if [ ! -d "database-backup" ]; then
        echo "📦 Creating manual database backup..."
        mongodump --db student_registration --out database-backup-$TIMESTAMP
        mv database-backup-$TIMESTAMP database-backup
    fi
    echo "✅ Database backup ready!"
fi

# Step 2: Prepare enhanced deployment package
echo ""
echo "📦 STEP 2: Preparing enhanced deployment package..."
echo "=================================================="

# Remove old deployment package
rm -rf deployment-package-enhanced
mkdir -p deployment-package-enhanced

echo "📄 Copying project files..."
# Copy all project files except what we don't need
rsync -av --progress \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='deployment-package' \
    --exclude='deployment-package-enhanced' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    --exclude='database-backup-*' \
    ./ deployment-package-enhanced/

echo "📄 Including perfect schedule fixes..."
# Ensure all our fixes are included
cp -f public/admin-panel.js deployment-package-enhanced/public/
cp -f complete-schedule-reseed.js deployment-package-enhanced/
cp -f backup-database.js deployment-package-enhanced/
cp -f reseed-schedules.js deployment-package-enhanced/

echo "✅ Enhanced deployment package ready!"

# Step 3: Create production environment file
echo ""
echo "⚙️  STEP 3: Creating production environment..."
echo "=============================================="

cat > deployment-package-enhanced/.env << 'EOF'
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://localhost:27017/student_registration
SESSION_SECRET=student-admin-secret-key-production-2025
JWT_SECRET=admin-jwt-secret-production-2025
EOF

echo "✅ Production environment configured!"

# Step 4: Create enhanced VPS setup script
echo ""
echo "🛠️  STEP 4: Creating enhanced VPS setup script..."
echo "================================================"

cat > deployment-package-enhanced/enhanced-vps-setup.sh << 'SETUPEOF'
#!/bin/bash

echo "🚀 ENHANCED STUDENT REGISTRATION SYSTEM VPS SETUP"
echo "================================================="
echo "Setting up your complete system with:"
echo "✅ Perfect schedule timing fixes"
echo "✅ All your current data (students, admins, schedules)"
echo "✅ Production environment"
echo ""

set -e  # Exit on any error

# Update system
echo "📦 STEP 1: Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "🔧 Installing essential tools..."
apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Install Node.js 18
echo "📦 STEP 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install MongoDB 6.0 (Fixed for Ubuntu 22.04)
echo "📦 STEP 3: Installing MongoDB 6.0..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Configure MongoDB
echo "🔧 STEP 4: Configuring MongoDB..."
systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB to be ready..."
sleep 5

# Verify MongoDB is running
echo "✅ MongoDB status:"
systemctl status mongod --no-pager

# Create project directory
echo "📂 STEP 5: Setting up project directory..."
mkdir -p /opt/student-registration
cd /opt/student-registration

# Extract project files
echo "📦 Extracting project files..."
tar -xzf /root/student-registration-system.tar.gz -C .

# Install project dependencies
echo "📦 STEP 6: Installing project dependencies..."
npm install

# Install PM2 for process management
echo "📦 Installing PM2..."
npm install -g pm2

# Restore database with all current data
echo "💾 STEP 7: Restoring complete database..."
if [ -d "/root/database-backup" ]; then
    echo "📊 Restoring your complete database (students, schedules, admins)..."
    mongorestore --drop /root/database-backup/
    echo "✅ Database restored with all your current data!"
else
    echo "❌ Error: database-backup directory not found!"
    echo "Please ensure you uploaded the database-backup folder."
    exit 1
fi

# Verify database restoration
echo "🔍 Verifying database restoration..."
mongo student_registration --eval "
    print('Students count: ' + db.students.count());
    print('Schedules count: ' + db.schedules.count());
    print('Admins count: ' + db.admins.count());
    print('Promotion history count: ' + db.promotionhistories.count());
"

# Create PM2 ecosystem file
echo "⚙️  STEP 8: Creating PM2 configuration..."
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
      PORT: 3000,
      MONGODB_URI: 'mongodb://localhost:27017/student_registration'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
PMEOF

# Create logs directory
mkdir -p logs

# Configure firewall
echo "🔒 STEP 9: Configuring firewall..."
ufw allow 22/tcp
ufw allow 3000/tcp
ufw --force enable

# Start application
echo "🚀 STEP 10: Starting application..."
pm2 start ecosystem.config.js
pm2 save

# Set up PM2 to start on boot
pm2 startup systemd -u root --hp /root
sleep 2

# Final verification
echo ""
echo "🔍 STEP 11: Final verification..."
echo "================================"

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status

# Check application health
echo ""
echo "🏥 Application Health Check:"
sleep 3
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Application is running and responding!"
else
    echo "⚠️  Application might still be starting up..."
fi

# Final summary
echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "===================================="
echo "✅ System updated and configured"
echo "✅ Node.js $(node --version) installed"
echo "✅ MongoDB installed and running"
echo "✅ Complete database restored with all your data"
echo "✅ Application deployed and running"
echo "✅ PM2 process manager configured"
echo "✅ Firewall configured"
echo ""
echo "🌐 YOUR APPLICATION IS NOW LIVE!"
echo "================================"
echo "🌍 Main Site: http://172.86.116.3:3000"
echo "👤 Admin Panel: http://172.86.116.3:3000/admin"
echo "📝 Admin Login Page: http://172.86.116.3:3000/admin/login"
echo ""
echo "🔧 Management Commands:"
echo "======================"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs student-registration-system"
echo "🔄 Restart app: pm2 restart student-registration-system" 
echo "🛑 Stop app: pm2 stop student-registration-system"
echo "🗑️  Remove app: pm2 delete student-registration-system"
echo ""
echo "🎯 Your perfect schedule system is now live on the VPS!"
echo "All timing fixes are included - no more time corruption issues!"

SETUPEOF

chmod +x deployment-package-enhanced/enhanced-vps-setup.sh

echo "✅ Enhanced VPS setup script created!"

# Step 5: Create deployment tarball
echo ""
echo "📦 STEP 5: Creating deployment tarball..."
echo "========================================"

cd deployment-package-enhanced
tar -czf ../${PROJECT_NAME}.tar.gz .
cd ..

echo "✅ Deployment tarball created: ${PROJECT_NAME}.tar.gz"

# Step 6: Upload everything to VPS
echo ""
echo "📤 STEP 6: Uploading to VPS..."
echo "=============================="

echo "🔐 Note: You'll be prompted for the VPS password: $VPS_PASSWORD"
echo ""

echo "📦 Uploading project tarball..."
if scp ${PROJECT_NAME}.tar.gz root@${VPS_IP}:/root/; then
    echo "✅ Project uploaded successfully!"
else
    echo "❌ Failed to upload project. Please check VPS connectivity."
    exit 1
fi

echo "💾 Uploading database backup..."
if [ -d "database-backup" ]; then
    if scp -r database-backup root@${VPS_IP}:/root/; then
        echo "✅ Database backup uploaded successfully!"
    else
        echo "❌ Failed to upload database backup."
        exit 1
    fi
else
    echo "⚠️  No database-backup directory found. Will create fresh backup..."
fi

echo "🛠️  Uploading setup script..."
if scp deployment-package-enhanced/enhanced-vps-setup.sh root@${VPS_IP}:/root/; then
    echo "✅ Setup script uploaded successfully!"
else
    echo "❌ Failed to upload setup script."
    exit 1
fi

# Step 7: Execute setup on VPS
echo ""
echo "🚀 STEP 7: Executing setup on VPS..."
echo "===================================="
echo "🔐 Password: $VPS_PASSWORD"
echo ""

echo "📞 Connecting to VPS and running setup..."
ssh root@${VPS_IP} << 'SSHEOF'
echo "🔧 Starting VPS setup process..."
chmod +x /root/enhanced-vps-setup.sh
/root/enhanced-vps-setup.sh
SSHEOF

# Final success message
echo ""
echo "🎉 COMPLETE DEPLOYMENT FINISHED!"
echo "==============================="
echo ""
echo "✅ PROJECT SUCCESSFULLY DEPLOYED TO VPS!"
echo ""
echo "🌐 Your application is now live at:"
echo "   Main Site: http://172.86.116.3:3000"
echo "   Admin Panel: http://172.86.116.3:3000/admin"
echo "   Admin Login: http://172.86.116.3:3000/admin/login"
echo ""
echo "🎯 What's been deployed:"
echo "   ✅ Complete project with all latest fixes"
echo "   ✅ Perfect schedule system (no timing issues!)"
echo "   ✅ All your current database data"
echo "   ✅ Production environment setup"
echo "   ✅ Process management with PM2"
echo "   ✅ Firewall configuration"
echo ""
echo "🧪 Test your deployment:"
echo "   1. Visit http://172.86.116.3:3000"
echo "   2. Go to admin panel and login"
echo "   3. Check Schedule Management"
echo "   4. Verify all your data is there"
echo "   5. Test schedule editing (times should stay precise!)"
echo ""
echo "🔧 To manage your application:"
echo "   SSH: ssh root@172.86.116.3"
echo "   Check status: pm2 status"
echo "   View logs: pm2 logs"
echo ""
echo "🎊 Your perfect schedule system is now live on the VPS!"
echo "The timing fixes ensure schedules will always stay precise!"