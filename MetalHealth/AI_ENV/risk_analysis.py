#!/usr/bin/env python3
import os, sys, requests, re
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MODEL = "gemini-2.5-flash"
OUTPUT_FILE = "output.txt"
API_KEY_ENV = "GOOGLE_API_KEY_3"
API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

def get_api_key(env_var_name=API_KEY_ENV):
    key = os.getenv(env_var_name)
    if not key:
        key = input(f"Enter {env_var_name}: ").strip()
    if not key:
        print("No API key found. Exiting.")
        sys.exit(1)
    return key.strip().strip('"').strip("'")

def extract_text_from_response(resp):
    texts = []
    if isinstance(resp, dict) and "candidates" in resp:
        for c in resp["candidates"]:
            parts = c.get("content", {}).get("parts", [])
            for p in parts:
                if "text" in p:
                    texts.append(p["text"])
    return "\n".join(texts).strip()

def call_gemini(api_key, prompt, model=MODEL):
    url = API_URL_TEMPLATE.format(model=model, api_key=api_key)
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}
    r = requests.post(url, json=payload, headers=headers, timeout=30)
    r.raise_for_status()
    return extract_text_from_response(r.json())

def get_last_four_outputs(filename):
    """Read the last block of Output1–4 from output.txt"""
    outputs = {"Output1":"", "Output2":"", "Output3":"", "Output4":""}
    with open(filename,"r",encoding="utf-8") as f:
        text = f.read()
    matches = list(re.finditer(r"(Output\s*\d+)\n(.*?)\n\n", text, flags=re.S))
    # get last 4 outputs:
    if matches:
        # pick last 4 outputs
        last4 = matches[-4:]
        for m in last4:
            outputs[m.group(1).replace(" ","")] = m.group(2).strip()
    return outputs

def analyze_risk_level(analysis_text):
    """Analyze the risk level from the AI analysis text"""
    high_risk_keywords = [
        'suicide', 'self-harm', 'severe depression', 'crisis', 'emergency',
        'immediate help', 'urgent', 'dangerous', 'harmful', 'extreme',
        'psychotic', 'delusional', 'hallucination', 'manic episode',
        'substance abuse', 'addiction', 'overdose', 'withdrawal'
    ]
    
    medium_risk_keywords = [
        'moderate', 'concerning', 'worrying', 'persistent', 'chronic',
        'anxiety', 'panic', 'stress', 'mood swings', 'irritability',
        'sleep problems', 'appetite changes', 'social withdrawal'
    ]
    
    analysis_lower = analysis_text.lower()
    
    high_risk_count = sum(1 for keyword in high_risk_keywords if keyword in analysis_lower)
    medium_risk_count = sum(1 for keyword in medium_risk_keywords if keyword in analysis_lower)
    
    if high_risk_count >= 2:
        return "HIGH"
    elif medium_risk_count >= 3 or high_risk_count >= 1:
        return "MEDIUM"
    else:
        return "LOW"

def get_recommended_doctors(risk_level, analysis_text):
    """Get recommended doctors based on risk level and analysis"""
    analysis_lower = analysis_text.lower()
    
    if risk_level == "HIGH":
        # For high risk, recommend crisis intervention and general psychiatry
        return [
            {"speciality": "Crisis Intervention", "reason": "Immediate professional help needed for crisis situation"},
            {"speciality": "Psychiatry", "reason": "Medical evaluation and potential medication management required"}
        ]
    elif risk_level == "MEDIUM":
        # For medium risk, recommend based on specific symptoms
        recommendations = []
        
        if any(keyword in analysis_lower for keyword in ['anxiety', 'panic', 'stress']):
            recommendations.append({"speciality": "Clinical Psychology", "reason": "Specialized in anxiety disorders and stress management"})
        
        if any(keyword in analysis_lower for keyword in ['depression', 'mood', 'sadness']):
            recommendations.append({"speciality": "Psychiatry", "reason": "Expert in mood disorders and depression treatment"})
        
        if any(keyword in analysis_lower for keyword in ['trauma', 'ptsd', 'flashback']):
            recommendations.append({"speciality": "Trauma & PTSD Specialist", "reason": "Specialized in trauma recovery and PTSD treatment"})
        
        if any(keyword in analysis_lower for keyword in ['addiction', 'substance', 'alcohol', 'drug']):
            recommendations.append({"speciality": "Addiction Psychiatry", "reason": "Expert in substance use disorders and recovery"})
        
        if any(keyword in analysis_lower for keyword in ['eating', 'food', 'weight', 'body image']):
            recommendations.append({"speciality": "Eating Disorders", "reason": "Specialized in eating disorder treatment and recovery"})
        
        if any(keyword in analysis_lower for keyword in ['family', 'relationship', 'couple', 'marriage']):
            recommendations.append({"speciality": "Couples & Family Therapy", "reason": "Expert in relationship and family dynamics"})
        
        # Default recommendations if no specific symptoms identified
        if not recommendations:
            recommendations = [
                {"speciality": "Clinical Psychology", "reason": "General mental health support and therapy"},
                {"speciality": "Psychiatry", "reason": "Medical evaluation and treatment options"}
            ]
        
        return recommendations[:2]  # Return top 2 recommendations
    else:
        # For low risk, general recommendations
        return [
            {"speciality": "Clinical Psychology", "reason": "Preventive mental health support and wellness"},
            {"speciality": "General Medicine", "reason": "General health checkup and lifestyle guidance"}
        ]

