import express from 'express';
import { Library } from '../models/Library.js';
import { authenticate, requireAdmin, requireLibraryAccess } from '../middleware/auth.js';
import CodeGenerator from '../services/CodeGenerator.js';

const router = express.Router();

// GET /api/libraries - Get all libraries (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const libraries = await Library.findAll();
    
    res.status(200).json({
      success: true,
      count: libraries.length,
      data: libraries
    });
  } catch (error) {
    console.error('Error fetching libraries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch libraries',
      error: error.message
    });
  }
});

// GET /api/cities/:cityId/libraries - Get libraries by city (Admin only)
router.get('/by-city/:cityId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { cityId } = req.params;
    
    if (!cityId || isNaN(parseInt(cityId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid city ID'
      });
    }

    const libraries = await Library.findByCity(cityId);
    
    res.status(200).json({
      success: true,
      count: libraries.length,
      data: libraries
    });
  } catch (error) {
    console.error('Error fetching libraries by city:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch libraries',
      error: error.message
    });
  }
});

// GET /api/libraries/:id - Get library by ID
router.get('/:id', authenticate, requireLibraryAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    const library = await Library.findById(id);
    
    if (!library) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    res.status(200).json({
      success: true,
      data: library
    });
  } catch (error) {
    console.error('Error fetching library:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library',
      error: error.message
    });
  }
});

// POST /api/libraries - Create library (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, address, cityId, librarianId } = req.body;

    console.log('=== Library Creation Request ===');
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);

    // Validation
    if (!name) {
      console.log('Validation failed: Library name is required');
      return res.status(400).json({
        success: false,
        message: 'Library name is required'
      });
    }

    if (!cityId || isNaN(parseInt(cityId))) {
      console.log('Validation failed: Invalid city ID:', cityId);
      return res.status(400).json({
        success: false,
        message: 'Valid city ID is required'
      });
    }

    const libraryData = {
      name: name.trim(),
      address: address?.trim() || null,
      cityId: parseInt(cityId)
    };

    // Generate library code automatically
    const libraryCode = await CodeGenerator.generateLibraryCode(parseInt(cityId));
    libraryData.libraryCode = libraryCode;

    // Don't include librarianId in library creation - it's set via user.libraryId
    console.log('Creating library with data:', JSON.stringify(libraryData, null, 2));

    const library = await Library.create(libraryData);

    console.log('Library created successfully:', JSON.stringify(library, null, 2));

    res.status(201).json({
      success: true,
      message: `Library created successfully with code: ${libraryCode}`,
      data: library
    });
  } catch (error) {
    console.error('=== Library Creation Error ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', error);
    
    if (error.message === 'City not found') {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create library',
      error: error.message
    });
  }
});

// POST /api/cities/:cityId/libraries - Create library in city (Admin only)
router.post('/in-city/:cityId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { cityId } = req.params;
    const { name, address } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Library name is required'
      });
    }

    if (!cityId || isNaN(parseInt(cityId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid city ID'
      });
    }

    const libraryData = {
      name: name.trim(),
      address: address?.trim(),
      cityId: parseInt(cityId)
    };

    // Generate library code automatically
    const libraryCode = await CodeGenerator.generateLibraryCode(parseInt(cityId));
    libraryData.libraryCode = libraryCode;

    const library = await Library.create(libraryData);

    res.status(201).json({
      success: true,
      message: `Library created successfully with code: ${libraryCode}`,
      data: library
    });
  } catch (error) {
    console.error('Error creating library:', error);
    
    if (error.message === 'City not found') {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create library',
      error: error.message
    });
  }
});

// PUT /api/libraries/:id - Update library (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    // Check if library exists
    const exists = await Library.exists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    const { name, address } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address?.trim();

    const library = await Library.update(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Library updated successfully',
      data: library
    });
  } catch (error) {
    console.error('Error updating library:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update library',
      error: error.message
    });
  }
});

// DELETE /api/libraries/:id - Delete library (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    // Check if library exists
    const exists = await Library.exists(id);
    if (!exists) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    await Library.delete(id);

    res.status(200).json({
      success: true,
      message: 'Library deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting library:', error);
    
    if (error.message.includes('Cannot delete library')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete library',
      error: error.message
    });
  }
});

// POST /api/libraries/:id/assign-librarian - Assign librarian (Admin only)
router.post('/:id/assign-librarian', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const assignment = await Library.assignLibrarian(id, userId);

    res.status(200).json({
      success: true,
      message: 'Librarian assigned successfully',
      data: assignment
    });
  } catch (error) {
    console.error('Error assigning librarian:', error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot assign')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign librarian',
      error: error.message
    });
  }
});

// DELETE /api/libraries/:id/librarians/:userId - Remove librarian assignment (Admin only)
router.delete('/:id/librarians/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id, userId } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const result = await Library.removeLibrarian(id, userId);

    res.status(200).json({
      success: true,
      message: 'Librarian assignment removed successfully',
      data: result
    });
  } catch (error) {
    console.error('Error removing librarian assignment:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to remove librarian assignment',
      error: error.message
    });
  }
});

// GET /api/libraries/available-librarians - Get available users for assignment (Admin only)
router.get('/available-librarians/list', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await Library.getAvailableLibrarians();
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching available librarians:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available librarians',
      error: error.message
    });
  }
});

// GET /api/libraries/:id/stats - Get library statistics
router.get('/:id/stats', authenticate, requireLibraryAccess, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: 'Invalid library ID'
      });
    }

    const stats = await Library.getStats(id);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Library not found'
      });
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching library stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch library statistics',
      error: error.message
    });
  }
});

export default router;