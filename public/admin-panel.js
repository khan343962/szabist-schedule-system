document.addEventListener('DOMContentLoaded', () => {
    // Global variables
    let currentAdmin = null;
    let studentsData = [];
    let adminData = [];
    
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const navItems = document.querySelectorAll('.nav-item');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const pageSections = document.querySelectorAll('.page-section');
    const logoutBtn = document.getElementById('logoutBtn');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    const userAvatar = document.getElementById('userAvatar');
    
    // Initialize
    init();
    
    async function init() {
        try {
            // Load admin profile
            await loadAdminProfile();
            
            // Load dashboard data
            await loadDashboardData();
            
            // Setup event listeners
            setupEventListeners();
            
            // Show dashboard by default
            showPage('dashboard');
            
        } catch (error) {
            console.error('Initialization error:', error);
            // Redirect to login if authentication fails
            window.location.href = '/admin/login';
        }
    }
    
    function setupEventListeners() {
        // Sidebar toggle
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
        
        // Navigation items
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.getAttribute('data-page');
                showPage(page);
                
                // Update active state
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
        
        // Logout
        logoutBtn.addEventListener('click', logout);
        
        // Change password form
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', handleChangePassword);
        }
        
        // Global search
        const globalSearch = document.getElementById('globalSearch');
        if (globalSearch) {
            globalSearch.addEventListener('input', handleGlobalSearch);
        }
    }
    
    async function loadAdminProfile() {
        try {
            const response = await fetch('/api/admin/profile');
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            
            const data = await response.json();
            currentAdmin = data.admin;
            
            // Update UI
            userName.textContent = currentAdmin.username;
            userRole.textContent = currentAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin';
            userAvatar.textContent = currentAdmin.username.charAt(0).toUpperCase();
            
            // Show admin management if super admin
            if (currentAdmin.role === 'super_admin') {
                document.getElementById('adminManagementCard').style.display = 'block';
                loadAdmins();
            }
            
        } catch (error) {
            console.error('Profile loading error:', error);
            throw error;
        }
    }
    
    async function loadDashboardData() {
        try {
            const response = await fetch('/api/admin/stats');
            if (!response.ok) {
                throw new Error('Failed to load stats');
            }
            
            const stats = await response.json();
            
            // Update stats cards
            document.getElementById('totalStudents').textContent = stats.totalStudents;
            document.getElementById('newStudents').textContent = stats.recentRegistrations;
            document.getElementById('totalAdmins').textContent = stats.totalAdmins;
            
            // Create charts
            createEnrollmentChart(stats.monthlyStats);
            createDepartmentChart(stats.departmentStats);
            
            // Update recent activities
            updateRecentActivities(stats);
            
        } catch (error) {
            console.error('Dashboard loading error:', error);
            showError('Failed to load dashboard data');
        }
    }
    
    function createEnrollmentChart(monthlyStats) {
        const ctx = document.getElementById('enrollmentChart');
        if (!ctx) return;
        
        const labels = monthlyStats.map(stat => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[stat._id.month - 1] + ' ' + stat._id.year;
        });
        
        const data = monthlyStats.map(stat => stat.count);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Student Enrollments',
                    data: data,
                    borderColor: 'rgb(112, 0, 255)',
                    backgroundColor: 'rgba(112, 0, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    function createDepartmentChart(departmentStats) {
        const ctx = document.getElementById('departmentChart');
        if (!ctx) return;
        
        const labels = departmentStats.map(stat => stat._id || 'Unknown');
        const data = departmentStats.map(stat => stat.count);
        const colors = [
            'rgb(112, 0, 255)',
            'rgb(0, 225, 255)',
            'rgb(255, 61, 202)',
            'rgb(0, 217, 166)',
            'rgb(255, 189, 0)'
        ];
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    }
                }
            }
        });
    }
    
    function updateRecentActivities(stats) {
        const container = document.getElementById('recentActivities');
        if (!container) return;
        
        const activities = [
            {
                icon: 'fas fa-user-plus',
                text: `${stats.recentRegistrations} new students registered this week`,
                time: 'Recent',
                color: 'var(--success-color)'
            },
            {
                icon: 'fas fa-chart-line',
                text: `Total of ${stats.totalStudents} students in the system`,
                time: 'Overall',
                color: 'var(--primary-color)'
            },
            {
                icon: 'fas fa-users',
                text: `${stats.totalAdmins} admin users managing the system`,
                time: 'System',
                color: 'var(--accent-color)'
            }
        ];
        
        container.innerHTML = activities.map(activity => `
            <div style="display: flex; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-color);">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: ${activity.color}20; display: flex; align-items: center; justify-content: center; margin-right: 1rem;">
                    <i class="${activity.icon}" style="color: ${activity.color};"></i>
                </div>
                <div style="flex: 1;">
                    <p style="margin: 0; font-weight: 500;">${activity.text}</p>
                    <small style="color: #666;">${activity.time}</small>
                </div>
            </div>
        `).join('');
    }
    
    function showPage(page) {
        // Hide all sections
        pageSections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show selected section
        const targetSection = document.getElementById(`${page}-page`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update header
        const pageConfig = {
            dashboard: {
                title: 'Dashboard',
                subtitle: 'Overview of your student management system'
            },
            students: {
                title: 'Student Management',
                subtitle: 'Manage and view student records'
            },
            whatsapp: {
                title: 'WhatsApp Messaging',
                subtitle: 'Send messages to students via WhatsApp'
            },
            promotion: {
                title: 'Student Promotion',
                subtitle: 'Promote students to next semester and manage graduation'
            },
            settings: {
                title: 'Settings',
                subtitle: 'Manage your account and system settings'
            }
        };
        
        const config = pageConfig[page] || { title: 'Admin Panel', subtitle: 'Student Management System' };
        pageTitle.textContent = config.title;
        pageSubtitle.textContent = config.subtitle;
        
        // Load page-specific data
        if (page === 'students') {
            loadStudents();
        } else if (page === 'whatsapp') {
            initializeWhatsAppPage();
        } else if (page === 'promotion') {
            initializePromotionPage();
        } else if (page === 'settings' && currentAdmin?.role === 'super_admin') {
            loadAdmins();
        }
    }
    
    async function loadStudents() {
        try {
            const response = await fetch('/api/students');
            if (!response.ok) {
                throw new Error('Failed to load students');
            }
            
            studentsData = await response.json();
            displayStudents(studentsData);
            
        } catch (error) {
            console.error('Students loading error:', error);
            showError('Failed to load students');
        }
    }
    
    function displayStudents(students) {
        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 3rem; color: #666;">No students found</td></tr>';
            return;
        }
        
        tbody.innerHTML = students.map(student => `
            <tr>
                <td>${student.studentName}</td>
                <td>${student.email}</td>
                <td><span class="badge badge-primary">${student.department || '-'}</span></td>
                <td><span class="badge badge-success">${student.program || '-'}</span></td>
                <td><span class="badge badge-warning">${student.section || '-'}</span></td>
                <td><span class="badge badge-info">${student.semester ? student.semester + getOrdinalSuffix(student.semester) : '-'}</span></td>
                <td><span class="badge ${student.gender === 'Male' ? 'badge-primary' : 'badge-danger'}">${student.gender}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="viewStudent('${student._id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="editStudent('${student._id}')" title="Edit">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteStudent('${student._id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    async function loadAdmins() {
        if (currentAdmin?.role !== 'super_admin') return;
        
        try {
            const response = await fetch('/api/admin/all');
            if (!response.ok) {
                throw new Error('Failed to load admins');
            }
            
            adminData = await response.json();
            displayAdmins(adminData);
            
        } catch (error) {
            console.error('Admins loading error:', error);
            showError('Failed to load admins');
        }
    }
    
    function displayAdmins(admins) {
        const tbody = document.getElementById('adminsTableBody');
        if (!tbody) return;
        
        if (admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #666;">No admins found</td></tr>';
            return;
        }
        
        tbody.innerHTML = admins.map(admin => `
            <tr>
                <td>${admin.username}</td>
                <td>${admin.email}</td>
                <td><span class="badge ${admin.role === 'super_admin' ? 'badge-danger' : 'badge-primary'}">${admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span></td>
                <td>${new Date(admin.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        ${admin._id !== currentAdmin.id ? `
                            <button class="btn-icon btn-delete" onclick="deleteAdmin('${admin._id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : '<span class="badge badge-success">Current User</span>'}
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    async function handleChangePassword(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (newPassword !== confirmPassword) {
            showError('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('Password changed successfully');
                document.getElementById('changePasswordForm').reset();
            } else {
                showError(data.message || 'Failed to change password');
            }
            
        } catch (error) {
            console.error('Change password error:', error);
            showError('Network error. Please try again.');
        }
    }
    
    function handleGlobalSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        
        // Filter students if on students page
        const studentsPage = document.getElementById('students-page');
        if (studentsPage.classList.contains('active')) {
            const filteredStudents = studentsData.filter(student =>
                student.studentName.toLowerCase().includes(searchTerm) ||
                student.email.toLowerCase().includes(searchTerm) ||
                (student.department && student.department.toLowerCase().includes(searchTerm)) ||
                (student.program && student.program.toLowerCase().includes(searchTerm))
            );
            displayStudents(filteredStudents);
        }
    }
    
    async function logout() {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            window.location.href = '/admin/login';
        } catch (error) {
            console.error('Logout error:', error);
            window.location.href = '/admin/login';
        }
    }
    
    // Department-Program mapping (same as in main form)
    const departmentPrograms = {
        'Management Sciences': [
            'BBA', 'BS (Business Analytics)', 'BS (Accounting & Finance)',
            'MBA', 'MS (Project Management)', 'PhD (Management Sciences)'
        ],
        'Computer Sciences': [
            'BS (Computer Science)', 'BS (Software Engineering)', 'BS (Artificial Intelligence)',
            'MS (Computer Science)', 'MS (Data Science)', 'MS (Cyber Security)', 'PhD (Computing)'
        ],
        'Executive Programs': [
            'MPM', 'MHRM', 'EMBA', 'PMBA', 'MS PM', 'MS BA'
        ],
        'Social Sciences': [
            'BS (Social Sciences)', 'BS (PSYCHOLOGY)', 'MS (Social Sciences)',
            'MS (Development Studies)', 'MS (Clinical Psychology)', 'MS (Sociology)', 'Phd (Psychology)'
        ],
        'Media Sciences': [
            'BS (Media Science)', 'Master of Media Science'
        ]
    };
    
    // Global functions for button actions
    window.refreshStudents = loadStudents;
    
    window.viewStudent = function(id) {
        const student = studentsData.find(s => s._id === id);
        if (!student) {
            showError('Student not found');
            return;
        }
        
        const viewBody = document.getElementById('viewStudentBody');
        const formatDate = (dateStr) => {
            if (!dateStr) return 'N/A';
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };
        
        viewBody.innerHTML = `
            <div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Name:</span>
                    <span class="student-detail-value">${student.studentName}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Email:</span>
                    <span class="student-detail-value">${student.email}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Phone:</span>
                    <span class="student-detail-value">${student.phoneNumber}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Department:</span>
                    <span class="student-detail-value">${student.department || 'N/A'}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Program:</span>
                    <span class="student-detail-value">${student.program || 'N/A'}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Section:</span>
                    <span class="student-detail-value">${student.section || 'N/A'}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Semester:</span>
                    <span class="student-detail-value">${student.semester ? student.semester + getOrdinalSuffix(student.semester) + ' Semester' : 'N/A'}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Gender:</span>
                    <span class="student-detail-value">${student.gender}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Date of Birth:</span>
                    <span class="student-detail-value">${formatDate(student.dob)}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Registration Number:</span>
                    <span class="student-detail-value">${student.regNumber || 'N/A'}</span>
                </div>
                <div class="student-detail-item">
                    <span class="student-detail-label">Registration Date:</span>
                    <span class="student-detail-value">${formatDate(student.createdAt)}</span>
                </div>
            </div>
        `;
        
        // Set up edit button in view modal
        const editFromViewBtn = document.getElementById('editFromViewBtn');
        editFromViewBtn.onclick = () => {
            closeModal('viewStudentModal');
            editStudent(id);
        };
        
        document.getElementById('viewStudentModal').classList.add('show');
    };
    
    window.editStudent = function(id) {
        const student = studentsData.find(s => s._id === id);
        if (!student) {
            showError('Student not found');
            return;
        }
        
        // Populate form fields
        document.getElementById('editStudentId').value = student._id;
        document.getElementById('editStudentName').value = student.studentName;
        document.getElementById('editStudentEmail').value = student.email;
        document.getElementById('editStudentPhone').value = student.phoneNumber;
        document.getElementById('editStudentDepartment').value = student.department || '';
        document.getElementById('editStudentSection').value = student.section || '';
        document.getElementById('editStudentSemester').value = student.semester || '';
        document.getElementById('editStudentGender').value = student.gender;
        document.getElementById('editStudentRegNumber').value = student.regNumber || '';
        
        // Format date for input field
        if (student.dob) {
            const date = new Date(student.dob);
            document.getElementById('editStudentDob').value = date.toISOString().split('T')[0];
        }
        
        // Handle department-program dependency
        populateEditProgramOptions(student.department, student.program);
        
        // Set up department change handler
        const departmentSelect = document.getElementById('editStudentDepartment');
        departmentSelect.onchange = function() {
            populateEditProgramOptions(this.value);
        };
        
        document.getElementById('editStudentModal').classList.add('show');
    };
    
    // Populate program options based on selected department
    function populateEditProgramOptions(department, selectedProgram = '') {
        const programSelect = document.getElementById('editStudentProgram');
        
        // Clear existing options
        programSelect.innerHTML = '<option value="">Select a program</option>';
        
        // Populate programs based on department
        if (department && departmentPrograms[department]) {
            departmentPrograms[department].forEach(program => {
                const option = document.createElement('option');
                option.value = program;
                option.textContent = program;
                if (program === selectedProgram) {
                    option.selected = true;
                }
                programSelect.appendChild(option);
            });
        }
    }
    
    window.saveStudentChanges = async function() {
        const form = document.getElementById('editStudentForm');
        const formData = new FormData(form);
        const studentData = Object.fromEntries(formData.entries());
        
        // Validate required fields
        const requiredFields = ['studentName', 'email', 'phoneNumber', 'department', 'program', 'section', 'semester', 'gender', 'dob', 'regNumber'];
        const missingFields = requiredFields.filter(field => !studentData[field]);
        
        if (missingFields.length > 0) {
            showError('Please fill in all required fields');
            return;
        }
        
        const studentId = studentData.id;
        delete studentData.id;
        
        try {
            const response = await fetch(`/api/students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showSuccess('Student updated successfully');
                closeModal('editStudentModal');
                
                // Update local data
                const studentIndex = studentsData.findIndex(s => s._id === studentId);
                if (studentIndex !== -1) {
                    studentsData[studentIndex] = { ...studentsData[studentIndex], ...result.student };
                    displayStudents(studentsData);
                }
            } else {
                showError(result.message || 'Failed to update student');
            }
            
        } catch (error) {
            console.error('Update student error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.deleteStudent = async function(id) {
        if (!confirm('Are you sure you want to delete this student?')) return;
        
        try {
            const response = await fetch(`/api/students/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showSuccess('Student deleted successfully');
                loadStudents();
            } else {
                showError('Failed to delete student');
            }
        } catch (error) {
            console.error('Delete student error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.showCreateAdminModal = function() {
        document.getElementById('createAdminModal').classList.add('show');
    };
    
    window.showModal = function(modalId) {
        console.log('📺 Showing modal:', modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            console.log('✅ Modal element found, adding show class');
            modal.classList.add('show');
        } else {
            console.error('❌ Modal element not found:', modalId);
        }
    };
    
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    };
    
    // Add click outside to close modals
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
    
    window.createAdmin = async function() {
        const username = document.getElementById('adminUsername').value;
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const role = document.getElementById('adminRole').value;
        
        if (!username || !email || !password) {
            showError('Please fill in all fields');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    role
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showSuccess('Admin created successfully');
                closeModal('createAdminModal');
                document.getElementById('createAdminForm').reset();
                loadAdmins();
            } else {
                showError(data.message || 'Failed to create admin');
            }
            
        } catch (error) {
            console.error('Create admin error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.deleteAdmin = async function(id) {
        if (!confirm('Are you sure you want to delete this admin?')) return;
        
        try {
            const response = await fetch(`/api/admin/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showSuccess('Admin deleted successfully');
                loadAdmins();
            } else {
                showError('Failed to delete admin');
            }
        } catch (error) {
            console.error('Delete admin error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    // Utility functions
    function getOrdinalSuffix(number) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const value = number % 100;
        return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
    }
    
    function showSuccess(message) {
        showToast('success', message);
    }
    
    function showError(message) {
        showToast('error', message);
    }
    
    function showToast(type, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success-color)' : 'var(--error-color)'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 3000;
            transform: translateX(120%);
            transition: transform 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    // ==================== WHATSAPP FUNCTIONALITY ====================
    
    let whatsappStatusInterval = null;
    let messageHistory = JSON.parse(localStorage.getItem('whatsappMessageHistory') || '[]');
    
    // Initialize WhatsApp page
    async function initializeWhatsAppPage() {
        setupWhatsAppEventListeners();
        await loadProgramOptions(); // Load available programs
        checkWhatsAppStatus();
        updateRecipientCount();
        displayMessageHistory();
        
        // Start status checking interval
        if (whatsappStatusInterval) {
            clearInterval(whatsappStatusInterval);
        }
        whatsappStatusInterval = setInterval(checkWhatsAppStatus, 5000);
    }
    
    async function loadProgramOptions() {
        try {
            const response = await fetch('/api/whatsapp/student-groups');
            const groups = await response.json();
            
            const programSelect = document.getElementById('programFilter');
            if (programSelect && groups.programs) {
                // Clear existing options except the first one
                programSelect.innerHTML = '<option value="">Select Program</option>';
                
                // Add program options
                groups.programs.forEach(program => {
                    if (program._id) { // Only add if program name exists
                        const option = document.createElement('option');
                        option.value = program._id;
                        option.textContent = program._id;
                        programSelect.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading program options:', error);
        }
    }
    
    function setupWhatsAppEventListeners() {
        // Quick message form
        const quickForm = document.getElementById('quickMessageForm');
        if (quickForm) {
            quickForm.addEventListener('submit', handleQuickMessage);
        }
        
        // Bulk message form
        const bulkForm = document.getElementById('bulkMessageForm');
        if (bulkForm) {
            bulkForm.addEventListener('submit', handleBulkMessage);
        }
        
        // Character counters
        const quickMessage = document.getElementById('quickMessage');
        if (quickMessage) {
            quickMessage.addEventListener('input', (e) => {
                document.getElementById('quickMessageCount').textContent = e.target.value.length;
            });
        }
        
        const bulkMessage = document.getElementById('bulkMessage');
        if (bulkMessage) {
            bulkMessage.addEventListener('input', (e) => {
                document.getElementById('bulkMessageCount').textContent = e.target.value.length;
            });
        }
        
        // Radio button change listeners
        const radioButtons = document.querySelectorAll('input[name="bulkTarget"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', handleBulkTargetChange);
        });
        
        // Enhanced filter change listeners for hierarchical selection
        const departmentFilter = document.getElementById('departmentFilter');
        if (departmentFilter) {
            departmentFilter.addEventListener('change', handleDepartmentChange);
        }
        
        const programFilter = document.getElementById('programFilter');
        if (programFilter) {
            programFilter.addEventListener('change', handleProgramChange);
        }
        
        const semesterFilter = document.getElementById('semesterFilter');
        if (semesterFilter) {
            semesterFilter.addEventListener('change', handleSemesterChange);
        }
        
        const sectionFilter = document.getElementById('sectionFilter');
        if (sectionFilter) {
            sectionFilter.addEventListener('change', handleSectionChange);
        }
    }
    
    async function checkWhatsAppStatus() {
        try {
            const response = await fetch('/api/whatsapp/status');
            const status = await response.json();
            
            updateConnectionStatus(status);
            
            if (status.qrCode) {
                displayQRCode(status.qrCode);
            }
            
        } catch (error) {
            console.error('Error checking WhatsApp status:', error);
            updateConnectionStatus({ connectionStatus: 'error', isReady: false, isConnecting: false });
        }
    }
    
    function updateConnectionStatus(status) {
        const statusBadge = document.querySelector('#connectionStatus .status-badge');
        const qrSection = document.getElementById('qrCodeSection');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        const restartBtn = document.getElementById('restartBtn');
        
        if (!statusBadge) return;
        
        // Remove all status classes
        statusBadge.classList.remove('status-connected', 'status-connecting', 'status-disconnected', 'status-error');
        
        switch (status.connectionStatus) {
            case 'connected':
            case 'authenticated':
                statusBadge.textContent = 'Connected';
                statusBadge.classList.add('status-connected');
                qrSection.style.display = 'none';
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'inline-block';
                restartBtn.style.display = 'inline-block';
                break;
                
            case 'connecting':
                statusBadge.textContent = 'Connecting';
                statusBadge.classList.add('status-connecting');
                qrSection.style.display = 'block';
                connectBtn.style.display = 'none';
                disconnectBtn.style.display = 'none';
                restartBtn.style.display = 'inline-block';
                break;
                
            case 'error':
            case 'auth_failed':
                statusBadge.textContent = 'Error';
                statusBadge.classList.add('status-error');
                qrSection.style.display = 'none';
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
                restartBtn.style.display = 'inline-block';
                break;
                
            default:
                statusBadge.textContent = 'Disconnected';
                statusBadge.classList.add('status-disconnected');
                qrSection.style.display = 'none';
                connectBtn.style.display = 'inline-block';
                disconnectBtn.style.display = 'none';
                restartBtn.style.display = 'none';
                break;
        }
    }
    
    function displayQRCode(qrCodeDataUrl) {
        const container = document.getElementById('qrCodeContainer');
        if (container && qrCodeDataUrl) {
            container.innerHTML = `<img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 250px; height: auto;">`;
        }
    }
    
    async function handleQuickMessage(e) {
        e.preventDefault();
        
        const phoneNumber = document.getElementById('quickPhoneNumber').value;
        const message = document.getElementById('quickMessage').value;
        const submitBtn = document.getElementById('sendQuickBtn');
        
        if (!phoneNumber || !message) {
            showError('Please fill in all fields');
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            const response = await fetch('/api/whatsapp/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ phoneNumber, message })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('Message sent successfully!');
                document.getElementById('quickMessageForm').reset();
                document.getElementById('quickMessageCount').textContent = '0';
                
                // Add to history
                addToMessageHistory({
                    type: 'single',
                    recipient: phoneNumber,
                    message: message,
                    timestamp: new Date().toISOString(),
                    status: 'success'
                });
            } else {
                showError(result.message || 'Failed to send message');
                addToMessageHistory({
                    type: 'single',
                    recipient: phoneNumber,
                    message: message,
                    timestamp: new Date().toISOString(),
                    status: 'error',
                    error: result.message
                });
            }
            
        } catch (error) {
            console.error('Quick message error:', error);
            showError('Network error. Please try again.');
            addToMessageHistory({
                type: 'single',
                recipient: phoneNumber,
                message: message,
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message
            });
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Send Message';
    }
    
    async function handleBulkMessage(e) {
        e.preventDefault();
        
        const message = document.getElementById('bulkMessage').value;
        const submitBtn = document.getElementById('sendBulkBtn');
        const bulkTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
        
        if (!message) {
            showError('Please enter a message');
            return;
        }
        
        // Validate hierarchical filter selection for targeted bulk messages
        if (bulkTarget !== 'all') {
            const department = document.getElementById('departmentFilter').value;
            const program = document.getElementById('programFilter').value;
            const semester = document.getElementById('semesterFilter').value;
            const section = document.getElementById('sectionFilter').value;
            
            let validationError = '';
            
            switch (bulkTarget) {
                case 'department':
                    if (!department) validationError = 'Please select a department.';
                    break;
                    
                case 'program':
                    if (!department) validationError = 'Please select a department first.';
                    else if (!program) validationError = 'Please select a program.';
                    break;
                    
                case 'program-semester':
                    if (!department) validationError = 'Please select a department first.';
                    else if (!program) validationError = 'Please select a program.';
                    else if (!semester) validationError = 'Please select a semester.';
                    break;
                    
                case 'specific-section':
                    if (!department) validationError = 'Please select a department first.';
                    else if (!program) validationError = 'Please select a program.';
                    else if (!semester) validationError = 'Please select a semester.';
                    else if (!section) validationError = 'Please select a section.';
                    break;
            }
            
            if (validationError) {
                showError(validationError);
                return;
            }
        }
        
        if (!confirm(`Are you sure you want to send this message to ${document.getElementById('recipientCountNumber').textContent} students?`)) {
            return;
        }
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        
        try {
            let endpoint = '/api/whatsapp/send-all';
            let body = { message };
            
            if (bulkTarget !== 'all') {
                endpoint = '/api/whatsapp/send-bulk';
                const filterCriteria = {
                    department: document.getElementById('departmentFilter').value,
                    program: document.getElementById('programFilter').value,
                    semester: document.getElementById('semesterFilter').value,
                    section: document.getElementById('sectionFilter').value
                };
                
                // Remove empty values
                Object.keys(filterCriteria).forEach(key => {
                    if (!filterCriteria[key]) {
                        delete filterCriteria[key];
                    }
                });
                
                body.filterCriteria = filterCriteria;
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess(result.message);
                document.getElementById('bulkMessageForm').reset();
                document.getElementById('bulkMessageCount').textContent = '0';
                
                // Display results if available
                if (result.summary) {
                    displayBulkResults(result);
                }
                
                // Add to history
                addToMessageHistory({
                    type: 'bulk',
                    target: bulkTarget,
                    message: message,
                    timestamp: new Date().toISOString(),
                    status: 'success',
                    summary: result.summary
                });
            } else {
                showError(result.message || 'Failed to send bulk messages');
                addToMessageHistory({
                    type: 'bulk',
                    target: bulkTarget,
                    message: message,
                    timestamp: new Date().toISOString(),
                    status: 'error',
                    error: result.message
                });
            }
            
        } catch (error) {
            console.error('Bulk message error:', error);
            showError('Network error. Please try again.');
            addToMessageHistory({
                type: 'bulk',
                target: bulkTarget,
                message: message,
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message
            });
        }
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Send Bulk Message';
    }
    
    function handleBulkTargetChange() {
        const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
        const filterOptions = document.getElementById('filterOptions');
        
        // Reset all steps
        resetHierarchySteps();
        
        if (selectedTarget === 'all') {
            filterOptions.style.display = 'none';
        } else {
            filterOptions.style.display = 'block';
            showHierarchySteps(selectedTarget);
        }
        
        updateRecipientCount();
    }
    
    function resetHierarchySteps() {
        // Hide all steps
        document.getElementById('departmentStep').style.display = 'none';
        document.getElementById('programStep').style.display = 'none';
        document.getElementById('semesterStep').style.display = 'none';
        document.getElementById('sectionStep').style.display = 'none';
        document.getElementById('selectionSummary').style.display = 'none';
        
        // Reset all dropdowns
        document.getElementById('departmentFilter').value = '';
        document.getElementById('programFilter').value = '';
        document.getElementById('semesterFilter').value = '';
        document.getElementById('sectionFilter').value = '';
        
        // Remove all step states
        document.querySelectorAll('.hierarchy-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
    }
    
    function showHierarchySteps(targetType) {
        const departmentStep = document.getElementById('departmentStep');
        const programStep = document.getElementById('programStep');
        const semesterStep = document.getElementById('semesterStep');
        const sectionStep = document.getElementById('sectionStep');
        
        switch (targetType) {
            case 'department':
                departmentStep.style.display = 'block';
                departmentStep.classList.add('active');
                break;
                
            case 'program':
                departmentStep.style.display = 'block';
                programStep.style.display = 'block';
                departmentStep.classList.add('active');
                break;
                
            case 'program-semester':
                departmentStep.style.display = 'block';
                programStep.style.display = 'block';
                semesterStep.style.display = 'block';
                departmentStep.classList.add('active');
                break;
                
            case 'specific-section':
                departmentStep.style.display = 'block';
                programStep.style.display = 'block';
                semesterStep.style.display = 'block';
                sectionStep.style.display = 'block';
                departmentStep.classList.add('active');
                break;
        }
    }
    
    async function handleDepartmentChange() {
        const departmentValue = document.getElementById('departmentFilter').value;
        const departmentStep = document.getElementById('departmentStep');
        const programStep = document.getElementById('programStep');
        
        if (departmentValue) {
            departmentStep.classList.remove('active');
            departmentStep.classList.add('completed');
            
            // Load programs for selected department
            await loadProgramsForDepartment(departmentValue);
            
            // Show next step if needed
            const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
            if (['program', 'program-semester', 'specific-section'].includes(selectedTarget)) {
                programStep.classList.add('active');
            }
        } else {
            departmentStep.classList.remove('completed');
            departmentStep.classList.add('active');
            programStep.classList.remove('active', 'completed');
        }
        
        updateSelectionSummary();
        updateRecipientCount();
    }
    
    function handleProgramChange() {
        const programValue = document.getElementById('programFilter').value;
        const programStep = document.getElementById('programStep');
        const semesterStep = document.getElementById('semesterStep');
        
        if (programValue) {
            programStep.classList.remove('active');
            programStep.classList.add('completed');
            
            // Show next step if needed
            const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
            if (['program-semester', 'specific-section'].includes(selectedTarget)) {
                semesterStep.classList.add('active');
            }
        } else {
            programStep.classList.remove('completed');
            programStep.classList.add('active');
            semesterStep.classList.remove('active', 'completed');
        }
        
        updateSelectionSummary();
        updateRecipientCount();
    }
    
    function handleSemesterChange() {
        const semesterValue = document.getElementById('semesterFilter').value;
        const semesterStep = document.getElementById('semesterStep');
        const sectionStep = document.getElementById('sectionStep');
        
        if (semesterValue) {
            semesterStep.classList.remove('active');
            semesterStep.classList.add('completed');
            
            // Show next step if needed
            const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
            if (selectedTarget === 'specific-section') {
                sectionStep.classList.add('active');
            }
        } else {
            semesterStep.classList.remove('completed');
            semesterStep.classList.add('active');
            sectionStep.classList.remove('active', 'completed');
        }
        
        updateSelectionSummary();
        updateRecipientCount();
    }
    
    function handleSectionChange() {
        const sectionValue = document.getElementById('sectionFilter').value;
        const sectionStep = document.getElementById('sectionStep');
        
        if (sectionValue) {
            sectionStep.classList.remove('active');
            sectionStep.classList.add('completed');
        } else {
            sectionStep.classList.remove('completed');
            sectionStep.classList.add('active');
        }
        
        updateSelectionSummary();
        updateRecipientCount();
    }
    
    async function loadProgramsForDepartment(department) {
        try {
            // Get programs filtered by department from the server
            const response = await fetch('/api/whatsapp/programs-by-department', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ department })
            });
            
            const result = await response.json();
            
            const programSelect = document.getElementById('programFilter');
            programSelect.innerHTML = '<option value="">Choose Program...</option>';
            
            if (result.programs && result.programs.length > 0) {
                result.programs.forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programSelect.appendChild(option);
                });
                
                console.log('Loaded programs for', department, ':', result.programs);
            } else {
                console.log('No programs found for department:', department);
            }
        } catch (error) {
            console.error('Error loading programs:', error);
        }
    }
    
    function updateSelectionSummary() {
        const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked').value;
        const department = document.getElementById('departmentFilter').value;
        const program = document.getElementById('programFilter').value;
        const semester = document.getElementById('semesterFilter').value;
        const section = document.getElementById('sectionFilter').value;
        
        const summaryElement = document.getElementById('selectionSummary');
        const summaryText = document.getElementById('summaryText');
        
        let summary = '';
        
        switch (selectedTarget) {
            case 'department':
                if (department) {
                    summary = `<strong>All students</strong> in <span class="highlight">${department}</span> department`;
                }
                break;
                
            case 'program':
                if (department && program) {
                    summary = `<strong>All students</strong> in <span class="highlight">${program}</span> program from <span class="highlight">${department}</span> department`;
                }
                break;
                
            case 'program-semester':
                if (department && program && semester) {
                    const semesterText = semester + getOrdinalSuffix(parseInt(semester));
                    summary = `<strong>All students</strong> in <span class="highlight">${semesterText} semester</span> of <span class="highlight">${program}</span> program from <span class="highlight">${department}</span> department`;
                }
                break;
                
            case 'specific-section':
                if (department && program && semester && section) {
                    const semesterText = semester + getOrdinalSuffix(parseInt(semester));
                    summary = `<strong>Section ${section}</strong> of <span class="highlight">${semesterText} semester</span> of <span class="highlight">${program}</span> program from <span class="highlight">${department}</span> department`;
                }
                break;
        }
        
        if (summary) {
            summaryText.innerHTML = summary;
            summaryElement.style.display = 'block';
        } else {
            summaryElement.style.display = 'none';
        }
    }
    
    async function updateRecipientCount() {
        try {
            const countElement = document.getElementById('recipientCountNumber');
            if (!countElement) return;
            
            const selectedTarget = document.querySelector('input[name="bulkTarget"]:checked')?.value || 'all';
            
            if (selectedTarget === 'all') {
                const response = await fetch('/api/admin/stats');
                const stats = await response.json();
                countElement.textContent = stats.totalStudents;
            } else {
                // For hierarchical filtering, we need to count students based on the actual criteria
                const filterCriteria = {
                    department: document.getElementById('departmentFilter').value,
                    program: document.getElementById('programFilter').value,
                    semester: document.getElementById('semesterFilter').value,
                    section: document.getElementById('sectionFilter').value
                };
                
                // Remove empty values
                Object.keys(filterCriteria).forEach(key => {
                    if (!filterCriteria[key]) {
                        delete filterCriteria[key];
                    }
                });
                
                // If no filters are set, show 0
                if (Object.keys(filterCriteria).length === 0) {
                    countElement.textContent = '0';
                    return;
                }
                
                // Debug logging
                console.log('\n=== FRONTEND COUNT DEBUG ===');
                console.log('Selected target:', selectedTarget);
                console.log('Filter criteria being sent:', JSON.stringify(filterCriteria, null, 2));
                
                // Get count from server with the actual filter criteria
                const response = await fetch('/api/whatsapp/count-students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ filterCriteria })
                });
                
                const result = await response.json();
                console.log('Server response:', result);
                console.log('=== END FRONTEND DEBUG ===\n');
                
                countElement.textContent = result.count || 0;
            }
        } catch (error) {
            console.error('Error updating recipient count:', error);
            document.getElementById('recipientCountNumber').textContent = '0';
        }
    }
    
    function displayBulkResults(result) {
        const existingResults = document.querySelector('.bulk-results');
        if (existingResults) {
            existingResults.remove();
        }
        
        const resultsDiv = document.createElement('div');
        resultsDiv.className = 'bulk-results';
        resultsDiv.innerHTML = `
            <h4>Bulk Message Results</h4>
            <div class="result-summary">
                <div class="result-item result-success">
                    <strong>${result.summary.successful}</strong> Successful
                </div>
                <div class="result-item result-error">
                    <strong>${result.summary.failed}</strong> Failed
                </div>
                <div class="result-item">
                    <strong>${result.summary.total}</strong> Total
                </div>
            </div>
        `;
        
        document.querySelector('#bulkMessageForm').appendChild(resultsDiv);
        
        setTimeout(() => {
            resultsDiv.remove();
        }, 10000);
    }
    
    function addToMessageHistory(messageData) {
        messageHistory.unshift(messageData);
        if (messageHistory.length > 50) {
            messageHistory = messageHistory.slice(0, 50);
        }
        localStorage.setItem('whatsappMessageHistory', JSON.stringify(messageHistory));
        displayMessageHistory();
    }
    
    function displayMessageHistory() {
        const container = document.getElementById('messageHistory');
        if (!container) return;
        
        if (messageHistory.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No messages sent yet</p>';
            return;
        }
        
        container.innerHTML = messageHistory.map(msg => `
            <div class="message-history-item">
                <div class="message-header">
                    <span><strong>${msg.type === 'bulk' ? 'Bulk Message' : 'Single Message'}</strong> - ${msg.type === 'bulk' ? msg.target : msg.recipient}</span>
                    <span>${new Date(msg.timestamp).toLocaleString()}</span>
                </div>
                <div class="message-content">${msg.message}</div>
                <div class="message-status ${msg.status === 'success' ? 'success-status' : 'error-status'}">
                    ${msg.status === 'success' ? 
                        (msg.summary ? `✓ ${msg.summary.successful}/${msg.summary.total} sent successfully` : '✓ Sent successfully') : 
                        `✗ Failed: ${msg.error || 'Unknown error'}`
                    }
                </div>
            </div>
        `).join('');
    }
    
    // Global WhatsApp functions
    window.initializeWhatsApp = async function() {
        try {
            const response = await fetch('/api/whatsapp/initialize', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('WhatsApp initialization started. Please wait for QR code...');
            } else {
                showError(result.message || 'Failed to initialize WhatsApp');
            }
        } catch (error) {
            console.error('WhatsApp initialization error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.disconnectWhatsApp = async function() {
        if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
        
        try {
            const response = await fetch('/api/whatsapp/disconnect', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('WhatsApp disconnected successfully');
            } else {
                showError(result.message || 'Failed to disconnect WhatsApp');
            }
        } catch (error) {
            console.error('WhatsApp disconnect error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.restartWhatsApp = async function() {
        if (!confirm('Are you sure you want to restart the WhatsApp connection?')) return;
        
        try {
            const response = await fetch('/api/whatsapp/restart', {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showSuccess('WhatsApp restart initiated. Please wait...');
            } else {
                showError(result.message || 'Failed to restart WhatsApp');
            }
        } catch (error) {
            console.error('WhatsApp restart error:', error);
            showError('Network error. Please try again.');
        }
    };
    
    window.clearMessageHistory = function() {
        if (!confirm('Are you sure you want to clear the message history?')) return;
        
        messageHistory = [];
        localStorage.removeItem('whatsappMessageHistory');
        displayMessageHistory();
        showSuccess('Message history cleared');
    };
    
    // Store reference to original showPage (will be handled globally later)
    
    // ==================== END WHATSAPP FUNCTIONALITY ====================
    
    // ==================== PROMOTION FUNCTIONALITY ====================
    
    let filteredStudents = [];
    let selectedStudentIds = [];
    
    // Initialize promotion page
    async function initializePromotionPage() {
        await loadPromotionStats();
        await loadPromotionHistory();
        setupPromotionEventListeners();
        loadPromotionProgramOptions();
    }
    
    function setupPromotionEventListeners() {
        // Department filter change
        const deptFilter = document.getElementById('promotionDepartmentFilter');
        if (deptFilter) {
            deptFilter.addEventListener('change', loadPromotionProgramOptions);
        }
    }
    
    async function loadPromotionStats() {
        try {
            const response = await fetch('/api/promotion/stats');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('activeStudentsCount').textContent = data.stats.students.active;
                document.getElementById('totalPromotions').textContent = data.stats.promotions.total;
                document.getElementById('graduatedStudents').textContent = data.stats.students.graduated;
                document.getElementById('rollbackCount').textContent = data.stats.promotions.rollbacks;
            }
        } catch (error) {
            console.error('Error loading promotion stats:', error);
        }
    }
    
    async function loadPromotionProgramOptions() {
        const department = document.getElementById('promotionDepartmentFilter').value;
        const programSelect = document.getElementById('promotionProgramFilter');
        
        programSelect.innerHTML = '<option value="">All Programs</option>';
        
        if (department) {
            try {
                const response = await fetch('/api/whatsapp/programs-by-department', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ department })
                });
                
                const data = await response.json();
                
                if (data.programs) {
                    data.programs.forEach(program => {
                        const option = document.createElement('option');
                        option.value = program;
                        option.textContent = program;
                        programSelect.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error loading programs:', error);
            }
        }
    }
    
    async function filterStudentsForPromotion() {
        const filters = {
            department: document.getElementById('promotionDepartmentFilter').value,
            program: document.getElementById('promotionProgramFilter').value,
            semester: document.getElementById('promotionSemesterFilter').value,
            section: document.getElementById('promotionSectionFilter').value
        };
        
        console.log('🔍 Promotion Filter Debug - Sending filters:', filters);
        
        try {
            const response = await fetch('/api/promotion/filter-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters })
            });
            
            const data = await response.json();
            console.log('🔍 Promotion Filter Debug - API Response:', data);
            
            if (data.success) {
                console.log('✅ Found', data.count, 'students');
                console.log('📋 Sample students:', data.students.slice(0, 3));
                filteredStudents = data.students;
                displayFilteredStudents(data.students);
                document.getElementById('filteredCount').textContent = `Found ${data.count} students`;
            } else {
                console.error('❌ Filter failed:', data.message);
                showError(data.message || 'Failed to filter students');
            }
        } catch (error) {
            console.error('❌ Network error filtering students:', error);
            showError('Network error while filtering students');
        }
    }
    
    function displayFilteredStudents(students) {
        const card = document.getElementById('promotionStudentsCard');
        const tbody = document.getElementById('promotionStudentsTableBody');
        
        if (students.length === 0) {
            card.style.display = 'none';
            return;
        }
        
        card.style.display = 'block';
        
        tbody.innerHTML = students.map(student => `
            <tr>
                <td>
                    <input type="checkbox" class="student-checkbox" value="${student._id}" 
                           onchange="updateSelectedCount()">
                </td>
                <td>${student.studentName}</td>
                <td>${student.regNumber || 'N/A'}</td>
                <td>${student.department}</td>
                <td>${student.program}</td>
                <td><span class="badge badge-info">${student.semester}${getOrdinalSuffix(student.semester)}</span></td>
                <td><span class="badge badge-warning">${student.section}</span></td>
                <td>
                    <span class="badge ${student.semester >= 8 ? 'badge-success' : 'badge-primary'}">
                        ${student.semester >= 8 ? 'Graduate' : (student.semester + 1) + getOrdinalSuffix(student.semester + 1)}
                    </span>
                </td>
            </tr>
        `).join('');
        
        // Reset selection
        selectedStudentIds = [];
        updateSelectedCount();
        document.getElementById('masterCheckbox').checked = false;
    }
    
    function updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.student-checkbox:checked');
        selectedStudentIds = Array.from(checkboxes).map(cb => cb.value);
        
        const count = selectedStudentIds.length;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('bulkPromoteBtn').disabled = count === 0;
        
        // Update master checkbox
        const allCheckboxes = document.querySelectorAll('.student-checkbox');
        const masterCheckbox = document.getElementById('masterCheckbox');
        
        if (count === 0) {
            masterCheckbox.indeterminate = false;
            masterCheckbox.checked = false;
        } else if (count === allCheckboxes.length) {
            masterCheckbox.indeterminate = false;
            masterCheckbox.checked = true;
        } else {
            masterCheckbox.indeterminate = true;
            masterCheckbox.checked = false;
        }
    }
    
    function toggleAllSelection() {
        const masterCheckbox = document.getElementById('masterCheckbox');
        const checkboxes = document.querySelectorAll('.student-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = masterCheckbox.checked;
        });
        
        updateSelectedCount();
    }
    
    function selectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = true);
        updateSelectedCount();
    }
    
    function deselectAllStudents() {
        const checkboxes = document.querySelectorAll('.student-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
        updateSelectedCount();
    }
    
    function clearPromotionFilters() {
        document.getElementById('promotionDepartmentFilter').value = '';
        document.getElementById('promotionProgramFilter').value = '';
        document.getElementById('promotionSemesterFilter').value = '';
        document.getElementById('promotionSectionFilter').value = '';
        document.getElementById('filteredCount').textContent = '';
        document.getElementById('promotionStudentsCard').style.display = 'none';
        loadPromotionProgramOptions();
    }
    
    function showPromotionModal() {
        if (selectedStudentIds.length === 0) {
            showError('Please select students to promote');
            return;
        }
        
        const selectedStudents = filteredStudents.filter(s => selectedStudentIds.includes(s._id));
        const summaryContainer = document.getElementById('promotionSummary');
        
        // Group students by current semester
        const semesterGroups = selectedStudents.reduce((acc, student) => {
            const sem = student.semester;
            if (!acc[sem]) acc[sem] = [];
            acc[sem].push(student);
            return acc;
        }, {});
        
        let summaryHTML = `<h4>Promotion Summary (${selectedStudents.length} students)</h4><ul class="promotion-list">`;
        
        Object.keys(semesterGroups).sort().forEach(semester => {
            const students = semesterGroups[semester];
            const nextSem = parseInt(semester) + 1;
            const isGraduation = nextSem > 8;
            
            summaryHTML += `
                <li>
                    <span><strong>${students.length} students</strong> from ${semester}${getOrdinalSuffix(parseInt(semester))} semester</span>
                    <span>→ ${isGraduation ? 'Graduate' : nextSem + getOrdinalSuffix(nextSem) + ' semester'}</span>
                </li>
            `;
        });
        
        summaryHTML += '</ul>';
        summaryContainer.innerHTML = summaryHTML;
        
        // Check for graduation warning
        const hasGraduations = selectedStudents.some(s => s.semester >= 8);
        document.getElementById('graduationWarning').style.display = hasGraduations ? 'block' : 'none';
        
        // Reset form
        document.getElementById('promotionType').value = 'automatic';
        document.getElementById('customSemesterGroup').style.display = 'none';
        document.getElementById('newSectionGroup').style.display = 'block';
        document.getElementById('newSection').value = '';
        document.getElementById('promotionNotes').value = '';
        
        document.getElementById('promotionModal').classList.add('show');
    }
    
    function handlePromotionTypeChange() {
        const type = document.getElementById('promotionType').value;
        const customGroup = document.getElementById('customSemesterGroup');
        const sectionGroup = document.getElementById('newSectionGroup');
        
        switch (type) {
            case 'custom':
                customGroup.style.display = 'block';
                sectionGroup.style.display = 'block';
                break;
            case 'graduation':
                customGroup.style.display = 'none';
                sectionGroup.style.display = 'none';
                break;
            default:
                customGroup.style.display = 'none';
                sectionGroup.style.display = 'block';
                break;
        }
    }
    
    async function confirmPromotion() {
        const type = document.getElementById('promotionType').value;
        const customSemester = document.getElementById('customSemester').value;
        const newSection = document.getElementById('newSection').value;
        const notes = document.getElementById('promotionNotes').value;
        
        const promotionData = {
            notes: notes
        };
        
        if (type === 'custom' && customSemester) {
            promotionData.toSemester = parseInt(customSemester);
        }
        
        if (newSection) {
            promotionData.toSection = newSection;
        }
        
        try {
            const response = await fetch('/api/promotion/bulk-promote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentIds: selectedStudentIds,
                    promotionData
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(`Successfully promoted ${data.results.length} students!`);
                closeModal('promotionModal');
                
                // Refresh data
                await loadPromotionStats();
                await loadPromotionHistory();
                
                // Clear current selection
                document.getElementById('promotionStudentsCard').style.display = 'none';
                clearPromotionFilters();
            } else {
                showError(data.message || 'Failed to promote students');
            }
        } catch (error) {
            console.error('Error promoting students:', error);
            showError('Network error during promotion');
        }
    }
    
    async function loadPromotionHistory() {
        try {
            const response = await fetch('/api/promotion/history?limit=10');
            const data = await response.json();
            
            const container = document.getElementById('promotionHistoryContainer');
            
            if (data.success && data.promotions.length > 0) {
                container.innerHTML = data.promotions.map(promotion => {
                    const student = promotion.studentId;
                    const promotedBy = promotion.promotedBy;
                    const date = new Date(promotion.promotionDate).toLocaleString();
                    
                    let typeClass = 'semester';
                    let typeText = 'Promotion';
                    
                    if (promotion.promotionType === 'graduation') {
                        typeClass = 'graduation';
                        typeText = 'Graduation';
                    } else if (promotion.promotionType === 'rollback') {
                        typeClass = 'rollback';
                        typeText = 'Rollback';
                    }
                    
                    return `
                        <div class="promotion-history-item">
                            <div class="promotion-header">
                                <span class="promotion-type ${typeClass}">${typeText}</span>
                                <span class="promotion-meta">${date}</span>
                            </div>
                            <div class="promotion-details">
                                <div><strong>Student:</strong> ${student ? student.studentName : 'N/A'}</div>
                                <div><strong>From:</strong> ${promotion.fromSemester}${getOrdinalSuffix(promotion.fromSemester)} (${promotion.fromSection || 'N/A'})</div>
                                <div><strong>To:</strong> ${promotion.toSemester ? promotion.toSemester + getOrdinalSuffix(promotion.toSemester) : 'Graduated'} (${promotion.toSection || 'N/A'})</div>
                                <div><strong>By:</strong> ${promotedBy ? promotedBy.username : 'N/A'}</div>
                            </div>
                            ${promotion.notes ? `<div class="promotion-meta"><strong>Notes:</strong> ${promotion.notes}</div>` : ''}
                            <div class="promotion-actions-inline">
                                ${!promotion.isRolledBack && promotion.promotionType !== 'rollback' ? 
                                    `<button class="btn btn-danger btn-sm" onclick="showRollbackModal('${promotion._id}', '${student ? student.studentName : 'N/A'}')">
                                        <i class="fas fa-undo"></i> Rollback
                                    </button>` : 
                                    '<span class="text-muted">Cannot rollback</span>'
                                }
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No promotion history found</p>';
            }
        } catch (error) {
            console.error('Error loading promotion history:', error);
            const container = document.getElementById('promotionHistoryContainer');
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Failed to load promotion history</p>';
        }
    }
    
    function showRollbackModal(promotionId, studentName) {
        document.getElementById('rollbackPromotionId').value = promotionId;
        document.getElementById('rollbackStudentInfo').innerHTML = `
            <p><strong>Student:</strong> ${studentName}</p>
            <p>This will revert the student back to their previous semester and section.</p>
        `;
        document.getElementById('rollbackReason').value = '';
        document.getElementById('rollbackModal').classList.add('show');
    }
    
    async function confirmRollback() {
        const promotionId = document.getElementById('rollbackPromotionId').value;
        const reason = document.getElementById('rollbackReason').value;
        
        if (!reason.trim()) {
            showError('Please provide a reason for the rollback');
            return;
        }
        
        try {
            const response = await fetch(`/api/promotion/rollback/${promotionId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showSuccess(data.message);
                closeModal('rollbackModal');
                
                // Refresh data
                await loadPromotionStats();
                await loadPromotionHistory();
            } else {
                showError(data.message || 'Failed to rollback promotion');
            }
        } catch (error) {
            console.error('Error rolling back promotion:', error);
            showError('Network error during rollback');
        }
    }
    
    // Global promotion functions
    window.initializePromotionPage = initializePromotionPage;
    window.filterStudentsForPromotion = filterStudentsForPromotion;
    window.clearPromotionFilters = clearPromotionFilters;
    window.selectAllStudents = selectAllStudents;
    window.deselectAllStudents = deselectAllStudents;
    window.showPromotionModal = showPromotionModal;
    window.handlePromotionTypeChange = handlePromotionTypeChange;
    window.confirmPromotion = confirmPromotion;
    window.loadPromotionHistory = loadPromotionHistory;
    window.showRollbackModal = showRollbackModal;
    window.confirmRollback = confirmRollback;
    window.updateSelectedCount = updateSelectedCount;
    window.toggleAllSelection = toggleAllSelection;
    
    // ==================== END PROMOTION FUNCTIONALITY ====================
    
    // Debug: Log promotion functions loaded
    console.log('Promotion functions loaded:', {
        initializePromotionPage: typeof initializePromotionPage,
        filterStudentsForPromotion: typeof filterStudentsForPromotion,
        showPromotionModal: typeof showPromotionModal
    });
    
    // Debug function to test promotion filtering
    window.debugPromotionFilter = async function() {
        console.log('\n🧪 DEBUGGING PROMOTION FILTER');
        
        try {
            // First, let's get the debug data
            const debugResponse = await fetch('/api/debug/students');
            const debugData = await debugResponse.json();
            
            console.log('\n📊 Debug data from server:');
            console.log('Sample students:', debugData.students?.slice(0, 5));
            console.log('Unique departments:', debugData.uniqueValues?.departments);
            console.log('Unique programs:', debugData.uniqueValues?.programs);
            console.log('Unique sections:', debugData.uniqueValues?.sections);
            console.log('Unique semesters:', debugData.uniqueValues?.semesters);
            
            // Test with empty filters
            console.log('\n🧪 Testing with empty filters...');
            const emptyFilters = { department: '', program: '', semester: '', section: '' };
            const emptyResponse = await fetch('/api/promotion/filter-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters: emptyFilters })
            });
            const emptyResult = await emptyResponse.json();
            console.log('Empty filters result:', emptyResult);
            
            // Test with first department only
            if (debugData.uniqueValues?.departments?.length > 0) {
                console.log('\n🧪 Testing with first department...');
                const deptFilters = { department: debugData.uniqueValues.departments[0], program: '', semester: '', section: '' };
                const deptResponse = await fetch('/api/promotion/filter-students', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filters: deptFilters })
                });
                const deptResult = await deptResponse.json();
                console.log('Department filter result:', deptResult);
            }
            
            // Check if students have the 'active' status
            console.log('\n🔍 Checking student status field...');
            if (debugData.students?.length > 0) {
                const statusCounts = debugData.students.reduce((acc, student) => {
                    const status = student.status || 'undefined';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Student status distribution:', statusCounts);
                
                // Show a sample student with all fields
                console.log('Sample student with all fields:', debugData.students[0]);
            }
            
        } catch (error) {
            console.error('❌ Debug function error:', error);
        }
        
        console.log('\n✅ Debug complete. Check the results above.');
    };
    
    // Test function to filter students WITHOUT status requirement
    window.testPromotionFilterNoStatus = async function() {
        console.log('\n🧪 TESTING PROMOTION FILTER WITHOUT STATUS REQUIREMENT');
        
        const filters = {
            department: document.getElementById('promotionDepartmentFilter')?.value || '',
            program: document.getElementById('promotionProgramFilter')?.value || '',
            semester: document.getElementById('promotionSemesterFilter')?.value || '',
            section: document.getElementById('promotionSectionFilter')?.value || ''
        };
        
        console.log('Testing with current UI filters (no status requirement):', filters);
        
        try {
            // Use the regular students API to test without status filter
            let query = new URLSearchParams();
            if (filters.department) query.append('department', filters.department);
            if (filters.program) query.append('program', filters.program);
            if (filters.semester) query.append('semester', filters.semester);
            if (filters.section) query.append('section', filters.section);
            
            const response = await fetch(`/api/students?${query.toString()}`);
            const students = await response.json();
            
            console.log('Students found (no status filter):', students.length);
            console.log('Sample students:', students.slice(0, 3));
            
            if (students.length > 0) {
                const statusCounts = students.reduce((acc, student) => {
                    const status = student.status || 'no_status_field';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Status distribution in filtered students:', statusCounts);
            }
            
        } catch (error) {
            console.error('Error testing without status:', error);
        }
        
        console.log('✅ Test complete.');
    };
    
    // ==================== SCHEDULE MANAGEMENT FUNCTIONS ====================
    
    // Global schedule variables
    let schedulesData = [];
    let currentEditingSchedule = null;
    
    // Initialize schedule management when schedules page is shown
    function initializeSchedulePage() {
        console.log('Initializing schedule page...');
        loadScheduleStats();
        loadSchedules();
        setupScheduleEventListeners();
    }
    
    function setupScheduleEventListeners() {
        // Department filter change for programs
        const scheduleDeptFilter = document.getElementById('scheduleDepartmentFilter');
        if (scheduleDeptFilter) {
            scheduleDeptFilter.addEventListener('change', function() {
                loadProgramsForScheduleDepartment(this.value, 'scheduleProgramFilter');
            });
        }
        
        // WhatsApp schedule department change
        const whatsappScheduleDept = document.getElementById('whatsappScheduleDepartment');
        if (whatsappScheduleDept) {
            whatsappScheduleDept.addEventListener('change', function() {
                loadProgramsForScheduleDepartment(this.value, 'whatsappScheduleProgram');
                updateScheduleStudentCount();
            });
        }
        
        // Other WhatsApp schedule filters
        const whatsappFilters = ['whatsappScheduleProgram', 'whatsappScheduleSemester', 'whatsappScheduleSection'];
        whatsappFilters.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', updateScheduleStudentCount);
            }
        });
    }
    
    async function loadScheduleStats() {
        try {
            const response = await fetch('/api/schedules/stats');
            if (!response.ok) throw new Error('Failed to load schedule stats');
            
            const data = await response.json();
            const stats = data.stats;
            
            // Update stats cards
            document.getElementById('totalSchedules').textContent = stats.total;
            document.getElementById('scheduleDepartments').textContent = stats.byDepartment.length;
            document.getElementById('schedulePrograms').textContent = stats.byProgram.length;
            document.getElementById('scheduleSemesters').textContent = stats.bySemester.length;
            
            console.log('Schedule stats loaded:', stats);
        } catch (error) {
            console.error('Error loading schedule stats:', error);
            showError('Failed to load schedule statistics');
        }
    }
    
    async function loadSchedules() {
        try {
            const container = document.getElementById('schedulesContainer');
            container.innerHTML = '<div class="loading" style="text-align: center; padding: 2rem;"><div class="spinner"></div><p>Loading schedules...</p></div>';
            
            // Get current filters
            const filters = {
                department: document.getElementById('scheduleDepartmentFilter')?.value || '',
                program: document.getElementById('scheduleProgramFilter')?.value || '',
                semester: document.getElementById('scheduleSemesterFilter')?.value || '',
                section: document.getElementById('scheduleSectionFilter')?.value || ''
            };
            
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });
            
            const response = await fetch(`/api/schedules?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to load schedules');
            
            const data = await response.json();
            schedulesData = data.schedules;
            
            displaySchedules(schedulesData);
            
            // Update filter count
            const countElement = document.getElementById('scheduleFilteredCount');
            if (countElement) {
                countElement.textContent = `Found ${schedulesData.length} schedule(s)`;
            }
            
            console.log('Schedules loaded:', schedulesData.length);
        } catch (error) {
            console.error('Error loading schedules:', error);
            document.getElementById('schedulesContainer').innerHTML = 
                '<div style="text-align: center; padding: 2rem; color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Failed to load schedules</div>';
        }
    }
    
    function displaySchedules(schedules) {
        const container = document.getElementById('schedulesContainer');
        
        if (schedules.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;"><i class="fas fa-calendar-alt"></i><br>No schedules found</div>';
            return;
        }
        
        container.innerHTML = schedules.map(schedule => createScheduleCard(schedule)).join('');
    }
    
    function createScheduleCard(schedule) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Calculate total classes
        const totalClasses = days.reduce((sum, day) => {
            return sum + (schedule.weekly_schedule[day]?.length || 0);
        }, 0);
        
        return `
            <div class="schedule-card">
                <div class="schedule-header">
                    <div class="schedule-info">
                        <h4>${schedule.program} - Semester ${schedule.semester} - Section ${schedule.section}</h4>
                        <div class="schedule-meta">
                            ${schedule.department} | ${schedule.university}
                        </div>
                    </div>
                    <div class="schedule-actions">
                        <button class="btn btn-sm btn-primary" onclick="viewSchedule('${schedule._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="editSchedule('${schedule._id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-success" onclick="sendScheduleToClass('${schedule._id}')">
                            <i class="fab fa-whatsapp"></i> Send
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule._id}')">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
                
                <div class="schedule-grid">
                    ${days.map((day, index) => `
                        <div class="day-column">
                            <div class="day-header">${dayNames[index]}</div>
                            ${schedule.weekly_schedule[day] && schedule.weekly_schedule[day].length > 0 
                                ? schedule.weekly_schedule[day].map(classItem => `
                                    <div class="class-item">
                                        <div class="class-course">${classItem.course}</div>
                                        <div class="class-details">
                                            ${classItem.faculty}<br>
                                            ${classItem.time}<br>
                                            ${classItem.room}
                                        </div>
                                    </div>
                                `).join('')
                                : '<div class="no-classes">No classes</div>'
                            }
                        </div>
                    `).join('')}
                </div>
                
                <div class="schedule-stats">
                    <span><i class="fas fa-book"></i> ${totalClasses} total classes</span>
                    <span><i class="fas fa-user"></i> Created by: ${schedule.createdBy?.username || 'System'}</span>
                    <span><i class="fas fa-clock"></i> Updated: ${new Date(schedule.updatedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `;
    }
    
    // Schedule CRUD operations
    window.showAddScheduleModal = function() {
        currentEditingSchedule = null;
        document.getElementById('scheduleModalTitle').textContent = 'Add Schedule';
        document.getElementById('saveScheduleBtn').textContent = 'Save Schedule';
        
        // Clear form
        document.getElementById('scheduleForm').reset();
        document.getElementById('scheduleId').value = '';
        
        // Clear the schedule builder
        document.querySelectorAll('.draggable-class').forEach(el => el.remove());
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('has-class'));
        
        // Initialize empty schedule data
        scheduleData = {
            monday: [], tuesday: [], wednesday: [], 
            thursday: [], friday: [], saturday: []
        };
        
        showModal('scheduleModal');
        
        // Initialize drag and drop after modal is shown
        setTimeout(() => {
            initializeDragAndDrop();
        }, 100);
    };
    
    window.editSchedule = function(scheduleId) {
        console.log('🔧 Edit Schedule Called:', { scheduleId, schedulesDataLength: schedulesData.length });
        
        const schedule = schedulesData.find(s => s._id === scheduleId);
        console.log('🔍 Found schedule:', schedule);
        
        if (!schedule) {
            console.error('❌ Schedule not found in schedulesData:', schedulesData);
            showError('Schedule not found');
            return;
        }
        
        currentEditingSchedule = schedule;
        document.getElementById('scheduleModalTitle').textContent = 'Edit Schedule';
        document.getElementById('saveScheduleBtn').textContent = 'Update Schedule';
        
        // Populate form
        document.getElementById('scheduleId').value = schedule._id;
        document.getElementById('scheduleDepartment').value = schedule.department;
        document.getElementById('scheduleProgram').value = schedule.program;
        document.getElementById('scheduleSemester').value = schedule.semester;
        document.getElementById('scheduleSection').value = schedule.section;
        document.getElementById('scheduleUniversity').value = schedule.university;
        
        showModal('scheduleModal');
        
        // Initialize drag and drop and populate schedule builder after modal is shown
        setTimeout(() => {
            initializeDragAndDrop();
            populateScheduleBuilder(schedule);
        }, 100);
    };
    
    window.viewSchedule = function(scheduleId) {
        const schedule = schedulesData.find(s => s._id === scheduleId);
        if (!schedule) {
            showError('Schedule not found');
            return;
        }
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        const scheduleHtml = `
            <div class="schedule-info">
                <h4>${schedule.program} - Semester ${schedule.semester} - Section ${schedule.section}</h4>
                <p><strong>Department:</strong> ${schedule.department}</p>
                <p><strong>University:</strong> ${schedule.university}</p>
                <hr>
            </div>
            
            <div class="weekly-schedule">
                ${days.map((day, index) => `
                    <div class="day-section" style="margin-bottom: 2rem;">
                        <h5 style="color: var(--primary-color); margin-bottom: 1rem;">
                            <i class="fas fa-calendar-day"></i> ${dayNames[index]}
                        </h5>
                        ${schedule.weekly_schedule[day] && schedule.weekly_schedule[day].length > 0
                            ? schedule.weekly_schedule[day].map(classItem => `
                                <div class="class-detail" style="background: #f8f9fa; padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; border-left: 4px solid var(--primary-color);">
                                    <strong>${classItem.course}</strong><br>
                                    <small>
                                        <i class="fas fa-user"></i> ${classItem.faculty}<br>
                                        <i class="fas fa-clock"></i> ${classItem.time}<br>
                                        <i class="fas fa-map-marker-alt"></i> ${classItem.room}<br>
                                        <i class="fas fa-building"></i> ${classItem.campus}
                                    </small>
                                </div>
                            `).join('')
                            : '<p style="color: #666; font-style: italic;">No classes scheduled</p>'
                        }
                    </div>
                `).join('')}
            </div>
        `;
        
        document.getElementById('viewScheduleBody').innerHTML = scheduleHtml;
        
        // Set up buttons
        document.getElementById('editScheduleFromViewBtn').onclick = () => {
            closeModal('viewScheduleModal');
            editSchedule(scheduleId);
        };
        
        document.getElementById('sendScheduleFromViewBtn').onclick = () => {
            closeModal('viewScheduleModal');
            sendScheduleToClass(scheduleId);
        };
        
        showModal('viewScheduleModal');
    };
    
    window.deleteSchedule = async function(scheduleId) {
        if (!confirm('Are you sure you want to delete this schedule?')) return;
        
        try {
            const response = await fetch(`/api/schedules/${scheduleId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete schedule');
            
            showSuccess('Schedule deleted successfully');
            loadSchedules();
            loadScheduleStats();
        } catch (error) {
            console.error('Error deleting schedule:', error);
            showError('Failed to delete schedule');
        }
    };
    
    // Modern Drag & Drop Schedule Editor Functions
    let draggedElement = null;
    let scheduleData = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: []
    };
    
    // University time slot configuration
    const TIME_SLOTS = {
        1: { start: '8:00 AM', end: '11:00 AM', duration: '3 hours' },
        2: { start: '11:00 AM', end: '2:00 PM', duration: '3 hours' },
        3: { start: '2:00 PM', end: '5:00 PM', duration: '3 hours' },
        4: { start: '5:00 PM', end: '9:30 PM', duration: '4.5 hours' }
    };
    
    const CLASS_TYPES = {
        class: { duration: '1.5 hours', name: 'Class', icon: 'fas fa-book' },
        lab: { duration: '3 hours', name: 'Lab', icon: 'fas fa-flask' }
    };
    
    function initializeDragAndDrop() {
        const dropZones = document.querySelectorAll('.drop-zone');
        
        dropZones.forEach(zone => {
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('drop', handleDrop);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
        });
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDragEnter(e) {
        e.preventDefault();
        if (!e.target.classList.contains('has-class')) {
            e.target.classList.add('drag-over');
        }
    }
    
    function handleDragLeave(e) {
        e.target.classList.remove('drag-over');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.target.classList.remove('drag-over');
        
        if (!draggedElement) {
            return;
        }
        
        // Find the correct drop zone
        let dropZone = e.target;
        if (!dropZone.classList.contains('drop-zone')) {
            dropZone = dropZone.closest('.drop-zone');
        }
        
        if (!dropZone) return;
        
        const day = dropZone.closest('.day-column').dataset.day;
        const slot = dropZone.dataset.slot;
        
        // Move the class to the new position
        dropZone.appendChild(draggedElement);
        dropZone.classList.add('has-classes');
        
        // Update the class data
        const classData = draggedElement.classData;
        classData.day = day;
        classData.slot = slot;
        
        // Remove from old position
        const oldZone = draggedElement.oldZone;
        if (oldZone && oldZone !== dropZone) {
            // Check if old zone has any remaining classes
            if (oldZone.querySelectorAll('.draggable-class').length === 0) {
                oldZone.classList.remove('has-classes');
            }
        }
        
        draggedElement.classList.remove('dragging');
        draggedElement = null;
        
        updateScheduleData();
    }
    
    window.addClassSlot = function(day, classType = 'class', slot = null) {
        console.log('🎯 Adding class slot:', { day, classType, slot });
        
        const classId = 'class_' + day + '_' + Date.now();
        const typeInfo = CLASS_TYPES[classType] || CLASS_TYPES.class;
        
        const classData = {
            id: classId,
            day: day,
            slot: slot || '1',
            type: classType,
            course: classType === 'lab' ? 'New Lab' : 'New Course',
            faculty: 'Faculty Name',
            room: 'Room Number',
            campus: 'SZABIST University Campus H-8/4 ISB',
            time: slot ? formatSlotTime(slot) : formatSlotTime('1'),
            duration: typeInfo.duration
        };
        
        const classElement = createDraggableClass(classData);
        
        // Find the best available drop zone
        let targetZone;
        if (slot) {
            targetZone = document.querySelector(`[data-day="${day}"] [data-slot="${slot}"]`);
        }
        
        if (!targetZone || targetZone.classList.contains('has-class')) {
            // Find first available slot
            const dayColumn = document.querySelector(`[data-day="${day}"]`);
            const availableZones = dayColumn.querySelectorAll('.drop-zone:not(.has-class)');
            targetZone = availableZones[0];
        }
        
        if (targetZone) {
            targetZone.appendChild(classElement);
            targetZone.classList.add('has-class');
            
            // Update class data with actual slot
            classData.slot = targetZone.dataset.slot;
            classData.time = formatSlotTime(targetZone.dataset.slot);
            
            updateScheduleData();
            
            // Auto-edit the course name
            setTimeout(() => {
                const courseField = classElement.querySelector('.editable-field[data-field="course"]');
                if (courseField) {
                    courseField.focus();
                    courseField.select();
                }
            }, 100);
        }
    };
    
    function createDraggableClass(classData) {
        const classElement = document.createElement('div');
        const classType = classData.type || 'class';
        classElement.className = `draggable-class ${classType}-class`;
        classElement.draggable = true;
        classElement.id = classData.id;
        classElement.classData = classData;
        
        const typeInfo = CLASS_TYPES[classType] || CLASS_TYPES.class;
        const slotInfo = TIME_SLOTS[classData.slot] || TIME_SLOTS[1];
        
        classElement.innerHTML = `
            <div class="class-type-badge ${classType}">${typeInfo.name}</div>
            <div class="class-actions">
                <button class="class-action-btn btn-edit-class" onclick="showClassEditModal('${classData.id}')" title="Edit Class Details">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="class-action-btn btn-delete-class" onclick="deleteClass('${classData.id}')" title="Delete Class">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div class="class-course editable-field" data-field="course" contenteditable="true" title="Click to edit course name">${classData.course}</div>
            <div class="class-meta">
                <div class="class-faculty">
                    <i class="fas fa-user"></i>
                    <span class="editable-field" data-field="faculty" contenteditable="true" title="Click to edit faculty name">${classData.faculty}</span>
                </div>
                <div class="class-time">
                    <i class="fas fa-clock"></i>
                    <span class="editable-field class-time-display" data-field="time" contenteditable="true" title="Click to edit class timing">${classData.time}</span>
                </div>
                <div class="class-room">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="editable-field" data-field="room" contenteditable="true" title="Click to edit room number">${classData.room}</span>
                </div>
            </div>
        `;
        
        // Add drag event listeners
        classElement.addEventListener('dragstart', handleClassDragStart);
        classElement.addEventListener('dragend', handleClassDragEnd);
        
        // Add inline editing listeners
        const editableFields = classElement.querySelectorAll('.editable-field');
        editableFields.forEach(field => {
            field.addEventListener('blur', function() {
                const fieldName = this.dataset.field;
                const newValue = this.textContent.trim();
                if (newValue !== classData[fieldName]) {
                    // Special handling for time field with validation
                    if (fieldName === 'time') {
                        const validatedTime = preserveTimeFormat(newValue, classData.originalTime || classData.time);
                        classData[fieldName] = validatedTime;
                        classData.originalTime = validatedTime; // Update original time backup
                        this.textContent = validatedTime; // Update display if corrected
                        console.log(`⏰ Time validated and preserved: ${validatedTime}`);
                    } else {
                        classData[fieldName] = newValue;
                    }
                    updateScheduleData();
                    showSuccess(`${fieldName} updated successfully`);
                }
            });
            
            field.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    this.textContent = classData[this.dataset.field];
                    this.blur();
                }
            });
            
            field.addEventListener('focus', function() {
                // Select all text for easy editing
                setTimeout(() => {
                    const range = document.createRange();
                    range.selectNodeContents(this);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }, 10);
            });
        });
        
        return classElement;
    }
    
    function handleClassDragStart(e) {
        draggedElement = e.target;
        draggedElement.oldZone = e.target.parentElement;
        e.target.classList.add('dragging');
    }
    
    function handleClassDragEnd(e) {
        e.target.classList.remove('dragging');
    }
    
    function formatSlotTime(slot) {
        const slotInfo = TIME_SLOTS[slot] || TIME_SLOTS[1];
        return `${slotInfo.start} - ${slotInfo.end}`;
    }
    
    function formatTimeSlot(time) {
        // Legacy function - try to convert to slot format if possible
        if (typeof time === 'string' && time.includes('-')) {
            return time; // Already formatted
        }
        const hour = parseInt(time);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        return `${displayHour}:00 ${ampm}`;
    }
    
    window.showClassEditModal = function(classId) {
        const classElement = document.getElementById(classId);
        if (!classElement) {
            showError('Class not found');
            return;
        }
        
        const classData = classElement.classData;
        
        // Populate the form
        document.getElementById('editClassId').value = classId;
        document.getElementById('editClassCourse').value = classData.course || '';
        document.getElementById('editClassType').value = classData.type || 'class';
        document.getElementById('editClassFaculty').value = classData.faculty || '';
        document.getElementById('editClassRoom').value = classData.room || '';
        document.getElementById('editClassTime').value = classData.time || '8:00 AM - 9:30 AM';
        document.getElementById('editClassCampus').value = classData.campus || 'SZABIST University Campus H-8/4 ISB';
        document.getElementById('editClassNotes').value = classData.notes || '';
        
        showModal('classEditModal');
    };
    
    window.saveClassDetails = function() {
        const classId = document.getElementById('editClassId').value;
        const classElement = document.getElementById(classId);
        
        if (!classElement) {
            showError('Class not found');
            return;
        }
        
        // Get form data
        const course = document.getElementById('editClassCourse').value.trim();
        const type = document.getElementById('editClassType').value;
        const faculty = document.getElementById('editClassFaculty').value.trim();
        const room = document.getElementById('editClassRoom').value.trim();
        const time = document.getElementById('editClassTime').value.trim();
        const campus = document.getElementById('editClassCampus').value.trim();
        const notes = document.getElementById('editClassNotes').value.trim();
        
        // Validate required fields
        if (!course || !faculty || !room || !time) {
            showError('Please fill in all required fields');
            return;
        }
        
        // Update class data
        const classData = classElement.classData;
        const oldType = classData.type;
        
        classData.course = course;
        classData.type = type;
        classData.faculty = faculty;
        classData.room = room;
        classData.time = time;
        classData.originalTime = time; // PRESERVE: Keep original time format
        classData.campus = campus;
        classData.notes = notes;
        classData.duration = CLASS_TYPES[type].duration;
        
        // Update class element if type changed
        if (oldType !== type) {
            classElement.className = `draggable-class ${type}-class`;
            
            // Update type badge
            const typeBadge = classElement.querySelector('.class-type-badge');
            if (typeBadge) {
                typeBadge.textContent = CLASS_TYPES[type].name;
                typeBadge.className = `class-type-badge ${type}`;
            }
            
            // Update duration display
            const durationDisplay = classElement.querySelector('.class-duration');
            if (durationDisplay) {
                durationDisplay.textContent = CLASS_TYPES[type].duration;
            }
        }
        
        // Update displayed content
        const courseElement = classElement.querySelector('.class-course');
        const facultyElement = classElement.querySelector('.class-faculty span');
        const roomElement = classElement.querySelector('.class-room span');
        const timeElement = classElement.querySelector('.class-time-display');
        
        if (courseElement) courseElement.textContent = course;
        if (facultyElement) facultyElement.textContent = faculty;
        if (roomElement) roomElement.textContent = room;
        if (timeElement) timeElement.textContent = time;
        
        updateScheduleData();
        closeModal('classEditModal');
        showSuccess('Class details updated successfully!');
    };
    
    window.deleteClass = function(classId) {
        if (!confirm('Delete this class?')) return;
        
        const classElement = document.getElementById(classId);
        if (classElement) {
            const parentZone = classElement.parentElement;
            classElement.remove();
            
            // Check if zone still has classes
            if (parentZone.querySelectorAll('.draggable-class').length === 0) {
                parentZone.classList.remove('has-classes');
            }
            
            updateScheduleData();
            showSuccess('Class deleted successfully!');
        }
    };
    
    window.editClassInline = function(classId) {
        const classElement = document.getElementById(classId);
        const courseField = classElement.querySelector('.editable-field[data-field="course"]');
        courseField.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(courseField);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    };
    
    window.autoArrangeSchedule = function() {
        // Auto-arrange classes in chronological order
        const classes = document.querySelectorAll('.draggable-class');
        
        classes.forEach(classElement => {
            const classData = classElement.classData;
            const timeSlot = classData.time || '8';
            
            // Find optimal position
            const dayColumn = document.querySelector(`[data-day="${classData.day}"]`);
            const targetZone = dayColumn.querySelector(`[data-time="${timeSlot}"]`);
            
            if (targetZone && !targetZone.classList.contains('has-class')) {
                // Remove from current position
                const currentZone = classElement.parentElement;
                currentZone.classList.remove('has-class');
                
                // Move to new position
                targetZone.appendChild(classElement);
                targetZone.classList.add('has-class');
            }
        });
        
        updateScheduleData();
        showSuccess('Schedule auto-arranged successfully!');
    };
    
    window.clearAllClasses = function() {
        if (!confirm('Clear all classes from the schedule?')) return;
        
        document.querySelectorAll('.draggable-class').forEach(el => el.remove());
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('has-class'));
        
        scheduleData = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: []
        };
        
        showSuccess('Schedule cleared successfully!');
    };
    
    window.previewSchedule = function() {
        updateScheduleData();
        
        // Generate preview HTML
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        let previewHtml = '<div class="schedule-preview">';
        
        days.forEach((day, index) => {
            const dayClasses = scheduleData[day];
            previewHtml += `
                <div class="preview-day">
                    <h5><i class="fas fa-calendar-day"></i> ${dayNames[index]}</h5>
            `;
            
            if (dayClasses.length > 0) {
                dayClasses.forEach(classItem => {
                    const typeIcon = classItem.type === 'lab' ? 'fas fa-flask' : 'fas fa-book';
                    const typeColor = classItem.type === 'lab' ? '#27ae60' : '#7000FF';
                    
                    previewHtml += `
                        <div class="preview-class" style="border-left-color: ${typeColor};">
                            <div class="class-header">
                                <strong><i class="${typeIcon}"></i> ${classItem.course}</strong>
                                <span class="type-badge" style="background: ${typeColor}; color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">
                                    ${classItem.type === 'lab' ? 'LAB' : 'CLASS'}
                                </span>
                            </div>
                            <div class="class-details" style="margin-top: 8px;">
                                <i class="fas fa-user"></i> ${classItem.faculty}<br>
                                <i class="fas fa-clock"></i> ${classItem.time} <small>(${classItem.duration})</small><br>
                                <i class="fas fa-map-marker-alt"></i> ${classItem.room}<br>
                                <i class="fas fa-building"></i> ${classItem.campus}
                                ${classItem.notes ? `<br><i class="fas fa-sticky-note"></i> ${classItem.notes}` : ''}
                            </div>
                        </div>
                    `;
                });
            } else {
                previewHtml += '<p class="no-classes">No classes scheduled</p>';
            }
            
            previewHtml += '</div>';
        });
        
        previewHtml += '</div>';
        
        // Show in a modal or new window
        const previewWindow = window.open('', '_blank', 'width=900,height=700');
        previewWindow.document.write(`
            <html>
                <head><title>Schedule Preview - University Timetable</title>
                <style>
                    body { 
                        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif; 
                        margin: 20px;
                        background: #f8f9fa;
                    }
                    .schedule-preview { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); 
                        gap: 20px;
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .preview-day { 
                        background: white; 
                        padding: 20px; 
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border: 1px solid #e9ecef;
                    }
                    .preview-class { 
                        background: #fff; 
                        padding: 12px; 
                        margin: 12px 0; 
                        border-radius: 8px; 
                        border-left: 4px solid #7000FF;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    }
                    .class-header {
                        display: flex;
                        align-items: center;
                        margin-bottom: 8px;
                    }
                    .class-details {
                        font-size: 0.9rem;
                        line-height: 1.5;
                        color: #666;
                    }
                    .no-classes { 
                        color: #999; 
                        font-style: italic;
                        text-align: center;
                        padding: 20px;
                    }
                    h5 { 
                        margin: 0 0 15px 0; 
                        color: #7000FF;
                        font-size: 1.2rem;
                        border-bottom: 2px solid #7000FF;
                        padding-bottom: 8px;
                    }
                    h2 {
                        text-align: center;
                        color: #333;
                        margin-bottom: 30px;
                    }
                    .print-btn {
                        display: block;
                        margin: 30px auto;
                        padding: 12px 24px;
                        background: #7000FF;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-size: 1rem;
                        font-weight: 600;
                    }
                    @media print {
                        .print-btn { display: none; }
                        body { margin: 0; background: white; }
                    }
                </style>
                </head>
                <body>
                    <h2>📅 University Schedule Preview</h2>
                    ${previewHtml}
                    <button class="print-btn" onclick="window.print()">🖨️ Print Schedule</button>
                </body>
            </html>
        `);
    };
    
    function updateScheduleData() {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            scheduleData[day] = [];
            const dayColumn = document.querySelector(`[data-day="${day}"]`);
            const classes = dayColumn.querySelectorAll('.draggable-class');
            
            classes.forEach(classElement => {
                const classData = classElement.classData;
                // CRITICAL FIX: Preserve original time instead of converting to slots
                // Only use slot time as fallback if no original time exists
                let preservedTime = classData.time;
                if (!preservedTime || preservedTime.match(/^Slot \d+$/)) {
                    const slotInfo = TIME_SLOTS[classData.slot] || TIME_SLOTS[1];
                    preservedTime = `${slotInfo.start} - ${slotInfo.end}`;
                }
                
                scheduleData[day].push({
                    course: classData.course,
                    faculty: classData.faculty,
                    room: classData.room,
                    time: preservedTime, // Use preserved time instead of slot time
                    campus: classData.campus || 'SZABIST University Campus H-8/4 ISB',
                    type: classData.type || 'class',
                    duration: classData.duration || CLASS_TYPES[classData.type || 'class'].duration,
                    slot: classData.slot,
                    notes: classData.notes || ''
                });
            });
            
            // Sort by time instead of slot for more accurate ordering
            scheduleData[day].sort((a, b) => {
                const timeA = parseTimeForSorting(a.time);
                const timeB = parseTimeForSorting(b.time);
                return timeA - timeB;
            });
        });
    }
    
    function formatTimeRange(timeSlot) {
        const hour = parseInt(timeSlot);
        const nextHour = hour + 1;
        
        const formatHour = (h) => {
            const ampm = h >= 12 ? 'PM' : 'AM';
            const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
            return `${displayHour}:00 ${ampm}`;
        };
        
        return `${formatHour(hour)} - ${formatHour(nextHour)}`;
    }
    
    // Helper function to parse time strings for sorting
    function parseTimeForSorting(timeString) {
        if (!timeString) return 0;
        
        // Extract the start time from formats like "8:00 AM - 9:30 AM" or "08:00 AM – 09:30 AM"
        const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!timeMatch) return 0;
        
        let hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();
        
        // Convert to 24-hour format for sorting
        if (ampm === 'PM' && hour !== 12) {
            hour += 12;
        } else if (ampm === 'AM' && hour === 12) {
            hour = 0;
        }
        
        return hour * 60 + minute; // Return minutes since midnight
    }
    
    // Validation function to check if time format is valid
    function validateTimeFormat(timeString) {
        if (!timeString) return false;
        
        // Accept various time formats:
        // "8:00 AM - 9:30 AM", "08:00 AM – 09:30 AM", "8:00 AM - 11:00 AM", etc.
        const validTimePattern = /^\d{1,2}:\d{2}\s*(AM|PM)\s*[-–—]\s*\d{1,2}:\d{2}\s*(AM|PM)$/i;
        return validTimePattern.test(timeString.trim());
    }
    
    // Function to preserve time format during edits
    function preserveTimeFormat(newTime, originalTime) {
        // If the new time is valid, use it
        if (validateTimeFormat(newTime)) {
            return newTime;
        }
        
        // If not valid, try to preserve original or provide a sensible default
        if (validateTimeFormat(originalTime)) {
            console.warn('⚠️ Invalid time format entered, preserving original:', originalTime);
            return originalTime;
        }
        
        // Last resort: provide a default time
        console.warn('⚠️ Invalid time format, using default');
        return '8:00 AM - 9:30 AM';
    }
    
    function populateScheduleBuilder(schedule) {
        console.log('🏗️ Populating schedule builder with:', schedule);
        
        // Clear existing classes
        document.querySelectorAll('.draggable-class').forEach(el => el.remove());
        document.querySelectorAll('.drop-zone').forEach(zone => zone.classList.remove('has-class'));
        
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            if (schedule.weekly_schedule[day] && schedule.weekly_schedule[day].length > 0) {
                schedule.weekly_schedule[day].forEach((classItem, index) => {
                    const slot = parseTimeToSlot(classItem.time);
                    
                    const classData = {
                        id: `class_${day}_${index}_${Date.now()}`,
                        day: day,
                        slot: slot,
                        time: classItem.time, // PRESERVED: Keep original time from JSON
                        originalTime: classItem.time, // Store original time separately as backup
                        course: classItem.course,
                        faculty: classItem.faculty,
                        room: classItem.room,
                        campus: classItem.campus,
                        type: classItem.type || 'class',
                        duration: classItem.duration || CLASS_TYPES[classItem.type || 'class'].duration,
                        notes: classItem.notes || ''
                    };
                    
                    const classElement = createDraggableClass(classData);
                    
                    // Find appropriate slot
                    const dayColumn = document.querySelector(`[data-day="${day}"]`);
                    const targetZone = dayColumn.querySelector(`[data-slot="${slot}"]`) || 
                                     dayColumn.querySelector('.drop-zone:not(.has-class)');
                    
                    if (targetZone) {
                        targetZone.appendChild(classElement);
                        targetZone.classList.add('has-class');
                    }
                });
            }
        });
        
        updateScheduleData();
    }
    
    function parseTimeToSlot(timeString) {
        if (!timeString) return '1';
        
        // Check if it's already a slot number
        if (timeString.match(/^[1-4]$/)) {
            return timeString;
        }
        
        // Convert time ranges to slots
        const lowerTime = timeString.toLowerCase();
        
        if (lowerTime.includes('8:00 am') || lowerTime.includes('08:00')) {
            return '1'; // 8:00 AM - 11:00 AM
        } else if (lowerTime.includes('11:00 am') || lowerTime.includes('11:00')) {
            return '2'; // 11:00 AM - 2:00 PM
        } else if (lowerTime.includes('2:00 pm') || lowerTime.includes('14:00')) {
            return '3'; // 2:00 PM - 5:00 PM
        } else if (lowerTime.includes('5:00 pm') || lowerTime.includes('17:00')) {
            return '4'; // 5:00 PM - 9:30 PM
        }
        
        // Try to parse hour from time string
        const hourMatch = timeString.match(/(\d{1,2}):/i);
        if (hourMatch) {
            let hour = parseInt(hourMatch[1]);
            if (timeString.toLowerCase().includes('pm') && hour !== 12) {
                hour += 12;
            } else if (timeString.toLowerCase().includes('am') && hour === 12) {
                hour = 0;
            }
            
            // Map hours to slots
            if (hour >= 8 && hour < 11) return '1';
            if (hour >= 11 && hour < 14) return '2';
            if (hour >= 14 && hour < 17) return '3';
            if (hour >= 17) return '4';
        }
        
        return '1'; // Default to slot 1
    }
    
    // Legacy function for backward compatibility - now calls the updated addClassSlot
    window.addQuickClass = function(day) {
        // Add a regular class by default
        addClassSlot(day, 'class');
    };
    
    // Update legacy function
    window.addClassSlot = function(day, classType = 'class', classData = null) {
        if (typeof classType === 'object' && classType !== null) {
            // Old format: addClassSlot(day, classData)
            classData = classType;
            classType = 'class';
        }
        
        if (classData) {
            // Converting from existing schedule data
            const slot = parseTimeToSlot(classData.time);
            const data = {
                id: `class_${day}_${Date.now()}`,
                day: day,
                slot: slot,
                time: classData.time,
                course: classData.course || 'Course Name',
                faculty: classData.faculty || 'Faculty Name',
                room: classData.room || 'Room',
                campus: classData.campus || 'SZABIST University Campus H-8/4 ISB',
                type: classData.type || classType,
                duration: classData.duration || CLASS_TYPES[classType].duration,
                notes: classData.notes || ''
            };
            
            const classElement = createDraggableClass(data);
            const dayColumn = document.querySelector(`[data-day="${day}"]`);
            const targetZone = dayColumn.querySelector(`[data-slot="${slot}"]`) ||
                             dayColumn.querySelector('.drop-zone:not(.has-class)');
            
            if (targetZone) {
                targetZone.appendChild(classElement);
                targetZone.classList.add('has-class');
                updateScheduleData();
            }
        } else {
            // Creating new class
            const classId = 'class_' + day + '_' + Date.now();
            const typeInfo = CLASS_TYPES[classType] || CLASS_TYPES.class;
            
        const defaultTime = classType === 'lab' ? '8:00 AM - 11:00 AM' : '8:00 AM - 9:30 AM';
        
        const newClassData = {
            id: classId,
            day: day,
            slot: '1',
            type: classType,
            course: classType === 'lab' ? 'New Lab' : 'New Course',
            faculty: 'Faculty Name',
            room: 'Room Number',
            campus: 'SZABIST University Campus H-8/4 ISB',
            time: defaultTime,
            duration: typeInfo.duration
        };
            
            const classElement = createDraggableClass(newClassData);
            const dayColumn = document.querySelector(`[data-day="${day}"]`);
            const availableZone = dayColumn.querySelector('.drop-zone:not(.has-class)');
            
        if (availableZone) {
            availableZone.appendChild(classElement);
            availableZone.classList.add('has-classes');
            
            // Update class data with actual slot
            newClassData.slot = availableZone.dataset.slot;
                
                updateScheduleData();
                
                // Auto-edit the course name
                setTimeout(() => {
                    const courseField = classElement.querySelector('.editable-field[data-field="course"]');
                    if (courseField) {
                        courseField.focus();
                        courseField.select();
                    }
                }, 100);
            }
        }
    };
    
    window.removeClassSlot = function(slotId) {
        const slot = document.getElementById(slotId);
        if (slot) {
            slot.remove();
        }
    };
    
    window.saveSchedule = async function() {
        try {
            const form = document.getElementById('scheduleForm');
            const formData = new FormData(form);
            
            // Update schedule data from drag-and-drop interface
            updateScheduleData();
            
            const scheduleDataToSave = {
                department: formData.get('department'),
                program: formData.get('program'),
                semester: parseInt(formData.get('semester')),
                section: formData.get('section'),
                university: formData.get('university'),
                weekly_schedule: scheduleData // Use the global scheduleData from drag-and-drop
            };
            
            const scheduleId = document.getElementById('scheduleId').value;
            const isEditing = scheduleId !== '';
            
            const response = await fetch(`/api/schedules${isEditing ? `/${scheduleId}` : ''}`, {
                method: isEditing ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleDataToSave)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save schedule');
            }
            
            const result = await response.json();
            showSuccess(result.message);
            closeModal('scheduleModal');
            loadSchedules();
            loadScheduleStats();
            
        } catch (error) {
            console.error('Error saving schedule:', error);
            showError(error.message || 'Failed to save schedule');
        }
    };
    
    // Filter functions
    window.filterSchedules = function() {
        loadSchedules();
    };
    
    window.clearScheduleFilters = function() {
        document.getElementById('scheduleDepartmentFilter').value = '';
        document.getElementById('scheduleProgramFilter').value = '';
        document.getElementById('scheduleSemesterFilter').value = '';
        document.getElementById('scheduleSectionFilter').value = '';
        
        // Clear program options
        const programFilter = document.getElementById('scheduleProgramFilter');
        programFilter.innerHTML = '<option value="">All Programs</option>';
        
        loadSchedules();
    };
    
    // Import schedules
    window.showImportModal = function() {
        document.getElementById('importForm').reset();
        showModal('importModal');
    };
    
    window.importSchedules = async function() {
        try {
            const form = document.getElementById('importForm');
            const formData = new FormData(form);
            const files = document.getElementById('importFile').files;
            const department = formData.get('department');
            const program = formData.get('program');
            
            if (!files.length) {
                showError('Please select JSON files to import');
                return;
            }
            
            const schedulesArray = [];
            
            for (let file of files) {
                const text = await file.text();
                try {
                    const scheduleData = JSON.parse(text);
                    schedulesArray.push(scheduleData);
                } catch (parseError) {
                    console.error(`Error parsing ${file.name}:`, parseError);
                    showError(`Failed to parse ${file.name}. Please ensure it's valid JSON.`);
                    return;
                }
            }
            
            const response = await fetch('/api/schedules/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    schedules: schedulesArray,
                    department: department,
                    program: program
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to import schedules');
            }
            
            const result = await response.json();
            showSuccess(result.message);
            closeModal('importModal');
            loadSchedules();
            loadScheduleStats();
            
        } catch (error) {
            console.error('Error importing schedules:', error);
            showError(error.message || 'Failed to import schedules');
        }
    };
    
    // WhatsApp schedule sending
    async function loadProgramsForScheduleDepartment(department, targetSelectId) {
        const programSelect = document.getElementById(targetSelectId);
        programSelect.innerHTML = '<option value="">Loading...</option>';
        
        if (!department) {
            programSelect.innerHTML = '<option value="">All Programs</option>';
            return;
        }
        
        try {
            const response = await fetch('/api/whatsapp/programs-by-department', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department })
            });
            
            if (!response.ok) throw new Error('Failed to load programs');
            
            const data = await response.json();
            programSelect.innerHTML = '<option value="">All Programs</option>' + 
                data.programs.map(program => `<option value="${program}">${program}</option>`).join('');
                
        } catch (error) {
            console.error('Error loading programs:', error);
            programSelect.innerHTML = '<option value="">Error loading programs</option>';
        }
    }
    
    async function updateScheduleStudentCount() {
        const department = document.getElementById('whatsappScheduleDepartment')?.value;
        const program = document.getElementById('whatsappScheduleProgram')?.value;
        const semester = document.getElementById('whatsappScheduleSemester')?.value;
        const section = document.getElementById('whatsappScheduleSection')?.value;
        
        const countElement = document.getElementById('scheduleStudentCount');
        if (!countElement) return;
        
        if (!department || !program || !semester || !section) {
            countElement.textContent = '';
            return;
        }
        
        try {
            const response = await fetch('/api/whatsapp/count-students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filterCriteria: { department, program, semester, section } 
                })
            });
            
            const data = await response.json();
            countElement.textContent = `${data.count} student(s) will receive the schedule`;
            
        } catch (error) {
            console.error('Error counting students:', error);
            countElement.textContent = 'Error counting students';
        }
    }
    
    window.sendScheduleToStudents = async function() {
        const department = document.getElementById('whatsappScheduleDepartment')?.value;
        const program = document.getElementById('whatsappScheduleProgram')?.value;
        const semester = document.getElementById('whatsappScheduleSemester')?.value;
        const section = document.getElementById('whatsappScheduleSection')?.value;
        const selectedDay = document.getElementById('scheduleDaySelect')?.value;
        
        if (!department || !program || !semester || !section) {
            showError('Please select department, program, semester, and section');
            return;
        }
        
        try {
            // First, get the schedule
            const scheduleResponse = await fetch('/api/schedules/filter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ department, program, semester, section })
            });
            
            if (!scheduleResponse.ok) throw new Error('Failed to get schedule');
            
            const scheduleData = await scheduleResponse.json();
            if (!scheduleData.schedules || scheduleData.schedules.length === 0) {
                showError('No schedule found for the selected criteria');
                return;
            }
            
            const schedule = scheduleData.schedules[0];
            
            // Format the schedule message
            let message = `📅 *Class Schedule*\n\n`;
            message += `🏫 *${schedule.program}*\n`;
            message += `📚 Semester: ${schedule.semester}\n`;
            message += `📝 Section: ${schedule.section}\n`;
            message += `🏢 ${schedule.department}\n\n`;
            
            const days = selectedDay ? [selectedDay] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            const dayNames = {
                monday: '📅 *MONDAY*',
                tuesday: '📅 *TUESDAY*', 
                wednesday: '📅 *WEDNESDAY*',
                thursday: '📅 *THURSDAY*',
                friday: '📅 *FRIDAY*',
                saturday: '📅 *SATURDAY*'
            };
            
            days.forEach(day => {
                if (schedule.weekly_schedule[day] && schedule.weekly_schedule[day].length > 0) {
                    message += `${dayNames[day]}\n`;
                    schedule.weekly_schedule[day].forEach(classItem => {
                        message += `\n📖 ${classItem.course}\n`;
                        message += `👨‍🏫 ${classItem.faculty}\n`;
                        message += `⏰ ${classItem.time}\n`;
                        message += `🏛️ ${classItem.room}\n`;
                    });
                    message += '\n---\n\n';
                }
            });
            
            if (message.includes('📖')) {
                // Send the message
                const sendResponse = await fetch('/api/whatsapp/send-bulk', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        filterCriteria: { department, program, semester, section },
                        message: message
                    })
                });
                
                if (!sendResponse.ok) throw new Error('Failed to send schedule messages');
                
                const result = await sendResponse.json();
                showSuccess(result.message || 'Schedule sent successfully');
            } else {
                showError('No classes found for the selected day(s)');
            }
            
        } catch (error) {
            console.error('Error sending schedule:', error);
            showError(error.message || 'Failed to send schedule');
        }
    };
    
    window.sendScheduleToClass = function(scheduleId) {
        const schedule = schedulesData.find(s => s._id === scheduleId);
        if (!schedule) {
            showError('Schedule not found');
            return;
        }
        
        // Pre-fill the WhatsApp form
        document.getElementById('whatsappScheduleDepartment').value = schedule.department;
        document.getElementById('whatsappScheduleProgram').value = schedule.program;
        document.getElementById('whatsappScheduleSemester').value = schedule.semester;
        document.getElementById('whatsappScheduleSection').value = schedule.section;
        
        // Load programs for the department
        loadProgramsForScheduleDepartment(schedule.department, 'whatsappScheduleProgram')
            .then(() => {
                document.getElementById('whatsappScheduleProgram').value = schedule.program;
                updateScheduleStudentCount();
            });
        
        // Scroll to WhatsApp section
        const whatsappCard = document.querySelector('.card:has(#whatsappScheduleDepartment)');
        if (whatsappCard) {
            whatsappCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };
    
    // Update the existing showPage function to include schedule management
    const originalShowPageLocal = showPage;
    
    showPage = function(page) {
        // Clean up WhatsApp intervals when leaving WhatsApp page
        if (whatsappStatusInterval && page !== 'whatsapp') {
            clearInterval(whatsappStatusInterval);
            whatsappStatusInterval = null;
        }
        
        // Call the original showPage function
        originalShowPageLocal(page);
        
        // Add schedule title if not already included
        if (page === 'schedules') {
            pageTitle.textContent = 'Schedule Management';
            pageSubtitle.textContent = 'Manage class schedules and timetables';
            initializeSchedulePage();
        }
    };
    
    // Make the function available globally
    window.showPage = showPage;
    
    // ==================== END SCHEDULE MANAGEMENT FUNCTIONS ====================
    
});
