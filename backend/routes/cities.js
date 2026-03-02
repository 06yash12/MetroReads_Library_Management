import express from 'express';
import { City } from '../models/City.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import CodeGenerator from '../services/CodeGenerator.js';

const router = express.Router();

// GET /api/cities/public - Public endpoint to list all cities (no auth required)
router.get('/public', async (req, res) => {
  try {
    const cities = await City.findAll();

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cities'
    });
  }
});

// GET /api/cities - List all cities with library counts (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const cities = await City.findAll();

    res.json({
      success: true,
      data: cities
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cities'
    });
  }
});

// POST /api/cities - Create new city
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, state, country } = req.body;

    if (!name || !country) {
      return res.status(400).json({
        success: false,
        error: 'City name and country are required'
      });
    }

    if (!state) {
      return res.status(400).json({
        success: false,
        error: 'State is required for code generation'
      });
    }

    // Generate city code automatically
    const { cityCode, stateCode } = await CodeGenerator.generateCityCode(state);

    const cityData = {
      name: name.trim(),
      state: state?.trim(),
      stateCode,
      country: country.trim(),
      cityCode
    };

    const city = await City.create(cityData);

    res.status(201).json({
      success: true,
      data: city,
      message: `City created with code: ${cityCode}`
    });
  } catch (error) {
    console.error('Error creating city:', error);
    
    if (error.message === 'City already exists in this country') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create city'
    });
  }
});

// GET /api/cities/:id - Get city details with libraries
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid city ID'
      });
    }

    const city = await City.findById(id);

    if (!city) {
      return res.status(404).json({
        success: false,
        error: 'City not found'
      });
    }

    res.json({
      success: true,
      data: city
    });
  } catch (error) {
    console.error('Error fetching city:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch city details'
    });
  }
});

// PUT /api/cities/:id - Update city information
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, state, country } = req.body;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid city ID'
      });
    }

    if (!name || !country) {
      return res.status(400).json({
        success: false,
        error: 'City name and country are required'
      });
    }

    const updateData = {
      name: name.trim(),
      state: state?.trim(),
      country: country.trim()
    };

    const updatedCity = await City.update(id, updateData);

    res.json({
      success: true,
      data: updatedCity
    });
  } catch (error) {
    console.error('Error updating city:', error);
    
    if (error.message === 'City not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'City name already exists in this country') {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update city'
    });
  }
});

// DELETE /api/cities/:id - Delete city if no libraries
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid city ID'
      });
    }

    await City.delete(id);

    res.json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting city:', error);
    
    if (error.message === 'City not found') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    if (error.message.includes('Cannot delete city with existing libraries')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete city'
    });
  }
});

export default router;