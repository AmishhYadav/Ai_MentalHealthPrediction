#!/usr/bin/env python3
"""
Weekly and Monthly Mental Health Analytics
This script analyzes multiple assessments and daily summaries to provide comprehensive health insights.
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta
from dotenv import load_dotenv
import statistics

load_dotenv()

MODEL = "gemini-2.5-flash"
API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

def get_api_key(env_var_name="GOOGLE_API_KEY_1"):
    """Get API key from environment variables."""
    key = os.getenv(env_var_name)
    if not key:
        return None
    return key.strip().strip('"').strip("'")

def extract_text_from_response(resp):
    """Safely extract human-readable text from Gemini responses."""
    if resp is None:
        return ""

    texts = []
    if isinstance(resp, dict):
        if "candidates" in resp and isinstance(resp["candidates"], list):
            for c in resp["candidates"]:
                content = c.get("content")
                if isinstance(content, dict) and "parts" in content:
                    for part in content["parts"]:
                        if isinstance(part, dict) and "text" in part:
                            texts.append(part["text"])
                elif isinstance(content, str):
                    texts.append(content)

    cleaned = [t.strip() for t in texts if isinstance(t, str) and t.strip()]
    return "\n".join(cleaned).strip()

def call_gemini(api_key, prompt, model=MODEL):
    """Call the Gemini API and return extracted text."""
    url = API_URL_TEMPLATE.format(model=model, api_key=api_key)
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}
    
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=60)
        if not r.ok:
            return f"[ERROR] HTTP {r.status_code}: {r.text}"
        resp = r.json()
    except requests.exceptions.Timeout:
        return f"[ERROR] Request timeout - API took too long to respond"
    except requests.exceptions.ConnectionError:
        return f"[ERROR] Connection error - Unable to reach API"
    except Exception as e:
        return f"[ERROR] {e}"
    
    return extract_text_from_response(resp)

def calculate_trends(assessments):
    """Calculate trends from assessment data."""
    if len(assessments) < 2:
        return {
            "moodTrend": "Insufficient data",
            "stressTrend": "Insufficient data", 
            "sleepTrend": "Insufficient data",
            "energyTrend": "Insufficient data"
        }
    
    # Extract data points
    mood_levels = [a['answers'].get('moodLevel', 5) for a in assessments]
    stress_levels = [a['answers'].get('stressLevel', 5) for a in assessments]
    sleep_hours = [a['answers'].get('sleepHours', 8) for a in assessments]
    energy_levels = [a['answers'].get('energyLevel', 'Moderate') for a in assessments]
    
    # Convert energy levels to numbers for trend calculation
    energy_map = {'Very low': 1, 'Low': 2, 'Moderate': 3, 'High': 4, 'Very high': 5}
    energy_nums = [energy_map.get(e, 3) for e in energy_levels]
    
    def calculate_trend(values):
        if len(values) < 2:
            return "Insufficient data"
        
        # Simple linear trend calculation
        n = len(values)
        x = list(range(n))
        y = values
        
        # Calculate slope
        x_mean = sum(x) / n
        y_mean = sum(y) / n
        
        numerator = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(n))
        denominator = sum((x[i] - x_mean) ** 2 for i in range(n))
        
        if denominator == 0:
            return "No change"
        
        slope = numerator / denominator
        
        if slope > 0.1:
            return "Improving"
        elif slope < -0.1:
            return "Declining"
        else:
            return "Stable"
    
    return {
        "moodTrend": calculate_trend(mood_levels),
        "stressTrend": calculate_trend(stress_levels),
        "sleepTrend": calculate_trend(sleep_hours),
        "energyTrend": calculate_trend(energy_nums)
    }

def calculate_statistics(assessments):
    """Calculate basic statistics from assessments."""
    if not assessments:
        return {}
    
    mood_levels = [a['answers'].get('moodLevel', 5) for a in assessments]
    stress_levels = [a['answers'].get('stressLevel', 5) for a in assessments]
    sleep_hours = [a['answers'].get('sleepHours', 8) for a in assessments]
    
    # Risk level distribution
    risk_levels = [a['aiAnalysis'].get('riskLevel', 'Medium') for a in assessments]
    risk_counts = {}
    for risk in risk_levels:
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
    
    return {
        "averageMood": round(statistics.mean(mood_levels), 1),
        "averageStress": round(statistics.mean(stress_levels), 1),
        "averageSleep": round(statistics.mean(sleep_hours), 1),
        "moodRange": f"{min(mood_levels)}-{max(mood_levels)}",
        "stressRange": f"{min(stress_levels)}-{max(stress_levels)}",
        "sleepRange": f"{min(sleep_hours):.1f}-{max(sleep_hours):.1f}",
        "riskDistribution": risk_counts,
        "totalAssessments": len(assessments)
    }

def build_analytics_prompt(assessments, summaries, period, stats, trends):
    """Build the prompt for weekly/monthly analysis."""
    
    period_name = "week" if period == "weekly" else "month"
    period_plural = "weeks" if period == "weekly" else "months"
    
    instruction = f"""You are an expert clinical psychologist and mental health AI with 20+ years of experience in longitudinal mental health assessment and trend analysis. Analyze the following {period} mental health data and provide comprehensive insights about patterns, trends, and recommendations.

