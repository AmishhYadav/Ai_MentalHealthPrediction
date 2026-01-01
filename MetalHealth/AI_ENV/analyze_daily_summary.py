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

def build_summary_analysis_prompt(summary_text, context=None):
    """Build the prompt for daily summary analysis with optional context."""
    
    # Base instruction
    instruction = (
        "You are an expert clinical psychologist and mental health AI with specialized training in journal analysis and narrative therapy. "
        "Analyze the following daily summary with clinical expertise and provide comprehensive insights about the user's emotional state, patterns, and well-being. "
        "Go beyond simply restating what the user wrote - provide meaningful clinical interpretation and insights.\n\n"
        
        "ANALYSIS FRAMEWORK:\n"
        "- Apply evidence-based psychological assessment principles and clinical judgment\n"
        "- Use narrative therapy and journal analysis techniques\n"
        "- Identify clinical indicators and diagnostic patterns\n"
        "- Assess functional impairment and quality of life impact\n"
        "- Provide clinical insights about mental health condition\n"
        "- Look for underlying psychological processes and defense mechanisms\n"
        "- Identify clinical themes and diagnostic indicators\n"
        "- Provide professional assessment of mental health status\n"
        "- Focus on clinical presentation rather than personal narrative\n\n"
    )
    
    # Add context if provided
    if context:
        context_info = []
        
        if context.get('is_synthetic'):
            context_info.append("CLINICAL NOTE: This is an auto-generated summary created from structured assessment data.")
        else:
            context_info.append("CLINICAL NOTE: This is a personal summary written by the user - rich qualitative data.")
            
        if context.get('is_edit'):
            context_info.append("NOTE: This summary has been edited/updated by the user - consider changes in perspective.")
            
        if context.get('time_of_day'):
            context_info.append(f"TIMING: Summary written at {context['time_of_day']} - consider circadian and daily rhythm factors.")
            
        if context.get('has_previous_analysis'):
            context_info.append("HISTORY: This summary has been analyzed before - provide fresh insights based on any changes or evolution.")
            
        if context_info:
            instruction += "CONTEXTUAL INFORMATION:\n" + "\n".join(context_info) + "\n\n"
    
    instruction += f"DAILY SUMMARY TO ANALYZE:\n\"{summary_text}\"\n\n"
    
    # Adjust analysis approach based on context
    if context and context.get('is_synthetic'):
        instruction += (
            "ANALYSIS FOCUS (Structured Data Summary):\n"
            "• Quantitative patterns in mood, stress, sleep, and anxiety indicators\n"
            "• Data-driven insights and trend analysis\n"
            "• Objective assessment of mental health metrics\n"
            "• Evidence-based recommendations based on numerical patterns\n"
            "• Identification of areas requiring attention or intervention\n\n"
        )
    else:
        instruction += (
            "ANALYSIS FOCUS (Personal Narrative):\n"
            "• Emotional tone, language patterns, and psychological themes\n"
            "• Cognitive patterns and thought processes\n"
            "• Behavioral indicators and coping strategies\n"
            "• Personal growth, resilience, and self-awareness\n"
            "• Narrative structure and storytelling elements\n"
            "• Subjective experience and internal world\n\n"
        )
    
    instruction += (
        "CLINICAL ANALYSIS AREAS:\n"
        "• Emotional Regulation: How well the user manages and expresses emotions\n"
        "• Cognitive Patterns: Thought processes, beliefs, and mental frameworks\n"
        "• Behavioral Indicators: Actions, habits, and coping strategies\n"
        "• Social Connections: Relationships and interpersonal dynamics\n"
        "• Stress Management: How the user handles challenges and pressure\n"
        "• Self-Care: Attention to physical and mental well-being\n"
        "• Growth Mindset: Learning, adaptation, and personal development\n\n"
        
        "REQUIRED OUTPUT FORMAT (JSON only, no markdown):\n"
        "{\n"
        '  "summary": "Comprehensive 2-3 sentence analysis of the user\'s emotional state, psychological patterns, and overall well-being. Be specific about what you observe.",\n'
        '  "mood_indicators": "Detailed identification of emotional indicators, mood patterns, and affective states present in the writing. Include both positive and concerning indicators.",\n'
        '  "patterns": "Specific patterns, themes, and recurring elements identified in the writing. Include cognitive, emotional, and behavioral patterns.",\n'
        '  "insights": "Clinical insights about the user\'s mental well-being, personal growth, and psychological state. Focus on both strengths and areas for development.",\n'
        '  "suggestions": "3-4 specific, actionable suggestions for reflection, growth, or positive actions. Be practical, evidence-based, and tailored to the user\'s situation."\n'
        "}\n\n"
        
        "ANALYSIS GUIDELINES:\n"
        "- Maintain clinical objectivity while being empathetic and supportive\n"
        "- Identify both challenges and strengths/resilience factors\n"
        "- Use evidence-based psychological principles\n"
        "- Provide specific, actionable recommendations\n"
        "- Consider the user's unique circumstances and context\n"
        "- Focus on growth, healing, and positive development\n"
        "- Be sensitive to potential mental health concerns\n\n"
        
        "CRITICAL: Return ONLY valid JSON. No markdown formatting, no additional text, no explanations outside the JSON structure."
    )
    
    return instruction

def analyze_daily_summary(summary_text, context=None):
    """Main function to analyze daily summary with optional context."""
    try:
        # Get API key
        api_key = get_api_key()
        if not api_key:
            return json.dumps({
                "error": "API key not found",
                "summary": "Unable to perform analysis",
                "mood_indicators": "Not available",
                "patterns": "Not available",
                "insights": "Please contact a mental health professional",
                "suggestions": "Please try again later"
            })
        
        # Build prompt and call Gemini
        prompt = build_summary_analysis_prompt(summary_text, context)
        gemini_response = call_gemini(api_key, prompt)
        
        # Clean up the response and try to parse JSON
        cleaned_response = gemini_response.strip()
        
        # Remove markdown code blocks if present
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]  # Remove ```json
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]  # Remove ```
        
        cleaned_response = cleaned_response.strip()
        
        # Try to parse the JSON response
        try:
            analysis = json.loads(cleaned_response)
        except json.JSONDecodeError:
            # If response is not valid JSON, create a structured response
            analysis = {
                "summary": cleaned_response,
                "mood_indicators": "Analysis completed but format unclear",
                "patterns": "Unable to identify specific patterns",
                "insights": "Please consider speaking with a mental health professional for personalized advice.",
                "suggestions": "Continue journaling to track your thoughts and feelings."
            }
        
        # Add timestamp
        analysis["timestamp"] = datetime.now().isoformat()
        
        return json.dumps(analysis)
        
    except Exception as e:
        return json.dumps({
            "error": str(e),
            "summary": "Analysis failed",
            "mood_indicators": "Not available",
            "patterns": "Not available",
            "insights": "Please try again or contact support",
            "suggestions": "Please try again later"
        })

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Invalid arguments"}), file=sys.stdout)
        sys.exit(1)
    
    summary_text = sys.argv[1]
    
    # Parse context if provided as second argument
    context = None
    if len(sys.argv) > 2:
        try:
            context = json.loads(sys.argv[2])
        except json.JSONDecodeError:
            # If context is not valid JSON, ignore it
            pass
    
    result = analyze_daily_summary(summary_text, context)
    print(result, file=sys.stdout)
    sys.stdout.flush()
