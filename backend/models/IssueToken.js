import { PrismaClient } from '@prisma/client';
import QRCode from 'qrcode';
import crypto from 'crypto';

const prisma = new PrismaClient();

class IssueToken {
  static async generate({ requestId, memberId, bookCopyId }) {
    // Generate unique alphanumeric code (8 characters)
    const alphanumericCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Generate QR code data
    const qrData = JSON.stringify({
      requestId,
      memberId,
      bookCopyId,
      code: alphanumericCode,
      timestamp: Date.now()
    });
    
    const qrCode = await QRCode.toDataURL(qrData);

    // Set issue date and due date
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14); // 14 days loan period

    return await prisma.issueToken.create({
      data: {
        requestId,
        memberId,
        bookCopyId,
        qrCode,
        alphanumericCode,
        issueDate,
        dueDate,
        status: 'GENERATED'
      }
    });
  }

  static async verify(code, verificationType = 'ALPHANUMERIC') {
    let token;

    if (verificationType === 'ALPHANUMERIC') {
      token = await prisma.issueToken.findUnique({
        where: { alphanumericCode: code.toUpperCase() },
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
                  id: true,
                  name: true,
                  address: true
                }
              }
            }
          },
          request: true
        }
      });
    } else if (verificationType === 'QR') {
      // For QR code, extract the alphanumeric code from the QR data
      try {
        const qrData = JSON.parse(code);
        token = await prisma.issueToken.findUnique({
          where: { alphanumericCode: qrData.code },
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
                    id: true,
                    name: true,
                    address: true
                  }
                }
              }
            },
            request: true
          }
        });
      } catch (error) {
        return {
          valid: false,
          message: 'Invalid QR code format'
        };
      }
    }

    if (!token) {
      return {
        valid: false,
        message: 'Invalid code'
      };
    }

    if (token.status === 'ISSUED') {
      return {
        valid: false,
        message: 'This code has already been used'
      };
    }

    if (token.status === 'EXPIRED') {
      return {
        valid: false,
        message: 'This code has expired'
      };
    }

    // Check if pickup deadline has passed
    if (token.request.pickupDeadline && new Date() > new Date(token.request.pickupDeadline)) {
      // Mark as expired
      await prisma.issueToken.update({
        where: { id: token.id },
        data: { status: 'EXPIRED' }
      });

      return {
        valid: false,
        message: 'Pickup deadline has passed'
      };
    }

    return {
      valid: true,
      token,
      member: token.member,
      book: token.bookCopy.book,
      library: token.bookCopy.library,
      dueDate: token.dueDate
    };
  }

  static async markVerified(tokenId, verifiedBy) {
    return await prisma.issueToken.update({
      where: { id: tokenId },
      data: {
        status: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedBy
      }
    });
  }

  static async completeIssuance(tokenId, processedBy, notes) {
    const token = await prisma.issueToken.findUnique({
      where: { id: tokenId },
      include: {
        bookCopy: true,
        request: true
      }
    });

    if (!token) {
      throw new Error('Token not found');
    }

    if (token.status === 'ISSUED') {
      throw new Error('Book has already been issued');
    }

    if (token.status === 'EXPIRED') {
      throw new Error('Token has expired');
    }

    // Create loan record
    const loan = await prisma.loan.create({
      data: {
        userId: token.memberId,
        bookCopyId: token.bookCopyId,
        dueDate: token.dueDate,
        status: 'ACTIVE',
        issueTokenId: token.id,
        pickupVerifiedBy: processedBy,
        pickupVerifiedAt: new Date()
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

    // Update token status
    await prisma.issueToken.update({
      where: { id: tokenId },
      data: { status: 'ISSUED' }
    });

    // Update book copy status
    await prisma.bookCopy.update({
      where: { id: token.bookCopyId },
      data: {
        status: 'LOANED',
        reservedBy: null,
        reservedUntil: null
      }
    });

    // Log transaction
    await prisma.loanTransaction.create({
      data: {
        loanId: loan.id,
        transactionType: 'ISSUE',
        memberId: token.memberId,
        bookCopyId: token.bookCopyId,
        libraryId: token.bookCopy.libraryId,
        processedBy,
        dueDate: token.dueDate,
        notes: notes || 'Book issued via pickup code verification'
      }
    });

    return { loan, token };
  }
}

export default IssueToken;
