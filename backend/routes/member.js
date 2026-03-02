import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.js';
import BookRequest from '../models/BookRequest.js';
import IssueToken from '../models/IssueToken.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to ensure user is a member
const memberAuth = (req, res, next) => {
  if (req.user.role !== 'MEMBER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Members only.'
    });
  }
  next();
};

// Get all cities for library selection
router.get('/cities', authenticate, memberAuth, async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      include: {
        _count: {
          select: { libraries: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const citiesWithCount = cities.map(city => ({
      id: city.id,
      name: city.name,
      state: city.state,
      country: city.country,
      libraryCount: city._count.libraries
    }));

    res.json({
      success: true,
      data: citiesWithCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message
    });
  }
});

// Get libraries in a specific city
router.get('/cities/:cityId/libraries', authenticate, memberAuth, async (req, res) => {
  try {
    const { cityId } = req.params;

    const libraries = await prisma.library.findMany({
      where: { cityId: parseInt(cityId) },
      include: {
        _count: {
          select: {
            bookCopies: true,
            homeLibraryMembers: true
          }
        },
        bookCopies: {
          where: { status: 'AVAILABLE' },
          select: { id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const librariesWithStats = libraries.map(library => ({
      id: library.id,
      name: library.name,
      address: library.address,
      stats: {
        totalBooks: library._count.bookCopies,
        availableBooks: library.bookCopies.length,
        activeMembers: library._count.homeLibraryMembers
      }
    }));

    res.json({
      success: true,
      data: librariesWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch libraries',
      error: error.message
    });
  }
});

// Set member's home library
router.put('/home-library', authenticate, memberAuth, async (req, res) => {
  try {
    const { libraryId } = req.body;

    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required'
      });
    }

    // Verify library exists
    const library = await prisma.library.findUnique({
      where: { id: parseInt(libraryId) },
      include: { city: true }
    });

    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    // Update user's home library
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { homeLibraryId: parseInt(libraryId) },
      include: {
        homeLibrary: {
          include: { city: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Home library updated successfully',
      data: {
        homeLibrary: {
          id: updatedUser.homeLibrary.id,
          name: updatedUser.homeLibrary.name,
          address: updatedUser.homeLibrary.address,
          city: updatedUser.homeLibrary.city
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update home library',
      error: error.message
    });
  }
});

// Get member's current home library
router.get('/home-library', authenticate, memberAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        homeLibrary: {
          include: {
            city: true,
            _count: {
              select: { bookCopies: true }
            }
          }
        }
      }
    });

    if (!user.homeLibrary) {
      return res.json({
        success: true,
        data: null,
        message: 'No home library set'
      });
    }

    // Get available books count
    const availableBooks = await prisma.bookCopy.count({
      where: {
        libraryId: user.homeLibrary.id,
        status: 'AVAILABLE'
      }
    });

    res.json({
      success: true,
      data: {
        id: user.homeLibrary.id,
        name: user.homeLibrary.name,
        address: user.homeLibrary.address,
        city: user.homeLibrary.city,
        stats: {
          totalBooks: user.homeLibrary._count.bookCopies,
          availableBooks
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch home library',
      error: error.message
    });
  }
});

// Get available books in member's library
router.get('/library/:libraryId/books', authenticate, memberAuth, async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { search, limit = 100, offset = 0 } = req.query;

    let bookCopies;

    if (search) {
      // Use raw query for SQLite compatibility
      const searchTerm = `%${search}%`;
      bookCopies = await prisma.$queryRaw`
        SELECT bc.*, b.id as bookId, b.title, b.author, b.description, b.imageUrl, b.isbn
        FROM book_copies bc
        JOIN books b ON bc.bookId = b.id
        WHERE bc.libraryId = ${parseInt(libraryId)}
        AND bc.status = 'AVAILABLE'
        AND (LOWER(b.title) LIKE LOWER(${searchTerm}) OR LOWER(b.author) LIKE LOWER(${searchTerm}))
        ORDER BY b.title ASC
        LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
      `;

      // Format the results to match the expected structure
      bookCopies = bookCopies.map(copy => ({
        id: copy.id,
        copyId: copy.copyId,
        status: copy.status,
        libraryId: copy.libraryId,
        book: {
          id: copy.bookId,
          title: copy.title,
          author: copy.author,
          description: copy.description,
          imageUrl: copy.imageUrl,
          isbn: copy.isbn
        }
      }));
    } else {
      bookCopies = await prisma.bookCopy.findMany({
        where: {
          libraryId: parseInt(libraryId),
          status: 'AVAILABLE'
        },
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              description: true,
              imageUrl: true,
              isbn: true
            }
          }
        },
        orderBy: { book: { title: 'asc' } },
        take: parseInt(limit),
        skip: parseInt(offset)
      });
    }

    // Group by book and show availability
    const booksMap = new Map();
    bookCopies.forEach(copy => {
      const bookId = copy.book.id;
      if (!booksMap.has(bookId)) {
        // Derive correct ISBN from copyId (strip the -1, -2 suffix)
        const derivedIsbn = copy.copyId ? copy.copyId.replace(/-\d+$/, '') : copy.book.isbn;
        booksMap.set(bookId, {
          ...copy.book,
          isbn: derivedIsbn,
          availableCopies: [],
          totalAvailable: 0
        });
      }
      const book = booksMap.get(bookId);
      book.availableCopies.push({
        id: copy.id,
        copyId: copy.copyId
      });
      book.totalAvailable++;
    });

    const books = Array.from(booksMap.values());

    res.json({
      success: true,
      data: books,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: books.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books',
      error: error.message
    });
  }
});

