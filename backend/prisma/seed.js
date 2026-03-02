import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import CodeGenerator from '../services/CodeGenerator.js';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@library.com' }
  });

  let adminUser;
  if (existingAdmin) {
    console.log('Admin already exists');
    adminUser = existingAdmin;
  } else {
    const hashedPassword = await bcrypt.hash('admin@library.com', 12);
    adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin@library.com',
        password: hashedPassword,
        role: 'ADMIN'
      }
    });
    console.log(`Created admin: ${adminUser.email}`);
  }

  // Create sample cities with auto-generated codes
  const cities = [
    { name: 'Bangalore', state: 'Karnataka', country: 'India' },
    { name: 'Mysore', state: 'Karnataka', country: 'India' },
    { name: 'Mumbai', state: 'Maharashtra', country: 'India' },
    { name: 'Pune', state: 'Maharashtra', country: 'India' }
  ];

  for (const cityData of cities) {
    const existing = await prisma.city.findFirst({
      where: { name: cityData.name, country: cityData.country }
    });

    if (!existing) {
      const { cityCode, stateCode } = await CodeGenerator.generateCityCode(cityData.state);
      const city = await prisma.city.create({
        data: {
          ...cityData,
          cityCode,
          stateCode
        }
      });
      console.log(`Created city: ${city.name} (${city.cityCode})`);

      // Create a library in each city
      const libraryCode = await CodeGenerator.generateLibraryCode(city.id);
      const library = await prisma.library.create({
        data: {
          name: `${city.name} Central Library`,
          address: `Main Street, ${city.name}`,
          cityId: city.id,
          libraryCode
        }
      });
      console.log(`Created library: ${library.name} (${library.libraryCode})`);

      // Create a librarian for the first library
      if (cityData.name === 'Bangalore') {
        const librarianExists = await prisma.user.findFirst({
          where: { email: 'librarian@library.com' }
        });

        if (!librarianExists) {
          const librarianPassword = await bcrypt.hash('librarian@library.com', 12);
          const librarian = await prisma.user.create({
            data: {
              name: 'Librarian',
              email: 'librarian@library.com',
              password: librarianPassword,
              role: 'LIBRARIAN',
              libraryId: library.id
            }
          });
          console.log(`Created librarian: ${librarian.email} for ${library.name}`);
        }
      }
    } else {
      console.log(`City already exists: ${cityData.name}`);
    }
  }

  // Create a sample member
  const memberExists = await prisma.user.findFirst({
    where: { email: 'member@library.com' }
  });

  if (!memberExists) {
    const memberPassword = await bcrypt.hash('member@library.com', 12);
    const member = await prisma.user.create({
      data: {
        name: 'Member User',
        email: 'member@library.com',
        password: memberPassword,
        role: 'MEMBER'
      }
    });
    console.log(`Created member: ${member.email}`);
  }

  console.log('\n=== Seed Complete ===');
  console.log('Login credentials (email = password):');
  console.log('Admin: admin@library.com / admin@library.com');
  console.log('Librarian: librarian@library.com / librarian@library.com');
  console.log('Member: member@library.com / member@library.com');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });