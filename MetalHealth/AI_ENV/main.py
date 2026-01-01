#!/usr/bin/env python3
import os
import sys
import json
import requests
from datetime import datetime
import subprocess
from dotenv import load_dotenv

load_dotenv()  # load .env automatically

MODEL = "gemini-2.5-flash"
API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

def get_api_key(env_var_name: str) -> str:
    """
    Get API key from environment or prompt the user once.
    Exits if no key provided.
    """
    key = os.getenv(env_var_name)
    if key:
        return key.strip()
    # Prompt once (useful for local runs)
    try:
        key = input(f"Enter {env_var_name}: ").strip()
    except (EOFError, KeyboardInterrupt):
        key = ""
    if not key:
        print(f"No API key for {env_var_name}. Exiting.")
        sys.exit(1)
    return key

def extract_text_from_response(resp) -> str:
    """
    Safely extract human-readable text from Gemini responses.
    """
    if resp is None:
        return ""

    texts = []

    if isinstance(resp, dict):
        # New Gemini format: candidates -> content -> parts -> text
        if "candidates" in resp and isinstance(resp["candidates"], list):
            for c in resp["candidates"]:
                content = c.get("content")
                if isinstance(content, dict) and "parts" in content:
                    for part in content["parts"]:
                        if isinstance(part, dict) and "text" in part:
                            texts.append(part["text"])
                elif isinstance(content, list):
                    for ci in content:
                        if isinstance(ci, dict) and "text" in ci:
                            texts.append(ci["text"])
                        elif isinstance(ci, str):
                            texts.append(ci)
                elif isinstance(content, str):
                    texts.append(content)

        # older style
        if "outputs" in resp and isinstance(resp["outputs"], list):
            for o in resp["outputs"]:
                if isinstance(o, dict):
                    if "text" in o and isinstance(o["text"], str):
                        texts.append(o["text"])
                    if "content" in o and isinstance(o["content"], list):
                        for ci in o["content"]:
                            if isinstance(ci, dict) and "text" in ci:
                                texts.append(ci["text"])
                            elif isinstance(ci, str):
                                texts.append(ci)

        # also check top-level text-like keys
        for k in ("text", "output", "response"):
            if k in resp and isinstance(resp[k], str):
                texts.append(resp[k])

    # Fallback: recursively find any strings inside dicts/lists
    def _find_strings(x):
        found = []
        if isinstance(x, str):
            found.append(x)
        elif isinstance(x, dict):
            for v in x.values():
                found.extend(_find_strings(v))
        elif isinstance(x, list):
            for item in x:
                found.extend(_find_strings(item))
        return found

    if not texts:
        texts = _find_strings(resp)

    cleaned = [t.strip() for t in texts if isinstance(t, str) and t.strip()]
    return "\n".join(cleaned).strip()

def call_gemini(api_key: str, prompt: str, model: str = MODEL) -> str:
    """
    Call the Gemini-like REST endpoint and return extracted text.
    On failure, returns a string that starts with [ERROR_CALLING_GEMINI].
    """
    url = API_URL_TEMPLATE.format(model=model, api_key=api_key)
    payload = {"contents": [{"parts": [{"text": prompt}]}]}
    headers = {"Content-Type": "application/json"}
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        # If non-2xx, try to give back server message
        if not r.ok:
            try:
                err_json = r.json()
                err_text = extract_text_from_response(err_json) or r.text
            except Exception:
                err_text = r.text
            return f"[ERROR_CALLING_GEMINI] HTTP {r.status_code}: {err_text}"
        resp = r.json()
    except Exception as e:
        return f"[ERROR_CALLING_GEMINI] {e}"
    return extract_text_from_response(resp)

