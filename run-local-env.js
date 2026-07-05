const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const BSON = require('bson');

async function main() {
    console.log('🚀 Starting in-memory MongoDB server...');
    const mongod = await MongoMemoryServer.create({
        binary: {
            version: '6.0.14', // A stable, widely compatible version that has a fully functional Win32 binary
        }
    });
    
    const uri = mongod.getUri();
    console.log(`\n✅ In-memory MongoDB started at: ${uri}`);
    
    // Set the MONGODB_URI env var for the rest of the application
    process.env.MONGODB_URI = uri;
    
    // Connect to the in-memory database to seed the backup data
    console.log('🔌 Connecting to seed database...');
    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB.');
    
    // Helper to read and deserialize a BSON file
    const readBson = (filename) => {
        const filePath = path.join(__dirname, 'database-backup', 'student_registration', filename);
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ Backup file ${filename} not found.`);
            return [];
        }
        const buffer = fs.readFileSync(filePath);
        let offset = 0;
        const docs = [];
        while (offset < buffer.length) {
            const size = buffer.readInt32LE(offset);
            const doc = BSON.deserialize(buffer.subarray(offset, offset + size));
            docs.push(doc);
            offset += size;
        }
        return docs;
    };
    
    // Seed Admins
    console.log('\n👤 Seeding Admins...');
    const admins = readBson('admins.bson');
    if (admins.length > 0) {
        const AdminSchema = new mongoose.Schema({}, { strict: false });
        const Admin = mongoose.model('AdminSeed', AdminSchema, 'admins');
        await Admin.insertMany(admins);
        console.log(`   Seeded ${admins.length} admins.`);
    } else {
        console.log('   No admin backups found, server will create default super admin.');
    }
    
    // Seed Students
    console.log('\n👥 Seeding Students...');
    const students = readBson('students.bson');
    if (students.length > 0) {
        const StudentSchema = new mongoose.Schema({}, { strict: false });
        const Student = mongoose.model('StudentSeed', StudentSchema, 'students');
        await Student.insertMany(students);
        console.log(`   Seeded ${students.length} students.`);
    }
    
    // Seed Schedules
    console.log('\n📅 Seeding Schedules...');
    const schedules = readBson('schedules.bson');
    if (schedules.length > 0) {
        const ScheduleSchema = new mongoose.Schema({}, { strict: false });
        const Schedule = mongoose.model('ScheduleSeed', ScheduleSchema, 'schedules');
        await Schedule.insertMany(schedules);
        console.log(`   Seeded ${schedules.length} schedules.`);
    }
    
    // Seed Promotion History
    console.log('\n📊 Seeding Promotion Histories...');
    const histories = readBson('promotionhistories.bson');
    if (histories.length > 0) {
        const HistorySchema = new mongoose.Schema({}, { strict: false });
        const History = mongoose.model('HistorySeed', HistorySchema, 'promotionhistories');
        await History.insertMany(histories);
        console.log(`   Seeded ${histories.length} promotion histories.`);
    }
    
    // Disconnect mongoose seed client so server.js can establish its own connection
    console.log('\n🔌 Disconnecting seed client...');
    await mongoose.disconnect();
    console.log('✅ Seed client disconnected.');
    
    // Now start server.js
    console.log('\n🌐 Starting server.js...');
    require('./server.js');
}

main().catch(err => {
    console.error('❌ Error in wrapper server startup:', err);
    process.exit(1);
});
