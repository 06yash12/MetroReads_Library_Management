import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// State code mapping
const STATE_CODES = {
  'karnataka': 'KA',
  'maharashtra': 'MH',
  'tamil nadu': 'TN',
  'kerala': 'KL',
  'andhra pradesh': 'AP',
  'telangana': 'TG',
  'gujarat': 'GJ',
  'rajasthan': 'RJ',
  'punjab': 'PB',
  'haryana': 'HR',
  'uttar pradesh': 'UP',
  'madhya pradesh': 'MP',
  'bihar': 'BR',
  'west bengal': 'WB',
  'odisha': 'OD',
  'assam': 'AS',
  'jharkhand': 'JH',
  'chhattisgarh': 'CG',
  'uttarakhand': 'UK',
  'himachal pradesh': 'HP',
  'goa': 'GA',
  'delhi': 'DL'
};

class CodeGenerator {
  /**
   * Get state code from state name
   */
  static getStateCode(stateName) {
    if (!stateName) return 'XX';
    const normalized = stateName.toLowerCase().trim();
    return STATE_CODES[normalized] || stateName.substring(0, 2).toUpperCase();
  }

  /**
   * Generate city code: StateCode + Sequential Number (e.g., KA01, MH02)
   */
  static async generateCityCode(stateName) {
    const stateCode = this.getStateCode(stateName);
    
    // Count existing cities in this state
    const existingCities = await prisma.city.findMany({
      where: {
        stateCode: stateCode
      },
      orderBy: {
        cityCode: 'desc'
      }
    });

    // Get the next number
    let nextNumber = 1;
    if (existingCities.length > 0) {
      const lastCode = existingCities[0].cityCode;
      const lastNumber = parseInt(lastCode.substring(2));
      nextNumber = lastNumber + 1;
    }

    // Format: StateCode + 2-digit number (e.g., KA01, KA02)
    const cityCode = `${stateCode}${String(nextNumber).padStart(2, '0')}`;
    
    return {
      cityCode,
      stateCode
    };
  }

  /**
   * Generate library code: CityCode + Letter (e.g., KA01A, MH02B)
   */
  static async generateLibraryCode(cityId) {
    const city = await prisma.city.findUnique({
      where: { id: cityId },
      include: {
        libraries: {
          orderBy: {
            libraryCode: 'desc'
          }
        }
      }
    });

    if (!city) {
      throw new Error('City not found');
    }

    // Get the next letter
    let nextLetter = 'A';
    if (city.libraries.length > 0) {
      const lastCode = city.libraries[0].libraryCode;
      const lastLetter = lastCode.charAt(lastCode.length - 1);
      nextLetter = String.fromCharCode(lastLetter.charCodeAt(0) + 1);
    }

    // Format: CityCode + Letter (e.g., KA01A, KA01B)
    const libraryCode = `${city.cityCode}${nextLetter}`;
    
    return libraryCode;
  }

  /**
   * Generate ISBN: LibraryCode + 4-digit book number (e.g., KA01A0001)
   */
  static async generateISBN(libraryId) {
    const library = await prisma.library.findUnique({
      where: { id: libraryId }
    });

    if (!library) {
      throw new Error('Library not found');
    }

    // Find the highest book sequence used in this library via copy IDs
    // copyId format: TN01A0020-3 → extract 0020
    const existingCopies = await prisma.bookCopy.findMany({
      where: {
        libraryId: libraryId,
        copyId: { startsWith: library.libraryCode }
      },
      orderBy: { copyId: 'desc' },
      take: 1
    });

    let nextNumber = 1;
    if (existingCopies.length > 0) {
      const lastCopyId = existingCopies[0].copyId;
      const seqPart = lastCopyId.substring(library.libraryCode.length, library.libraryCode.length + 4);
      nextNumber = parseInt(seqPart) + 1;
    }

    // Format: LibraryCode + 4-digit number (e.g., TN01A0021)
    const isbn = `${library.libraryCode}${String(nextNumber).padStart(4, '0')}`;
    
    return isbn;
  }

  /**
   * Generate copy ID: ISBN + Copy Number (e.g., KA01A0001-1, KA01A0001-2)
   */
  static async generateCopyId(isbn) {
    // Count existing copies for this book
    const book = await prisma.book.findUnique({
      where: { isbn },
      include: {
        copies: {
          orderBy: {
            copyId: 'desc'
          }
        }
      }
    });

    if (!book) {
      throw new Error('Book not found');
    }

    // Get the next copy number
    let nextCopyNumber = 1;
    if (book.copies.length > 0) {
      const lastCopyId = book.copies[0].copyId;
      const lastNumber = parseInt(lastCopyId.split('-')[1]);
      nextCopyNumber = lastNumber + 1;
    }

    // Format: ISBN-CopyNumber (e.g., KA01A0001-1)
    const copyId = `${isbn}-${nextCopyNumber}`;
    
    return copyId;
  }

  /**
   * Validate city code format
   */
  static validateCityCode(code) {
    return /^[A-Z]{2}\d{2}$/.test(code);
  }

  /**
   * Validate library code format
   */
  static validateLibraryCode(code) {
    return /^[A-Z]{2}\d{2}[A-Z]$/.test(code);
  }

  /**
   * Validate ISBN format
   */
  static validateISBN(isbn) {
    return /^[A-Z]{2}\d{2}[A-Z]\d{4}$/.test(isbn);
  }

  /**
   * Validate copy ID format
   */
  static validateCopyId(copyId) {
    return /^[A-Z]{2}\d{2}[A-Z]\d{4}-\d+$/.test(copyId);
  }
}

export default CodeGenerator;
