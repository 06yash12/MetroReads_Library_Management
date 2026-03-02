import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdminOrLibrarian } from '../middleware/auth.js';
import BookRequest from '../models/BookRequest.js';
import IssueToken from '../models/IssueToken.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to ensure user is a librarian or admin
const librarianAuth = (req, res, next) => {
  if (req.user.role !== 'LIBRARIAN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied. Librarians only.' 
    });
  }
  next();
};

// Get pending requests for librarian's library
router.get('/requests/pending', authenticate, librarianAuth, async (req, res) => {
  try {
    let libraryId;
    
    // Admin can see all libraries, librarian only their assigned library
    if (req.user.role === 'ADMIN') {
      libraryId = req.query.libraryId ? parseInt(req.query.libraryId) : null;
    } else {
      libraryId = req.user.libraryId;
    }
    
    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required'
      });
    }
    
    const requests = await BookRequest.findByLibrary(libraryId, {
      status: 'PENDING',
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0
    });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Failed to fetch pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending requests',
      error: error.message
    });
  }
});

// Get all requests for librarian's library (with status filter)
router.get('/requests', authenticate, librarianAuth, async (req, res) => {
  try {
    let libraryId;
    
    // Admin can see all libraries, librarian only their assigned library
    if (req.user.role === 'ADMIN') {
      libraryId = req.query.libraryId ? parseInt(req.query.libraryId) : null;
    } else {
      libraryId = req.user.libraryId;
    }
    
    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required'
      });
    }
    
    const { status, limit = 50, offset = 0 } = req.query;
    
    const requests = await BookRequest.findByLibrary(libraryId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Failed to fetch requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

// Approve a book request
router.post('/requests/:requestId/approve', authenticate, librarianAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    
    // Verify request belongs to librarian's library (unless admin)
    const request = await prisma.bookRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { library: true }
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check library access
    if (req.user.role === 'LIBRARIAN' && request.libraryId !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage requests for your library.'
      });
    }
    
    const result = await BookRequest.approve(parseInt(requestId), req.user.id, notes);
    
    res.json({
      success: true,
      message: 'Request approved successfully',
      data: {
        request: result.request,
        issueToken: {
          qrCode: result.issueToken.qrCode,
          alphanumericCode: result.issueToken.alphanumericCode,
          dueDate: result.issueToken.dueDate,
          pickupDeadline: result.request.pickupDeadline
        }
      }
    });
  } catch (error) {
    console.error('Failed to approve request:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Reject a book request
router.post('/requests/:requestId/reject', authenticate, librarianAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { rejectionNote } = req.body;
    
    if (!rejectionNote || rejectionNote.trim().length === 0) {
      rejectionNote = 'Request rejected by librarian';
    }
    
    // Verify request belongs to librarian's library (unless admin)
    const request = await prisma.bookRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { library: true }
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Check library access
    if (req.user.role === 'LIBRARIAN' && request.libraryId !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only manage requests for your library.'
      });
    }
    
    const result = await BookRequest.reject(parseInt(requestId), req.user.id, rejectionNote);
    
    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: result
    });
  } catch (error) {
    console.error('Failed to reject request:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Verify QR code or alphanumeric code
router.post('/verify-code', authenticate, librarianAuth, async (req, res) => {
  try {
    const { code, verificationType = 'ALPHANUMERIC', expectedBook } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Code is required'
      });
    }
    
    const result = await IssueToken.verify(code, verificationType);
    
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    // Check if token belongs to librarian's library (unless admin)
    if (req.user.role === 'LIBRARIAN' && result.library.id !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'This code is for a different library'
      });
    }
    
    // Check if the code matches the expected book (if provided)
    if (expectedBook) {
      const bookMatches = result.book.title.toLowerCase() === expectedBook.title.toLowerCase() &&
                         result.book.author.toLowerCase() === expectedBook.author.toLowerCase();
      
      if (!bookMatches) {
        return res.status(400).json({
          success: false,
          message: `This pickup code is for "${result.book.title}" by ${result.book.author}, but you're trying to verify it for "${expectedBook.title}" by ${expectedBook.author}. Please use the correct pickup code for this book.`
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        valid: true,
        tokenId: result.token.id,
        member: result.member,
        book: result.book,
        library: result.library,
        dueDate: result.dueDate,
        issueDate: result.token.issueDate
      }
    });
  } catch (error) {
    console.error('Failed to verify code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify code',
      error: error.message
    });
  }
});

