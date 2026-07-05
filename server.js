// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const whatsappService = require('./services/whatsapp');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET || 'student-admin-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/student_registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Student Schema
const studentSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: [true, 'Student name is required']
    },
    phoneNumber: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function(v) {
                // Accept Pakistani format (+92xxxxxxxxxx) or local format (0xxxxxxxxx)
                return /^(\+92|0)\d{10}$/.test(v.replace(/[\s\-\(\)]/g, ''));
            },
            message: props => `${props.value} is not a valid Pakistani phone number!`
        }
    },
    email: {
        type: String,
        required: [true, 'Email address is required'],
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: props => `${props.value} is not a valid email address!`
        },
        unique: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: ['Management Sciences', 'Computer Sciences', 'Executive Programs', 'Social Sciences', 'Media Sciences']
    },
    program: {
        type: String,
        required: [true, 'Program is required']
    },
    section: {
        type: String,
        required: [true, 'Section is required'],
        enum: ['A', 'B', 'C', 'D']
    },
    semester: {
        type: Number,
        required: [true, 'Semester is required'],
        min: [1, 'Semester must be at least 1'],
        max: [8, 'Semester cannot exceed 8']
    },
    status: {
        type: String,
        enum: ['active', 'graduated', 'dropped'],
        default: 'active'
    },
    gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other']
    },
    dob: {
        type: Date,
        required: [true, 'Date of birth is required']
    },
    regNumber: {
        type: String,
        required: [true, 'Student registration number is required'],
        unique: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create Student model
const Student = mongoose.model('Student', studentSchema);

// Promotion History Schema
const promotionHistorySchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    promotedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    promotionType: {
        type: String,
        enum: ['semester_promotion', 'graduation', 'rollback'],
        required: true
    },
    fromSemester: {
        type: Number,
        required: true
    },
    toSemester: {
        type: Number,
        required: function() {
            return this.promotionType !== 'graduation';
        }
    },
    fromStatus: {
        type: String,
        enum: ['active', 'graduated', 'dropped'],
        required: true
    },
    toStatus: {
        type: String,
        enum: ['active', 'graduated', 'dropped'],
        required: true
    },
    fromSection: String,
    toSection: String,
    batchSize: {
        type: Number,
        default: 1
    },
    notes: String,
    promotionDate: {
        type: Date,
        default: Date.now
    },
    isRolledBack: {
        type: Boolean,
        default: false
    },
    rollbackDate: Date,
    rollbackBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

// Create PromotionHistory model
const PromotionHistory = mongoose.model('PromotionHistory', promotionHistorySchema);

// Schedule Schema
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
        monday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }],
        tuesday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }],
        wednesday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }],
        thursday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }],
        friday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }],
        saturday: [{
            course: String,
            faculty: String,
            room: String,
            time: String,
            campus: String
        }]
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
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

// Create unique compound index
scheduleSchema.index({ department: 1, program: 1, semester: 1, section: 1 }, { unique: true });

// Update updatedAt on save
scheduleSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create Schedule model
const Schedule = mongoose.model('Schedule', scheduleSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        validate: {
            validator: function(v) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: 'Please enter a valid email address'
        }
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: {
        type: String,
        enum: ['super_admin', 'admin'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Create Admin model
const Admin = mongoose.model('Admin', adminSchema);

// Helper function to format Pakistani phone numbers
function formatPakistaniPhoneNumber(phoneNumber) {
    if (!phoneNumber) return phoneNumber;
    
    // Remove any spaces, dashes, parentheses, or plus signs
    let cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    
    // If the number starts with '0', remove it and add '+92'
    if (cleaned.startsWith('0')) {
        cleaned = '+92' + cleaned.substring(1);
    }
    // If the number starts with '92', add '+' prefix
    else if (cleaned.startsWith('92')) {
        cleaned = '+' + cleaned;
    }
    // If the number doesn't start with '+92', assume it's a local number and add '+92'
    else if (!cleaned.startsWith('+92')) {
        cleaned = '+92' + cleaned;
    }
    
    return cleaned;
}

// Authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.cookies.adminToken || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'admin-jwt-secret');
        const admin = await Admin.findById(decoded.id).select('-password');
        
        if (!admin || !admin.isActive) {
            return res.status(401).json({ message: 'Invalid token or admin account disabled.' });
        }
        
        req.admin = admin;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token.' });
    }
};

// Check if super admin
const requireSuperAdmin = (req, res, next) => {
    if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
    }
    next();
};

