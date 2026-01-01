#!/usr/bin/env python3
import os
import sys
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

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
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        if not r.ok:
            return f"[ERROR] HTTP {r.status_code}: {r.text}"
        resp = r.json()
    except Exception as e:
        return f"[ERROR] {e}"
    
    return extract_text_from_response(resp)

def build_analysis_prompt(answers, daily_summary=None):
    """Build the prompt for mental health analysis."""
    instruction = (
        "You are an expert clinical psychologist and mental health AI with 20+ years of experience in daily mental health assessment and crisis intervention. "
        "Analyze the following daily mental health check-in data and provide a comprehensive, clinically-informed analysis that goes beyond simply restating the data.\n\n"
        
        "CLINICAL ANALYSIS FRAMEWORK:\n"
        "- Apply evidence-based psychological assessment principles and clinical judgment\n"
        "- Use validated mental health screening criteria (PHQ-9, GAD-7, PSS-10)\n"
        "- Identify patterns, correlations, and clinical significance in the data\n"
        "- Consider both immediate concerns and underlying psychological processes\n"
        "- Provide specific, actionable recommendations based on clinical best practices\n"
        "- Focus on protective factors, strengths, and areas for intervention\n"
        "- Avoid simply restating the data - provide meaningful clinical insights\n\n"
        
        "DAILY MENTAL HEALTH CHECK-IN DATA:\n\n"
        
        "CORE DAILY METRICS:\n"
        f"• Mood Today: {answers.get('mood', 'Not specified')}\n"
        f"• Mood Level (1-10): {answers.get('moodLevel', 'Not specified')} {'(Positive mood)' if answers.get('moodLevel', 0) >= 7 else '(Neutral mood)' if answers.get('moodLevel', 0) >= 4 else '(Low mood)'}\n"
        f"• Stress Level (1-10): {answers.get('stressLevel', 'Not specified')} {'(High stress)' if answers.get('stressLevel', 0) >= 8 else '(Moderate stress)' if answers.get('stressLevel', 0) >= 5 else '(Low stress)'}\n"
        f"• Sleep Hours: {answers.get('sleepHours', 'Not specified')} {'(Adequate sleep)' if 7 <= answers.get('sleepHours', 0) <= 9 else '(Sleep concerns)' if answers.get('sleepHours', 0) < 6 or answers.get('sleepHours', 0) > 10 else '(Moderate sleep)'}\n"
        f"• Sleep Quality: {answers.get('sleepQuality', 'Not specified')}\n"
        f"• Anxiety Level: {answers.get('anxietyFrequency', 'Not specified')}\n"
        f"• Energy Level: {answers.get('energyLevel', 'Not specified')}\n"
        f"• Overwhelm Level: {answers.get('overwhelmedFrequency', 'Not specified')}\n"
        f"• Social Connection: {answers.get('socialConnection', 'Not specified')}\n"
        f"• Daily Functioning: {answers.get('dailyFunctioning', 'Not specified')}\n\n"
    )
    
    # Add daily summary if available
    if daily_summary and daily_summary.strip():
        instruction += (
            "PERSONAL REFLECTION (Daily Summary):\n"
            f'"{daily_summary}"\n\n'
            "CLINICAL NOTE: This personal reflection provides crucial qualitative data about the user's internal state, "
            "thoughts, emotions, and experiences. Use this to:\n"
            "- Identify patterns and themes not captured in structured data\n"
            "- Understand the user's subjective experience\n"
            "- Detect subtle warning signs or positive indicators\n"
            "- Provide more personalized and contextually relevant recommendations\n\n"
        )
    
    instruction += (
        "CLINICAL CONDITION ASSESSMENT:\n\n"
        "Evaluate for these clinical presentations:\n"
        "- Major Depressive Episode: Persistent low mood, anhedonia, sleep disturbances, fatigue, concentration difficulties\n"
        "- Generalized Anxiety Disorder: Excessive worry, restlessness, fatigue, concentration problems, sleep disturbances\n"
        "- Mixed Anxiety-Depressive Disorder: Combination of anxiety and depressive symptoms without meeting full criteria for either\n"
        "- Adjustment Disorder: Emotional or behavioral symptoms in response to identifiable stressors\n"
        "- Sleep Disorders: Insomnia, hypersomnia, or circadian rhythm disturbances affecting daily functioning\n"
        "- Social Anxiety Disorder: Fear of social situations, avoidance behaviors, significant distress\n"
        "- Acute Stress Reaction: Symptoms following exposure to traumatic or stressful events\n"
        "- Burnout Syndrome: Emotional exhaustion, depersonalization, reduced personal accomplishment\n\n"
        
        "CONDITION-SPECIFIC ANALYSIS CRITERIA:\n\n"
        "DEPRESSION & MOOD DISORDERS:\n"
        "- Major Depression: Persistent sadness, loss of interest, fatigue, concentration issues, suicidal thoughts\n"
        "- Bipolar Disorder: Mood swings, periods of mania/hypomania alternating with depression\n"
        "- Seasonal Affective Disorder: Depression related to seasonal changes\n\n"
        
        "ANXIETY DISORDERS:\n"
        "- Generalized Anxiety: Excessive worry, restlessness, fatigue, concentration issues\n"
        "- Panic Disorder: Recurrent panic attacks, fear of future attacks\n"
        "- Social Anxiety: Fear of social situations, avoidance behaviors\n"
        "- Phobias: Specific fears causing significant distress\n\n"
        
        "TRAUMA & STRESS DISORDERS:\n"
        "- PTSD: Trauma exposure, flashbacks, nightmares, hypervigilance, avoidance\n"
        "- Acute Stress Disorder: Similar to PTSD but shorter duration\n"
        "- Adjustment Disorder: Difficulty coping with life changes\n\n"
        
        "EATING DISORDERS:\n"
        "- Anorexia: Restriction, body image distortion, fear of weight gain\n"
        "- Bulimia: Binge eating followed by compensatory behaviors\n"
        "- Binge Eating: Recurrent episodes of overeating without compensation\n\n"
        
        "ATTENTION & NEURODEVELOPMENTAL:\n"
        "- ADHD: Inattention, hyperactivity, impulsivity affecting daily functioning\n"
        "- Learning Disabilities: Academic difficulties despite normal intelligence\n\n"
        
        "SUBSTANCE USE DISORDERS:\n"
        "- Alcohol Use Disorder: Problematic alcohol consumption\n"
        "- Drug Use Disorder: Problematic use of substances\n"
        "- Dependence: Physical or psychological dependence on substances\n\n"
        
        "SLEEP DISORDERS:\n"
        "- Insomnia: Difficulty falling or staying asleep\n"
        "- Sleep Apnea: Breathing interruptions during sleep\n"
        "- Circadian Rhythm Disorders: Sleep-wake cycle disruptions\n\n"
        
        "RISK ASSESSMENT CRITERIA:\n"
        "HIGH RISK: Suicidal ideation, self-harm, severe depression, psychosis, substance abuse, crisis situations, severe functional impairment\n"
        "MEDIUM RISK: Persistent anxiety, moderate depression, sleep disturbances, social withdrawal, stress overload, moderate functional impairment\n"
        "LOW RISK: Mild symptoms, good coping strategies, stable mood, adequate sleep, manageable stress, good functional capacity\n\n"
        
        "REQUIRED OUTPUT FORMAT (JSON only, no markdown):\n"
        "{\n"
        '  "summary": "Provide a clinical assessment of the mental health condition (3-4 sentences). Focus on the clinical presentation, diagnostic indicators, and functional impact. Do NOT reference specific scores or responses. Example: \'The clinical presentation indicates symptoms consistent with major depressive episode, characterized by persistent low mood, anhedonia, and significant functional impairment. The presence of sleep disturbances, social withdrawal, and cognitive difficulties suggests moderate to severe depression requiring professional intervention. The combination of mood symptoms with anxiety features may indicate a mixed anxiety-depressive disorder or comorbid conditions. Early intervention is recommended to prevent further deterioration and improve prognosis.\'",\n'
        '  "riskLevel": "Low/Medium/High - Based on clinical presentation, symptom severity, functional impairment, and risk factors. Do not reference specific scores.",\n'
        '  "recommendations": "Provide 4-6 clinical recommendations for treatment and management. Include: 1) Immediate interventions, 2) Professional treatment options, 3) Therapeutic approaches, 4) Monitoring and follow-up. Focus on evidence-based treatments and clinical best practices."\n'
        "}\n\n"
        
        "ANALYSIS GUIDELINES:\n"
        "- Provide a clinical assessment of the mental health condition, not a restatement of responses\n"
        "- Focus on diagnostic indicators, symptom clusters, and clinical presentation\n"
        "- Use professional clinical terminology and diagnostic criteria\n"
        "- Assess functional impairment and quality of life impact\n"
        "- Identify potential diagnoses or clinical conditions\n"
        "- Consider differential diagnoses and comorbid conditions\n"
        "- Evaluate severity and acuity of symptoms\n"
        "- Assess risk factors and protective factors\n"
        "- Provide evidence-based treatment recommendations\n"
        "- DO NOT reference specific scores, numbers, or user responses\n"
        "- DO NOT use phrases like 'your responses show' or 'based on your answers'\n"
        "- Focus on the clinical condition and its implications\n\n"
        
        "CLINICAL ASSESSMENT APPROACH:\n"
        "- Analyze symptom patterns and clusters\n"
        "- Evaluate functional impairment across domains\n"
        "- Assess risk level based on clinical criteria\n"
        "- Consider differential diagnoses\n"
        "- Provide treatment recommendations based on clinical presentation\n"
        "- Use DSM-5 criteria and clinical best practices\n\n"
        
        "CRITICAL: Return ONLY valid JSON. No markdown formatting, no additional text, no explanations outside the JSON structure."
    )
    return instruction

