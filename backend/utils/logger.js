/**
 * Centralized logging utility for consistent log formatting
 */

const LOG_LEVELS = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  ERROR: 'ERROR',
  WARN: 'WARN',
  DEBUG: 'DEBUG'
};

class Logger {
  static formatMessage(level, category, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${category}] ${message}`;
  }

  static info(category, message) {
    console.log(`[${category}] ${message}`);
  }

  static success(category, message) {
    console.log(`[${category}] ✓ ${message}`);
  }

  static error(category, message, error = null) {
    if (error) {
      console.error(`[${category}] ✗ ${message} | ${error.message || error}`);
    } else {
      console.error(`[${category}] ✗ ${message}`);
    }
  }

  static warn(category, message) {
    console.warn(`[${category}] ⚠ ${message}`);
  }

  static debug(category, message) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${category}] [DEBUG] ${message}`);
    }
  }

  // Request logging
  static request(method, path, user = null) {
    const userInfo = user ? `User: ${user.email} (${user.role})` : 'Anonymous';
    console.log(`[REQUEST] ${method} ${path} | ${userInfo}`);
  }

  // Database operation logging
  static db(operation, details) {
    console.log(`[DATABASE] ${operation} | ${details}`);
  }

  // Authentication logging
  static auth(action, details) {
    console.log(`[AUTH] ${action} | ${details}`);
  }
}

export default Logger;
