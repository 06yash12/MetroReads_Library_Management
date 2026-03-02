import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class City {
  static async findAll() {
    return await prisma.city.findMany({
      include: {
        _count: {
          select: { libraries: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  static async findById(id) {
    return await prisma.city.findUnique({
      where: { id: parseInt(id) },
      include: {
        libraries: {
          include: {
            _count: {
              select: { bookCopies: true }
            }
          }
        }
      }
    });
  }

  static async create(data) {
    // Check if city already exists
    const existing = await prisma.city.findFirst({
      where: {
        name: data.name,
        country: data.country
      }
    });

    if (existing) {
      throw new Error('City already exists in this country');
    }

    return await prisma.city.create({ data });
  }

  static async update(id, data) {
    const city = await prisma.city.findUnique({
      where: { id: parseInt(id) }
    });

    if (!city) {
      throw new Error('City not found');
    }

    // Check for duplicate name
    if (data.name || data.country) {
      const existing = await prisma.city.findFirst({
        where: {
          name: data.name || city.name,
          country: data.country || city.country,
          NOT: { id: parseInt(id) }
        }
      });

      if (existing) {
        throw new Error('City name already exists in this country');
      }
    }

    return await prisma.city.update({
      where: { id: parseInt(id) },
      data
    });
  }

  static async delete(id) {
    const city = await prisma.city.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { libraries: true }
        }
      }
    });

    if (!city) {
      throw new Error('City not found');
    }

    if (city._count.libraries > 0) {
      throw new Error(`Cannot delete city with existing libraries. This city has ${city._count.libraries} library(ies).`);
    }

    return await prisma.city.delete({
      where: { id: parseInt(id) }
    });
  }
}
