// Main JavaScript file for AI Doctor website
// Handles 3D model interactions, scroll animations, and UI functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all components
    initNavigation();
    initScrollAnimations();
    init3DModel();
    initFileUpload();
    initCalendar();
    initMedicationTracker();
    initContactForm();
});

// Navigation functionality
function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Toggle mobile menu
    hamburger.addEventListener('click', function() {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = 'none';
        }
    });
}

// Scroll animations and 3D model interactions
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.feature-card, .medication-item, .appointment-item');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // 3D Model scroll interactions
    window.addEventListener('scroll', function() {
        const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
        update3DModel(scrollPercent);
    });
}

// 3D Model management
function init3DModel() {
    const modelContainer = document.querySelector('.model-container');
    const iframe = document.getElementById('skeleton-model');
    
    // Adjust model visibility based on screen size
    function adjustModelVisibility() {
        if (window.innerWidth <= 768) {
            modelContainer.style.position = 'relative';
            modelContainer.style.width = '100%';
            modelContainer.style.height = '300px';
            modelContainer.style.marginBottom = '2rem';
        } else {
            modelContainer.style.position = 'fixed';
            modelContainer.style.width = '50%';
            modelContainer.style.height = '100vh';
            modelContainer.style.marginBottom = '0';
        }
    }

    // Initial setup
    adjustModelVisibility();
    
    // Adjust on window resize
    window.addEventListener('resize', adjustModelVisibility);

    // Model loading state
    iframe.addEventListener('load', function() {
        console.log('3D Skeleton model loaded successfully');
        modelContainer.style.opacity = '1';
    });
}

// Update 3D model based on scroll position
function update3DModel(scrollPercent) {
    const modelContainer = document.querySelector('.model-container');
    const sections = document.querySelectorAll('section');
    
    // Change model opacity and position based on scroll
    if (scrollPercent < 0.2) {
        // Hero section - full visibility
        modelContainer.style.opacity = '1';
        modelContainer.style.transform = 'translateX(0)';
    } else if (scrollPercent < 0.4) {
        // Features section - slight fade
        modelContainer.style.opacity = '0.8';
        modelContainer.style.transform = 'translateX(10px)';
    } else if (scrollPercent < 0.6) {
        // Upload section - more fade
        modelContainer.style.opacity = '0.6';
        modelContainer.style.transform = 'translateX(20px)';
    } else if (scrollPercent < 0.8) {
        // Medications section - minimal visibility
        modelContainer.style.opacity = '0.4';
        modelContainer.style.transform = 'translateX(30px)';
    } else {
        // Footer section - hidden
        modelContainer.style.opacity = '0.2';
        modelContainer.style.transform = 'translateX(40px)';
    }

    // Add rotation effect based on scroll
    const rotation = scrollPercent * 360;
    if (window.innerWidth > 768) {
        modelContainer.style.filter = `hue-rotate(${rotation}deg)`;
    }
}



