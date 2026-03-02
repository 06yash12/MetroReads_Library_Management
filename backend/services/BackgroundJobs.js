import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';

const prisma = new PrismaClient();

class BackgroundJobs {
  static init() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', async () => {
      console.log('[JOBS] Running scheduled cleanup tasks');
      await this.cleanupExpiredRequests();
      await this.updateOverdueLoans();
    });
  }
  
  // Cleanup expired book requests (24 hour pickup deadline)
  static async cleanupExpiredRequests() {
    try {
      const expiredRequests = await prisma.bookRequest.findMany({
        where: {
          status: 'APPROVED',
          pickupDeadline: {
            lt: new Date() // Past deadline
          }
        },
        include: { bookCopy: true, issueToken: true }
      });
      
      let cleanedCount = 0;
      
      for (const request of expiredRequests) {
        // Mark request as expired
        await prisma.bookRequest.update({
          where: { id: request.id },
          data: { status: 'EXPIRED' }
        });
        
        // Release book copy reservation
        await prisma.bookCopy.update({
          where: { id: request.bookCopyId },
          data: {
            status: 'AVAILABLE',
            reservedBy: null,
            reservedUntil: null
          }
        });
        
        // Mark issue token as expired
        if (request.issueToken) {
          await prisma.issueToken.update({
            where: { id: request.issueToken.id },
            data: { status: 'EXPIRED' }
          });
        }
        
        // Log transaction
        await prisma.loanTransaction.create({
          data: {
            transactionType: 'ISSUE',
            memberId: request.memberId,
            bookCopyId: request.bookCopyId,
            libraryId: request.libraryId,
            notes: 'Request expired - 24 hour pickup deadline passed'
          }
        });
        
        cleanedCount++;
      }
      
      if (cleanedCount > 0) {
        console.log(`[JOBS] Cleaned ${cleanedCount} expired book requests`);
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('[JOBS] Failed to cleanup expired requests:', error.message);
      return 0;
    }
  }
  
  // Update overdue loan status
  static async updateOverdueLoans() {
    try {
      const overdueLoans = await prisma.loan.updateMany({
        where: {
          status: 'ACTIVE',
          dueDate: {
            lt: new Date()
          }
        },
        data: {
          status: 'OVERDUE'
        }
      });
      
      if (overdueLoans.count > 0) {
        console.log(`[JOBS] Updated ${overdueLoans.count} loans to overdue status`);
      }
      
      return overdueLoans.count;
    } catch (error) {
      console.error('[JOBS] Failed to update overdue loans:', error.message);
      return 0;
    }
  }
  
  // Calculate and update fines for overdue books
  static async calculateFines() {
    try {
      const overdueLoans = await prisma.loan.findMany({
        where: {
          status: 'OVERDUE',
          fineAmount: 0 // Only calculate for loans without existing fines
        }
      });
      
      let updatedCount = 0;
      
      for (const loan of overdueLoans) {
        const daysOverdue = Math.ceil((new Date() - new Date(loan.dueDate)) / (1000 * 60 * 60 * 24));
        const fineAmount = daysOverdue * 1.0; // $1 per day
        
        await prisma.loan.update({
          where: { id: loan.id },
          data: { fineAmount }
        });
        
        updatedCount++;
      }
      
      if (updatedCount > 0) {
        console.log(`[JOBS] Calculated fines for ${updatedCount} overdue loans`);
      }
      
      return updatedCount;
    } catch (error) {
      console.error('[JOBS] Failed to calculate fines:', error.message);
      return 0;
    }
  }
  
  // Send reminder notifications (placeholder for future implementation)
  static async sendReminders() {
    try {
      // Get loans due in 3 days
      const dueSoonLoans = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
          }
        },
        include: {
          user: true,
          bookCopy: {
            include: { book: true }
          }
        }
      });
      
      // TODO: Implement email/SMS notifications
      if (dueSoonLoans.length > 0) {
        console.log(`[JOBS] Found ${dueSoonLoans.length} loans due for reminders`);
      }
      
      return dueSoonLoans.length;
    } catch (error) {
      console.error('[JOBS] Failed to send reminders:', error.message);
      return 0;
    }
  }
}

export default BackgroundJobs;