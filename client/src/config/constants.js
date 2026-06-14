/**
 * Application Configuration Constants
 * Centralized location for all hardcoded values and constants
 */

// ===== GEMINI AI CONFIGURATION =====
export const GEMINI_CONFIG = {
  MODEL_NAME: 'gemini-2.5-flash',
  // Model alternatives (for easy switching):
  // - 'gemini-2.5-flash' (recommended, latest stable)
  // - 'gemini-1.5-flash' (older stable version)
  // - 'gemini-2.0-flash-exp' (experimental, may have quota issues)
};

// ===== MACRO TARGET PRESETS =====
// Note: These are sample presets for demonstration.
// Users should use the calculator for personalized targets.
// Formulas used:
// - Deficit: -500 cal from maintenance, 2.0g/kg protein (preserve muscle), 25% fat
// - Maintenance: BMR × activity level, 1.6g/kg protein, 27.5% fat  
// - Bulking: +300 cal from maintenance, 1.8g/kg protein, 30% fat
export const MACRO_TARGET_PRESETS = {
  deficit: {
    calories: 1700,
    protein: 150,
    carbs: 140,
    fat: 60
  },
  maintenance: {
    calories: 2200,
    protein: 140,
    carbs: 210,
    fat: 80
  },
  bulking: {
    calories: 2500,
    protein: 150,
    carbs: 250,
    fat: 95
  }
};

// ===== DEFAULT VALUES =====
export const DEFAULT_MACRO_TARGETS = {
  calories: 2000,
  protein: 140,
  carbs: 200,
  fat: 100
};

// ===== UI CONFIGURATION =====
export const UI_CONFIG = {
  BOTTOM_NAV_ICONS_REGULAR: 5,  // Number of bottom navigation icons for regular users
  BOTTOM_NAV_ICONS_ADMIN: 7,    // Number of bottom navigation icons for admin users
  PROGRESS_BAR_MAX_PERCENT: 100,
  SNACKBAR_AUTO_HIDE_DURATION: 6000, // milliseconds
};

// ===== SEMANTIC SEARCH CONFIGURATION =====
export const SEARCH_CONFIG = {
  MAX_ITEMS_FOR_SEMANTIC_SEARCH: 5, // Only use semantic search if database has <= this many items
  MIN_WORD_LENGTH_FOR_MATCHING: 2,  // Minimum word length for word-based matching
};

// ===== FIREBASE COLLECTION NAMES =====
export const FIREBASE_COLLECTIONS = {
  DAILY_FOOD_LOG: 'daily_food_log',
  FOOD_CALORIE_MASTER: 'food_calorie_master',
  WEIGHTS: 'weights',
  MACRO_TARGETS: 'macro_targets',
  USERS: 'users',
  ADMIN_USERS: 'admin_users',
  CALORIES_BURNT_LOG: 'calories_burnt_log'
};

// ===== DATE FORMATS =====
export const DATE_FORMATS = {
  FIREBASE_DATE: 'yyyy-MM-dd',      // Format used for Firestore date storage
  DISPLAY_DATE: 'MMM dd, yyyy',     // Format for displaying dates to users
};

// ===== WEIGHT LOG CONFIGURATION =====
export const WEIGHT_CONFIG = {
  DEFAULT_DAYS_TO_SHOW: 30,  // Default number of days to show in weight history
  UNIT_KG: 'kg',
  UNIT_LBS: 'lbs',
};

// ===== COPYRIGHT INFO =====
export const APP_INFO = {
  AUTHOR: 'Raj Kumar Pandit',
  START_YEAR: 2025,
  APP_NAME: 'Macro Tracker & Planner'
};

// ===== API RATE LIMIT HANDLING =====
export const API_CONFIG = {
  RETRY_DELAY_SECONDS: 5,  // Seconds to wait before retrying after rate limit
  MAX_RETRY_ATTEMPTS: 3,   // Maximum number of retry attempts
};
