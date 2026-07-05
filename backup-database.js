#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create backup directory with timestamp
const backupDir = path.join(__dirname, 'database-backup', new Date().toISOString().replace(/[:.]/g, '-'));

console.log('🔄 Creating database backup...');
console.log(`📂 Backup directory: ${backupDir}`);

try {
    // Create backup directory
    if (!fs.existsSync(path.dirname(backupDir))) {
        fs.mkdirSync(path.dirname(backupDir), { recursive: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });

    // Backup schedules collection
    console.log('📅 Backing up schedules collection...');
    execSync(`mongodump --db student_registration --collection schedules --out "${backupDir}"`, { stdio: 'inherit' });

    // Backup students collection  
    console.log('👥 Backing up students collection...');
    execSync(`mongodump --db student_registration --collection students --out "${backupDir}"`, { stdio: 'inherit' });

    // Backup promotionhistories collection
    console.log('📊 Backing up promotionhistories collection...');
    execSync(`mongodump --db student_registration --collection promotionhistories --out "${backupDir}"`, { stdio: 'inherit' });

    // Backup admins collection
    console.log('👤 Backing up admins collection...');
    execSync(`mongodump --db student_registration --collection admins --out "${backupDir}"`, { stdio: 'inherit' });

    console.log('✅ Database backup completed successfully!');
    console.log(`📂 Backup saved to: ${backupDir}`);
    
    // Create restore script
    const restoreScript = `#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🔄 Restoring database from backup...');
console.log('📂 Backup directory: ${backupDir}');

try {
    // Restore all collections
    execSync('mongorestore --db student_registration --drop "${backupDir}/student_registration"', { stdio: 'inherit' });
    console.log('✅ Database restored successfully!');
} catch (error) {
    console.error('❌ Error restoring database:', error.message);
    process.exit(1);
}
`;

    fs.writeFileSync(path.join(backupDir, 'restore.js'), restoreScript);
    fs.chmodSync(path.join(backupDir, 'restore.js'), 0o755);
    
    console.log('📝 Restore script created: restore.js');

} catch (error) {
    console.error('❌ Error creating backup:', error.message);
    process.exit(1);
}