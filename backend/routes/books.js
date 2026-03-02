import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, requireLibrarian, optionalAuth } from '../middleware/auth.js';
import CodeGenerator from '../services/CodeGenerator.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/books/preview-isbn/:libraryId - Preview ISBN for new book
router.get('/preview-isbn/:libraryId', authenticate, requireLibrarian, async (req, res) => {
  try {
    const { libraryId } = req.params;
    const { totalCopies = 1 } = req.query;

    if (!libraryId || isNaN(parseInt(libraryId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    // Get library details
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

    // Generate ISBN preview
    const isbn = await CodeGenerator.generateISBN(parseInt(libraryId));
    
    // Generate copy IDs preview
    const copies = [];
    for (let i = 1; i <= parseInt(totalCopies); i++) {
      copies.push(`${isbn}-${i}`);
    }

    res.json({
      success: true,
      data: {
        libraryCode: library.libraryCode,
        libraryName: library.name,
        cityName: library.city.name,
        isbn,
        copies,
        totalCopies: parseInt(totalCopies)
      }
    });
  } catch (error) {
    console.error('Error previewing ISBN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to preview ISBN',
      error: error.message
    });
  }
});

// GET /api/books/library/:libraryId/status - Get detailed book status for a library (MUST BE BEFORE /:id)
router.get('/library/:libraryId/status', authenticate, async (req, res) => {
  try {
    const { libraryId } = req.params;
    
    if (!libraryId || isNaN(parseInt(libraryId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    // Check if user has access to this library
    if (req.user.role === 'LIBRARIAN' && req.user.libraryId !== parseInt(libraryId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your assigned library.'
      });
    }

    // Get all book copies for this library with book details
    const bookCopies = await prisma.bookCopy.findMany({
      where: { libraryId: parseInt(libraryId) },
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
      orderBy: {
        book: { title: 'asc' }
      }
    });

    // Group by book and calculate status
    const booksMap = new Map();
    
    bookCopies.forEach(copy => {
      const bookId = copy.book.id;
      if (!booksMap.has(bookId)) {
        // Derive correct ISBN from copyId (strip the -1, -2 suffix)
        const derivedIsbn = copy.copyId ? copy.copyId.replace(/-\d+$/, '') : copy.book.isbn;
        booksMap.set(bookId, {
          ...copy.book,
          isbn: derivedIsbn,
          totalCopies: 0,
          available: 0,
          loaned: 0,
          reserved: 0,
          maintenance: 0,
          lost: 0,
          copies: []
        });
      }
      
      const book = booksMap.get(bookId);
      book.totalCopies++;
      book.copies.push({
        id: copy.id,
        copyId: copy.copyId,
        status: copy.status
      });
      
      // Count by status
      switch (copy.status) {
        case 'AVAILABLE':
          book.available++;
          break;
        case 'LOANED':
          book.loaned++;
          break;
        case 'RESERVED':
          book.reserved++;
          break;
        case 'MAINTENANCE':
          book.maintenance++;
          break;
        case 'LOST':
          book.lost++;
          break;
      }
    });

    const books = Array.from(booksMap.values());

    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Error fetching library book status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library book status',
      error: error.message
    });
  }
});

// GET /api/books - Get all books with optional search (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { search } = req.query;
    
    let books;
    
    if (search) {
      // SQLite doesn't support case-insensitive mode, so we'll use LIKE
      const searchTerm = `%${search}%`;
      books = await prisma.$queryRaw`
        SELECT DISTINCT b.* FROM books b
        WHERE LOWER(b.title) LIKE LOWER(${searchTerm})
        OR LOWER(b.author) LIKE LOWER(${searchTerm})
        OR LOWER(b.isbn) LIKE LOWER(${searchTerm})
      `;
      
      // Fetch copies for each book
      for (const book of books) {
        book.copies = await prisma.bookCopy.findMany({
          where: { bookId: book.id },
          select: {
            id: true,
            status: true,
            library: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }
    } else {
      books = await prisma.book.findMany({
        include: {
          copies: {
            select: {
              id: true,
              status: true,
              library: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
    }
    
    res.status(200).json({
      success: true,
      count: books.length,
      data: books
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch books',
      error: error.message
    });
  }
});

// GET /api/books/:id/availability - Get book availability across libraries
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const copies = await prisma.bookCopy.findMany({
      where: { bookId: parseInt(id) },
      include: {
        library: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });
    
    const availability = copies.reduce((acc, copy) => {
      const libraryId = copy.library.id;
      if (!acc[libraryId]) {
        acc[libraryId] = {
          library: copy.library,
          total: 0,
          available: 0,
          loaned: 0,
          reserved: 0
        };
      }
      acc[libraryId].total++;
      if (copy.status === 'AVAILABLE') acc[libraryId].available++;
      if (copy.status === 'LOANED') acc[libraryId].loaned++;
      if (copy.status === 'RESERVED') acc[libraryId].reserved++;
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: Object.values(availability)
    });
  } catch (error) {
    console.error('Error fetching book availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book availability',
      error: error.message
    });
  }
});

// GET /api/books/:id - Get book by ID (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        copies: {
          include: {
            library: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        }
      }
    });
    
    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(200).json({
      success: true,
      data: book
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book',
      error: error.message
    });
  }
});

