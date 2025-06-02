// API Configuration File
// Store all API keys and configuration settings here

const CONFIG = {
    // OpenAI API Configuration
    OPENAI: {
        API_KEY: 'your-openai-api-key-here',
        BASE_URL: 'https://api.openai.com/v1',
        MODEL: 'gpt-4',
        MAX_TOKENS: 2000
    },

    // Replicate API Configuration (for OCR)
    REPLICATE: {
        API_KEY: 'your-replicate-api-key-here',
        BASE_URL: 'https://api.replicate.com/v1'
    },

    // Twilio Configuration (for SMS notifications)
    TWILIO: {
        ACCOUNT_SID: 'your-twilio-account-sid-here',
        AUTH_TOKEN: 'your-twilio-auth-token-here',
        PHONE_NUMBER: 'your-twilio-phone-number-here'
    },

    // Google Calendar API Configuration
    GOOGLE_CALENDAR: {
        API_KEY: 'your-google-calendar-api-key-here',
        CLIENT_ID: 'your-google-client-id-here',
        DISCOVERY_DOC: 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
        SCOPES: 'https://www.googleapis.com/auth/calendar'
    },

    // Application Settings
    APP: {
        NAME: 'AI Doctor',
        VERSION: '1.0.0',
        ENVIRONMENT: 'development', // development, staging, production
        DEBUG: true
    },

    // File Upload Settings
    UPLOAD: {
        MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
        ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
        UPLOAD_ENDPOINT: 'http://localhost:3001/api/upload'
    },

    // Notification Settings
    NOTIFICATIONS: {
        PUSH_ENABLED: true,
        SMS_ENABLED: true,
        EMAIL_ENABLED: true,
        REMINDER_INTERVALS: [15, 30, 60] // minutes before medication time
    },

    // Database Configuration (if using a backend)
    DATABASE: {
        HOST: 'localhost',
        PORT: 5432,
        NAME: 'ai_doctor_db',
        USER: 'your-db-username',
        PASSWORD: 'your-db-password'
    }
};

// Export configuration for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}

// Helper function to get API key safely
function getApiKey(service) {
    const key = CONFIG[service]?.API_KEY;
    if (!key || key.includes('your-')) {
        console.warn(`${service} API key not configured properly`);
        return null;
    }
    return key;
}

// Helper function to check if environment is production
function isProduction() {
    return CONFIG.APP.ENVIRONMENT === 'production';
}

// Helper function to log debug messages
function debugLog(message, data = null) {
    if (CONFIG.APP.DEBUG && !isProduction()) {
        console.log(`[${CONFIG.APP.NAME}] ${message}`, data || '');
    }
}