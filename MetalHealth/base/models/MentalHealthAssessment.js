const { getDatabase } = require('../config/database');

class MentalHealthAssessment {
  constructor(assessmentData) {
    this.userId = assessmentData.userId;
    this.answers = assessmentData.answers;
    this.aiAnalysis = assessmentData.aiAnalysis;
    this.createdAt = assessmentData.createdAt || new Date();
    this.updatedAt = assessmentData.updatedAt || new Date();
  }

  // Create new assessment
  static async create(assessmentData) {
    try {
      const db = await getDatabase();
      const now = new Date();
      const mysqlDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const [result] = await db.query(
        `INSERT INTO MentalHealthAssessments 
         (user_id, answers, ai_analysis, created_at, updated_at) 
         VALUES (${assessmentData.userId}, '${JSON.stringify(assessmentData.answers)}', '${JSON.stringify(assessmentData.aiAnalysis)}', '${mysqlDateTime}', '${mysqlDateTime}')`
      );
      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Find assessments by user ID
  static async findByUserId(userId, limit = 10) {
    try {
      const db = await getDatabase();
      
      // Convert parameters to proper types and escape them
      const userIdInt = parseInt(userId);
      const limitInt = parseInt(limit);
      
      // Use query instead of execute for now to avoid prepared statement issues
      const [rows] = await db.query(
        `SELECT * FROM MentalHealthAssessments 
         WHERE user_id = ${userIdInt} 
         ORDER BY created_at DESC 
         LIMIT ${limitInt}`
      );
      
      return rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
        aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Find latest assessment by user ID
  static async findLatestByUserId(userId) {
    try {
      const db = await getDatabase();
      const userIdInt = parseInt(userId);
      const [rows] = await db.query(
        `SELECT * FROM MentalHealthAssessments 
         WHERE user_id = ${userIdInt} 
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
        aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      throw error;
    }
  }

  // Find assessment by ID
  static async findById(id) {
    try {
      const db = await getDatabase();
      const idInt = parseInt(id);
      const [rows] = await db.query(
        `SELECT * FROM MentalHealthAssessments WHERE id = ${idInt}`
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const row = rows[0];
      return {
        id: row.id,
        userId: row.user_id,
        answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
        aiAnalysis: typeof row.ai_analysis === 'string' ? JSON.parse(row.ai_analysis) : row.ai_analysis,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MentalHealthAssessment;
