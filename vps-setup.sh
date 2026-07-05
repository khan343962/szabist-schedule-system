#!/bin/bash

# Student Registration System - VPS Setup Script
# This script sets up the complete environment on your VPS

set -e  # Exit on any error

echo "🚀 Starting Student Registration System VPS Setup..."
echo "=================================================="

# Update system
echo "📦 Step 1: Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18
echo "📦 Step 2: Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install MongoDB 6.0
echo "📦 Step 3: Installing MongoDB 6.0..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Start MongoDB service
echo "🔧 Step 4: Starting MongoDB service..."
systemctl start mongod
systemctl enable mongod

# Verify MongoDB is running
echo "✅ MongoDB status:"
systemctl status mongod --no-pager

# Extract project files
echo "📂 Step 5: Extracting project files..."
cd /root
if [ -f "student-registration-system.tar.gz" ]; then
    tar -xzf student-registration-system.tar.gz
    echo "✅ Project files extracted successfully"
else
    echo "❌ Error: student-registration-system.tar.gz not found!"
    exit 1
fi

# Install project dependencies
echo "📦 Step 6: Installing project dependencies..."
npm install

# Restore database
echo "💾 Step 7: Restoring database..."
if [ -d "database-backup" ]; then
    mongorestore database-backup/
    echo "✅ Database restored successfully"
else
    echo "❌ Error: database-backup directory not found!"
    exit 1
fi

# Install PM2 for process management
echo "📦 Step 8: Installing PM2..."
npm install -g pm2

# Configure firewall
echo "🔒 Step 9: Configuring firewall..."
ufw allow 3000/tcp
ufw allow 22/tcp
ufw allow 27017/tcp
ufw --force enable

# Start application with PM2
echo "🚀 Step 10: Starting application..."
pm2 start server.js --name "student-registration-system"
pm2 startup
pm2 save

# Final status check
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo "✅ Node.js: $(node --version)"
echo "✅ MongoDB: Running"
echo "✅ Application: Running on port 3000"
echo "✅ PM2 Status:"
pm2 status

echo ""
echo "🌐 Your application is now live at:"
echo "   http://172.86.116.3:3000"
echo ""
echo "🔧 Useful PM2 commands:"
echo "   pm2 status          - Check application status"
echo "   pm2 logs            - View application logs"
echo "   pm2 restart all     - Restart application"
echo "   pm2 stop all        - Stop application"
echo "   pm2 delete all      - Delete application from PM2"
echo ""
echo "🎯 Setup completed successfully!"