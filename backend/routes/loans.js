import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireAdminOrLibrarian, requireOwnerOrAdmin } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/loans/borrow - Borrow a book (member only)
router.post('/borrow', authenticate, async (req, res) => {
  try {
    const { bookCopyId } = req.body;
    const userId = req.user.id;

    if (!bookCopyId) {
      return res.status(400).json({
        success: false,
        message: 'Book copy ID is required'
      });
    }

    const bookCopy = await prisma.bookCopy.findUnique({
      where: { id: parseInt(bookCopyId) },
      include: { book: true }
    });

    if (!bookCopy) {
      return res.status(404).json({
        success: false,
        message: 'Book copy not found'
      });
    }

    if (bookCopy.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'Book copy is not available'
      });
    }

    // Check if member already has an active loan for the same book title
    const existingLoan = await prisma.loan.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        bookCopy: { bookId: bookCopy.bookId }
      },
      include: { bookCopy: { include: { book: true } } }
    });

    if (existingLoan) {
      return res.status(400).json({
        success: false,
        message: `You already have an active loan for "${existingLoan.bookCopy.book.title}". Please return it before borrowing again.`
      });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period

    const loan = await prisma.loan.create({
      data: {
        userId,
        bookCopyId: parseInt(bookCopyId),
        dueDate,
        status: 'ACTIVE'
      },
      include: {
        bookCopy: {
          include: {
            book: true,
            library: true
          }
        }
      }
    });

    await prisma.bookCopy.update({
      where: { id: parseInt(bookCopyId) },
      data: { status: 'LOANED' }
    });

    res.status(201).json({
      success: true,
      message: 'Book borrowed successfully',
      data: loan
    });
  } catch (error) {
    console.error('Borrow error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to borrow book'
    });
  }
});

// POST /api/loans/:id/return - Return a book (admin/librarian only)
router.post('/:id/return', authenticate, requireAdminOrLibrarian, async (req, res) => {
  try {
    const { id } = req.params;

    const existingLoan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: { bookCopy: true }
    });

    if (!existingLoan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (existingLoan.status === 'RETURNED') {
      return res.status(400).json({
        success: false,
        message: 'Book already returned'
      });
    }

    const loan = await prisma.loan.update({
      where: { id: parseInt(id) },
      data: {
        returnedAt: new Date(),
        status: 'RETURNED'
      },
      include: {
        bookCopy: {
          include: {
            book: true,
            library: true
          }
        }
      }
    });

    await prisma.bookCopy.update({
      where: { id: existingLoan.bookCopyId },
      data: { status: 'AVAILABLE' }
    });

    res.status(200).json({
      success: true,
      message: 'Book returned successfully',
      data: loan
    });
  } catch (error) {
    console.error('Return error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to return book'
    });
  }
});

// GET /api/loans/my-loans - Get current user's active loans
router.get('/my-loans', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const loans = await prisma.loan.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        bookCopy: {
          include: {
            book: true,
            library: true
          }
        }
      },
      orderBy: { borrowedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get user loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your loans'
    });
  }
});

// GET /api/loans/my-history - Get current user's loan history
router.get('/my-history', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const loans = await prisma.loan.findMany({
      where: { userId },
      include: {
        bookCopy: {
          include: {
            book: true,
            library: true
          }
        }
      },
      orderBy: { borrowedAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get user loan history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan history'
    });
  }
});

// GET /api/loans/active - Get all active loans (admin/librarian)
router.get('/active', authenticate, requireAdminOrLibrarian, async (req, res) => {
  try {
    let loans;

    if (req.user.role === 'ADMIN') {
      loans = await prisma.loan.findMany({
        where: { status: 'ACTIVE' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bookCopy: {
            include: {
              book: true,
              library: true
            }
          }
        },
        orderBy: { borrowedAt: 'desc' }
      });
    } else if (req.user.role === 'LIBRARIAN') {
      if (!req.user.libraryId) {
        return res.status(403).json({
          success: false,
          message: 'No library assigned to this librarian'
        });
      }
      loans = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          bookCopy: {
            libraryId: req.user.libraryId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bookCopy: {
            include: {
              book: true,
              library: true
            }
          }
        },
        orderBy: { borrowedAt: 'desc' }
      });
    }

    res.status(200).json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get active loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active loans'
    });
  }
});

// GET /api/loans/overdue - Get overdue loans (admin/librarian)
router.get('/overdue', authenticate, requireAdminOrLibrarian, async (req, res) => {
  try {
    let loans;
    const now = new Date();

    if (req.user.role === 'ADMIN') {
      loans = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          dueDate: {
            lt: now
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bookCopy: {
            include: {
              book: true,
              library: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });
    } else if (req.user.role === 'LIBRARIAN') {
      if (!req.user.libraryId) {
        return res.status(403).json({
          success: false,
          message: 'No library assigned to this librarian'
        });
      }
      loans = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          dueDate: {
            lt: now
          },
          bookCopy: {
            libraryId: req.user.libraryId
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          bookCopy: {
            include: {
              book: true,
              library: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });
    }

    res.status(200).json({
      success: true,
      data: loans
    });
  } catch (error) {
    console.error('Get overdue loans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue loans'
    });
  }
});

// GET /api/loans/:id - Get loan by ID (admin/librarian)
router.get('/:id', authenticate, requireAdminOrLibrarian, async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        bookCopy: {
          include: {
            book: true,
            library: true
          }
        }
      }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    res.status(200).json({
      success: true,
      data: loan
    });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan'
    });
  }
});

export default router;
