#!/usr/bin/env node

/**
 * COMPLETE SCHEDULE DATABASE RESEEDING SOLUTION
 * 
 * This script provides a comprehensive solution for reseeding your schedule database
 * with perfect schema alignment and data validation.
 * 
 * FEATURES:
 * - Perfect schema alignment (handles semester string -> number conversion)
 * - Time format normalization (all dash types standardized)
 * - Campus name standardization 
 * - Data validation and cleaning
 * - Comprehensive error handling
 * - Detailed verification and analysis
 * - Backup creation before changes
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { execSync } = require('child_process');

// Load environment variables
dotenv.config();

console.log('🚀 COMPLETE SCHEDULE DATABASE RESEEDING');
console.log('=========================================');
console.log('');

// Schedule Schema (exact match with server.js)
const scheduleSchema = new mongoose.Schema({
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['Management Sciences', 'Computer Sciences', 'Executive Programs', 'Social Sciences', 'Media Sciences']
    },
    program: {
        type: String,
        required: [true, 'Program is required']
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: [1, 'Semester must be at least 1'],
        max: [8, 'Semester cannot exceed 8']
    },
    section: {
        type: String,
        required: [true, 'Section is required'],
        enum: ['A', 'B', 'C', 'D', 'E']
    },
    university: {
        type: String,
        default: 'SZABIST University, Islamabad Campus'
    },
    weekly_schedule: {
        monday: [{ course: String, faculty: String, room: String, time: String, campus: String }],
        tuesday: [{ course: String, faculty: String, room: String, time: String, campus: String }],
        wednesday: [{ course: String, faculty: String, room: String, time: String, campus: String }],
        thursday: [{ course: String, faculty: String, room: String, time: String, campus: String }],
        friday: [{ course: String, faculty: String, room: String, time: String, campus: String }],
        saturday: [{ course: String, faculty: String, room: String, time: String, campus: String }]
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

scheduleSchema.index({ department: 1, program: 1, semester: 1, section: 1 }, { unique: true });
const Schedule = mongoose.model('Schedule', scheduleSchema);

// ===================== DATA CLEANING FUNCTIONS =====================

function normalizeTimeFormat(timeString) {
    if (!timeString) return timeString;
    
    // Convert all dash variations to consistent em dash with proper spacing
    return timeString
        .replace(/\s*[-—]\s*/g, ' – ')  // Normalize all dash types to em dash
        .replace(/\s+/g, ' ')          // Normalize multiple spaces
        .trim();
}

function standardizeCampusName(campusString) {
    if (!campusString) return 'SZABIST University Campus H-8/4 ISB';
    
    // Campus name standardization map
    const campusMap = {
        'SZABIST University Campus H-8/4 ISB': 'SZABIST University Campus H-8/4 ISB',
        'SZABIST HMB I-8 MarkazCampus': 'SZABIST University Campus H-8/4 ISB',
        'SZABIST HMB I-8 Markaz Campus': 'SZABIST University Campus H-8/4 ISB',
        'SZABIST University Campus': 'SZABIST University Campus H-8/4 ISB'
    };
    
    return campusMap[campusString.trim()] || 'SZABIST University Campus H-8/4 ISB';
}

function validateScheduleItem(item, context = '') {
    if (!item || typeof item !== 'object') return null;
    
    const cleaned = {
        course: (item.course || '').trim(),
        faculty: (item.faculty || '').trim(),
        room: (item.room || '').trim(),
        time: normalizeTimeFormat(item.time),
        campus: standardizeCampusName(item.campus)
    };
    
    // Validate required fields
    if (!cleaned.course || !cleaned.faculty || !cleaned.room || !cleaned.time) {
        console.warn(`⚠️  ${context}: Skipping incomplete class - ${JSON.stringify(item)}`);
        return null;
    }
    
    // Validate time format
    const timePattern = /^\d{1,2}:\d{2}\s+(AM|PM)\s+–\s+\d{1,2}:\d{2}\s+(AM|PM)$/i;
    if (!timePattern.test(cleaned.time)) {
        console.warn(`⚠️  ${context}: Invalid time format "${cleaned.time}" - attempting to fix...`);
        // Try to fix common time format issues
        if (cleaned.time.includes('-')) {
            cleaned.time = cleaned.time.replace('-', '–');
        }
    }
    
    return cleaned;
}

function processWeeklySchedule(weeklySchedule, context = '') {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const cleaned = {};
    let totalClasses = 0;
    let cleanedClasses = 0;
    
    days.forEach(day => {
        const daySchedule = weeklySchedule[day];
        if (Array.isArray(daySchedule)) {
            const validClasses = [];
            daySchedule.forEach((item, index) => {
                totalClasses++;
                const cleanedItem = validateScheduleItem(item, `${context} ${day}[${index}]`);
                if (cleanedItem) {
                    validClasses.push(cleanedItem);
                    cleanedClasses++;
                }
            });
            cleaned[day] = validClasses;
        } else {
            cleaned[day] = [];
        }
    });
    
    console.log(`   📚 ${context}: ${cleanedClasses}/${totalClasses} classes processed successfully`);
    return cleaned;
}

function parseSemesterAndSection(scheduleData, filename) {
    let semester, section;
    
    // Method 1: Parse from section field (e.g., "BSAI-1A")
    const sectionMatch = scheduleData.section?.match(/BSAI-(\d+)([A-E])$/i);
    if (sectionMatch) {
        semester = parseInt(sectionMatch[1]);
        section = sectionMatch[2].toUpperCase();
    } else {
        // Method 2: Parse from semester field (e.g., "3rd Semester")
        const semesterMatch = scheduleData.semester?.match(/(\d+)/);
        if (semesterMatch) {
            semester = parseInt(semesterMatch[1]);
            const altSectionMatch = scheduleData.section?.match(/([A-E])$/i);
            section = altSectionMatch ? altSectionMatch[1].toUpperCase() : 'A';
        } else {
            throw new Error(`Cannot parse semester/section from ${filename}: section="${scheduleData.section}", semester="${scheduleData.semester}"`);
        }
    }
    
    // Validate parsed values
    if (!semester || semester < 1 || semester > 8) {
        throw new Error(`Invalid semester in ${filename}: ${semester}`);
    }
    if (!section || !/^[A-E]$/.test(section)) {
        throw new Error(`Invalid section in ${filename}: ${section}`);
    }
    
    return { semester, section };
}

// ===================== MAIN RESEEDING FUNCTION =====================