// Create default super admin if none exists
const createDefaultAdmin = async () => {
    try {
        const adminCount = await Admin.countDocuments();
        if (adminCount === 0) {
            const defaultAdmin = new Admin({
                username: 'superadmin',
                email: 'admin@example.com',
                password: 'admin123',
                role: 'super_admin'
            });
            await defaultAdmin.save();
            console.log('Default super admin created: username=superadmin, password=admin123');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};

// Initialize default admin
createDefaultAdmin();

// Admin Authentication Routes
// Admin login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Find admin
        const admin = await Admin.findOne({ 
            $or: [{ username }, { email: username }],
            isActive: true 
        });
        
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isValidPassword = await admin.comparePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // Update last login
        admin.lastLogin = new Date();
        await admin.save();
        
        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            process.env.JWT_SECRET || 'admin-jwt-secret',
            { expiresIn: '24h' }
        );
        
        // Set cookie
        res.cookie('adminToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        res.json({
            message: 'Login successful',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('adminToken');
    res.json({ message: 'Logout successful' });
});

// Get current admin profile
app.get('/api/admin/profile', authenticateAdmin, (req, res) => {
    res.json({
        admin: {
            id: req.admin._id,
            username: req.admin.username,
            email: req.admin.email,
            role: req.admin.role,
            lastLogin: req.admin.lastLogin,
            createdAt: req.admin.createdAt
        }
    });
});

// Create new admin (super admin only)
app.post('/api/admin/create', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const { username, email, password, role = 'admin' } = req.body;
        
        const newAdmin = new Admin({
            username,
            email,
            password,
            role,
            createdBy: req.admin._id
        });
        
        await newAdmin.save();
        
        res.status(201).json({
            message: 'Admin created successfully',
            admin: {
                id: newAdmin._id,
                username: newAdmin.username,
                email: newAdmin.email,
                role: newAdmin.role
            }
        });
        
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ message: `${field} already exists` });
        }
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }
        
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all admins (super admin only)
app.get('/api/admin/all', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password').populate('createdBy', 'username');
        res.json(admins);
    } catch (error) {
        console.error('Fetch admins error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update admin password
app.put('/api/admin/change-password', authenticateAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        const admin = await Admin.findById(req.admin._id);
        
        // Verify current password
        const isValidPassword = await admin.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        
        // Update password
        admin.password = newPassword;
        await admin.save();
        
        res.json({ message: 'Password updated successfully' });
        
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete admin (super admin only)
app.delete('/api/admin/:id', authenticateAdmin, requireSuperAdmin, async (req, res) => {
    try {
        const adminId = req.params.id;
        
        // Prevent deleting self
        if (adminId === req.admin._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }
        
        const deletedAdmin = await Admin.findByIdAndDelete(adminId);
        
        if (!deletedAdmin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        
        res.json({ message: 'Admin deleted successfully' });
        
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Dashboard statistics route
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments();
        const totalAdmins = await Admin.countDocuments();
        
        // Students by department
        const departmentStats = await Student.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Students by gender
        const genderStats = await Student.aggregate([
            { $group: { _id: '$gender', count: { $sum: 1 } } }
        ]);
        
        // Recent registrations (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentRegistrations = await Student.countDocuments({
            createdAt: { $gte: sevenDaysAgo }
        });
        
        // Monthly registrations for the chart
        const monthlyStats = await Student.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
        ]);
        
        res.json({
            totalStudents,
            totalAdmins,
            recentRegistrations,
            departmentStats,
            genderStats,
            monthlyStats
        });
        
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// API Routes
// Get all students (protected)
app.get('/api/students', authenticateAdmin, async (req, res) => {
    try {
        const students = await Student.find({}).select('-__v');
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
});

// Get student by ID (protected)
app.get('/api/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id).select('-__v');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching student', error: error.message });
    }
});

// Create new student (public - for registration form)
app.post('/api/students', async (req, res) => {
    try {
        // Check if email already exists
        const existingEmail = await Student.findOne({ email: req.body.email });
        if (existingEmail) {
            return res.status(400).json({ message: 'Email is already registered' });
        }
        
        // Check if registration number already exists
        const existingRegNumber = await Student.findOne({ regNumber: req.body.regNumber });
        if (existingRegNumber) {
            return res.status(400).json({ message: 'Registration number is already taken' });
        }
        
        // Format phone number before creating student
        const studentData = { ...req.body };
        if (studentData.phoneNumber) {
            studentData.phoneNumber = formatPakistaniPhoneNumber(studentData.phoneNumber);
        }
        
        // Create new student
        const newStudent = new Student(studentData);
        const savedStudent = await newStudent.save();
        
        res.status(201).json({
            message: 'Student registered successfully',
            student: savedStudent
        });
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            console.log('Validation errors:', validationErrors);
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }
        
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            const message = field === 'email' ? 'Email is already registered' : 
                           field === 'regNumber' ? 'Registration number is already taken' : 
                           'Duplicate entry found';
            return res.status(400).json({ message });
        }
        
        console.error('Unexpected error:', error.stack);
        res.status(500).json({ message: 'Error registering student', error: error.message });
    }
});