CLINICAL ANALYSIS FRAMEWORK:
- Apply evidence-based psychological assessment principles for longitudinal analysis
- Identify patterns, trends, and correlations across the {period}
- Consider both individual daily variations and overall {period}ly patterns
- Provide specific, actionable recommendations based on observed trends
- Focus on protective factors, areas of concern, and intervention opportunities
- Use clinical judgment to assess overall mental health trajectory

{period.upper()} MENTAL HEALTH DATA:

ASSESSMENT STATISTICS:
• Total Assessments: {stats.get('totalAssessments', 0)}
• Average Mood Level: {stats.get('averageMood', 'N/A')}/10
• Average Stress Level: {stats.get('averageStress', 'N/A')}/10
• Average Sleep Hours: {stats.get('averageSleep', 'N/A')} hours
• Mood Range: {stats.get('moodRange', 'N/A')}
• Stress Range: {stats.get('stressRange', 'N/A')}
• Sleep Range: {stats.get('sleepRange', 'N/A')} hours
• Risk Level Distribution: {stats.get('riskDistribution', {})}

TREND ANALYSIS:
• Mood Trend: {trends.get('moodTrend', 'Unknown')}
• Stress Trend: {trends.get('stressTrend', 'Unknown')}
• Sleep Trend: {trends.get('sleepTrend', 'Unknown')}
• Energy Trend: {trends.get('energyTrend', 'Unknown')}

DAILY ASSESSMENT DETAILS:
"""

    # Add assessment details
    for i, assessment in enumerate(assessments[:10]):  # Limit to first 10 for prompt length
        date = assessment.get('createdAt', 'Unknown date')
        answers = assessment.get('answers', {})
        ai_analysis = assessment.get('aiAnalysis', {})
        
        instruction += f"""
Day {i+1} ({date.split('T')[0]}):
• Mood: {answers.get('mood', 'N/A')} (Level: {answers.get('moodLevel', 'N/A')}/10)
• Stress: {answers.get('stressLevel', 'N/A')}/10
• Sleep: {answers.get('sleepHours', 'N/A')} hours ({answers.get('sleepQuality', 'N/A')})
• Energy: {answers.get('energyLevel', 'N/A')}
• Anxiety: {answers.get('anxietyFrequency', 'N/A')}
• Overwhelm: {answers.get('overwhelmedFrequency', 'N/A')}
• Social Connection: {answers.get('socialConnection', 'N/A')}
• Daily Functioning: {answers.get('dailyFunctioning', 'N/A')}
• Risk Level: {ai_analysis.get('riskLevel', 'Unknown')}
"""

    # Add daily summaries if available
    if summaries:
        instruction += f"\nDAILY SUMMARIES ({len(summaries)} entries):\n"
        for summary in summaries[:5]:  # Limit to first 5 summaries
            date = summary.get('date', 'Unknown date')
            summary_text = summary.get('summary', 'No summary')
            instruction += f"\n{date}: {summary_text}\n"

    instruction += f"""

