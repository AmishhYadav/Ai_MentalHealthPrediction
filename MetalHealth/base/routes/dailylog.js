const express = require('express');
const router = express.Router();
const DailyLog = require('../models/DaillyLog');
const { authenticateToken } = require('../middleware/auth');

// Create a new daily log entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { entry, output1, output2, output3, output4, finalOutput } = req.body;
    
    // Validate required fields
    if (!entry || !output1 || !output2 || !output3 || !output4 || !finalOutput) {
      return res.status(400).json({ 
        message: 'All fields (entry, output1, output2, output3, output4, finalOutput) are required' 
      });
    }

    const dailyLog = new DailyLog({
      userId: req.user.user_id,
      entry,
      output1,
      output2,
      output3,
      output4,
      finalOutput
    });

    await dailyLog.save();
    res.status(201).json({ 
      message: 'Daily log created successfully', 
      data: dailyLog 
    });
  } catch (error) {
    console.error('Error creating daily log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all daily logs for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const dailyLogs = await DailyLog.find({ userId: req.user.user_id })
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await DailyLog.countDocuments({ userId: req.user.user_id });

    res.json({
      data: dailyLogs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific daily log by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const dailyLog = await DailyLog.findOne({ 
      _id: req.params.id, 
      userId: req.user.user_id 
    });

    if (!dailyLog) {
      return res.status(404).json({ message: 'Daily log not found' });
    }

    res.json({ data: dailyLog });
  } catch (error) {
    console.error('Error fetching daily log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a daily log entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { entry, output1, output2, output3, output4, finalOutput } = req.body;
    
    const dailyLog = await DailyLog.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.user_id },
      { 
        entry, 
        output1, 
        output2, 
        output3, 
        output4, 
        finalOutput,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!dailyLog) {
      return res.status(404).json({ message: 'Daily log not found' });
    }

    res.json({ 
      message: 'Daily log updated successfully', 
      data: dailyLog 
    });
  } catch (error) {
    console.error('Error updating daily log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a daily log entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const dailyLog = await DailyLog.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.user_id 
    });

    if (!dailyLog) {
      return res.status(404).json({ message: 'Daily log not found' });
    }

    res.json({ message: 'Daily log deleted successfully' });
  } catch (error) {
    console.error('Error deleting daily log:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get daily logs by date range
router.get('/range/:startDate/:endDate', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const dailyLogs = await DailyLog.find({
      userId: req.user.user_id,
      date: { $gte: start, $lte: end }
    })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await DailyLog.countDocuments({
      userId: req.user.user_id,
      date: { $gte: start, $lte: end }
    });

    res.json({
      data: dailyLogs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching daily logs by range:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