// Submit book request
router.post('/requests', authenticate, memberAuth, async (req, res) => {
  try {
    const { bookCopyId, libraryId, notes } = req.body;

    if (!bookCopyId || !libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Book copy ID and library ID are required'
      });
    }

    const request = await BookRequest.create({
      memberId: req.user.id,
      bookCopyId: parseInt(bookCopyId),
      libraryId: parseInt(libraryId),
      notes
    });

    res.status(201).json({
      success: true,
      data: {
        requestId: request.id,
        status: request.status,
        estimatedProcessingTime: '24-48 hours'
      },
      message: 'Book request submitted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get member's book requests
router.get('/requests', authenticate, memberAuth, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const requests = await BookRequest.findByMember(req.user.id, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const formattedRequests = requests.map(request => ({
      id: request.id,
      book: {
        title: request.bookCopy.book.title,
        author: request.bookCopy.book.author,
        imageUrl: request.bookCopy.book.imageUrl
      },
      library: {
        name: request.library.name,
        address: request.library.address
      },
      status: request.status,
      requestDate: request.requestDate,
      processedDate: request.processedDate,
      rejectionNote: request.rejectionNote,
      pickupDeadline: request.pickupDeadline,
      processedBy: request.processedByUser?.name,
      issueToken: request.issueToken ? {
        qrCode: request.issueToken.qrCode,
        alphanumericCode: request.issueToken.alphanumericCode,
        dueDate: request.issueToken.dueDate,
        status: request.issueToken.status,
        pickupInstructions: 'Visit the library with this code to collect your book'
      } : null
    }));

    res.json({
      success: true,
      data: formattedRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: error.message
    });
  }
});

// Cancel pending request
router.delete('/requests/:requestId', authenticate, memberAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await BookRequest.cancel(
      parseInt(requestId),
      req.user.id
    );

    res.json({
      success: true,
      message: 'Request cancelled successfully',
      data: request
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Get member's active loans
router.get('/loans/active', authenticate, memberAuth, async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      where: {
        userId: req.user.id,
        status: { in: ['ACTIVE', 'OVERDUE'] }
      },
      include: {
        bookCopy: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
                imageUrl: true
              }
            },
            library: {
              select: {
                name: true,
                address: true
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    const formattedLoans = loans.map(loan => ({
      id: loan.id,
      book: loan.bookCopy.book,
      library: loan.bookCopy.library,
      borrowedAt: loan.borrowedAt,
      dueDate: loan.dueDate,
      status: loan.status,
      reissueCount: loan.reissueCount,
      fineAmount: loan.fineAmount,
      canReissue: loan.reissueCount < 2 && loan.status === 'ACTIVE',
      daysUntilDue: Math.ceil((new Date(loan.dueDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    res.json({
      success: true,
      data: formattedLoans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active loans',
      error: error.message
    });
  }
});

// Request loan reissue
router.post('/loans/:loanId/reissue', authenticate, memberAuth, async (req, res) => {
  try {
    const { loanId } = req.params;

    const loan = await prisma.loan.findUnique({
      where: { id: parseInt(loanId) }
    });

    if (!loan) {
      return res.status(404).json({
        success: false,
        message: 'Loan not found'
      });
    }

    if (loan.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Can only reissue active loans'
      });
    }

    if (loan.reissueCount >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Maximum reissue limit reached'
      });
    }

    // Extend due date by 14 days
    const newDueDate = new Date(loan.dueDate);
    newDueDate.setDate(newDueDate.getDate() + 14);

    const updatedLoan = await prisma.loan.update({
      where: { id: parseInt(loanId) },
      data: {
        dueDate: newDueDate,
        reissueCount: loan.reissueCount + 1
      }
    });

    // Log transaction
    await prisma.loanTransaction.create({
      data: {
        loanId: updatedLoan.id,
        transactionType: 'REISSUE',
        memberId: req.user.id,
        bookCopyId: loan.bookCopyId,
        libraryId: 1, // Will need to get from book copy
        dueDate: newDueDate,
        notes: 'Loan reissued by member'
      }
    });

    res.json({
      success: true,
      message: 'Loan reissued successfully',
      data: {
        newDueDate,
        reissueCount: updatedLoan.reissueCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reissue loan',
      error: error.message
    });
  }
});

// Request book return
router.post('/loans/:loanId/return-request', authenticate, memberAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { notes } = req.body;

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

    if (loan.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (loan.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: 'Can only request return for active loans'
      });
    }

    // Log return request
    await prisma.loanTransaction.create({
      data: {
        loanId: loan.id,
        transactionType: 'RETURN',
        memberId: req.user.id,
        bookCopyId: loan.bookCopyId,
        libraryId: loan.bookCopy.libraryId,
        notes: `Return requested by member: ${notes || 'No notes'}`
      }
    });

    res.json({
      success: true,
      message: 'Return request submitted successfully. Please visit the library to complete the return.',
      data: {
        library: {
          name: loan.bookCopy.library.name,
          address: loan.bookCopy.library.address
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit return request',
      error: error.message
    });
  }
});

// Get loan history
router.get('/loans/history', authenticate, memberAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const loans = await prisma.loan.findMany({
      where: { userId: req.user.id },
      include: {
        bookCopy: {
          include: {
            book: {
              select: {
                title: true,
                author: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const formattedLoans = loans.map(loan => ({
      id: loan.id,
      book: loan.bookCopy.book,
      borrowedAt: loan.borrowedAt,
      dueDate: loan.dueDate,
      returnedAt: loan.returnedAt,
      status: loan.status,
      fineAmount: loan.fineAmount,
      reissueCount: loan.reissueCount
    }));

    res.json({
      success: true,
      data: formattedLoans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan history',
      error: error.message
    });
  }
});

export default router;