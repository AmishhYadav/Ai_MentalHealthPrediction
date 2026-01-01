const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const MentalHealthAssessment = require('../models/MentalHealthAssessment');
const { authenticateToken } = require('../middleware/auth');
const { getDatabase } = require('../config/database');

const router = express.Router();

// Submit mental health assessment and get AI analysis
router.post('/assessment', authenticateToken, async (req, res) => {
  try {
    const { answers } = req.body;
    const userId = req.user.user_id; // Get authenticated user's ID

    console.log('Received assessment data:', { answers, userId });

    // Validate answers - daily mental health check-in
    const requiredFields = [
      'mood', 'moodLevel', 'stressLevel', 'sleepHours', 'sleepQuality',
      'anxietyFrequency', 'energyLevel', 'overwhelmedFrequency', 'socialConnection', 'dailyFunctioning'
    ];
    
    // Set default values for missing fields
    for (const field of requiredFields) {
      if (answers[field] === undefined || answers[field] === null || answers[field] === '') {
        // Set appropriate default values based on field type
        if (field === 'mood') answers[field] = 'Neutral';
        else if (field === 'moodLevel' || field === 'stressLevel') answers[field] = 5;
        else if (field === 'sleepHours') answers[field] = 8;
        else if (field === 'sleepQuality') answers[field] = 'Good';
        else if (field === 'anxietyFrequency') answers[field] = 'A little';
        else if (field === 'energyLevel') answers[field] = 'Moderate';
        else if (field === 'overwhelmedFrequency') answers[field] = 'Slightly';
        else if (field === 'socialConnection') answers[field] = 'Neutral';
        else if (field === 'dailyFunctioning') answers[field] = 'Good';
        else answers[field] = 'Neutral'; // Default for other fields
      }
    }

    // Validate stress and mood levels
    if (answers.stressLevel < 1 || answers.stressLevel > 10) {
      return res.status(400).json({ 
        message: 'Stress level must be between 1 and 10' 
      });
    }

    if (answers.moodLevel < 1 || answers.moodLevel > 10) {
      return res.status(400).json({ 
        message: 'Mood level must be between 1 and 10' 
      });
    }

    if (answers.sleepHours < 0 || answers.sleepHours > 24) {
      return res.status(400).json({ 
        message: 'Sleep hours must be between 0 and 24' 
      });
    }

    // Optional fields validation (for backward compatibility)
    // These fields are no longer required for the core daily questions flow
    // Legacy fields are optional - no validation needed

    // commonFeeling is optional legacy field - no validation needed

    // Get today's daily summary if it exists
    const today = new Date().toISOString().split('T')[0];
    let dailySummary = null;
    
    try {
      const DailySummary = require('../models/DailySummary');
      const summary = await DailySummary.findOne({
        userId: userId,
        date: today
      });
      
      if (summary) {
        dailySummary = summary.summary;
        console.log('Found daily summary for analysis:', dailySummary);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      // Continue without summary if there's an error
    }

    // Call Python AI analysis script with both answers and daily summary
    const pythonScriptPath = path.join(__dirname, '../../AI_ENV/analyze_mental_health.py');
    const analysisData = {
      answers: answers,
      dailySummary: dailySummary
    };
    const analysisDataJson = JSON.stringify(analysisData);

    const pythonExecutable = path.join(__dirname, '../../AI_ENV/venv/bin/python');
    const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, analysisDataJson], {
      cwd: path.dirname(pythonScriptPath)
    });

    let aiResponse = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      aiResponse += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('Python stderr:', data.toString());
    });

    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({ 
          message: 'AI analysis failed',
          error: errorOutput 
        });
      }

      try {
        let aiAnalysis;
        if (typeof aiResponse === 'string') {
          aiAnalysis = JSON.parse(aiResponse);
        } else {
          aiAnalysis = aiResponse;
        }
        
        // Create new assessment record
        const assessmentId = await MentalHealthAssessment.create({
          userId,
          answers,
          aiAnalysis: {
            summary: aiAnalysis.summary || 'Analysis completed',
            riskLevel: aiAnalysis.riskLevel || 'Medium',
            recommendations: aiAnalysis.recommendations || 'Please consider speaking with a mental health professional.',
            timestamp: new Date()
          }
        });

        res.json({
          message: 'Assessment completed successfully',
          assessment: {
            id: assessmentId,
            answers: answers,
            aiAnalysis: {
              summary: aiAnalysis.summary || 'Analysis completed',
              riskLevel: aiAnalysis.riskLevel || 'Medium',
              recommendations: aiAnalysis.recommendations || 'Please consider speaking with a mental health professional.',
              timestamp: new Date()
            },
            createdAt: new Date()
          }
        });

      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        res.status(500).json({ 
          message: 'Failed to parse AI analysis',
          error: parseError.message 
        });
      }
    });

  } catch (error) {
    console.error('Assessment error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get user's assessment history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Get authenticated user's ID
    const assessments = await MentalHealthAssessment.findByUserId(userId, 10);

    res.json({
      message: 'Assessment history retrieved successfully',
      assessments
    });

  } catch (error) {
    console.error('History retrieval error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve assessment history',
      error: error.message 
    });
  }
});