def main():
    if not os.path.exists(OUTPUT_FILE):
        print("output.txt not found.")
        return
    outs = get_last_four_outputs(OUTPUT_FILE)
    api_key = get_api_key()

    prompt = f"""
You are an expert clinical psychologist and mental health AI with 20+ years of experience in risk assessment and crisis intervention. 
Using the following comprehensive data from one individual, provide a detailed clinical analysis and risk assessment that goes beyond simply restating the data.

CLINICAL ANALYSIS FRAMEWORK:
- Apply evidence-based risk assessment protocols and clinical judgment
- Use validated mental health screening criteria (PHQ-9, GAD-7, PSS-10, C-SSRS)
- Consider both immediate and long-term risk factors and protective factors
- Provide specific, actionable recommendations based on clinical best practices
- Maintain clinical objectivity while being empathetic and supportive
- Identify patterns, correlations, and clinical significance in the data
- Focus on meaningful insights rather than data restatement

DATA TO ANALYZE:
Output 1 (Daily Check-in): {outs.get('Output1')}
Output 2 (Assessment Analysis): {outs.get('Output2')}
Output 3 (Summary Analysis): {outs.get('Output3')}
Output 4 (Additional Context): {outs.get('Output4')}

REQUIRED ANALYSIS COMPONENTS:

1. COMPREHENSIVE MENTAL HEALTH ASSESSMENT:
   - Current psychological state and functioning
   - Emotional regulation and coping strategies
   - Cognitive patterns and thought processes
   - Behavioral indicators and daily functioning
   - Social and interpersonal functioning

2. RISK FACTOR IDENTIFICATION:
   - Immediate risk factors (suicidal ideation, self-harm, psychosis)
   - Moderate risk factors (severe depression, anxiety, substance use)
   - Protective factors (support systems, coping skills, treatment engagement)
   - Environmental and situational stressors

3. RISK LEVEL DETERMINATION:
   - HIGH RISK: Immediate danger, crisis situation, requires urgent intervention
   - MEDIUM RISK: Significant concerns, professional help recommended within days
   - LOW RISK: Mild symptoms, self-care and monitoring sufficient

4. EVIDENCE-BASED RECOMMENDATIONS:
   - Immediate actions (crisis intervention, safety planning)
   - Short-term interventions (therapy, medication evaluation)
   - Long-term strategies (lifestyle changes, ongoing treatment)
   - Specific resources and support systems

5. CLINICAL INSIGHTS:
   - Clinical presentation and diagnostic indicators
   - Functional impairment assessment
   - Risk factors and protective factors
   - Treatment recommendations and prognosis
   - Differential diagnosis considerations

ANALYSIS GUIDELINES:
- Be thorough, specific, and clinically accurate
- Use evidence-based assessment criteria
- Provide actionable, personalized recommendations
- Consider the individual's unique circumstances
- Balance concern with hope and empowerment
- Emphasize professional help when appropriate

CRITICAL: If you identify HIGH RISK indicators, immediately emphasize the need for crisis intervention and professional help.
"""

    gemini_out = call_gemini(api_key, prompt)
    if not gemini_out:
        gemini_out = "Could not analyze."

    # Analyze risk level
    risk_level = analyze_risk_level(gemini_out)
    
    # Get doctor recommendations
    doctor_recommendations = get_recommended_doctors(risk_level, gemini_out)
    
    # Format the final output with recommendations
    final_output = f"""
{gemini_out}

{'='*60}
RISK ASSESSMENT & DOCTOR RECOMMENDATIONS
{'='*60}

RISK LEVEL: {risk_level}

RECOMMENDED DOCTORS:
"""
    
    for i, rec in enumerate(doctor_recommendations, 1):
        final_output += f"""
{i}. {rec['speciality']}
   Reason: {rec['reason']}
"""
    
    if risk_level == "HIGH":
        final_output += f"""

⚠️  URGENT: HIGH RISK DETECTED ⚠️
Please seek immediate professional help. Consider:
- Contacting a crisis helpline
- Visiting an emergency room
- Scheduling an urgent appointment with a psychiatrist
- Reaching out to a trusted friend or family member
"""
    elif risk_level == "MEDIUM":
        final_output += f"""

📋 MEDIUM RISK: Professional consultation recommended
Consider scheduling an appointment with a mental health professional within the next week.
"""
    else:
        final_output += f"""

✅ LOW RISK: Preventive care recommended
Regular check-ins with mental health professionals can help maintain wellness.
"""

    with open(OUTPUT_FILE,"a",encoding="utf-8") as f:
        f.write(f"Final Output: {final_output}\n")
        f.write("-"*40 + "\n")

    print("\nRisk Analysis Final Output:\n")
    print(final_output)

if __name__ == "__main__":
    main()
