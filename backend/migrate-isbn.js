import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// City code mapping: cityId → cityCode (actual DB IDs)
const CITY_CODE_MAP = {
  // Maharashtra
  35: 'MH01', // Mumbai
  41: 'MH02', // Pune
  50: 'MH03', // Nagpur
  // Delhi
  36: 'DL01', // Delhi
  // Karnataka
  37: 'KA01', // Bangalore
  // Telangana
  38: 'TG01', // Hyderabad
  // Tamil Nadu
  39: 'TN01', // Chennai
  54: 'TN02', // Coimbatore
  // West Bengal
  40: 'WB01', // Kolkata
  // Gujarat
  42: 'GJ01', // Ahmedabad
  45: 'GJ02', // Surat
  // Rajasthan
  43: 'RJ01', // Jaipur
  // Uttar Pradesh
  44: 'UP01', // Lucknow
  // Madhya Pradesh
  46: 'MP01', // Indore
  48: 'MP02', // Bhopal
  // Chandigarh
  47: 'CH01', // Chandigarh
  // Bihar
  49: 'BR01', // Patna
  // Kerala
  51: 'KL01', // Kochi
  // Andhra Pradesh
  52: 'AP01', // Visakhapatnam
  // Odisha
  53: 'OD01', // Bhubaneswar
};

// Library code mapping: libraryId → libraryCode (actual DB IDs)
const LIBRARY_CODE_MAP = {
  65: 'MH01A', 66: 'MH01B', // Mumbai
  67: 'DL01A', 68: 'DL01B', // Delhi
  69: 'KA01A', 70: 'KA01B', // Bangalore
  71: 'TG01A', 72: 'TG01B', // Hyderabad
  73: 'TN01A', 74: 'TN01B', // Chennai
  75: 'WB01A', 76: 'WB01B', // Kolkata
  77: 'MH02A', 78: 'MH02B', // Pune
  79: 'GJ01A', 80: 'GJ01B', // Ahmedabad
  81: 'RJ01A', 82: 'RJ01B', // Jaipur
  83: 'UP01A', 84: 'UP01B', // Lucknow
  85: 'GJ02A', 86: 'GJ02B', // Surat
  87: 'MP01A', 88: 'MP01B', // Indore
  89: 'CH01A', 90: 'CH01B', // Chandigarh
  91: 'MP02A', 92: 'MP02B', // Bhopal
  93: 'BR01A', 94: 'BR01B', // Patna
  95: 'MH03A', 96: 'MH03B', // Nagpur
  97: 'KL01A', 98: 'KL01B', // Kochi
  99: 'AP01A', 100: 'AP01B', // Visakhapatnam
  101: 'OD01A', 102: 'OD01B', // Bhubaneswar
  103: 'TN02A', 104: 'TN02B', // Coimbatore
};

async function migrateAllCodes() {
  try {
    console.log('🔄 Starting full code migration...\n');

    // Step 1: Update city codes
    console.log('📍 Updating city codes...');
    const cities = await prisma.city.findMany({ orderBy: { id: 'asc' } });
    for (const city of cities) {
      const newCode = CITY_CODE_MAP[city.id];
      if (!newCode) { console.log(`  ⚠️  No code for city ID ${city.id} (${city.name})`); continue; }
      await prisma.city.update({ where: { id: city.id }, data: { cityCode: newCode, stateCode: newCode.substring(0, 2) } });
      console.log(`  ✓ ${city.name}: ${city.cityCode || '???'} → ${newCode}`);
    }

    // Step 2: Update library codes
    console.log('\n🏛️  Updating library codes...');
    const libraries = await prisma.library.findMany({ orderBy: { id: 'asc' } });
    for (const library of libraries) {
      const newCode = LIBRARY_CODE_MAP[library.id];
      if (!newCode) { console.log(`  ⚠️  No code for library ID ${library.id} (${library.name})`); continue; }
      await prisma.library.update({ where: { id: library.id }, data: { libraryCode: newCode } });
      console.log(`  ✓ ${library.name}: ${library.libraryCode || '???'} → ${newCode}`);
    }

    // Step 3: Update book ISBNs - books are shared, so ISBN = first library's code that has it
    // We skip this since copyId already encodes the library info
    console.log('\n📚 Book ISBNs stay as library-specific (handled via copyId)...');
    // Just confirm books exist
    const totalBooks = await prisma.book.count();
    console.log(`  Total unique books: ${totalBooks}`);

    // Step 4: Update all copy IDs - first set ALL to TEMP globally
    console.log('\n📋 Updating copy IDs...');
    const allCopies = await prisma.bookCopy.findMany({ orderBy: { id: 'asc' } });
    console.log(`  Setting ${allCopies.length} copies to TEMP...`);
    for (const copy of allCopies) {
      await prisma.bookCopy.update({ where: { id: copy.id }, data: { copyId: `TEMP-${copy.id}` } });
    }
    console.log('  All TEMP IDs set. Now assigning final IDs...');

    // Then set final IDs per library
    for (const library of libraries) {
      const libraryCode = LIBRARY_CODE_MAP[library.id];
      if (!libraryCode) continue;

      const libCopies = await prisma.bookCopy.findMany({
        where: { libraryId: library.id },
        include: { book: true },
        orderBy: [{ bookId: 'asc' }, { id: 'asc' }]
      });

      const bookGroups = {};
      for (const copy of libCopies) {
        if (!bookGroups[copy.bookId]) bookGroups[copy.bookId] = [];
        bookGroups[copy.bookId].push(copy);
      }

      let bookSeq = 1;
      for (const copies of Object.values(bookGroups)) {
        const bookSeqStr = String(bookSeq).padStart(4, '0');
        for (let i = 0; i < copies.length; i++) {
          // Use libraryCode + bookSeq + copyNum for globally unique copyId
          await prisma.bookCopy.update({
            where: { id: copies[i].id },
            data: { copyId: `${libraryCode}${bookSeqStr}-${i + 1}` }
          });
        }
        bookSeq++;
      }
      console.log(`  ✓ ${library.name}: ${libCopies.length} copies updated`);
    }

    // Final sample
    console.log('\n📖 Sample results:');
    const sample = await prisma.bookCopy.findMany({
      take: 6, orderBy: { id: 'asc' },
      include: { book: { select: { title: true, isbn: true } }, library: { select: { name: true, libraryCode: true } } }
    });
    sample.forEach(c => console.log(`  [${c.library.libraryCode}] ${c.book.title} → ${c.copyId} [${c.status}]`));

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateAllCodes();
