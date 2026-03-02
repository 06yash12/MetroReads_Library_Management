import { PrismaClient } from '@prisma/client';
import { verifyToken, extractToken } from '../utils/auth.js';

const prisma = new PrismaClient();

// Middleware to authenticate user
export const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = verifyToken(token);
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, libraryId: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

// Middleware to check if user is admin or librarian
export const requireAdminOrLibrarian = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'LIBRARIAN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or librarian privileges required.'
    });
  }

  next();
};

// Middleware to check if user is librarian or admin
export const requireLibrarian = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Librarian or Admin privileges required.'
    });
  }

  next();
};

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Middleware to check if user is admin (top level)
export const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Alias for backward compatibility
export const requireOwnerOrAdmin = requireAdmin;

// Middleware to check if user can access library (librarian scope)
export const requireLibraryAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.'
    });
  }

  // Admins have access to all libraries
  if (req.user.role === 'ADMIN') {
    return next();
  }

  // Librarians can only access their assigned library
  if (req.user.role === 'LIBRARIAN') {
    const libraryId = req.params.libraryId || req.params.id;
    
    if (!req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'No library assigned to this librarian.'
      });
    }

    if (libraryId && parseInt(libraryId) !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage your assigned library.'
      });
    }

    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. Insufficient privileges.'
  });
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req.headers.authorization);
    
    if (token) {
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true, libraryId: true }
      });
      
      if (user) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};