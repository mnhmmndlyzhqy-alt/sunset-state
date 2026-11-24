"""Generate realistic Hebrew voice clips for SUNSET STATE (neural TTS, recorded once).

Usage (Windows):
    py -3 -m pip install edge-tts
    py -3 TOOLS\\generate_voices.py

Writes assets/voices/<voice>/<line>.mp3 and assets/voices/manifest.json.
The game plays these clips with 3-D audio; nothing is generated at runtime.
Only the game's own lines (below) are sent to the speech service.
"""
import asyncio, json, os, hashlib, sys

try:
    import edge_tts
except ImportError:
    sys.exit("Install first:  py -3 -m pip install edge-tts")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "voices")

# Character voices: neural base voice + pitch/rate shaping (distinct people, natural timbre).
VOICES = {
    "m_mid":   ("he-IL-AvriNeural", "+0%",  "+0Hz"),
    "m_deep":  ("he-IL-AvriNeural", "-6%",  "-14Hz"),
    "m_young": ("he-IL-AvriNeural", "+8%",  "+16Hz"),
    "m_elder": ("he-IL-AvriNeural", "-12%", "-6Hz"),
    "m_tough": ("he-IL-AvriNeural", "+4%",  "-10Hz"),
    "teen_m":  ("he-IL-AvriNeural", "+12%", "+30Hz"),
    "f_mid":   ("he-IL-HilaNeural", "+0%",  "+0Hz"),
    "f_warm":  ("he-IL-HilaNeural", "-6%",  "-8Hz"),
    "f_young": ("he-IL-HilaNeural", "+8%",  "+14Hz"),
    "f_elder": ("he-IL-HilaNeural", "-12%", "-10Hz"),
    "teen_f":  ("he-IL-HilaNeural", "+10%", "+26Hz"),
}
# Line -> mood. Mood adjusts delivery on top of the voice.
LINES = {
    "angry": ["מה יש לך?!", "אתה עיוור?!", "תסתכל על הכביש!", "וואו, באמת?!", "נהג גרוע!", "מה הבעיה שלך?!",
              "היי, תיזהר!", "סליחה?!", "לאט לאט!", "היי! זה האוטו שלי!", "גנב! תחזיר את הרכב!", "מישהו, תעזרו!",
              "קדימה, זוז!", "נו כבר!", "זוז מהדרך!", "עצור! משטרה!", "תעצור בצד!", "ידיים למעלה!"],
    "scared": ["וואי! כמעט דרסת אותי!", "תאט!", "תסתכל לאן אתה נוסע!", "הצילו!", "תברחו!", "אוי!"],
    "happy": ["שלום", "בוקר טוב", "מה נשמע?", "יום יפה היום", "איזה חום היום", "היי אחי",
              "סליחה, איפה החוף?", "יפהפה!", "אפשר תמונה?"],
}
MOOD = {"angry": ("+10%", "+6Hz", "+20%"), "scared": ("+14%", "+14Hz", "+10%"), "happy": ("+2%", "+4Hz", "+0%")}

def line_id(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]

def add(a, b, unit):
    return f"{int(a.rstrip(unit)) + int(b.rstrip(unit)):+d}{unit}"

async def main():
    manifest = {"voices": list(VOICES), "lines": {}}
    total = sum(len(v) for v in LINES.values()) * len(VOICES)
    done = 0
    for mood, texts in LINES.items():
        mr, mp, mv = MOOD[mood]
        for text in texts:
            lid = line_id(text)
            manifest["lines"][text] = {"id": lid, "mood": mood}
            for name, (base, rate, pitch) in VOICES.items():
                out = os.path.join(ROOT, name, lid + ".mp3")
                os.makedirs(os.path.dirname(out), exist_ok=True)
                done += 1
                if os.path.exists(out) and os.path.getsize(out) > 500:
                    continue
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(text, base, rate=add(rate, mr, "%"), pitch=add(pitch, mp, "Hz"), volume=mv).save(out)
                        break
                    except Exception as e:
                        if attempt == 2: print("failed:", name, text, e)
                        await asyncio.sleep(1.5)
                print(f"{done}/{total}", name, text)
    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print("done ->", os.path.abspath(ROOT))

asyncio.run(main())
