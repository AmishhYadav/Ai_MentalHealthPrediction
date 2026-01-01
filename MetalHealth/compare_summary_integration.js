#!/usr/bin/env node
/**
 * Test script to compare analysis with and without daily summary
 */

const { spawn } = require('child_process');
const path = require('path');

function runAnalysis(testData, testName) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== ${testName} ===\n`);
    console.log("Test Data:");
    console.log("Assessment Answers:", JSON.stringify(testData.answers, null, 2));
    console.log("Daily Summary:", testData.dailySummary || "None");
    console.log("\n" + "=".repeat(50) + "\n");

    const scriptPath = path.join(__dirname, 'AI_ENV', 'analyze_mental_health.py');
    const pythonExecutable = path.join(__dirname, 'AI_ENV', 'venv', 'bin', 'python');
    const analysisDataJson = JSON.stringify(testData);

    console.log("Running AI analysis...");

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
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        reject(new Error(`Script failed with code ${code}`));
        return;
      }

      try {
        const aiAnalysis = JSON.parse(aiResponse);
        console.log("✅ Analysis completed successfully!");
        console.log("\nAI Analysis Result:");
        console.log("Summary:", aiAnalysis.summary || 'N/A');
        console.log("Risk Level:", aiAnalysis.riskLevel || 'N/A');
        
        // Show first recommendation for brevity
        const recommendations = aiAnalysis.recommendations;
        if (Array.isArray(recommendations) && recommendations.length > 0) {
          console.log("First Recommendation:", recommendations[0]);
        } else {
          console.log("Recommendations:", recommendations || 'N/A');
        }
        
        resolve(aiAnalysis);
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.log('Raw response:', aiResponse);
        reject(parseError);
      }
    });

    pythonProcess.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log("Daily Summary Integration Comparison Test");
  console.log("=" * 50);

  // Test data with daily summary
  const testDataWithSummary = {
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

  // Test data without daily summary
  const testDataWithoutSummary = {
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
    dailySummary: null
  };

  try {
    // Run both tests
    const analysisWithSummary = await runAnalysis(testDataWithSummary, "Test WITH Daily Summary");
    const analysisWithoutSummary = await runAnalysis(testDataWithoutSummary, "Test WITHOUT Daily Summary");

    // Compare the results
    console.log("\n" + "=".repeat(60));
    console.log("=== COMPARISON RESULTS ===");
    console.log("=".repeat(60));

    console.log("\n📊 SUMMARY COMPARISON:");
    console.log("With Summary Length:", analysisWithSummary.summary?.length || 0, "characters");
    console.log("Without Summary Length:", analysisWithoutSummary.summary?.length || 0, "characters");

    console.log("\n🎯 RISK LEVEL COMPARISON:");
    console.log("With Summary:", analysisWithSummary.riskLevel);
    console.log("Without Summary:", analysisWithoutSummary.riskLevel);

    // Check for specific keywords from the daily summary
    const summaryText = (analysisWithSummary.summary || '').toLowerCase();
    const recommendationsText = Array.isArray(analysisWithSummary.recommendations) 
      ? analysisWithSummary.recommendations.join(' ').toLowerCase()
      : (analysisWithSummary.recommendations || '').toLowerCase();

    const summaryKeywords = ['boss', 'criticized', 'humiliated', 'performance', 'work', 'anxiety', 'workplace'];
    const foundKeywords = summaryKeywords.filter(keyword => 
      summaryText.includes(keyword) || recommendationsText.includes(keyword)
    );

    console.log("\n🔍 KEYWORDS FROM DAILY SUMMARY FOUND:");
    console.log("Keywords found:", foundKeywords.join(', ') || 'None');
    console.log("Total keywords found:", foundKeywords.length);

    if (foundKeywords.length > 0) {
      console.log("\n✅ CONCLUSION: Daily summary IS being used in the analysis!");
      console.log("   The AI analysis includes specific content from the user's daily summary.");
    } else {
      console.log("\n⚠️  CONCLUSION: Daily summary may NOT be properly integrated.");
      console.log("   No specific content from the daily summary was found in the analysis.");
    }

    // Check if the analyses are different
    const summariesAreDifferent = analysisWithSummary.summary !== analysisWithoutSummary.summary;
    const riskLevelsAreDifferent = analysisWithSummary.riskLevel !== analysisWithoutSummary.riskLevel;

    console.log("\n📈 ANALYSIS DIFFERENCES:");
    console.log("Summaries are different:", summariesAreDifferent ? "✅ YES" : "❌ NO");
    console.log("Risk levels are different:", riskLevelsAreDifferent ? "✅ YES" : "❌ NO");

    if (summariesAreDifferent || riskLevelsAreDifferent) {
      console.log("\n🎉 SUCCESS: The daily summary is affecting the analysis!");
    } else {
      console.log("\n⚠️  WARNING: The daily summary may not be affecting the analysis.");
    }

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