// Complete book issuance after code verification
router.post('/complete-issue', authenticate, librarianAuth, async (req, res) => {
  try {
    const { tokenId, notes } = req.body;
    
    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Token ID is required'
      });
    }
    
    // Verify token belongs to librarian's library (unless admin)
    const token = await prisma.issueToken.findUnique({
      where: { id: parseInt(tokenId) },
      include: {
        request: {
          include: { library: true }
        }
      }
    });
    
    if (!token) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    if (req.user.role === 'LIBRARIAN' && token.request.libraryId !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'This token is for a different library'
      });
    }
    
    // Mark token as verified first
    await IssueToken.markVerified(parseInt(tokenId), req.user.id);
    
    // Complete the issuance
    const result = await IssueToken.completeIssuance(parseInt(tokenId), req.user.id, notes);
    
    res.json({
      success: true,
      message: 'Book issued successfully',
      data: {
        loanId: result.loan.id,
        dueDate: result.loan.dueDate,
        issuedAt: result.loan.borrowedAt
      }
    });
  } catch (error) {
    console.error('Failed to complete issuance:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Request return from member (notify via transaction log)
router.post('/loans/:loanId/request-return', authenticate, librarianAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { notes } = req.body;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        bookCopy: { include: { library: true } },
        user: true
      }
    });

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (req.user.role === 'LIBRARIAN' && loan.bookCopy.libraryId !== req.user.libraryId) {
      return res.status(403).json({ success: false, message: 'Access denied for this library' });
    }

    const tx = await prisma.loanTransaction.create({
      data: {
        loanId: loan.id,
        transactionType: 'RETURN',
        memberId: loan.userId,
        bookCopyId: loan.bookCopyId,
        libraryId: loan.bookCopy.libraryId,
        processedBy: req.user.id,
        notes: notes && notes.trim() ? notes.trim() : 'Please return this book at the earliest.'
      }
    });

    res.json({ success: true, message: 'Return request sent to member', data: { transactionId: tx.id } });
  } catch (error) {
    console.error('Failed to request return:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get approved requests awaiting pickup
router.get('/pending-issues', authenticate, librarianAuth, async (req, res) => {
  try {
    let libraryId;
    
    // Admin can see all libraries, librarian only their assigned library
    if (req.user.role === 'ADMIN') {
      libraryId = req.query.libraryId ? parseInt(req.query.libraryId) : null;
    } else {
      libraryId = req.user.libraryId;
    }
    
    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required'
      });
    }
    
    const pendingIssues = await prisma.bookRequest.findMany({
      where: {
        libraryId,
        status: 'APPROVED',
        pickupDeadline: {
          gte: new Date() // Not yet expired
        },
        // Exclude requests that have already been fully issued
        NOT: {
          issueToken: {
            is: {
              status: 'ISSUED'
            }
          }
        }
      },
      include: {
        member: {
          select: { id: true, name: true, email: true, phone: true }
        },
        bookCopy: {
          include: {
            book: { select: { title: true, author: true } }
          }
        },
        issueToken: {
          select: {
            alphanumericCode: true,
            qrCode: true,
            dueDate: true,
            status: true
          }
        }
      },
      orderBy: { pickupDeadline: 'asc' }
    });
    
    const formattedIssues = pendingIssues.map(issue => ({
      id: issue.id,
      member: issue.member,
      book: {
        title: issue.bookCopy.book.title,
        author: issue.bookCopy.book.author
      },
      approvedDate: issue.processedDate,
      pickupDeadline: issue.pickupDeadline,
      issueToken: issue.issueToken,
      hoursLeft: Math.max(0, Math.ceil((new Date(issue.pickupDeadline) - new Date()) / (1000 * 60 * 60)))
    }));
    
    res.json({
      success: true,
      data: formattedIssues
    });
  } catch (error) {
    console.error('Failed to fetch pending issues:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending issues',
      error: error.message
    });
  }
});

// Process book return
router.post('/process-return', authenticate, librarianAuth, async (req, res) => {
  try {
    const { loanId, condition = 'GOOD', fineAmount = 0, notes } = req.body;
    
    if (!loanId) {
      return res.status(400).json({
        success: false,
        message: 'Loan ID is required'
      });
    }
    
    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) },
      include: {
        bookCopy: {
          include: { library: true }
        }
      }
    });
    
    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }
    
    // Check library access
    if (req.user.role === 'LIBRARIAN' && loan.bookCopy.libraryId !== req.user.libraryId) {
      return res.status(403).json({
        success: false,
        message: 'This loan is for a different library'
      });
    }
    
    if (loan.status === 'RETURNED') {
      return res.status(400).json({
        success: false,
        message: 'This loan has already been returned'
      });
    }
    
    // Calculate fine if overdue
    let calculatedFine = parseFloat(fineAmount) || 0;
    const now = new Date();
    const dueDate = new Date(loan.dueDate);
    
    if (now > dueDate && calculatedFine === 0) {
      const daysOverdue = Math.ceil((now - dueDate) / (1000 * 60 * 60 * 24));
      calculatedFine = daysOverdue * 1.0; // $1 per day fine
    }
    
    // Update loan status
    const updatedLoan = await prisma.loan.update({
      where: { id: parseInt(loanId) },
      data: {
        status: 'RETURNED',
        returnedAt: now,
        fineAmount: calculatedFine
      }
    });
    
    // Update book copy status
    await prisma.bookCopy.update({
      where: { id: loan.bookCopyId },
      data: {
        status: 'AVAILABLE',
        reservedBy: null,
        reservedUntil: null
      }
    });
    
    // Log transaction
    await prisma.loanTransaction.create({
      data: {
        loanId: updatedLoan.id,
        transactionType: 'RETURN',
        memberId: loan.userId,
        bookCopyId: loan.bookCopyId,
        libraryId: loan.bookCopy.libraryId,
        processedBy: req.user.id,
        fineAmount: calculatedFine,
        notes: `Book returned in ${condition} condition. ${notes || ''}`
      }
    });
    
    res.json({
      success: true,
      message: 'Book return processed successfully',
      data: {
        loanId: updatedLoan.id,
        returnedAt: updatedLoan.returnedAt,
        fineAmount: calculatedFine,
        condition
      }
    });
  } catch (error) {
    console.error('Failed to process return:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process return',
      error: error.message
    });
  }
});