// Update student (protected)
app.put('/api/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!updatedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json({
            message: 'Student updated successfully',
            student: updatedStudent
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ message: 'Validation error', errors: validationErrors });
        }
        
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
});

// Delete student (protected)
app.delete('/api/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const deletedStudent = await Student.findByIdAndDelete(req.params.id);
        
        if (!deletedStudent) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        res.status(200).json({ message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting student', error: error.message });
    }
});

// ==================== WHATSAPP API ROUTES ====================

// Initialize WhatsApp client
app.post('/api/whatsapp/initialize', authenticateAdmin, async (req, res) => {
    try {
        const result = await whatsappService.initialize();
        res.json(result);
    } catch (error) {
        console.error('WhatsApp initialization error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to initialize WhatsApp client', 
            error: error.message 
        });
    }
});

// Get WhatsApp connection status
app.get('/api/whatsapp/status', authenticateAdmin, (req, res) => {
    try {
        const status = whatsappService.getStatus();
        res.json(status);
    } catch (error) {
        console.error('WhatsApp status error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get WhatsApp status', 
            error: error.message 
        });
    }
});

// Get QR code for WhatsApp authentication
app.get('/api/whatsapp/qr', authenticateAdmin, (req, res) => {
    try {
        const qrCode = whatsappService.getQRCode();
        if (qrCode) {
            res.json({ success: true, qrCode: qrCode });
        } else {
            res.json({ success: false, message: 'No QR code available. Please initialize first.' });
        }
    } catch (error) {
        console.error('WhatsApp QR error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get QR code', 
            error: error.message 
        });
    }
});

// Send message to a single student
app.post('/api/whatsapp/send-message', authenticateAdmin, async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }
        
        const result = await whatsappService.sendMessage(phoneNumber, message);
        res.json(result);
        
    } catch (error) {
        console.error('WhatsApp send message error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send message', 
            error: error.message 
        });
    }
});

// Send bulk messages to multiple students
app.post('/api/whatsapp/send-bulk', authenticateAdmin, async (req, res) => {
    try {
        const { studentIds, message, filterCriteria } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }
        
        let phoneNumbers = [];
        
        if (studentIds && studentIds.length > 0) {
            // Send to specific students by IDs
            const students = await Student.find({ _id: { $in: studentIds } }).select('phoneNumber studentName');
            phoneNumbers = students.map(student => student.phoneNumber).filter(phone => phone);
        } else if (filterCriteria) {
            // Send to students based on filter criteria
            const query = {};
            if (filterCriteria.department) query.department = filterCriteria.department;
            if (filterCriteria.section) query.section = filterCriteria.section;
            if (filterCriteria.program) query.program = filterCriteria.program;
            if (filterCriteria.semester) query.semester = parseInt(filterCriteria.semester);
            if (filterCriteria.gender) query.gender = filterCriteria.gender;
            
            const students = await Student.find(query).select('phoneNumber studentName');
            phoneNumbers = students.map(student => student.phoneNumber).filter(phone => phone);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Either studentIds or filterCriteria is required'
            });
        }
        
        if (phoneNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid phone numbers found for the given criteria'
            });
        }
        
        // Send bulk messages
        const result = await whatsappService.sendBulkMessages(phoneNumbers, message);
        res.json(result);
        
    } catch (error) {
        console.error('WhatsApp bulk send error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send bulk messages', 
            error: error.message 
        });
    }
});

// Send message to all students
app.post('/api/whatsapp/send-all', authenticateAdmin, async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }
        
        // Get all student phone numbers
        const students = await Student.find({}).select('phoneNumber studentName');
        const phoneNumbers = students.map(student => student.phoneNumber).filter(phone => phone);
        
        if (phoneNumbers.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No students with phone numbers found'
            });
        }
        
        const result = await whatsappService.sendBulkMessages(phoneNumbers, message);
        res.json(result);
        
    } catch (error) {
        console.error('WhatsApp send all error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send messages to all students', 
            error: error.message 
        });
    }
});

// Disconnect WhatsApp client
app.post('/api/whatsapp/disconnect', authenticateAdmin, async (req, res) => {
    try {
        const result = await whatsappService.disconnect();
        res.json(result);
    } catch (error) {
        console.error('WhatsApp disconnect error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to disconnect WhatsApp client', 
            error: error.message 
        });
    }
});

