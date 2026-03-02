import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// State code mapping for Indian states
const stateCodeMap = {
  'Maharashtra': 'MH',
  'Delhi': 'DL',
  'Karnataka': 'KA',
  'Telangana': 'TG',
  'Tamil Nadu': 'TN',
  'West Bengal': 'WB',
  'Gujarat': 'GJ',
  'Rajasthan': 'RJ',
  'Uttar Pradesh': 'UP',
  'Madhya Pradesh': 'MP',
  'Chandigarh': 'CH',
  'Bihar': 'BR',
  'Kerala': 'KL',
  'Andhra Pradesh': 'AP',
  'Odisha': 'OD'
};

async function seedDemoData() {
  try {
    console.log('📦 Loading demo data from JSON file...\n');

    // Read the demo data file
    const demoDataPath = path.join(__dirname, '../../demo/data.json');
    const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf-8'));

    console.log('🌍 Seeding cities...');
    const cityIdMap = new Map();
    let cityCounter = 1;
    
    for (const city of demoData.cities) {
      const stateCode = stateCodeMap[city.state] || 'XX';
      const cityCode = `${stateCode}${String(cityCounter).padStart(2, '0')}`;
      
      const createdCity = await prisma.city.create({
        data: {
          name: city.name,
          state: city.state,
          stateCode: stateCode,
          country: demoData.country,
          cityCode: cityCode
        }
      });
      
      cityIdMap.set(city.id, createdCity.id);
      console.log(`  ✓ Created city: ${city.name} (${cityCode})`);
      cityCounter++;
    }

    console.log('\n🏛️  Seeding libraries...');
    const libraryIdMap = new Map();
    const libraryCodeCounter = new Map();
    
    for (const library of demoData.libraries) {
      const cityDbId = cityIdMap.get(library.cityId);
      const city = demoData.cities.find(c => c.id === library.cityId);
      const stateCode = stateCodeMap[city.state] || 'XX';
      
      // Get or initialize counter for this state
      if (!libraryCodeCounter.has(stateCode)) {
        libraryCodeCounter.set(stateCode, 1);
      }
      const counter = libraryCodeCounter.get(stateCode);
      const libraryCode = `${stateCode}${String(counter).padStart(2, '0')}${String.fromCharCode(64 + counter)}`;
      libraryCodeCounter.set(stateCode, counter + 1);
      
      const createdLibrary = await prisma.library.create({
        data: {
          name: library.name,
          address: library.address,
          cityId: cityDbId,
          libraryCode: libraryCode
        }
      });
      
      libraryIdMap.set(library.id, createdLibrary.id);
      console.log(`  ✓ Created library: ${library.name} (${libraryCode})`);
    }

    console.log('\n👥 Seeding librarians...');
    const librarianIdMap = new Map();
    
    for (const librarian of demoData.librarians) {
      const hashedPassword = await bcrypt.hash(librarian.password, 10);
      const libraryDbId = libraryIdMap.get(librarian.libraryId);
      
      const createdLibrarian = await prisma.user.create({
        data: {
          name: librarian.name,
          email: librarian.email,
          password: hashedPassword,
          role: 'LIBRARIAN',
          libraryId: libraryDbId
        }
      });
      
      librarianIdMap.set(librarian.id, createdLibrarian.id);
      console.log(`  ✓ Created librarian: ${librarian.name} (${librarian.email})`);
    }

    console.log('\n👤 Seeding admin...');
    const adminEmail = 'admin@library.com';
    const adminPassword = 'admin@library.com';
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    
    const admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedAdminPassword,
        role: 'ADMIN'
      }
    });
    console.log(`  ✓ Created admin: ${admin.name} (${admin.email})`);

    console.log('\n👤 Seeding members...');
    const memberIdMap = new Map();
    
    for (const member of demoData.members) {
      const hashedPassword = await bcrypt.hash(member.password, 10);
      const libraryDbId = libraryIdMap.get(member.libraryId);
      
      const createdMember = await prisma.user.create({
        data: {
          name: member.name,
          email: member.email,
          password: hashedPassword,
          role: 'MEMBER',
          homeLibraryId: libraryDbId
        }
      });
      
      memberIdMap.set(member.id, createdMember.id);
      console.log(`  ✓ Created member: ${member.name} (${member.email})`);
    }

    console.log('\n📚 Seeding books and book copies...');
    const bookIdMap = new Map();
    const isbnMap = new Map(); // Track ISBNs to avoid duplicates
    
    // Book cover image mapping
    const bookImageMap = {
      '978-0143028574': '/book_covers/The God of Small Things by Arundhati Roy.jpg',
      '978-0099578512': '/book_covers/Midnight\'s Children by Salman Rushdie.jpg',
      '978-0060974022': '/book_covers/A Suitable Boy by Vikram Seth.jpg',
      '978-1416562603': '/book_covers/The White Tiger by Aravind Adiga.jpg',
      '978-0143065883': '/book_covers/Train to Pakistan by Khushwant Singh.jpg',
      '978-0618485222': '/book_covers/The Namesake by Jhumpa Lahiri.jpg',
      '978-0802142818': '/book_covers/The Inheritance of Loss by Kiran Desai.jpg',
      '978-0618173020': '/book_covers/Interpreter of Maladies by Jhumpa Lahiri.jpg',
      '978-0307474728': '/book_covers/The Palace of Illusions by Chitra Banerjee.jpg',
      '978-0312330538': '/book_covers/Divakaruni Shantaram by Gregory David Roberts.jpg',
      '978-0143039648': '/book_covers/The Guide by R.K. Narayan.jpg',
      '978-0143039655': '/book_covers/Malgudi Days by R.K. Narayan.jpg',
      '978-0143031031': '/book_covers/The Discovery of India by Jawaharlal Nehru.jpg',
      '978-0143039341': '/book_covers/My Experiments with Truth by Mahatma Gandhi.jpg',
      '978-8173711466': '/book_covers/Wings of Fire by A.P.J. Abdul Kalam.jpg',
      '978-9380658742': '/book_covers/The Immortals of Meluha by Amish Tripathi.jpg',
      '978-8129104175': '/book_covers/Five Point Someone by Chetan Bhagat.jpg',
      '978-8129115300': '/book_covers/2 States by Chetan Bhagat.jpg',
      '978-1932705003': '/book_covers/The Rozabal Line by Ashwin Sangh.jpg',
      '978-0060531928': '/book_covers/Sacred Games by Vikram Chandra.jpg'
    };
    
    for (const book of demoData.books) {
      const libraryDbId = libraryIdMap.get(book.libraryId);
      
      // Check if book with this ISBN already exists
      let createdBook;
      if (isbnMap.has(book.isbn)) {
        createdBook = isbnMap.get(book.isbn);
        console.log(`  ℹ Using existing book: ${book.title} (${book.isbn})`);
      } else {
        createdBook = await prisma.book.create({
          data: {
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            imageUrl: bookImageMap[book.isbn] || null,
            totalCopies: 1
          }
        });
        isbnMap.set(book.isbn, createdBook);
        console.log(`  ✓ Created book: ${book.title} (${book.isbn})`);
      }
      
      bookIdMap.set(book.id, createdBook.id);
      
      // Create a book copy for this library
      const copyId = `${book.isbn}-${book.id}`;
      await prisma.bookCopy.create({
        data: {
          copyId: copyId,
          bookId: createdBook.id,
          libraryId: libraryDbId,
          status: 'AVAILABLE'
        }
      });
      console.log(`    ✓ Created copy: ${copyId} at library ${book.libraryId}`);
    }

    // Update total copies count for each book
    console.log('\n📊 Updating book copy counts...');
    const books = await prisma.book.findMany({
      include: {
        copies: true
      }
    });
    
    for (const book of books) {
      await prisma.book.update({
        where: { id: book.id },
        data: { totalCopies: book.copies.length }
      });
    }

    console.log('\n✅ Demo data seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`  Cities: ${await prisma.city.count()}`);
    console.log(`  Libraries: ${await prisma.library.count()}`);
    console.log(`  Admin: ${await prisma.user.count({ where: { role: 'ADMIN' } })}`);
    console.log(`  Librarians: ${await prisma.user.count({ where: { role: 'LIBRARIAN' } })}`);
    console.log(`  Members: ${await prisma.user.count({ where: { role: 'MEMBER' } })}`);
    console.log(`  Books: ${await prisma.book.count()}`);
    console.log(`  Book Copies: ${await prisma.bookCopy.count()}`);
    
    console.log('\n🔑 Sample Login Credentials:');
    console.log('\n  Admin:');
    console.log('    Email: admin@library.com');
    console.log('    Password: admin@library.com');
    console.log('\n  Librarian:');
    console.log('    Email: librarian1@library.com');
    console.log('    Password: librarian1@library.com');
    console.log('\n  Member:');
    console.log('    Email: member1@library.com');
    console.log('    Password: member1@library.com');
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoData()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
