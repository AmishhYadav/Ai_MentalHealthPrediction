#!/usr/bin/env python3
import os, sys, requests
from dotenv import load_dotenv

load_dotenv()

MODEL = "gemini-2.5-flash"
OUTPUT_FILE = "output.txt"
API_KEY_ENV = "GOOGLE_API_KEY_2"
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
    api_key = get_api_key()

    post_text = input("\nPaste the text/caption of your Instagram post (or a small summary of it): ").strip()
    if not post_text:
        print("No Instagram text provided. Writing 'no'.")
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            f.write("Output 3\nno\n\n")
        return

    prompt = f"""
You are an emotional tone detection AI. 
Analyze the following Instagram post text and give a short, clear paragraph about:
- The emotional tone (positive, negative, neutral, mixed)
- Any stress, anxiety or mental health indicators
- Possible improvements to emotional well-being

Instagram Post: {post_text}
"""

    gemini_out = call_gemini(api_key, prompt)
    if not gemini_out:
        gemini_out = "Could not analyze Instagram post."

    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        f.write(f"Output 3\n{gemini_out}\n\n")

    print("\nInstagram Post Analysis:\n")
    print(gemini_out)

if __name__ == "__main__":
    main()
