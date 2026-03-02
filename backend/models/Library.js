import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class Library {
  static async findAll() {
    return await prisma.library.findMany({
      include: {
        city: true,
        _count: {
          select: {
            bookCopies: true,
            librarians: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async findById(id) {
    return await prisma.library.findUnique({
      where: { id: parseInt(id) },
      include: {
        city: true,
        librarians: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            bookCopies: true,
            homeLibraryMembers: true
          }
        }
      }
    });
  }

  static async findByCity(cityId) {
    return await prisma.library.findMany({
      where: { cityId: parseInt(cityId) },
      include: {
        city: true,
        _count: {
          select: {
            bookCopies: true,
            librarians: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async create(data) {
    try {
      console.log('Library.create called with data:', data);
      
      // Verify city exists
      const city = await prisma.city.findUnique({
        where: { id: data.cityId }
      });

      console.log('City lookup result:', city);

      if (!city) {
        throw new Error('City not found');
      }

      const library = await prisma.library.create({
        data,
        include: {
          city: true
        }
      });

      console.log('Library created successfully:', library);
      return library;
    } catch (error) {
      console.error('Error in Library.create:', error);
      throw error;
    }
  }

  static async update(id, data) {
    return await prisma.library.update({
      where: { id: parseInt(id) },
      data,
      include: {
        city: true
      }
    });
  }

  static async delete(id) {
    const library = await prisma.library.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            bookCopies: true,
            librarians: true,
            homeLibraryMembers: true
          }
        }
      }
    });

    if (!library) {
      throw new Error('Library not found');
    }

    if (library._count.bookCopies > 0) {
      throw new Error('Cannot delete library with existing book copies');
    }

    if (library._count.librarians > 0) {
      throw new Error('Cannot delete library with assigned librarians');
    }

    return await prisma.library.delete({
      where: { id: parseInt(id) }
    });
  }

  static async exists(id) {
    const library = await prisma.library.findUnique({
      where: { id: parseInt(id) }
    });
    return !!library;
  }

  static async assignLibrarian(libraryId, userId) {
    const library = await prisma.library.findUnique({
      where: { id: parseInt(libraryId) }
    });

    if (!library) {
      throw new Error('Library not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'LIBRARIAN') {
      throw new Error('Cannot assign non-librarian user to library');
    }

    return await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { libraryId: parseInt(libraryId) },
      select: {
        id: true,
        name: true,
        email: true,
        libraryId: true
      }
    });
  }

  static async removeLibrarian(libraryId, userId) {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.libraryId !== parseInt(libraryId)) {
      throw new Error('User is not assigned to this library');
    }

    return await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { libraryId: null },
      select: {
        id: true,
        name: true,
        email: true,
        libraryId: true
      }
    });
  }

  static async getAvailableLibrarians() {
    return await prisma.user.findMany({
      where: {
        role: 'LIBRARIAN',
        libraryId: null
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });
  }

  static async getStats(id) {
    const library = await prisma.library.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: {
            bookCopies: true,
            librarians: true,
            homeLibraryMembers: true
          }
        }
      }
    });

    if (!library) {
      return null;
    }

    // Count available books (not loaned, not reserved)
    const availableBooks = await prisma.bookCopy.count({
      where: {
        libraryId: parseInt(id),
        status: 'AVAILABLE'
      }
    });

    // Count maintenance books
    const maintenanceBooks = await prisma.bookCopy.count({
      where: {
        libraryId: parseInt(id),
        status: 'MAINTENANCE'
      }
    });

    // Count active loans
    const activeLoans = await prisma.loan.count({
      where: {
        status: 'ACTIVE',
        bookCopy: { libraryId: parseInt(id) }
      }
    });

    // Count pending book requests
    const pendingRequests = await prisma.bookRequest.count({
      where: {
        libraryId: parseInt(id),
        status: 'PENDING'
      }
    });

    return {
      ...library,
      stats: {
        totalBooks: library._count.bookCopies,
        availableBooks,
        maintenanceBooks,
        activeLoans,
        pendingRequests,
        librarians: library._count.librarians,
        members: library._count.homeLibraryMembers
      }
    };
  }
}
