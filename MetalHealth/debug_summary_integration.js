#!/usr/bin/env node
/**
 * Debug script to check if daily summaries are being passed to AI analysis
 * Run this script to test the backend integration
 */

const { spawn } = require('child_process');
const path = require('path');

// Test data with a clear daily summary
const testData = {
  answers: {
    mood: "Sad",
    moodLevel: 3,
    stressLevel: 8,
    sleepHours: 5,
    sleepQuality: "Poor",
    anxietyFrequency: "Quite a bit",
    energyLevel: "Low",
    overwhelmedFrequency: "Extremely",
    socialConnection: "Disconnected",
    dailyFunctioning: "Poor"
  },
  dailySummary: "I had a really tough day today. My boss criticized my work in front of everyone, and I felt completely humiliated. I've been struggling with anxiety about my performance lately, and this just made everything worse."
};

console.log("=== Testing Daily Summary Integration ===\n");
console.log("Test Data:");
console.log("Assessment Answers:", JSON.stringify(testData.answers, null, 2));
console.log("Daily Summary:", testData.dailySummary);
console.log("\n" + "=".repeat(50) + "\n");

// Get the path to the Python script
const scriptPath = path.join(__dirname, 'AI_ENV', 'analyze_mental_health.py');
const pythonExecutable = path.join(__dirname, 'AI_ENV', 'venv', 'bin', 'python');
const analysisDataJson = JSON.stringify(testData);

console.log("Running AI analysis with daily summary...");
console.log("Script path:", scriptPath);
console.log("Python executable:", pythonExecutable);
console.log("Data being sent:", analysisDataJson);
console.log("\n" + "=".repeat(50) + "\n");

// Run the Python script
const pythonProcess = spawn(pythonExecutable, [scriptPath, analysisDataJson], {
  cwd: path.dirname(scriptPath)
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
  console.log(`Python process exited with code: ${code}`);
  
  if (code !== 0) {
    console.error('Python script error:', errorOutput);
    process.exit(1);
  }

  try {
    let aiAnalysis;
    if (typeof aiResponse === 'string') {
      aiAnalysis = JSON.parse(aiResponse);
    } else {
      aiAnalysis = aiResponse;
    }
    
    console.log("✅ Analysis completed successfully!");
    console.log("\nAI Analysis Result:");
    console.log("Summary:", aiAnalysis.summary || 'N/A');
    console.log("Risk Level:", aiAnalysis.riskLevel || 'N/A');
    console.log("Recommendations:", aiAnalysis.recommendations || 'N/A');
    
    // Check if the analysis mentions content from the daily summary
    const summaryText = (aiAnalysis.summary || '').toLowerCase();
    const recommendationsText = Array.isArray(aiAnalysis.recommendations) 
      ? aiAnalysis.recommendations.join(' ').toLowerCase()
      : (aiAnalysis.recommendations || '').toLowerCase();
    
    // Keywords from the daily summary that should appear in analysis
    const summaryKeywords = ['boss', 'criticized', 'humiliated', 'performance', 'work', 'anxiety'];
    
    const foundKeywords = [];
    for (const keyword of summaryKeywords) {
      if (summaryText.includes(keyword) || recommendationsText.includes(keyword)) {
        foundKeywords.push(keyword);
      }
    }
    
    console.log(`\n🔍 Keywords from daily summary found in analysis: ${foundKeywords.join(', ')}`);
    
    if (foundKeywords.length > 0) {
      console.log("✅ SUCCESS: Daily summary content is being used in the analysis!");
      console.log(`   Found ${foundKeywords.length} keywords: ${foundKeywords.join(', ')}`);
    } else {
      console.log("⚠️  WARNING: No keywords from daily summary found in analysis");
      console.log("   This might indicate the summary is not being properly integrated");
    }
    
    // Show the full analysis for debugging
    console.log("\n" + "=".repeat(50));
    console.log("FULL ANALYSIS RESULT:");
    console.log(JSON.stringify(aiAnalysis, null, 2));
    
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    console.log('Raw response:', aiResponse);
    process.exit(1);
  }
});

pythonProcess.on('error', (error) => {
  console.error('Failed to start Python process:', error);
  process.exit(1);
});