CLINICAL TREND ANALYSIS CRITERIA:

MOOD PATTERNS:
- Improving: Consistent upward trend in mood levels
- Declining: Consistent downward trend in mood levels  
- Stable: Minimal variation in mood levels
- Volatile: High variability with no clear trend

STRESS PATTERNS:
- Improving: Decreasing stress levels over time
- Declining: Increasing stress levels over time
- Stable: Consistent stress levels
- Volatile: High variability in stress levels

SLEEP PATTERNS:
- Improving: Increasing sleep hours and quality
- Declining: Decreasing sleep hours and quality
- Stable: Consistent sleep patterns
- Volatile: High variability in sleep duration

ENERGY PATTERNS:
- Improving: Increasing energy levels
- Declining: Decreasing energy levels
- Stable: Consistent energy levels
- Volatile: High variability in energy

RISK ASSESSMENT:
- Low Risk: Predominantly low risk assessments, stable or improving trends
- Medium Risk: Mixed risk levels, some concerning patterns
- High Risk: Predominantly high risk assessments, declining trends

REQUIRED OUTPUT FORMAT (JSON only, no markdown):
{{
  "summary": "Provide a comprehensive {period}ly mental health summary (4-5 sentences). Focus on overall patterns, key trends, and clinical significance. Example: 'Over the past {period}, your mental health shows [trend description]. Key patterns include [specific patterns]. The data suggests [clinical insights]. Overall, [assessment of progress/concerns].'",
  "trends": "Detailed analysis of specific trends observed (3-4 sentences). Focus on mood, stress, sleep, and energy patterns. Identify any concerning or positive patterns.",
  "insights": "Clinical insights and observations (3-4 sentences). Focus on what the data reveals about mental health patterns, triggers, and protective factors.",
  "recommendations": "Specific, actionable recommendations for the next {period} (4-6 items). Include both immediate actions and longer-term strategies.",
  "riskLevel": "Low/Medium/High - Overall risk assessment based on {period}ly patterns and trends",
  "moodTrend": "{trends.get('moodTrend', 'Unknown')}",
  "stressTrend": "{trends.get('stressTrend', 'Unknown')}",
  "sleepTrend": "{trends.get('sleepTrend', 'Unknown')}",
  "energyTrend": "{trends.get('energyTrend', 'Unknown')}"
}}

ANALYSIS GUIDELINES:
- Focus on patterns and trends rather than individual daily scores
- Identify both positive and concerning patterns
- Provide specific, actionable recommendations
- Consider the relationship between different metrics (mood, stress, sleep, energy)
- Use clinical terminology appropriately
- Focus on the overall trajectory and patterns
- Consider both individual daily variations and overall {period}ly trends