// Get overdue books for library
router.get('/overdue-books', authenticate, librarianAuth, async (req, res) => {
  try {
    let libraryId;
    
    // Admin can see all libraries, librarian only their assigned library
    if (req.user.role === 'ADMIN') {
      libraryId = req.query.libraryId ? parseInt(req.query.libraryId) : null;
    } else {
      libraryId = req.user.libraryId;
    }
    
    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required'
      });
    }
    
    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: 'ACTIVE',
        dueDate: {
          lt: new Date()
        },
        bookCopy: {
          libraryId
        }
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true }
        },
        bookCopy: {
          include: {
            book: { select: { title: true, author: true } }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
    
    const formattedOverdue = overdueLoans.map(loan => {
      const daysOverdue = Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
      const estimatedFine = daysOverdue * 1.0; // $1 per day
      
      return {
        id: loan.id,
        member: loan.user,
        book: {
          title: loan.bookCopy.book.title,
          author: loan.bookCopy.book.author
        },
        borrowedAt: loan.borrowedAt,
        dueDate: loan.dueDate,
        daysOverdue,
        estimatedFine,
        currentFine: loan.fineAmount
      };
    });
    
    res.json({
      success: true,
      data: formattedOverdue
    });
  } catch (error) {
    console.error('Failed to fetch overdue books:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue books',
      error: error.message
    });
  }
});

// GET /api/librarian/activity-history - Loan transaction history for the library
router.get('/activity-history', authenticate, librarianAuth, async (req, res) => {
  try {
    let libraryId;
    if (req.user.role === 'ADMIN' && req.query.libraryId) {
      libraryId = parseInt(req.query.libraryId);
    } else {
      libraryId = req.user.libraryId;
    }

    const limit = parseInt(req.query.limit) || 50;

    const transactions = await prisma.loanTransaction.findMany({
      where: { libraryId },
      orderBy: { transactionDate: 'desc' },
      take: limit,
      include: {
        member: { select: { id: true, name: true, email: true } },
        bookCopy: {
          include: { book: { select: { title: true, author: true } } }
        },
        processedByUser: { select: { id: true, name: true } }
      }
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Failed to fetch activity history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activity history', error: error.message });
  }
});

// POST /api/librarian/requests/:requestId/cancel-pickup - Cancel an approved pickup
router.post('/requests/:requestId/cancel-pickup', authenticate, librarianAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const request = await prisma.bookRequest.findUnique({
      where: { id: parseInt(requestId) },
      include: { bookCopy: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!['APPROVED', 'PENDING'].includes(request.status)) {
      return res.status(400).json({ success: false, message: 'Request cannot be cancelled in its current state' });
    }

    await prisma.$transaction(async (tx) => {
      // Update request to REJECTED/cancelled
      await tx.bookRequest.update({
        where: { id: parseInt(requestId) },
        data: {
          status: 'REJECTED',
          rejectionNote: reason || 'Pickup cancelled by librarian',
          processedDate: new Date(),
          processedBy: req.user.id
        }
      });

      // Free up the book copy back to AVAILABLE
      await tx.bookCopy.update({
        where: { id: request.bookCopyId },
        data: { status: 'AVAILABLE', reservedBy: null, reservedUntil: null }
      });

      // Expire any issue token
      if (request.issueToken) {
        await tx.issueToken.updateMany({
          where: { requestId: parseInt(requestId) },
          data: { status: 'EXPIRED' }
        });
      }
    });

    res.json({ success: true, message: 'Pickup cancelled successfully' });
  } catch (error) {
    console.error('Failed to cancel pickup:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel pickup', error: error.message });
  }
});

export default router;