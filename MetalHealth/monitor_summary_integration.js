#!/usr/bin/env node
/**
 * Backend Log Monitor for Daily Summary Integration
 * This script helps monitor the backend logs to see if daily summaries are being processed
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function monitorBackendLogs() {
  console.log(colorize("🔍 Daily Summary Integration Monitor", "cyan"));
  console.log(colorize("=" * 50, "cyan"));
  console.log("Monitoring backend logs for daily summary processing...\n");
  
  console.log(colorize("📋 What to look for in the logs:", "yellow"));
  console.log("1. " + colorize("'Found daily summary for analysis:'", "green") + " - Summary is being retrieved");
  console.log("2. " + colorize("'Received assessment data:'", "green") + " - Assessment data includes summary");
  console.log("3. " + colorize("'Error fetching daily summary:'", "red") + " - Summary retrieval failed");
  console.log("4. " + colorize("'Assessment completed successfully'", "green") + " - Analysis completed");
  
  console.log("\n" + colorize("📊 Key Integration Points:", "yellow"));
  console.log("• " + colorize("Line 78-80", "blue") + " in mentalhealth.js: Logs when summary is found");
  console.log("• " + colorize("Line 88-92", "blue") + " in mentalhealth.js: Summary passed to AI script");
  console.log("• " + colorize("Line 87-98", "blue") + " in analyze_mental_health.py: Summary included in prompt");
  
  console.log("\n" + colorize("🧪 Test Scenarios:", "yellow"));
  console.log("1. " + colorize("Take assessment WITHOUT writing summary first", "magenta"));
  console.log("2. " + colorize("Write daily summary, then take assessment", "magenta"));
  console.log("3. " + colorize("Take assessment, then write summary", "magenta"));
  
  console.log("\n" + colorize("✅ Expected Behavior:", "green"));
  console.log("• When summary exists: Should see 'Found daily summary for analysis:'");
  console.log("• When no summary: Should continue without error");
  console.log("• Analysis should be different with vs without summary");
  
  console.log("\n" + colorize("❌ Potential Issues:", "red"));
  console.log("• No 'Found daily summary' message when summary exists");
  console.log("• 'Error fetching daily summary' messages");
  console.log("• Analysis results identical with/without summary");
  
  console.log("\n" + colorize("🔧 Debug Commands:", "yellow"));
  console.log("• Check MongoDB: " + colorize("mongo mental_health --eval 'db.dailysummaries.find().pretty()'", "blue"));
  console.log("• Check assessment data: " + colorize("mongo mental_health --eval 'db.mentalhealthassessments.find().sort({createdAt:-1}).limit(1).pretty()'", "blue"));
  console.log("• Test Python script: " + colorize("node debug_summary_integration.js", "blue"));
  
  console.log("\n" + colorize("📝 Manual Test Steps:", "yellow"));
  console.log("1. Start backend server: " + colorize("cd base && npm start", "blue"));
  console.log("2. Open browser to: " + colorize("http://localhost:4200", "blue"));
  console.log("3. Login and go to home page");
  console.log("4. Write a daily summary with specific keywords (e.g., 'work stress', 'boss criticism')");
  console.log("5. Take the daily assessment");
  console.log("6. Check if analysis mentions the specific keywords from your summary");
  
  console.log("\n" + colorize("🎯 Quick Verification:", "green"));
  console.log("Run this command to test the integration:");
  console.log(colorize("node debug_summary_integration.js", "blue"));
  console.log("This will show if keywords from the test summary appear in the AI analysis.");
}

function showCodeFlow() {
  console.log("\n" + colorize("🔄 Code Flow for Daily Summary Integration:", "cyan"));
  console.log("=" * 60);
  
  console.log("\n" + colorize("1. Frontend (home.ts):", "yellow"));
  console.log("   • User writes daily summary");
  console.log("   • Calls saveDailySummary() API");
  
  console.log("\n" + colorize("2. Backend (dailysummary.js):", "yellow"));
  console.log("   • POST /api/dailysummary");
  console.log("   • Saves summary to MongoDB");
  console.log("   • Analyzes summary with AI");
  
  console.log("\n" + colorize("3. Assessment Integration (mentalhealth.js):", "yellow"));
  console.log("   • POST /api/mentalhealth/assessment");
  console.log("   • Lines 66-84: Retrieves today's summary");
  console.log("   • Lines 88-92: Passes summary to AI script");
  
  console.log("\n" + colorize("4. AI Analysis (analyze_mental_health.py):", "yellow"));
  console.log("   • Lines 87-98: Includes summary in prompt if available");
  console.log("   • Lines 204-205: Calls Gemini with summary data");
  
  console.log("\n" + colorize("5. Response:", "yellow"));
  console.log("   • AI analysis includes summary content");
  console.log("   • More personalized recommendations");
  console.log("   • Different risk assessment");
}

function showDatabaseQueries() {
  console.log("\n" + colorize("🗄️ Database Queries to Check Integration:", "cyan"));
  console.log("=" * 50);
  
  console.log("\n" + colorize("Check if summaries exist:", "yellow"));
  console.log(colorize("mongo mental_health --eval 'db.dailysummaries.find({userId: YOUR_USER_ID}).pretty()'", "blue"));
  
  console.log("\n" + colorize("Check latest assessment:", "yellow"));
  console.log(colorize("mongo mental_health --eval 'db.mentalhealthassessments.find().sort({createdAt:-1}).limit(1).pretty()'", "blue"));
  
  console.log("\n" + colorize("Count summaries by date:", "yellow"));
  console.log(colorize("mongo mental_health --eval 'db.dailysummaries.aggregate([{$group:{_id:\"$date\", count:{$sum:1}}}])'", "blue"));
  
  console.log("\n" + colorize("Check assessment with summary data:", "yellow"));
  console.log(colorize("mongo mental_health --eval 'db.mentalhealthassessments.find({\"answers.dailySummary\":{$exists:true}}).pretty()'", "blue"));
}

function main() {
  console.clear();
  monitorBackendLogs();
  showCodeFlow();
  showDatabaseQueries();
  
  console.log("\n" + colorize("🚀 Ready to monitor! Start your backend server and watch the logs.", "green"));
  console.log(colorize("Press Ctrl+C to exit this monitor.", "yellow"));
}

main();
