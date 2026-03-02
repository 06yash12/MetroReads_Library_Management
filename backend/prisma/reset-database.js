import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database cleanup...\n');

    // Delete in correct order to respect foreign key constraints
    console.log('Deleting reminder schedules...');
    await prisma.reminderSchedule.deleteMany({});
    
    console.log('Deleting notification logs...');
    await prisma.notificationLog.deleteMany({});
    
    console.log('Deleting loan transactions...');
    await prisma.loanTransaction.deleteMany({});
    
    console.log('Deleting issue tokens...');
    await prisma.issueToken.deleteMany({});
    
    console.log('Deleting book requests...');
    await prisma.bookRequest.deleteMany({});
    
    console.log('Deleting loans...');
    await prisma.loan.deleteMany({});
    
    console.log('Deleting book copies...');
    await prisma.bookCopy.deleteMany({});
    
    console.log('Deleting books...');
    await prisma.book.deleteMany({});
    
    console.log('Deleting users (members, librarians)...');
    await prisma.user.deleteMany({});
    
    console.log('Deleting libraries...');
    await prisma.library.deleteMany({});
    
    console.log('Deleting cities...');
    await prisma.city.deleteMany({});

    console.log('\n✅ Database cleaned successfully!');
    console.log('\n📊 Current database state:');
    
    const counts = {
      cities: await prisma.city.count(),
      libraries: await prisma.library.count(),
      users: await prisma.user.count(),
      books: await prisma.book.count(),
      bookCopies: await prisma.bookCopy.count(),
      loans: await prisma.loan.count(),
      bookRequests: await prisma.bookRequest.count(),
      issueTokens: await prisma.issueToken.count(),
      loanTransactions: await prisma.loanTransaction.count(),
      notificationLogs: await prisma.notificationLog.count(),
      reminderSchedules: await prisma.reminderSchedule.count()
    };

    console.log(`Cities: ${counts.cities}`);
    console.log(`Libraries: ${counts.libraries}`);
    console.log(`Users: ${counts.users}`);
    console.log(`Books: ${counts.books}`);
    console.log(`Book Copies: ${counts.bookCopies}`);
    console.log(`Loans: ${counts.loans}`);
    console.log(`Book Requests: ${counts.bookRequests}`);
    console.log(`Issue Tokens: ${counts.issueTokens}`);
    console.log(`Loan Transactions: ${counts.loanTransactions}`);
    console.log(`Notification Logs: ${counts.notificationLogs}`);
    console.log(`Reminder Schedules: ${counts.reminderSchedules}`);
    
    console.log('\n🎉 Database is now empty and ready for fresh data!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