def build_prompt_from_qas(qas):
    """
    Creates the instruction + the six Q/A pairs block for Gemini.
    qas: list of (question, answer) tuples (expected length 6).
    """
    instruction = (
        "You are given six question / answer pairs from a short mental-health check-in. "
        "Analyze them strictly following the mapping rules below and produce a compact paragraph summarizing the user's state. "
        "No extra recommendations.\n\n"
        "Rules (apply exactly):\n\n"
        "1) Q1: Mood\n"
        "Happy → \"User has generally felt positive and content.\"\n"
        "Sad → \"User has experienced low mood and sadness frequently.\"\n"
        "Anxious → \"User has been feeling anxious or worried frequently.\"\n"
        "Stressed → \"User has been under stress frequently.\"\n"
        "Neutral → \"User’s mood has been mostly stable and neutral.\"\n\n"
        "2) Q2: Stress 1-10\n"
        "1–3 → \"User reports low stress today.\"\n"
        "4–7 → \"User reports moderate stress today.\"\n"
        "8–10 → \"User reports high stress today.\"\n\n"
        "3) Q3: Mood 1-10\n"
        "1–3 → \"User’s mood is low today.\"\n"
        "4–7 → \"User’s mood is moderate today.\"\n"
        "8–10 → \"User’s mood is high / positive today.\"\n\n"
        "4) Q4: Sleep hours\n"
        "<5 → \"User is experiencing very little sleep, may be sleep deprived.\"\n"
        "5–6 → \"User is getting slightly less sleep than recommended.\"\n"
        "7–8 → \"User is getting adequate sleep.\"\n"
        ">8 → \"User is sleeping more than average, may indicate fatigue or irregular patterns.\"\n\n"
        "5) Q5: Anxious\n"
        "Yes → \"User frequently feels anxious or on edge.\"\n"
        "Sometimes → \"User occasionally experiences anxiety.\"\n"
        "No → \"User rarely experiences anxiety.\"\n\n"
        "6) Q6: Overwhelmed\n"
        "Yes → \"User frequently feels overwhelmed by responsibilities.\"\n"
        "Sometimes → \"User occasionally feels overwhelmed.\"\n"
        "No → \"User rarely feels overwhelmed.\"\n\n"
        "Now respond with 4-6 short sentences summarizing the user’s state using only the mapped phrases."
    )

    pairs_text = ""
    for i, (q, a) in enumerate(qas, start=1):
        a_str = "" if a is None else str(a).strip()
        pairs_text += f"Q{i}: {q}\nA{i}: {a_str}\n\n"
    return instruction + "\n\n" + pairs_text

def append_to_output_file(filename: str, entries):
    """
    Appends one or more text entries to a file with timestamps.
    entries: iterable of strings.
    Creates file if missing and writes header.
    """
    is_new = not os.path.exists(filename)
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(filename, "a", encoding="utf-8") as f:
        if is_new:
            f.write(f"=== Session started: {now} ===\n\n")
        else:
            f.write(f"\n=== Entry appended: {now} ===\n\n")
        for i, e in enumerate(entries, start=1):
            f.write(f"Output {i}\n{e}\n\n")

def append_output_labelled(filename: str, label: str, content: str):
    """
    Convenience: append a single labelled output to file.
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(filename, "a", encoding="utf-8") as f:
        f.write(f"{label} ({now})\n{content}\n\n")

def call_subprocess(script_name: str):
    """
    Run another script with the same Python executable. Doesn't raise on failure.
    """
    cmd = [sys.executable, script_name]
    try:
        subprocess.run(cmd, check=False)
    except Exception as e:
        print(f"Failed to run {script_name}: {e}")

def sanitize_numeric_answer(ans):
    """
    tries to convert to int and clamp reasonable values, returns None on failure
    """
    if ans is None:
        return None
    s = str(ans).strip()
    try:
        val = int(s)
        return val
    except Exception:
        # try to extract first number in string
        import re
        m = re.search(r"\d+", s)
        if m:
            try:
                return int(m.group(0))
            except Exception:
                return None
        return None

def main():
    print("=== Daily Mental Health Check-in ===\n")
    print("This script processes the core 6 daily questions for mental health assessment.")
    print("Daily summaries are now handled separately through the web interface.\n")
    
    questions = [
        "How have you been feeling in the past week? (Happy / Sad / Anxious / Stressed / Neutral)",
        "On a scale of 1–10, how would you rate your overall stress level today?",
        "On a scale of 1–10, how would you rate your overall mood today?",
        "How many hours of sleep do you usually get per night?",
        "Have you felt anxious, worried, or on edge most days recently? (Yes / Sometimes / No)",
        "Do you often feel overwhelmed by work, school, or daily tasks? (Yes / Sometimes / No)"
    ]

    try:
        qas = []
        for q in questions:
            a = input(f"{q}\n").strip()
            qas.append((q, a))
    except (EOFError, KeyboardInterrupt):
        print("\nInput interrupted. Exiting.")
        sys.exit(1)

    # Get API key
    api_key_1 = get_api_key("GOOGLE_API_KEY_1")

    prompt = build_prompt_from_qas(qas)
    print("\nSending your responses to Gemini (API_KEY_1)...")
    gemini_out = call_gemini(api_key_1, prompt)

    output_file = "output.txt"
    append_to_output_file(output_file, [gemini_out])
    print("\nDaily Check-in Analysis (Output 1):\n")
    print(gemini_out)

    print("\n=== Daily Check-in Complete ===")
    print("Your daily mental health questions have been analyzed.")
    print("To write a daily summary, use the web interface at the home page.")
    print("\nCalling risk_analysis.py to compute risk via Gemini...")
    call_subprocess("risk_analysis.py")
    print("\nDaily check-in completed. Review output.txt for the full record.")

if __name__ == "__main__":
    main()