CRITICAL: Return ONLY valid JSON. No markdown formatting, no additional text, no explanations outside the JSON structure.
"""
    
    return instruction

def analyze_weekly_monthly(analysis_data_json):
    """Main function to analyze weekly/monthly mental health data."""
    try:
        # Parse the input JSON
        analysis_data = json.loads(analysis_data_json)
        assessments = analysis_data.get('assessments', [])
        summaries = analysis_data.get('summaries', [])
        period = analysis_data.get('period', 'weekly')
        
        # Get API key
        api_key = get_api_key()
        if not api_key:
            return json.dumps({
                "error": "API key not found",
                "summary": "Unable to perform analysis",
                "trends": "Analysis unavailable",
                "insights": "Please contact a mental health professional",
                "recommendations": "Please try again later",
                "riskLevel": "Unknown",
                "moodTrend": "Unknown",
                "stressTrend": "Unknown", 
                "sleepTrend": "Unknown",
                "energyTrend": "Unknown"
            })
        
        # Calculate statistics and trends
        stats = calculate_statistics(assessments)
        trends = calculate_trends(assessments)
        
        # Build prompt and call Gemini
        prompt = build_analytics_prompt(assessments, summaries, period, stats, trends)
        gemini_response = call_gemini(api_key, prompt)
        
        # Check if Gemini returned an error
        if gemini_response.startswith('[ERROR]'):
            return json.dumps({
                "error": "AI analysis failed",
                "summary": f"{period.title()} analysis completed with limited functionality",
                "trends": f"Basic trend analysis: Mood {trends.get('moodTrend', 'Unknown')}, Stress {trends.get('stressTrend', 'Unknown')}",
                "insights": "AI analysis unavailable - using basic statistical analysis",
                "recommendations": "Continue taking daily assessments and consider consulting a mental health professional",
                "riskLevel": "Medium",  # Safe default
                "moodTrend": trends.get('moodTrend', 'Unknown'),
                "stressTrend": trends.get('stressTrend', 'Unknown'),
                "sleepTrend": trends.get('sleepTrend', 'Unknown'),
                "energyTrend": trends.get('energyTrend', 'Unknown')
            })
        
        # Clean up the response and try to parse JSON
        cleaned_response = gemini_response.strip()
        
        # Remove markdown code blocks if present
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]  # Remove ```
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove ```
        
        cleaned_response = cleaned_response.strip()
        
        # Try to parse the JSON response
        try:
            analysis = json.loads(cleaned_response)
            
            # Validate required fields and provide defaults if missing
            required_fields = ['summary', 'trends', 'insights', 'recommendations', 'riskLevel']
            for field in required_fields:
                if field not in analysis or not analysis[field]:
                    if field == 'summary':
                        analysis[field] = f"Analysis completed for the {period}."
                    elif field == 'trends':
                        analysis[field] = "Trend analysis completed."
                    elif field == 'insights':
                        analysis[field] = "Please continue monitoring your mental health."
                    elif field == 'recommendations':
                        analysis[field] = "Continue taking daily assessments."
                    elif field == 'riskLevel':
                        analysis[field] = "Medium"
            
            # Ensure trend fields are present
            trend_fields = ['moodTrend', 'stressTrend', 'sleepTrend', 'energyTrend']
            for field in trend_fields:
                if field not in analysis:
                    analysis[field] = trends.get(field, 'Unknown')
                
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response was: {cleaned_response[:200]}...")
            
            # If response is not valid JSON, create a structured response
            analysis = {
                "summary": f"Analysis completed for the {period}. Raw response: {cleaned_response[:200]}...",
                "trends": "Trend analysis completed.",
                "insights": "Please continue monitoring your mental health.",
                "recommendations": "Continue taking daily assessments.",
                "riskLevel": "Medium",
                "moodTrend": trends.get('moodTrend', 'Unknown'),
                "stressTrend": trends.get('stressTrend', 'Unknown'),
                "sleepTrend": trends.get('sleepTrend', 'Unknown'),
                "energyTrend": trends.get('energyTrend', 'Unknown')
            }
        
        # Add timestamp
        analysis["timestamp"] = datetime.now().isoformat()
        
        return json.dumps(analysis)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "summary": "Analysis failed",
            "trends": "Analysis unavailable",
            "insights": "Please try again later",
            "recommendations": "Please try again or contact support",
            "riskLevel": "Unknown",
            "moodTrend": "Unknown",
            "stressTrend": "Unknown",
            "sleepTrend": "Unknown", 
            "energyTrend": "Unknown"
        })

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Invalid arguments"}), file=sys.stdout)
        sys.exit(1)
    
    analysis_data_json = sys.argv[1]
    result = analyze_weekly_monthly(analysis_data_json)
    print(result, file=sys.stdout)
    sys.stdout.flush()
