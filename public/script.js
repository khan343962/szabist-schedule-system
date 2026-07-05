document.addEventListener('DOMContentLoaded', () => {
    const studentForm = document.getElementById('studentForm');
    const statusMessage = document.getElementById('statusMessage');
    const progressFill = document.querySelector('.progress-fill');
    const nextButtons = document.querySelectorAll('.next-step');
    const prevButtons = document.querySelectorAll('.prev-step');
    const formSteps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    let currentStep = 1;
    const totalSteps = formSteps.length;
    
    // Department-Program mapping
    const departmentPrograms = {
        'Management Sciences': [
            'BBA',
            'BS (Business Analytics)',
            'BS (Accounting & Finance)',
            'MBA',
            'MS (Project Management)',
            'PhD (Management Sciences)'
        ],
        'Computer Sciences': [
            'BS (Computer Science)',
            'BS (Software Engineering)',
            'BS (Artificial Intelligence)',
            'MS (Computer Science)',
            'MS (Data Science)',
            'MS (Cyber Security)',
            'PhD (Computing)'
        ],
        'Executive Programs': [
            'MPM',
            'MHRM',
            'EMBA',
            'PMBA',
            'MS PM',
            'MS BA'
        ],
        'Social Sciences': [
            'BS (Social Sciences)',
            'BS (PSYCHOLOGY)',
            'MS (Social Sciences)',
            'MS (Development Studies)',
            'MS (Clinical Psychology)',
            'MS (Sociology)',
            'Phd (Psychology)'
        ],
        'Media Sciences': [
            'BS (Media Science)',
            'Master of Media Science'
        ]
    };
    
    // Initialize form animations with staggered delay
    document.querySelectorAll('.form-group').forEach((group, index) => {
        group.style.opacity = 0;
        group.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Update progress bar
    const updateProgress = (step) => {
        const percent = ((step - 1) / (totalSteps - 1)) * 100;
        progressFill.style.width = `${percent}%`;
        
        // Update progress steps
        progressSteps.forEach((progressStep, idx) => {
            if (idx + 1 < step) {
                progressStep.classList.add('completed');
                progressStep.classList.remove('active');
            } else if (idx + 1 === step) {
                progressStep.classList.add('active');
                progressStep.classList.remove('completed');
            } else {
                progressStep.classList.remove('active', 'completed');
            }
        });
    };
    
    // Navigate to next step
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            const nextStep = parseInt(button.getAttribute('data-step'));
            if (validateStep(currentStep)) {
                navigateToStep(nextStep);
            }
        });
    });
    
    // Navigate to previous step
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            const prevStep = parseInt(button.getAttribute('data-step'));
            navigateToStep(prevStep);
        });
    });
    
    // Navigate to specific step
    const navigateToStep = (step) => {
        // Hide all steps
        formSteps.forEach(formStep => {
            formStep.style.display = 'none';
        });
        
        // Show current step
        document.getElementById(`step${step}`).style.display = 'block';
        
        // Update current step variable
        currentStep = step;
        
        // Update progress
        updateProgress(currentStep);
        
        // Animate new form groups
        const newStepGroups = document.querySelectorAll(`#step${step} .form-group`);
        newStepGroups.forEach((group, index) => {
            group.style.opacity = 0;
            setTimeout(() => {
                group.style.opacity = 1;
            }, index * 100);
        });
        
        // Scroll to top of form
        studentForm.scrollIntoView({ behavior: 'smooth' });
    };
    
    // Validate current step
    const validateStep = (step) => {
        let isValid = true;
        
        // Reset all error styles
        const inputs = document.querySelectorAll(`#step${step} input, #step${step} select, #step${step} textarea`);
        inputs.forEach(input => {
            input.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            // If there's a parent with input-with-icon class, reset the icon color
            const iconParent = input.closest('.input-with-icon');
            if (iconParent) {
                const icon = iconParent.querySelector('i');
                if (icon) {
                    icon.style.color = 'rgba(23, 22, 39, 0.5)';
                }
            }
        });
        
        // Required fields validation for current step
        const requiredInputs = document.querySelectorAll(`#step${step} [required]`);
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'var(--error-color)';
                
                // If there's a parent with input-with-icon class, change the icon color
                const iconParent = input.closest('.input-with-icon');
                if (iconParent) {
                    const icon = iconParent.querySelector('i');
                    if (icon) {
                        icon.style.color = 'var(--error-color)';
                    }
                }
                
                // Add shake animation
                input.classList.add('shake-animation');
                setTimeout(() => {
                    input.classList.remove('shake-animation');
                }, 500);
            }
        });
        
        // Email validation
        if (step === 1) {
            const emailInput = document.getElementById('email');
            if (emailInput && emailInput.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(emailInput.value)) {
                    isValid = false;
                    emailInput.style.borderColor = 'var(--error-color)';
                    
                    // Change icon color
                    const iconParent = emailInput.closest('.input-with-icon');
                    if (iconParent) {
                        const icon = iconParent.querySelector('i');
                        if (icon) {
                            icon.style.color = 'var(--error-color)';
                        }
                    }
                }
            }
        }
        
        // Phone validation (Pakistani format)
        if (step === 1) {
            const phoneInput = document.getElementById('phoneNumber');
            if (phoneInput && phoneInput.value) {
                // Accept Pakistani local format (0xxxxxxxxxx) or international format (+92xxxxxxxxxx)
                const phoneRegex = /^(\+92|0)\d{10}$/;
                const cleanedPhone = phoneInput.value.replace(/[\s\-\(\)]/g, '');
                
                if (!phoneRegex.test(cleanedPhone)) {
                    isValid = false;
                    phoneInput.style.borderColor = 'var(--error-color)';
                    
                    // Change icon color
                    const iconParent = phoneInput.closest('.input-with-icon');
                    if (iconParent) {
                        const icon = iconParent.querySelector('i');
                        if (icon) {
                            icon.style.color = 'var(--error-color)';
                        }
                    }
                    
                    showFloatingMessage('error', 'Please enter a valid Pakistani phone number (e.g., 03001234567)');
                }
            }
        }
        
        if (!isValid && step === 1) {
            showFloatingMessage('error', 'Please fill in all required fields correctly');
        }
        
        return isValid;
    };
    
    // Form validation and submission
    studentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Final validation of all steps
        let allValid = true;
        for (let i = 1; i <= totalSteps; i++) {
            if (!validateStep(i)) {
                allValid = false;
                navigateToStep(i);
                break;
            }
        }
        
        if (allValid) {
            // Show loading state
            const submitBtn = document.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            submitBtn.disabled = true;
            
            // Reset status message
            statusMessage.className = '';
            statusMessage.style.display = 'none';
            statusMessage.textContent = '';
            
            // Collect form data
            const formData = new FormData(studentForm);
            const studentData = Object.fromEntries(formData.entries());
            
            try {
                // Send data to server
                const response = await fetch('/api/students', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(studentData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Show confetti animation
                    showConfetti();
                    
                    // Show success message
                    showStatus('success', 'Registration successful! Your data has been saved.');
                    
                    // Reset form
                    setTimeout(() => {
                        studentForm.reset();
                        navigateToStep(1);
                    }, 2000);
                } else {
                    // Show error message
                    showStatus('error', `Error: ${result.message || 'Something went wrong'}`);
                }
            } catch (error) {
                showStatus('error', 'Network error! Please try again later.');
                console.error('Submission error:', error);
            } finally {
                // Restore button state
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    });
    
    // Show status message
    function showStatus(type, message) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        statusMessage.style.display = 'block';
        
        // Scroll to status message
        statusMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Show floating message
    function showFloatingMessage(type, message) {
        // Remove any existing floating messages
        const existingMessage = document.querySelector('.floating-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // Create floating message
        const floatingMessage = document.createElement('div');
        floatingMessage.className = `floating-message ${type}`;
        floatingMessage.innerHTML = `
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(floatingMessage);
        
        // Show with animation
        setTimeout(() => {
            floatingMessage.classList.add('show');
        }, 10);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            floatingMessage.classList.remove('show');
            setTimeout(() => {
                floatingMessage.remove();
            }, 300);
        }, 3000);
    }
    
    // Confetti animation
    function showConfetti() {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        document.body.appendChild(confettiContainer);
        
        // Create confetti pieces
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = getRandomColor();
            confettiContainer.appendChild(confetti);
        }
        
        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 6000);
    }
    
    function getRandomColor() {
        const colors = [
            'var(--primary-color)',
            'var(--secondary-color)',
            'var(--accent-color)',
            'var(--success-color)',
            'var(--warning-color)'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // Add input event listeners for real-time validation
    const inputs = studentForm.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            // Reset error styling on input
            input.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            // Reset icon color
            const iconParent = input.closest('.input-with-icon');
            if (iconParent) {
                const icon = iconParent.querySelector('i');
                if (icon) {
                    icon.style.color = 'rgba(23, 22, 39, 0.5)';
                }
            }
            
            // Validate required fields
            if (input.hasAttribute('required') && !input.value.trim()) {
                input.style.borderColor = 'var(--error-color)';
                
                // Change icon color
                if (iconParent) {
                    const icon = iconParent.querySelector('i');
                    if (icon) {
                        icon.style.color = 'var(--error-color)';
                    }
                }
            }
            
            // Validate email
            if (input.id === 'email' && input.value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    input.style.borderColor = 'var(--error-color)';
                    
                    // Change icon color
                    if (iconParent) {
                        const icon = iconParent.querySelector('i');
                        if (icon) {
                            icon.style.color = 'var(--error-color)';
                        }
                    }
                }
            }
            
            // Validate phone (Pakistani format)
            if (input.id === 'phoneNumber' && input.value) {
                const phoneRegex = /^(\+92|0)\d{10}$/;
                const cleanedPhone = input.value.replace(/[\s\-\(\)]/g, '');
                
                if (!phoneRegex.test(cleanedPhone)) {
                    input.style.borderColor = 'var(--error-color)';
                    
                    // Change icon color
                    if (iconParent) {
                        const icon = iconParent.querySelector('i');
                        if (icon) {
                            icon.style.color = 'var(--error-color)';
                        }
                    }
                }
            }
        });
    });
    
    // Add hover effects for form fields
    inputs.forEach(input => {
        const iconParent = input.closest('.input-with-icon');
        if (iconParent) {
            const icon = iconParent.querySelector('i');
            
            input.addEventListener('mouseover', () => {
                if (icon && input.style.borderColor !== 'var(--error-color)') {
                    icon.style.color = 'var(--primary-color)';
                }
            });
            
            input.addEventListener('mouseout', () => {
                if (icon && input.style.borderColor !== 'var(--error-color)' && document.activeElement !== input) {
                    icon.style.color = 'rgba(23, 22, 39, 0.5)';
                }
            });
        }
    });
    
    // Add CSS for new elements
    const style = document.createElement('style');
    style.textContent = `
        .shake-animation {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .floating-message {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: white;
            border-radius: var(--border-radius-md);
            box-shadow: 0 5px 20px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 1000;
            transform: translateX(120%);
            transition: transform 0.3s ease-out;
        }
        
        .floating-message.show {
            transform: translateX(0);
        }
        
        .floating-message.error {
            border-left: 4px solid var(--error-color);
        }
        
        .floating-message.error i {
            color: var(--error-color);
        }
        
        .floating-message.success {
            border-left: 4px solid var(--success-color);
        }
        
        .floating-message.success i {
            color: var(--success-color);
        }
        
        .confetti-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            overflow: hidden;
        }
        
        .confetti {
            position: absolute;
            top: -10px;
            width: 10px;
            height: 20px;
            opacity: 0;
            transform: translateY(0) rotate(0);
            animation: confetti-fall 5s ease-out forwards;
        }
        
        @keyframes confetti-fall {
            0% {
                opacity: 1;
                transform: translateY(-10px) rotate(0);
            }
            100% {
                opacity: 0;
                transform: translateY(100vh) rotate(720deg);
            }
        }
    `;
    document.head.appendChild(style);
    
    // Department dropdown change handler
    const departmentSelect = document.getElementById('department');
    const programSelect = document.getElementById('program');
    
    if (departmentSelect && programSelect) {
        departmentSelect.addEventListener('change', function() {
            const selectedDepartment = this.value;
            
            // Clear program dropdown
            programSelect.innerHTML = '<option value="">Select a program</option>';
            
            // Populate programs based on selected department
            if (selectedDepartment && departmentPrograms[selectedDepartment]) {
                departmentPrograms[selectedDepartment].forEach(program => {
                    const option = document.createElement('option');
                    option.value = program;
                    option.textContent = program;
                    programSelect.appendChild(option);
                });
            }
        });
    }
    
    // Initialize progress bar
    updateProgress(currentStep);
});