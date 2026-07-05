#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Schedule Schema (same as in server.js)
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

// Data cleaning functions
function cleanTimeFormat(timeString) {
    if (!timeString) return timeString;
    
    // Normalize different dash types to em dash for consistency
    return timeString
        .replace(/\s*-\s*/g, ' – ')  // Convert hyphen to em dash with proper spacing
        .replace(/\s*—\s*/g, ' – ') // Convert em dash to consistent format
        .trim();
}

function cleanCampusName(campusString) {
    if (!campusString) return 'SZABIST University Campus H-8/4 ISB';
    
    // Standardize campus names
    const campusMap = {
        'SZABIST University Campus H-8/4 ISB': 'SZABIST University Campus H-8/4 ISB',
        'SZABIST HMB I-8 MarkazCampus': 'SZABIST University Campus H-8/4 ISB', // Normalize to main campus
        'SZABIST HMB I-8 Markaz Campus': 'SZABIST University Campus H-8/4 ISB',
    };
    
    return campusMap[campusString] || campusString;
}

function validateAndCleanScheduleItem(item) {
    if (!item || typeof item !== 'object') return null;
    
    // Clean and validate required fields
    const cleaned = {
        course: item.course ? item.course.trim() : '',
        faculty: item.faculty ? item.faculty.trim() : '',
        room: item.room ? item.room.trim() : '',
        time: cleanTimeFormat(item.time),
        campus: cleanCampusName(item.campus)
    };
    
    // Validate required fields
    if (!cleaned.course || !cleaned.faculty || !cleaned.room || !cleaned.time) {
        console.warn(`⚠️  Skipping invalid schedule item:`, item);
        return null;
    }
    
    return cleaned;
}