// Restart WhatsApp client
app.post('/api/whatsapp/restart', authenticateAdmin, async (req, res) => {
    try {
        const result = await whatsappService.restart();
        res.json(result);
    } catch (error) {
        console.error('WhatsApp restart error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to restart WhatsApp client', 
            error: error.message 
        });
    }
});

// Get students grouped by criteria for bulk messaging
app.get('/api/whatsapp/student-groups', authenticateAdmin, async (req, res) => {
    try {
        // Get department groups
        const departmentGroups = await Student.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 }, students: { $push: { id: '$_id', name: '$studentName', phone: '$phoneNumber' } } } },
            { $sort: { _id: 1 } }
        ]);
        
        // Get section groups
        const sectionGroups = await Student.aggregate([
            { $group: { _id: '$section', count: { $sum: 1 }, students: { $push: { id: '$_id', name: '$studentName', phone: '$phoneNumber' } } } },
            { $sort: { _id: 1 } }
        ]);
        
        // Get program groups
        const programGroups = await Student.aggregate([
            { $group: { _id: '$program', count: { $sum: 1 }, students: { $push: { id: '$_id', name: '$studentName', phone: '$phoneNumber' } } } },
            { $sort: { _id: 1 } }
        ]);
        
        // Get semester groups
        const semesterGroups = await Student.aggregate([
            { $group: { _id: '$semester', count: { $sum: 1 }, students: { $push: { id: '$_id', name: '$studentName', phone: '$phoneNumber' } } } },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            departments: departmentGroups,
            sections: sectionGroups,
            programs: programGroups,
            semesters: semesterGroups
        });
        
    } catch (error) {
        console.error('Student groups error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get student groups', 
            error: error.message 
        });
    }
});

// Count students based on filter criteria
app.post('/api/whatsapp/count-students', authenticateAdmin, async (req, res) => {
    try {
        const { filterCriteria } = req.body;
        
        if (!filterCriteria || Object.keys(filterCriteria).length === 0) {
            return res.json({ count: 0 });
        }
        
        // Build the query object
        const query = {};
        if (filterCriteria.department) query.department = filterCriteria.department;
        if (filterCriteria.program) query.program = filterCriteria.program;
        if (filterCriteria.section) query.section = filterCriteria.section;
        if (filterCriteria.semester) {
            // Try both string and number formats for semester
            const semesterNum = parseInt(filterCriteria.semester);
            query.semester = semesterNum;
        }
        if (filterCriteria.gender) query.gender = filterCriteria.gender;
        
        console.log('\n=== COUNT STUDENTS DEBUG ===');
        console.log('Received filterCriteria:', JSON.stringify(filterCriteria, null, 2));
        console.log('Built query:', JSON.stringify(query, null, 2));
        
        const count = await Student.countDocuments(query);
        
        console.log('Found', count, 'students matching criteria');
        
        // Also log some sample students to debug
        const samples = await Student.find(query).limit(3).select('studentName department program section semester');
        console.log('Sample matching students:', JSON.stringify(samples, null, 2));
        console.log('=== END DEBUG ===\n');
        
        
        res.json({ count });
        
    } catch (error) {
        console.error('Count students error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to count students', 
            error: error.message 
        });
    }
});

