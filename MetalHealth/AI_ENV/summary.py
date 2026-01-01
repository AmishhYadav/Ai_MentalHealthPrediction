#!/usr/bin/env python3
import os, sys, requests
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

MODEL = "gemini-2.5-flash"
OUTPUT_FILE = "output.txt"
API_KEY_ENV = "GOOGLE_API_KEY_1"
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

def main():
    print("=== Daily Summary Analysis ===")
    print("This script analyzes daily summaries written by users.")
    print("Note: Daily summaries are now primarily handled through the web interface.\n")
    
    user_summary = input("Please enter today's summary: ").strip()
    if not user_summary:
        print("No summary provided. Writing 'exhausted'.")
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            f.write(f"Daily Summary Analysis\nexhausted\n\n")
        return

    api_key = get_api_key()
    prompt = f"""
You are a mental health expert AI specializing in journal analysis. Analyze the following daily summary and provide insights about the user's emotional state, patterns, and well-being.

Daily Summary: {user_summary}

Please provide a comprehensive analysis including:
1. Brief summary of their emotional state
2. Key mood indicators
3. Any patterns or themes
4. Helpful insights about their mental well-being
5. Gentle suggestions for reflection or positive actions

Be empathetic, supportive, and focus on positive insights while acknowledging any challenges mentioned.
"""
    gemini_out = call_gemini(api_key, prompt)
    if not gemini_out:
        gemini_out = "Unable to analyze summary at this time."

    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(f"Daily Summary Analysis\n{gemini_out}\n\n")

    print("\nDaily Summary Analysis:\n")
    print(gemini_out)

if __name__ == "__main__":
    main()