// Get latest assessment
router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Get authenticated user's ID
    const latestAssessment = await MentalHealthAssessment.findLatestByUserId(userId);

    if (!latestAssessment) {
      return res.json({
        message: 'No assessments found',
        assessment: null
      });
    }

    res.json({
      message: 'Latest assessment retrieved successfully',
      assessment: latestAssessment
    });

  } catch (error) {
    console.error('Latest assessment error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve latest assessment',
      error: error.message 
    });
  }
});

// Get assessment by date
router.get('/date/:date', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Get authenticated user's ID
    const { date } = req.params;
    
    // Create start and end of day for the given date
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    
    // Query MySQL database for assessment by date range
    const db = await getDatabase();
    const [rows] = await db.query(
      `SELECT * FROM MentalHealthAssessments 
       WHERE user_id = ${userId} 
       AND created_at >= '${startOfDay.toISOString()}' 
       AND created_at <= '${endOfDay.toISOString()}' 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    const assessment = rows.length > 0 ? {
      id: rows[0].id,
      userId: rows[0].user_id,
      answers: typeof rows[0].answers === 'string' ? JSON.parse(rows[0].answers) : rows[0].answers,
      aiAnalysis: typeof rows[0].ai_analysis === 'string' ? JSON.parse(rows[0].ai_analysis) : rows[0].ai_analysis,
      createdAt: rows[0].created_at,
      updatedAt: rows[0].updated_at
    } : null;
    
    if (!assessment) {
      return res.json({ 
        message: 'No assessment found for this date',
        assessment: null 
      });
    }
    
    res.json({ 
      message: 'Assessment retrieved successfully',
      assessment: assessment 
    });
  } catch (error) {
    console.error('Error fetching assessment by date:', error);
    res.status(500).json({ 
      message: 'Error fetching assessment by date',
      error: error.message 
    });
  }
});

// Get assessments by date range
router.get('/by-date', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Get authenticated user's ID
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'startDate and endDate query parameters are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Add time to end date to include the entire day
    end.setHours(23, 59, 59, 999);

    const db = await getDatabase();
    const [rows] = await db.query(
      `SELECT * FROM MentalHealthAssessments 
       WHERE user_id = ${userId} 
       AND created_at >= '${start.toISOString()}' 
       AND created_at <= '${end.toISOString()}'
       ORDER BY created_at DESC`
    );

    const assessments = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
      aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      message: 'Assessments retrieved successfully',
      assessments
    });

  } catch (error) {
    console.error('Date range assessment error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve assessments by date range',
      error: error.message 
    });
  }
});

// Get weekly health analytics
router.get('/analytics/weekly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { weekStart } = req.query; // Format: YYYY-MM-DD
    
    // Calculate week start and end dates
    const startDate = weekStart ? new Date(weekStart) : getWeekStart(new Date());
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    // Get assessments for the week
    const db = await getDatabase();
    const [rows] = await db.query(
      `SELECT * FROM MentalHealthAssessments 
       WHERE user_id = ${userId} 
       AND created_at >= '${startDate.toISOString()}' 
       AND created_at <= '${endDate.toISOString()}'
       ORDER BY created_at ASC`
    );
    
    const assessments = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
      aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    // Get daily summaries for the week
    const DailySummary = require('../models/DailySummary');
    const summaries = await DailySummary.find({
      userId: userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).sort({ date: 1 });
    
    // Generate AI analysis for the week
    const weeklyAnalysis = await generateWeeklyAnalysis(assessments, summaries);
    
    res.json({
      message: 'Weekly analytics retrieved successfully',
      weekStart: startDate.toISOString().split('T')[0],
      weekEnd: endDate.toISOString().split('T')[0],
      assessments,
      summaries,
      analytics: weeklyAnalysis
    });
    
  } catch (error) {
    console.error('Weekly analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve weekly analytics',
      error: error.message 
    });
  }
});

// Get monthly health analytics
router.get('/analytics/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { month, year } = req.query; // month: 1-12, year: YYYY
    
    // Calculate month start and end dates
    const targetMonth = month ? parseInt(month) - 1 : new Date().getMonth(); // 0-based
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    // Get assessments for the month
    const db = await getDatabase();
    const [rows] = await db.query(
      `SELECT * FROM MentalHealthAssessments 
       WHERE user_id = ${userId} 
       AND created_at >= '${startDate.toISOString()}' 
       AND created_at <= '${endDate.toISOString()}'
       ORDER BY created_at ASC`
    );
    
    const assessments = rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
      aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    // Get daily summaries for the month
    const DailySummary = require('../models/DailySummary');
    const summaries = await DailySummary.find({
      userId: userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).sort({ date: 1 });
    
    // Generate AI analysis for the month
    const monthlyAnalysis = await generateMonthlyAnalysis(assessments, summaries);
    
    res.json({
      message: 'Monthly analytics retrieved successfully',
      month: targetMonth + 1,
      year: targetYear,
      monthStart: startDate.toISOString().split('T')[0],
      monthEnd: endDate.toISOString().split('T')[0],
      assessments,
      summaries,
      analytics: monthlyAnalysis
    });
    
  } catch (error) {
    console.error('Monthly analytics error:', error);
    res.status(500).json({ 
      message: 'Failed to retrieve monthly analytics',
      error: error.message 
    });
  }
});

// Helper function to get week start (Monday)
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

// Generate weekly analysis using AI
async function generateWeeklyAnalysis(assessments, summaries) {
  if (assessments.length === 0) {
    return {
      summary: "No assessments available for this week.",
      trends: "No data to analyze.",
      insights: "Start taking daily assessments to see your weekly health trends.",
      recommendations: "Consider taking daily mental health assessments to track your progress.",
      riskLevel: "Unknown",
      moodTrend: "No data",
      stressTrend: "No data",
      sleepTrend: "No data",
      energyTrend: "No data"
    };
  }
  
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const analysisData = {
      assessments: assessments,
      summaries: summaries,
      period: 'weekly'
    };
    
    const pythonScriptPath = path.join(__dirname, '../../AI_ENV/analyze_weekly_monthly.py');
    const pythonExecutable = path.join(__dirname, '../../AI_ENV/venv/bin/python');
    const analysisDataJson = JSON.stringify(analysisData);
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, analysisDataJson], {
        cwd: path.dirname(pythonScriptPath)
      });
      
      let aiResponse = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        aiResponse += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          resolve({
            summary: "Analysis completed with some issues.",
            trends: "Unable to generate trends analysis.",
            insights: "Please try again later.",
            recommendations: "Continue taking daily assessments.",
            riskLevel: "Unknown",
            moodTrend: "No data",
            stressTrend: "No data",
            sleepTrend: "No data",
            energyTrend: "No data"
          });
          return;
        }
        
        try {
          const analysis = JSON.parse(aiResponse);
          resolve(analysis);
        } catch (parseError) {
          console.error('Error parsing weekly analysis:', parseError);
          resolve({
            summary: "Analysis completed but format unclear.",
            trends: "Unable to parse trends data.",
            insights: "Please try again later.",
            recommendations: "Continue taking daily assessments.",
            riskLevel: "Unknown",
            moodTrend: "No data",
            stressTrend: "No data",
            sleepTrend: "No data",
            energyTrend: "No data"
          });
        }
      });
    });
  } catch (error) {
    console.error('Error generating weekly analysis:', error);
    return {
      summary: "Unable to generate analysis at this time.",
      trends: "Analysis unavailable.",
      insights: "Please try again later.",
      recommendations: "Continue taking daily assessments.",
      riskLevel: "Unknown",
      moodTrend: "No data",
      stressTrend: "No data",
      sleepTrend: "No data",
      energyTrend: "No data"
    };
  }
}

// Generate monthly analysis using AI
async function generateMonthlyAnalysis(assessments, summaries) {
  if (assessments.length === 0) {
    return {
      summary: "No assessments available for this month.",
      trends: "No data to analyze.",
      insights: "Start taking daily assessments to see your monthly health trends.",
      recommendations: "Consider taking daily mental health assessments to track your progress.",
      riskLevel: "Unknown",
      moodTrend: "No data",
      stressTrend: "No data",
      sleepTrend: "No data",
      energyTrend: "No data"
    };
  }
  
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    
    const analysisData = {
      assessments: assessments,
      summaries: summaries,
      period: 'monthly'
    };
    
    const pythonScriptPath = path.join(__dirname, '../../AI_ENV/analyze_weekly_monthly.py');
    const pythonExecutable = path.join(__dirname, '../../AI_ENV/venv/bin/python');
    const analysisDataJson = JSON.stringify(analysisData);
    
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, analysisDataJson], {
        cwd: path.dirname(pythonScriptPath)
      });
      
      let aiResponse = '';
      let errorOutput = '';
      
      pythonProcess.stdout.on('data', (data) => {
        aiResponse += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('Python stderr:', data.toString());
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', errorOutput);
          resolve({
            summary: "Analysis completed with some issues.",
            trends: "Unable to generate trends analysis.",
            insights: "Please try again later.",
            recommendations: "Continue taking daily assessments.",
            riskLevel: "Unknown",
            moodTrend: "No data",
            stressTrend: "No data",
            sleepTrend: "No data",
            energyTrend: "No data"
          });
          return;
        }
        
        try {
          const analysis = JSON.parse(aiResponse);
          resolve(analysis);
        } catch (parseError) {
          console.error('Error parsing monthly analysis:', parseError);
          resolve({
            summary: "Analysis completed but format unclear.",
            trends: "Unable to parse trends data.",
            insights: "Please try again later.",
            recommendations: "Continue taking daily assessments.",
            riskLevel: "Unknown",
            moodTrend: "No data",
            stressTrend: "No data",
            sleepTrend: "No data",
            energyTrend: "No data"
          });
        }
      });
    });
  } catch (error) {
    console.error('Error generating monthly analysis:', error);
    return {
      summary: "Unable to generate analysis at this time.",
      trends: "Analysis unavailable.",
      insights: "Please try again later.",
      recommendations: "Continue taking daily assessments.",
      riskLevel: "Unknown",
      moodTrend: "No data",
      stressTrend: "No data",
      sleepTrend: "No data",
      energyTrend: "No data"
    };
  }
}

// Download comprehensive report
router.get('/download-report', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user_id; // Get authenticated user's ID
    const assessments = await MentalHealthAssessment.findByUserId(userId, 100); // Get more assessments for report

    if (assessments.length === 0) {
      return res.status(404).json({
        message: 'No assessment data available to generate report'
      });
    }

    // Generate report content
    const reportContent = generateReportContent(assessments, userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="mental-health-report-${new Date().toISOString().split('T')[0]}.txt"`);
    
    res.send(reportContent);

  } catch (error) {
    console.error('Report generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate report',
      error: error.message 
    });
  }
});

