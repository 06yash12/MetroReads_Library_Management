import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get platform statistics
router.get('/', async (req, res) => {
  try {
    const [citiesCount, librariesCount, bookCopiesCount, membersCount] = await Promise.all([
      prisma.city.count(),
      prisma.library.count(),
      prisma.bookCopy.count(),
      prisma.user.count({ where: { role: 'MEMBER' } })
    ]);

    res.json({
      cities: citiesCount,
      libraries: librariesCount,
      books: bookCopiesCount,
      members: membersCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

export default router;