// Debug endpoint to check schedule data (temporary)
app.get('/api/debug/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find({}).select('department program semester section isActive').limit(10);
        
        // Also get unique values for each field
        const departments = await Schedule.distinct('department');
        const programs = await Schedule.distinct('program');
        const sections = await Schedule.distinct('section');
        const semesters = await Schedule.distinct('semester');
        
        res.json({
            schedules,
            uniqueValues: {
                departments,
                programs,
                sections,
                semesters
            },
            totalCount: await Schedule.countDocuments({})
        });
    } catch (error) {
        console.error('Debug schedules error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check student data (temporary)
app.get('/api/debug/students', authenticateAdmin, async (req, res) => {
    try {
        const students = await Student.find({}).select('studentName department program section semester').limit(10);
        
        // Also get unique values for each field
        const departments = await Student.distinct('department');
        const programs = await Student.distinct('program');
        const sections = await Student.distinct('section');
        const semesters = await Student.distinct('semester');
        
        res.json({
            students,
            uniqueValues: {
                departments,
                programs,
                sections,
                semesters
            }
        });
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get programs by department
app.post('/api/whatsapp/programs-by-department', authenticateAdmin, async (req, res) => {
    try {
        const { department } = req.body;
        
        if (!department) {
            return res.json({ programs: [] });
        }
        
        // Get distinct programs for the specified department
        const programs = await Student.distinct('program', { department: department });
        
        console.log('Programs for', department, ':', programs);
        
        res.json({ programs: programs.filter(p => p) }); // Filter out null/undefined
        
    } catch (error) {
        console.error('Get programs by department error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get programs', 
            error: error.message 
        });
    }
});

// ==================== SEMESTER PROMOTION API ROUTES ====================

// Get students for promotion with filtering
app.post('/api/promotion/filter-students', authenticateAdmin, async (req, res) => {
    try {
        const { filters } = req.body;
        
        // Build query based on filters
        const query = {
            $or: [
                { status: 'active' },
                { status: { $exists: false } }, // Include students without status field
                { status: null } // Include students with null status
            ]
        };
        
        if (filters.department) query.department = filters.department;
        if (filters.program) query.program = filters.program;
        if (filters.semester) query.semester = parseInt(filters.semester);
        if (filters.section) query.section = filters.section;
        
        console.log('Promotion filter query:', query);
        
        const students = await Student.find(query)
            .select('studentName email department program semester section status phoneNumber regNumber')
            .sort({ semester: 1, section: 1, studentName: 1 });
        
        res.json({ 
            success: true, 
            students,
            count: students.length
        });
        
    } catch (error) {
        console.error('Filter students for promotion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to filter students', 
            error: error.message 
        });
    }
});

// Bulk promote students
app.post('/api/promotion/bulk-promote', authenticateAdmin, async (req, res) => {
    try {
        const { studentIds, promotionData } = req.body;
        const { toSemester, toSection, notes } = promotionData;
        
        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No students selected for promotion'
            });
        }
        
        // Get students to be promoted (including those without status field)
        const students = await Student.find({ 
            _id: { $in: studentIds },
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        });
        
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No eligible students found for promotion'
            });
        }
        
        const results = [];
        const promotionHistories = [];
        
        // Process students without transactions (for standalone MongoDB)
        try {
            for (const student of students) {
                const fromSemester = student.semester;
                const fromSection = student.section;
                const fromStatus = student.status || 'active'; // Default to 'active' if no status
                
                let newSemester = toSemester || (student.semester + 1);
                let newStatus = 'active';
                
                // Handle graduation (semester 8 -> graduated)
                if (newSemester > 8) {
                    newSemester = 8;
                    newStatus = 'graduated';
                }
                
                try {
                    // Update student
                    await Student.findByIdAndUpdate(
                        student._id,
                        {
                            semester: newSemester,
                            section: toSection || student.section,
                            status: newStatus
                        }
                    );
                    
                    // Create promotion history record
                    const promotionHistory = new PromotionHistory({
                        studentId: student._id,
                        promotedBy: req.admin._id,
                        promotionType: newStatus === 'graduated' ? 'graduation' : 'semester_promotion',
                        fromSemester,
                        toSemester: newSemester,
                        fromStatus,
                        toStatus: newStatus,
                        fromSection,
                        toSection: toSection || student.section,
                        batchSize: studentIds.length,
                        notes: notes || `Bulk promotion from ${fromSemester} to ${newSemester}`
                    });
                    
                    await promotionHistory.save();
                    promotionHistories.push(promotionHistory);
                    
                    results.push({
                        studentId: student._id,
                        studentName: student.studentName,
                        fromSemester,
                        toSemester: newSemester,
                        fromStatus,
                        toStatus: newStatus,
                        success: true
                    });
                    
                    console.log(`Successfully promoted ${student.studentName} from semester ${fromSemester} to ${newSemester}`);
                    
                } catch (studentError) {
                    console.error(`Failed to promote student ${student.studentName}:`, studentError);
                    results.push({
                        studentId: student._id,
                        studentName: student.studentName,
                        fromSemester,
                        toSemester: newSemester,
                        fromStatus,
                        toStatus: newStatus,
                        success: false,
                        error: studentError.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            res.json({
                success: successCount > 0,
                message: `Successfully promoted ${successCount} students${failCount > 0 ? `, ${failCount} failed` : ''}`,
                results,
                promotionHistoryIds: promotionHistories.map(h => h._id)
            });
            
        } catch (error) {
            console.error('Bulk promotion error:', error);
            throw error;
        }
        
    } catch (error) {
        console.error('Bulk promotion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to promote students', 
            error: error.message 
        });
    }
});

// Get promotion history
app.get('/api/promotion/history', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, studentId } = req.query;
        
        const query = studentId ? { studentId } : {};
        
        const promotions = await PromotionHistory.find(query)
            .populate('studentId', 'studentName email regNumber')
            .populate('promotedBy', 'username')
            .populate('rollbackBy', 'username')
            .sort({ promotionDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await PromotionHistory.countDocuments(query);
        
        res.json({
            success: true,
            promotions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Get promotion history error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get promotion history', 
            error: error.message 
        });
    }
});

// Rollback promotion
app.post('/api/promotion/rollback/:promotionId', authenticateAdmin, async (req, res) => {
    try {
        const { promotionId } = req.params;
        const { reason } = req.body;
        
        const promotion = await PromotionHistory.findById(promotionId)
            .populate('studentId');
        
        if (!promotion) {
            return res.status(404).json({
                success: false,
                message: 'Promotion record not found'
            });
        }
        
        if (promotion.isRolledBack) {
            return res.status(400).json({
                success: false,
                message: 'This promotion has already been rolled back'
            });
        }
        
        // Process rollback without transactions (for standalone MongoDB)
        try {
            // Revert student back to original state
            await Student.findByIdAndUpdate(
                promotion.studentId._id,
                {
                    semester: promotion.fromSemester,
                    section: promotion.fromSection,
                    status: promotion.fromStatus
                }
            );
            
            // Mark promotion as rolled back
            await PromotionHistory.findByIdAndUpdate(
                promotionId,
                {
                    isRolledBack: true,
                    rollbackDate: new Date(),
                    rollbackBy: req.admin._id,
                    notes: (promotion.notes || '') + `\n[ROLLBACK: ${reason || 'No reason provided'}]`
                }
            );
            
            // Create rollback history record
            const rollbackHistory = new PromotionHistory({
                studentId: promotion.studentId._id,
                promotedBy: req.admin._id,
                promotionType: 'rollback',
                fromSemester: promotion.toSemester,
                toSemester: promotion.fromSemester,
                fromStatus: promotion.toStatus,
                toStatus: promotion.fromStatus,
                fromSection: promotion.toSection,
                toSection: promotion.fromSection,
                notes: `Rollback of promotion ${promotionId}: ${reason || 'No reason provided'}`
            });
            
            await rollbackHistory.save();
            
            console.log(`Successfully rolled back promotion for ${promotion.studentId.studentName}`);
            
            res.json({
                success: true,
                message: `Successfully rolled back promotion for ${promotion.studentId.studentName}`,
                rollbackHistoryId: rollbackHistory._id
            });
            
        } catch (error) {
            console.error('Rollback error:', error);
            throw error;
        }
        
    } catch (error) {
        console.error('Rollback promotion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to rollback promotion', 
            error: error.message 
        });
    }
});

// Get promotion statistics
app.get('/api/promotion/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalPromotions = await PromotionHistory.countDocuments({ 
            promotionType: 'semester_promotion',
            isRolledBack: false
        });
        
        const totalGraduations = await PromotionHistory.countDocuments({ 
            promotionType: 'graduation',
            isRolledBack: false
        });
        
        const totalRollbacks = await PromotionHistory.countDocuments({ 
            promotionType: 'rollback'
        });
        
        const activeStudents = await Student.countDocuments({ 
            $or: [
                { status: 'active' },
                { status: { $exists: false } },
                { status: null }
            ]
        });
        const graduatedStudents = await Student.countDocuments({ status: 'graduated' });
        const droppedStudents = await Student.countDocuments({ status: 'dropped' });
        
        // Students by semester (only active, including those without status)
        const semesterDistribution = await Student.aggregate([
            { $match: { 
                $or: [
                    { status: 'active' },
                    { status: { $exists: false } },
                    { status: null }
                ]
            } },
            { $group: { _id: '$semester', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                promotions: {
                    total: totalPromotions,
                    graduations: totalGraduations,
                    rollbacks: totalRollbacks
                },
                students: {
                    active: activeStudents,
                    graduated: graduatedStudents,
                    dropped: droppedStudents
                },
                semesterDistribution
            }
        });
        
    } catch (error) {
        console.error('Get promotion stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get promotion statistics', 
            error: error.message 
        });
    }
});

// ==================== END SEMESTER PROMOTION API ROUTES ====================

// ==================== SCHEDULE MANAGEMENT API ROUTES ====================

// Get all schedules with filtering
app.get('/api/schedules', authenticateAdmin, async (req, res) => {
    try {
        const { department, program, semester, section, page = 1, limit = 20 } = req.query;
        
        // Build query based on filters
        const query = { isActive: true };
        if (department) query.department = department;
        if (program) query.program = program;
        if (semester) query.semester = parseInt(semester);
        if (section) query.section = section;
        
        const schedules = await Schedule.find(query)
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username')
            .sort({ department: 1, program: 1, semester: 1, section: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);
        
        const total = await Schedule.countDocuments(query);
        
        res.json({
            success: true,
            schedules,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });
        
    } catch (error) {
        console.error('Get schedules error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get schedules', 
            error: error.message 
        });
    }
});