function cleanWeeklySchedule(weeklySchedule) {
    if (!weeklySchedule || typeof weeklySchedule !== 'object') {
        return {
            monday: [], tuesday: [], wednesday: [], 
            thursday: [], friday: [], saturday: []
        };
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const cleaned = {};
    
    days.forEach(day => {
        const daySchedule = weeklySchedule[day];
        if (Array.isArray(daySchedule)) {
            cleaned[day] = daySchedule
                .map(item => validateAndCleanScheduleItem(item))
                .filter(item => item !== null); // Remove invalid items
        } else {
            cleaned[day] = [];
        }
    });
    
    return cleaned;
}

async function reseedSchedules() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Connected to MongoDB');

        // Read all JSON files from BSAI folder
        const bsaiPath = path.join(__dirname, 'Schedules', 'BSAI');
        console.log(`📂 Reading schedule files from: ${bsaiPath}`);
        
        if (!fs.existsSync(bsaiPath)) {
            throw new Error(`BSAI folder not found at: ${bsaiPath}`);
        }

        const files = fs.readdirSync(bsaiPath).filter(file => file.endsWith('.json'));
        console.log(`📋 Found ${files.length} schedule files`);

        // Clear existing schedules (CAREFUL!)
        console.log('🗑️  Removing existing schedule data...');
        await Schedule.deleteMany({});
        console.log('✅ Existing schedules cleared');

        let processedCount = 0;
        const errors = [];

        for (const file of files) {
            try {
                console.log(`📄 Processing: ${file}`);
                
                const filePath = path.join(bsaiPath, file);
                const scheduleData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                // Parse section and semester with multiple methods for reliability
                let semester, section;
                
                // Method 1: Parse from section string (e.g., "BSAI-1A" -> semester: 1, section: "A")
                const sectionMatch = scheduleData.section?.match(/BSAI-(\d+)([A-Z])$/);
                if (sectionMatch) {
                    semester = parseInt(sectionMatch[1]);
                    section = sectionMatch[2];
                } else {
                    // Method 2: Parse from semester field (e.g., "3rd Semester" -> 3)
                    const semesterMatch = scheduleData.semester?.match(/(\d+)/); 
                    if (semesterMatch) {
                        semester = parseInt(semesterMatch[1]);
                        // Try to extract section from section field
                        const altSectionMatch = scheduleData.section?.match(/([A-Z])$/);
                        section = altSectionMatch ? altSectionMatch[1] : 'A';
                    } else {
                        throw new Error(`Could not parse semester/section from ${file}: section=${scheduleData.section}, semester=${scheduleData.semester}`);
                    }
                }
                
                // Validate parsed values
                if (!semester || semester < 1 || semester > 8) {
                    throw new Error(`Invalid semester parsed from ${file}: ${semester}`);
                }
                if (!section || !/^[A-E]$/.test(section)) {
                    throw new Error(`Invalid section parsed from ${file}: ${section}`);
                }

                // Clean and validate the schedule data
                const cleanedWeeklySchedule = cleanWeeklySchedule(scheduleData.weekly_schedule);
                
                // Create new schedule document with cleaned data
                const newSchedule = new Schedule({
                    department: 'Computer Sciences',
                    program: 'BS (Artificial Intelligence)', 
                    semester: semester,
                    section: section,
                    university: scheduleData.university || 'SZABIST University, Islamabad Campus',
                    weekly_schedule: cleanedWeeklySchedule,
                    isActive: true
                });
                
                // Log schedule cleaning summary
                const totalClasses = Object.values(cleanedWeeklySchedule)
                    .reduce((sum, dayClasses) => sum + dayClasses.length, 0);
                console.log(`   📚 Cleaned ${totalClasses} classes for Semester ${semester}, Section ${section}`);

                await newSchedule.save();
                processedCount++;
                console.log(`✅ ${file} → Semester ${semester}, Section ${section}`);

            } catch (error) {
                console.error(`❌ Error processing ${file}:`, error.message);
                errors.push({ file, error: error.message });
            }
        }

        console.log('\\n📊 Reseed Summary:');
        console.log(`✅ Successfully processed: ${processedCount} schedules`);
        console.log(`❌ Errors: ${errors.length}`);

        if (errors.length > 0) {
            console.log('\\n🚨 Error Details:');
            errors.forEach(({ file, error }) => {
                console.log(`   ${file}: ${error}`);
            });
        }

        console.log('\\n🎉 Database reseeding completed!');
        
        // Verify the data
        const totalSchedules = await Schedule.countDocuments({});
        console.log(`📈 Total schedules in database: ${totalSchedules}`);

        // Detailed verification and analysis
        console.log('\n🔍 SCHEDULE DATA ANALYSIS:');
        
        // Analyze by semester and section
        const scheduleAnalysis = await Schedule.aggregate([
            { $group: { 
                _id: { semester: '$semester', section: '$section' }, 
                count: { $sum: 1 },
                totalClasses: { 
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
            }},
            { $sort: { '_id.semester': 1, '_id.section': 1 } }
        ]);
        
        console.log('\n📊 Schedule Distribution:');
        scheduleAnalysis.forEach(item => {
            console.log(`   Semester ${item._id.semester}${item._id.section}: ${item.totalClasses} classes`);
        });
        
        // Sample schedule verification
        const sampleSchedule = await Schedule.findOne({}).populate('createdBy', 'username');
        if (sampleSchedule) {
            console.log('\n🔍 Sample Schedule Verification:');
            console.log(`   Department: ${sampleSchedule.department}`);
            console.log(`   Program: ${sampleSchedule.program}`);
            console.log(`   Semester: ${sampleSchedule.semester}, Section: ${sampleSchedule.section}`);
            console.log(`   University: ${sampleSchedule.university}`);
            
            // Show sample time formats
            const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            days.forEach(day => {
                const dayClasses = sampleSchedule.weekly_schedule[day];
                if (dayClasses && dayClasses.length > 0) {
                    console.log(`   ${day.charAt(0).toUpperCase() + day.slice(1)} (${dayClasses.length} classes):`);
                    dayClasses.slice(0, 2).forEach((classItem, index) => {
                        console.log(`     ${index + 1}. ${classItem.course}`);
                        console.log(`        Time: ${classItem.time}`);
                        console.log(`        Faculty: ${classItem.faculty}`);
                        console.log(`        Room: ${classItem.room}`);
                    });
                    if (dayClasses.length > 2) {
                        console.log(`     ... and ${dayClasses.length - 2} more classes`);
                    }
                    break; // Show only first day with classes
                }
            });
        }
        
        // Time format verification
        const timeFormats = await Schedule.aggregate([
            { $unwind: '$weekly_schedule.monday' },
            { $group: { _id: null, sampleTimes: { $addToSet: '$weekly_schedule.monday.time' } } },
            { $project: { sampleTimes: { $slice: ['$sampleTimes', 5] } } }
        ]);
        
        if (timeFormats[0]?.sampleTimes) {
            console.log('\n⏰ Time Format Samples:');
            timeFormats[0].sampleTimes.forEach((time, index) => {
                console.log(`   ${index + 1}. ${time}`);
            });
        }

    } catch (error) {
        console.error('❌ Fatal error during reseeding:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

// Run the script
if (require.main === module) {
    console.log('🚀 Starting schedule database reseed...');
    console.log('⚠️  WARNING: This will DELETE all existing schedule data!');
    console.log('💾 Make sure you have a backup before continuing.');
    console.log('');
    
    // Add a confirmation prompt in production
    reseedSchedules();
}

module.exports = { reseedSchedules };