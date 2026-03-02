import { PrismaClient } from '@prisma/client';
import IssueToken from './IssueToken.js';

const prisma = new PrismaClient();

class BookRequest {
  static async create({ memberId, bookCopyId, libraryId, notes }) {
    // Verify book copy exists and is available
    const bookCopy = await prisma.bookCopy.findUnique({
      where: { id: bookCopyId },
      include: { book: true }
    });

    if (!bookCopy) {
      throw new Error('Book copy not found');
    }

    if (bookCopy.status !== 'AVAILABLE') {
      throw new Error('Book copy is not available');
    }

    // Check if member already has an ACTIVE LOAN for the same book title
    const activeBookLoan = await prisma.loan.findFirst({
      where: {
        userId: memberId,
        status: 'ACTIVE',
        bookCopy: {
          bookId: bookCopy.bookId
        }
      }
    });

    if (activeBookLoan) {
      throw new Error(`You already have an active loan for "${bookCopy.book.title}". Please return it before requesting again.`);
    }

    // Check if member already has a PENDING REQUEST for the same book title
    const existingRequest = await prisma.bookRequest.findFirst({
      where: {
        memberId,
        status: 'PENDING',
        bookCopy: {
          bookId: bookCopy.bookId
        }
      }
    });

    if (existingRequest) {
      throw new Error(`You already have a pending request for "${bookCopy.book.title}".`);
    }

    return await prisma.bookRequest.create({
      data: {
        memberId,
        bookCopyId,
        libraryId,
        status: 'PENDING'
      },
      include: {
        bookCopy: {
          include: { book: true }
        },
        library: true
      }
    });
  }

  static async findByMember(memberId, { status, limit = 20, offset = 0 }) {
    const where = { memberId };
    if (status) {
      where.status = status;
    }

    return await prisma.bookRequest.findMany({
      where,
      include: {
        bookCopy: {
          include: { book: true }
        },
        library: true,
        processedByUser: {
          select: {
            id: true,
            name: true
          }
        },
        issueToken: true
      },
      orderBy: { requestDate: 'desc' },
      take: limit,
      skip: offset
    });
  }

  static async findByLibrary(libraryId, { status, limit = 50, offset = 0 }) {
    const where = { libraryId };
    if (status) {
      where.status = status;
    }

    return await prisma.bookRequest.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        bookCopy: {
          include: { book: true }
        },
        processedByUser: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { requestDate: 'asc' },
      take: limit,
      skip: offset
    });
  }

  static async approve(requestId, processedBy, notes) {
    const request = await prisma.bookRequest.findUnique({
      where: { id: requestId },
      include: {
        bookCopy: {
          include: { book: true, library: true }
        },
        member: true
      }
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Check if book copy is still available
    if (request.bookCopy.status !== 'AVAILABLE') {
      throw new Error('Book copy is no longer available');
    }

    // Set pickup deadline (48 hours from now)
    const pickupDeadline = new Date();
    pickupDeadline.setHours(pickupDeadline.getHours() + 48);

    // Update request status
    const updatedRequest = await prisma.bookRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        processedDate: new Date(),
        processedBy,
        pickupDeadline
      },
      include: {
        bookCopy: {
          include: { book: true }
        },
        member: true
      }
    });

    // Reserve the book copy
    await prisma.bookCopy.update({
      where: { id: request.bookCopyId },
      data: {
        status: 'RESERVED',
        reservedBy: request.memberId,
        reservedUntil: pickupDeadline
      }
    });

    // Generate issue token
    const issueToken = await IssueToken.generate({
      requestId,
      memberId: request.memberId,
      bookCopyId: request.bookCopyId
    });

    return {
      request: updatedRequest,
      issueToken
    };
  }

  static async reject(requestId, processedBy, rejectionNote) {
    const request = await prisma.bookRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    return await prisma.bookRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        processedDate: new Date(),
        processedBy,
        rejectionNote
      },
      include: {
        bookCopy: {
          include: { book: true }
        },
        member: true
      }
    });
  }

  static async cancel(requestId, memberId) {
    const request = await prisma.bookRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      throw new Error('Request not found');
    }

    if (request.memberId !== memberId) {
      throw new Error('Unauthorized');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Can only cancel pending requests');
    }

    return await prisma.bookRequest.update({
      where: { id: requestId },
      data: { status: 'EXPIRED' }
    });
  }
}

export default BookRequest;