// Get schedule statistics (must be before /:id route)
app.get('/api/schedules/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalSchedules = await Schedule.countDocuments({ isActive: true });
        
        // Schedules by department
        const departmentStats = await Schedule.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Schedules by program
        const programStats = await Schedule.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$program', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        // Schedules by semester
        const semesterStats = await Schedule.aggregate([
            { $match: { isActive: true } },
            { $group: { _id: '$semester', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        res.json({
            success: true,
            stats: {
                total: totalSchedules,
                byDepartment: departmentStats,
                byProgram: programStats,
                bySemester: semesterStats
            }
        });
        
    } catch (error) {
        console.error('Get schedule stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get schedule statistics', 
            error: error.message 
        });
    }
});

// Get schedule by ID
app.get('/api/schedules/:id', authenticateAdmin, async (req, res) => {
    try {
        const schedule = await Schedule.findById(req.params.id)
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username');
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }
        
        res.json({
            success: true,
            schedule
        });
        
    } catch (error) {
        console.error('Get schedule by ID error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get schedule', 
            error: error.message 
        });
    }
});

// Create new schedule
app.post('/api/schedules', authenticateAdmin, async (req, res) => {
    try {
        const scheduleData = {
            ...req.body,
            createdBy: req.admin._id,
            updatedBy: req.admin._id
        };
        
        // Check if schedule already exists for this combination
        const existingSchedule = await Schedule.findOne({
            department: scheduleData.department,
            program: scheduleData.program,
            semester: scheduleData.semester,
            section: scheduleData.section,
            isActive: true
        });
        
        if (existingSchedule) {
            return res.status(400).json({
                success: false,
                message: `Schedule already exists for ${scheduleData.department} - ${scheduleData.program} - Semester ${scheduleData.semester} - Section ${scheduleData.section}`
            });
        }
        
        const newSchedule = new Schedule(scheduleData);
        const savedSchedule = await newSchedule.save();
        
        // Populate the response
        const populatedSchedule = await Schedule.findById(savedSchedule._id)
            .populate('createdBy', 'username')
            .populate('updatedBy', 'username');
        
        res.status(201).json({
            success: true,
            message: 'Schedule created successfully',
            schedule: populatedSchedule
        });
        
    } catch (error) {
        console.error('Create schedule error:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: validationErrors 
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Schedule already exists for this department, program, semester, and section combination'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create schedule', 
            error: error.message 
        });
    }
});

// Update schedule
app.put('/api/schedules/:id', authenticateAdmin, async (req, res) => {
    try {
        const scheduleData = {
            ...req.body,
            updatedBy: req.admin._id,
            updatedAt: Date.now()
        };
        
        const updatedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            scheduleData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'username')
         .populate('updatedBy', 'username');
        
        if (!updatedSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Schedule updated successfully',
            schedule: updatedSchedule
        });
        
    } catch (error) {
        console.error('Update schedule error:', error);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({ 
                success: false, 
                message: 'Validation error', 
                errors: validationErrors 
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Schedule already exists for this department, program, semester, and section combination'
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update schedule', 
            error: error.message 
        });
    }
});

// Delete schedule (soft delete)
app.delete('/api/schedules/:id', authenticateAdmin, async (req, res) => {
    try {
        const deletedSchedule = await Schedule.findByIdAndUpdate(
            req.params.id,
            {
                isActive: false,
                updatedBy: req.admin._id,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!deletedSchedule) {
            return res.status(404).json({
                success: false,
                message: 'Schedule not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Schedule deleted successfully'
        });
        
    } catch (error) {
        console.error('Delete schedule error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete schedule', 
            error: error.message 
        });
    }
});

// Get schedules for specific criteria (for messaging)
app.post('/api/schedules/filter', authenticateAdmin, async (req, res) => {
    try {
        const { department, program, semester, section } = req.body;
        
        const query = { isActive: true };
        if (department) query.department = department;
        if (program) query.program = program;
        if (semester) query.semester = parseInt(semester);
        if (section) query.section = section;
        
        const schedules = await Schedule.find(query)
            .select('department program semester section weekly_schedule university')
            .sort({ department: 1, program: 1, semester: 1, section: 1 });
        
        res.json({
            success: true,
            schedules,
            count: schedules.length
        });
        
    } catch (error) {
        console.error('Filter schedules error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to filter schedules', 
            error: error.message 
        });
    }
});