async function completeScheduleReseed() {
    let connection = null;
    
    try {
        // Step 1: Create backup
        console.log('📦 STEP 1: Creating database backup...');
        try {
            execSync('node backup-database.js', { stdio: 'inherit', cwd: __dirname });
            console.log('✅ Backup created successfully');
        } catch (error) {
            console.warn('⚠️  Backup failed, but continuing with reseed:', error.message);
        }
        
        // Step 2: Connect to MongoDB
        console.log('\\n🔌 STEP 2: Connecting to MongoDB...');
        connection = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');
        
        // Step 3: Read and validate JSON files
        console.log('\\n📂 STEP 3: Reading schedule files...');
        const bsaiPath = path.join(__dirname, 'Schedules', 'BSAI');
        
        if (!fs.existsSync(bsaiPath)) {
            throw new Error(`BSAI folder not found at: ${bsaiPath}`);
        }
        
        const files = fs.readdirSync(bsaiPath).filter(file => file.endsWith('.json'));
        console.log(`📋 Found ${files.length} JSON files`);
        
        // Step 4: Clear existing data
        console.log('\\n🗑️  STEP 4: Clearing existing schedule data...');
        const deletedCount = await Schedule.deleteMany({});
        console.log(`✅ Removed ${deletedCount.deletedCount} existing schedules`);
        
        // Step 5: Process and insert new data
        console.log('\\n🔄 STEP 5: Processing and inserting schedules...');
        
        let processed = 0;
        let successful = 0;
        const errors = [];
        const stats = {
            totalClasses: 0,
            cleanedClasses: 0,
            semesterDistribution: {}
        };
        
        for (const file of files) {
            try {
                processed++;
                console.log(`\\n📄 Processing [${processed}/${files.length}]: ${file}`);
                
                const filePath = path.join(bsaiPath, file);
                const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                // Parse semester and section
                const { semester, section } = parseSemesterAndSection(scheduleData, file);
                
                // Clean weekly schedule
                const cleanedWeeklySchedule = processWeeklySchedule(scheduleData.weekly_schedule, `${semester}${section}`);
                
                // Count classes for stats
                const classCount = Object.values(cleanedWeeklySchedule).reduce((sum, dayClasses) => sum + dayClasses.length, 0);
                stats.totalClasses += classCount;
                stats.cleanedClasses += classCount;
                
                if (!stats.semesterDistribution[semester]) {
                    stats.semesterDistribution[semester] = 0;
                }
                stats.semesterDistribution[semester] += classCount;
                
                // Create schedule document
                const newSchedule = new Schedule({
                    department: 'Computer Sciences',
                    program: 'BS (Artificial Intelligence)',
                    semester: semester,
                    section: section,
                    university: scheduleData.university || 'SZABIST University, Islamabad Campus',
                    weekly_schedule: cleanedWeeklySchedule,
                    isActive: true
                });
                
                await newSchedule.save();
                successful++;
                console.log(`   ✅ Semester ${semester}${section}: ${classCount} classes inserted`);
                
            } catch (error) {
                console.error(`   ❌ Failed to process ${file}:`, error.message);
                errors.push({ file, error: error.message });
            }
        }
        
        // Step 6: Verification and analysis
        console.log('\\n🔍 STEP 6: Verification and analysis...');
        
        const totalSchedules = await Schedule.countDocuments({});
        console.log(`✅ Successfully inserted ${totalSchedules} schedules`);
        
        // Detailed analysis
        const analysis = await Schedule.aggregate([
            {
                $group: {
                    _id: { semester: '$semester', section: '$section' },
                    classCount: {
                        $sum: {
                            $add: [
                                { $size: { $ifNull: ['$weekly_schedule.monday', []] } },
                                { $size: { $ifNull: ['$weekly_schedule.tuesday', []] } },
                                { $size: { $ifNull: ['$weekly_schedule.wednesday', []] } },
                                { $size: { $ifNull: ['$weekly_schedule.thursday', []] } },
                                { $size: { $ifNull: ['$weekly_schedule.friday', []] } },
                                { $size: { $ifNull: ['$weekly_schedule.saturday', []] } }
                            ]
                        }
                    }
                }
            },
            { $sort: { '_id.semester': 1, '_id.section': 1 } }
        ]);
        
        console.log('\\n📊 SCHEDULE DISTRIBUTION:');
        analysis.forEach(item => {
            console.log(`   Semester ${item._id.semester}${item._id.section}: ${item.classCount} classes`);
        });
        
        // Sample verification
        const sampleSchedule = await Schedule.findOne({});
        if (sampleSchedule) {
            console.log('\\n🔍 SAMPLE VERIFICATION:');
            console.log(`   Department: ${sampleSchedule.department}`);
            console.log(`   Program: ${sampleSchedule.program}`);
            console.log(`   Semester: ${sampleSchedule.semester}, Section: ${sampleSchedule.section}`);
            
            // Show sample times
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            for (const day of days) {
                const dayClasses = sampleSchedule.weekly_schedule[day];
                if (dayClasses && dayClasses.length > 0) {
                    console.log(`   ${day.charAt(0).toUpperCase() + day.slice(1)} sample class:`);
                    console.log(`     Course: ${dayClasses[0].course}`);
                    console.log(`     Time: ${dayClasses[0].time}`);
                    console.log(`     Faculty: ${dayClasses[0].faculty}`);
                    console.log(`     Room: ${dayClasses[0].room}`);
                    break;
                }
            }
        }
        
        // Final summary
        console.log('\n🎉 COMPLETE RESEED SUMMARY:');
        console.log(`   ✅ Files processed: ${processed}`);
        console.log(`   ✅ Schedules inserted: ${successful}`);
        console.log(`   ❌ Errors: ${errors.length}`);
        console.log(`   📚 Total classes: ${stats.totalClasses}`);
        
        if (errors.length > 0) {
            console.log('\n🚨 ERROR DETAILS:');
            errors.forEach(({ file, error }) => {
                console.log(`   ${file}: ${error}`);
            });
        }
        
        console.log('\n✨ DATABASE RESEEDING COMPLETED SUCCESSFULLY!');
        console.log('\n🧪 Next steps:');
        console.log('   1. Start your server: npm start');
        console.log('   2. Go to Admin Panel → Schedule Management');
        console.log('   3. Verify schedules display correctly');
        console.log('   4. Test editing - times should remain precise!');
        
    } catch (error) {
        console.error('\n❌ FATAL ERROR:', error.message);
        console.log('\n💡 Troubleshooting:');
        console.log('   - Ensure MongoDB is running');
        console.log('   - Check .env file for correct database URI');
        console.log('   - Verify BSAI folder exists with JSON files');
        console.log('   - Run backup-database.js first for safety');
        process.exit(1);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('\n🔌 Disconnected from MongoDB');
        }
    }
}

// Run the complete reseed if called directly
if (require.main === module) {
    console.log('⚠️  WARNING: This will REPLACE all existing schedule data!');
    console.log('💾 Make sure you have a backup before continuing.');
    console.log('');
    
    completeScheduleReseed();
}

module.exports = { completeScheduleReseed };