function generateReportContent(assessments, userId) {
  const currentDate = new Date().toLocaleDateString();
  
  let report = `MENTAL HEALTH ASSESSMENT REPORT
Generated on: ${currentDate}
User ID: ${userId}
Total Assessments: ${assessments.length}

${'='.repeat(60)}

SUMMARY STATISTICS
${'='.repeat(60)}

Average Stress Level: ${(assessments.reduce((sum, a) => sum + a.answers.stressLevel, 0) / assessments.length).toFixed(1)}/10
Average Mood Level: ${(assessments.reduce((sum, a) => sum + a.answers.moodLevel, 0) / assessments.length).toFixed(1)}/10
Average Sleep Hours: ${(assessments.reduce((sum, a) => sum + a.answers.sleepHours, 0) / assessments.length).toFixed(1)} hours

Risk Level Distribution:
- Low Risk: ${assessments.filter(a => a.aiAnalysis.riskLevel === 'Low').length} assessments
- Medium Risk: ${assessments.filter(a => a.aiAnalysis.riskLevel === 'Medium').length} assessments
- High Risk: ${assessments.filter(a => a.aiAnalysis.riskLevel === 'High').length} assessments

Most Common Mood: ${getMostCommonValue(assessments, 'mood')}
Most Common Anxiety Frequency: ${getMostCommonValue(assessments, 'anxietyFrequency')}
Most Common Overwhelmed Frequency: ${getMostCommonValue(assessments, 'overwhelmedFrequency')}

${'='.repeat(60)}
DETAILED ASSESSMENT HISTORY
${'='.repeat(60)}

`;

  assessments.forEach((assessment, index) => {
    const date = new Date(assessment.createdAt).toLocaleDateString();
    const time = new Date(assessment.createdAt).toLocaleTimeString();
    
    report += `Assessment #${index + 1} - ${date} at ${time}
${'-'.repeat(40)}

Mood: ${assessment.answers.mood}
Stress Level: ${assessment.answers.stressLevel}/10
Mood Level: ${assessment.answers.moodLevel}/10
Sleep Hours: ${assessment.answers.sleepHours}
Anxiety Frequency: ${assessment.answers.anxietyFrequency}
Overwhelmed Frequency: ${assessment.answers.overwhelmedFrequency}
Common Feeling: ${assessment.answers.commonFeeling || 'Not specified'}

AI Analysis:
- Risk Level: ${assessment.aiAnalysis.riskLevel}
- Summary: ${assessment.aiAnalysis.summary}
- Recommendations: ${Array.isArray(assessment.aiAnalysis.recommendations) 
  ? assessment.aiAnalysis.recommendations.join(', ') 
  : assessment.aiAnalysis.recommendations}

${'='.repeat(60)}

`;
  });

  report += `
${'='.repeat(60)}
RECOMMENDATIONS
${'='.repeat(60)}

Based on your assessment history, here are some general recommendations:

1. Monitor your stress levels regularly and practice stress management techniques
2. Maintain consistent sleep patterns for better mental health
3. Consider seeking professional help if you notice persistent high-risk assessments
4. Track your mood patterns to identify triggers and positive influences
5. Practice self-care and mindfulness techniques

This report is for informational purposes only and should not replace professional medical advice.
If you have concerns about your mental health, please consult with a qualified healthcare provider.

Report generated by HealthCare+ Mental Health Assessment System
`;

  return report;
}

function getMostCommonValue(assessments, field) {
  const counts = assessments.reduce((counts, assessment) => {
    const value = assessment.answers[field];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
  
  return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
}

module.exports = router;