def analyze_mental_health(analysis_data_json):
    """Main function to analyze mental health data."""
    try:
        # Parse the input JSON
        analysis_data = json.loads(analysis_data_json)
        answers = analysis_data.get('answers', {})
        daily_summary = analysis_data.get('dailySummary', None)
        
        # Get API key
        api_key = get_api_key()
        if not api_key:
            return json.dumps({
                "error": "API key not found",
                "summary": "Unable to perform analysis",
                "riskLevel": "Unknown",
                "recommendations": "Please contact a mental health professional"
            })
        
        # Build prompt and call Gemini
        prompt = build_analysis_prompt(answers, daily_summary)
        gemini_response = call_gemini(api_key, prompt)
        
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
            if 'summary' not in analysis or not analysis['summary']:
                analysis['summary'] = "Analysis completed but summary not available."
            
            if 'riskLevel' not in analysis or analysis['riskLevel'] not in ['Low', 'Medium', 'High']:
                analysis['riskLevel'] = "Medium"  # Safe default
            
            if 'recommendations' not in analysis or not analysis['recommendations']:
                analysis['recommendations'] = "Please consider speaking with a mental health professional for personalized advice."
                
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            print(f"Response was: {cleaned_response[:200]}...")
            
            # If response is not valid JSON, create a structured response
            analysis = {
                "summary": f"Analysis completed. Raw response: {cleaned_response[:200]}...",
                "riskLevel": "Medium",  # Default when we can't parse
                "recommendations": "Please consider speaking with a mental health professional for personalized advice."
            }
        
        # Add timestamp
        analysis["timestamp"] = datetime.now().isoformat()
        
        return json.dumps(analysis)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "summary": "Analysis failed",
            "riskLevel": "Unknown",
            "recommendations": "Please try again or contact support"
        })

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Invalid arguments"}), file=sys.stdout)
        sys.exit(1)
    
    answers_json = sys.argv[1]
    result = analyze_mental_health(answers_json)
    print(result, file=sys.stdout)
    sys.stdout.flush()