function initFileUpload() {
    const uploadArea = document.querySelector('.upload-area');
    const fileInput  = document.getElementById('file-input');
    const fileList   = document.querySelector('.file-list');

    // Click to open file picker
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop visual feedback
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#2563eb';
        uploadArea.style.background = '#f0f9ff';
    });
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.background = 'transparent';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.background = 'transparent';
        handleFileUpload(e.dataTransfer.files);
    });

    // File input change event
    fileInput.addEventListener('change', (e) => {
        handleFileUpload(e.target.files);
    });

    // Handle selected files
    async function handleFileUpload(files) {
        Array.from(files).forEach(file => {
            // Validate file type
            if (!CONFIG.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
                alert(`File type ${file.type} is not supported`);
                return;
            }

            // Validate file size
            if (file.size > CONFIG.UPLOAD.MAX_FILE_SIZE) {
                const maxMB = CONFIG.UPLOAD.MAX_FILE_SIZE / 1024 / 1024;
                alert(`File size exceeds ${maxMB.toFixed(1)}MB limit`);
                return;
            }

            // Add file to the visible list with a 'Processing' status
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <i class="fas fa-${file.type.includes('pdf') ? 'file-pdf' : 'image'}"></i>
                <span>${file.name}</span>
                <span class="file-status processing">Processing</span>
            `;
            fileList.appendChild(fileItem);

            // Upload file to the backend
            uploadFileToServer(file, fileItem);
        });
    }

    // Upload a single file to the server and update status
    async function uploadFileToServer(file, fileItem) {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(CONFIG.UPLOAD.UPLOAD_ENDPOINT, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const json = await response.json();
            if (json.success) {
                const statusSpan = fileItem.querySelector('.file-status');
                statusSpan.textContent = 'Analyzed';
                statusSpan.className = 'file-status completed';

                // Optionally display the analysis result in a separate section:
                // appendResult(json.data);
            } else {
                const statusSpan = fileItem.querySelector('.file-status');
                statusSpan.textContent = 'Error';
                statusSpan.className = 'file-status error';
                console.error('Upload failed:', json);
            }
        } catch (err) {
            console.error('Error uploading file:', err);
            const statusSpan = fileItem.querySelector('.file-status');
            statusSpan.textContent = 'Error';
            statusSpan.className = 'file-status error';
        }
    }

    // Optional: Append AI analysis result to a separate container
    
    function appendResult(aiData) {
        const resultContainer = document.querySelector('#analysis-results');
        const container = document.createElement('div');
        container.className = 'analysis-item';
        container.innerHTML = `
            <h4>File: ${aiData.filename}</h4>
            <pre>${JSON.stringify(aiData.analysis, null, 2)}</pre>
        `;
        resultContainer.appendChild(container);
    }
    
}



// Calendar functionality
function initCalendar() {
    const calendarGrid = document.querySelector('.calendar-grid');
    const currentMonthElement = document.getElementById('current-month');
    const prevButton = document.getElementById('prev-month');
    const nextButton = document.getElementById('next-month');

    let currentDate = new Date();

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Update month display
        currentMonthElement.textContent = new Date(year, month).toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
        });

        // Clear existing calendar days (keep headers)
        const existingDays = calendarGrid.querySelectorAll('.calendar-day:not(.header)');
        existingDays.forEach(day => day.remove());

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Add empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Highlight today
            const today = new Date();
            if (year === today.getFullYear() && 
                month === today.getMonth() && 
                day === today.getDate()) {
                dayElement.style.background = '#2563eb';
                dayElement.style.color = 'white';
                dayElement.style.borderRadius = '50%';
            }

            calendarGrid.appendChild(dayElement);
        }
    }

    // Navigation event listeners
    prevButton.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextButton.addEventListener('click', function() {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    // Initial render
    renderCalendar();
}

// Medication tracker functionality
function initMedicationTracker() {
    const medicationItems = document.querySelectorAll('.medication-item');
    
    medicationItems.forEach(item => {
        const statusElement = item.querySelector('.medication-status');
        
        if (statusElement && statusElement.classList.contains('pending')) {
            statusElement.addEventListener('click', function() {
                // Toggle medication status
                if (statusElement.classList.contains('pending')) {
                    statusElement.classList.remove('pending');
                    statusElement.classList.add('taken');
                    statusElement.innerHTML = '<i class="fas fa-check"></i><span>Taken</span>';
                    
                    // Update stats
                    updateMedicationStats();
                    
                    // Show notification
                    showNotification('Medication marked as taken!', 'success');
                } else {
                    statusElement.classList.remove('taken');
                    statusElement.classList.add('pending');
                    statusElement.innerHTML = '<i class="fas fa-clock"></i><span>Pending</span>';
                    
                    updateMedicationStats();
                }
            });
        }
    });

    function updateMedicationStats() {
        const takenCount = document.querySelectorAll('.medication-status.taken').length;
        const pendingCount = document.querySelectorAll('.medication-status.pending').length;
        
        // Update stat cards
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[0]) {
            statCards[0].querySelector('h3').textContent = takenCount;
        }
        if (statCards[1]) {
            statCards[1].querySelector('h3').textContent = pendingCount;
        }
    }
}

// Contact form functionality
function initContactForm() {
    const contactForm = document.querySelector('.contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(contactForm);
            const name = formData.get('name');
            const email = formData.get('email');
            const message = formData.get('message');
            
            // Validate form
            if (!name || !email || !message) {
                showNotification('Please fill in all fields', 'error');
                return;
            }
            
            // Simulate form submission
            showNotification('Message sent successfully!', 'success');
            contactForm.reset();
        });
    }
}

// Utility function to show notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = '#10b981';
            break;
        case 'error':
            notification.style.background = '#ef4444';
            break;
        default:
            notification.style.background = '#3b82f6';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Performance optimization: Throttle scroll events
function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply throttling to scroll events
window.addEventListener('scroll', throttle(function() {
    const scrollPercent = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    update3DModel(scrollPercent);
}, 16)); // ~60fps