// Import schedules from JSON (bulk import)
app.post('/api/schedules/import', authenticateAdmin, async (req, res) => {
    try {
        const { schedules, department, program } = req.body;
        
        if (!schedules || !Array.isArray(schedules)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid schedules data provided'
            });
        }
        
        const results = [];
        const errors = [];
        
        for (const scheduleData of schedules) {
            try {
                // Parse section and semester from section string (e.g., "BSAI-1A" -> semester: 1, section: "A")
                const sectionMatch = scheduleData.section?.match(/-(\d+)([A-Z])$/);
                if (!sectionMatch) {
                    throw new Error(`Invalid section format: ${scheduleData.section}`);
                }
                
                const semester = parseInt(sectionMatch[1]);
                const section = sectionMatch[2];
                
                // Check if schedule already exists
                const existingSchedule = await Schedule.findOne({
                    department: department,
                    program: program,
                    semester: semester,
                    section: section,
                    isActive: true
                });
                
                if (existingSchedule) {
                    // Update existing schedule
                    existingSchedule.weekly_schedule = scheduleData.weekly_schedule;
                    existingSchedule.university = scheduleData.university;
                    existingSchedule.updatedBy = req.admin._id;
                    await existingSchedule.save();
                    
                    results.push({
                        section: scheduleData.section,
                        status: 'updated',
                        id: existingSchedule._id
                    });
                } else {
                    // Create new schedule
                    const newSchedule = new Schedule({
                        department: department,
                        program: program,
                        semester: semester,
                        section: section,
                        university: scheduleData.university,
                        weekly_schedule: scheduleData.weekly_schedule,
                        createdBy: req.admin._id,
                        updatedBy: req.admin._id
                    });
                    
                    const savedSchedule = await newSchedule.save();
                    
                    results.push({
                        section: scheduleData.section,
                        status: 'created',
                        id: savedSchedule._id
                    });
                }
            } catch (error) {
                console.error(`Error processing schedule ${scheduleData.section}:`, error);
                errors.push({
                    section: scheduleData.section,
                    error: error.message
                });
            }
        }
        
        const successCount = results.length;
        const errorCount = errors.length;
        
        res.json({
            success: successCount > 0,
            message: `Successfully processed ${successCount} schedules${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
            results,
            errors
        });
        
    } catch (error) {
        console.error('Import schedules error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to import schedules', 
            error: error.message 
        });
    }
});

// Get student's schedule based on their enrollment
app.get('/api/schedules/student/:studentId', authenticateAdmin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }
        
        const schedule = await Schedule.findOne({
            department: student.department,
            program: student.program,
            semester: student.semester,
            section: student.section,
            isActive: true
        });
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                message: 'No schedule found for this student\'s current enrollment'
            });
        }
        
        res.json({
            success: true,
            schedule,
            student: {
                name: student.studentName,
                regNumber: student.regNumber,
                department: student.department,
                program: student.program,
                semester: student.semester,
                section: student.section
            }
        });
        
    } catch (error) {
        console.error('Get student schedule error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to get student schedule', 
            error: error.message 
        });
    }
});

// ==================== END SCHEDULE MANAGEMENT API ROUTES ====================

// ==================== END WHATSAPP API ROUTES ====================

// Admin login page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Admin dashboard route (protected)
app.get('/admin', (req, res) => {
    // Check if admin is logged in via cookie
    const token = req.cookies.adminToken;
    if (!token) {
        return res.redirect('/admin/login');
    }
    
    try {
        jwt.verify(token, process.env.JWT_SECRET || 'admin-jwt-secret');
        res.sendFile(path.join(__dirname, 'public', 'admin.html'));
    } catch (error) {
        res.clearCookie('adminToken');
        res.redirect('/admin/login');
    }
});

// Serve admin-specific assets
app.get('/admin-styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-styles.css'));
});

app.get('/admin-script.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-script.js'));
});

// Public route for students to view their schedule
app.get('/schedule/:regNumber', async (req, res) => {
    try {
        const regNumber = req.params.regNumber;
        
        // Find student by registration number
        const student = await Student.findOne({ regNumber: regNumber });
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        
        // Find schedule for the student
        const schedule = await Schedule.findOne({
            department: student.department,
            program: student.program,
            semester: student.semester,
            section: student.section,
            isActive: true
        });
        
        if (!schedule) {
            return res.json({
                success: true,
                student: {
                    name: student.studentName,
                    regNumber: student.regNumber,
                    department: student.department,
                    program: student.program,
                    semester: student.semester,
                    section: student.section
                },
                schedule: null,
                message: 'No schedule available for your current enrollment'
            });
        }
        
        res.json({
            success: true,
            student: {
                name: student.studentName,
                regNumber: student.regNumber,
                department: student.department,
                program: student.program,
                semester: student.semester,
                section: student.section
            },
            schedule: {
                university: schedule.university,
                weekly_schedule: schedule.weekly_schedule
            }
        });
        
    } catch (error) {
        console.error('Public schedule view error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to load schedule', 
            error: error.message 
        });
    }
});

// Serve the main HTML file for any other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});