// POST /api/books - Create new book (librarian or admin)
router.post('/', authenticate, requireLibrarian, async (req, res) => {
  try {
    const { title, author, description, imageUrl, totalCopies } = req.body;

    console.log(`[REQUEST] Create book | User: ${req.user.email} | Role: ${req.user.role}`);

    // Validation
    if (!title || !author) {
      return res.status(400).json({
        success: false,
        message: 'Title and author are required'
      });
    }

    if (totalCopies && (isNaN(parseInt(totalCopies)) || parseInt(totalCopies) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Total copies must be a non-negative number'
      });
    }

    // For librarians, check if they have a library assigned
    if (req.user.role === 'LIBRARIAN' && !req.user.libraryId) {
      return res.status(400).json({
        success: false,
        message: 'No library assigned to this librarian'
      });
    }

    // Generate ISBN automatically based on library
    const libraryId = req.user.role === 'LIBRARIAN' ? req.user.libraryId : req.body.libraryId;
    
    if (!libraryId) {
      return res.status(400).json({
        success: false,
        message: 'Library ID is required for ISBN generation'
      });
    }

    const isbn = await CodeGenerator.generateISBN(parseInt(libraryId));

    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author.trim(),
        description: description?.trim() || null,
        isbn,
        imageUrl: imageUrl?.trim() || null,
        totalCopies: parseInt(totalCopies) || 0
      }
    });

    // If totalCopies > 0, create book copies automatically
    if (parseInt(totalCopies) > 0) {
      const copies = [];
      for (let i = 1; i <= parseInt(totalCopies); i++) {
        const copyId = `${isbn}-${i}`;
        copies.push({
          copyId,
          bookId: book.id,
          libraryId: parseInt(libraryId),
          status: 'AVAILABLE'
        });
      }

      await prisma.bookCopy.createMany({
        data: copies
      });

      console.log(`[SUCCESS] Created ${totalCopies} copies for book "${title}"`);
    }

    console.log(`[SUCCESS] Book created | ISBN: ${isbn} | Title: "${title}" | Author: "${author}"`);

    res.status(201).json({
      success: true,
      message: `Book created successfully with ISBN: ${isbn}`,
      data: book
    });
  } catch (error) {
    console.error(`[ERROR] Book creation failed | ${error.message}`);
    
    if (error.code === 'P2002') {
      const field = error.meta?.target?.includes('isbn') ? 'ISBN' : 'field';
      return res.status(400).json({
        success: false,
        message: `Duplicate ${field}: A book with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create book',
      error: error.message
    });
  }
});

// PUT /api/books/:id - Update book (admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const { title, author, description, isbn, imageUrl, totalCopies } = req.body;

    // Validation
    if (totalCopies && (isNaN(parseInt(totalCopies)) || parseInt(totalCopies) < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Total copies must be a non-negative number'
      });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (author) updateData.author = author.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (isbn !== undefined) updateData.isbn = isbn?.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim();
    if (totalCopies !== undefined) updateData.totalCopies = parseInt(totalCopies) || 0;

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: 'Book updated successfully',
      data: book
    });
  } catch (error) {
    console.error('Error updating book:', error);
    
    if (error.code === 'P2002' && error.meta?.target?.includes('isbn')) {
      return res.status(400).json({
        success: false,
        message: 'A book with this ISBN already exists'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update book',
      error: error.message
    });
  }
});

// DELETE /api/books/:id - Delete book (librarian or admin)
router.delete('/:id', authenticate, requireLibrarian, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    // Get the book to check which library it belongs to
    const book = await prisma.book.findUnique({
      where: { id: parseInt(id) },
      include: {
        copies: {
          select: {
            libraryId: true
          },
          take: 1
        }
      }
    });

    if (!book) {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }

    // If user is a librarian, check if the book belongs to their library
    if (req.user.role === 'LIBRARIAN') {
      const bookLibraryId = book.copies[0]?.libraryId;
      if (bookLibraryId !== req.user.libraryId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete books from your assigned library.'
        });
      }
    }

    // Delete all book copies first
    await prisma.bookCopy.deleteMany({
      where: { bookId: parseInt(id) }
    });

    // Then delete the book
    await prisma.book.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Book not found'
      });
    }
    
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book: it has associated loans'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete book',
      error: error.message
    });
  }
});

// GET /api/books/:id/availability - Get book availability across libraries
router.get('/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid book ID'
      });
    }

    const copies = await prisma.bookCopy.findMany({
      where: { bookId: parseInt(id) },
      include: {
        library: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });
    
    const availability = copies.reduce((acc, copy) => {
      const libraryId = copy.library.id;
      if (!acc[libraryId]) {
        acc[libraryId] = {
          library: copy.library,
          total: 0,
          available: 0,
          loaned: 0,
          reserved: 0
        };
      }
      acc[libraryId].total++;
      if (copy.status === 'AVAILABLE') acc[libraryId].available++;
      if (copy.status === 'LOANED') acc[libraryId].loaned++;
      if (copy.status === 'RESERVED') acc[libraryId].reserved++;
      return acc;
    }, {});
    
    res.status(200).json({
      success: true,
      data: Object.values(availability)
    });
  } catch (error) {
    console.error('Error fetching book availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch book availability',
      error: error.message
    });
  }
});

export default router;