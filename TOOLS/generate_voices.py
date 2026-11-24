"""Record every voice line of SUNSET STATE once with neural Hebrew TTS (street reactions + chat bank).

Usage (Windows):
    py -3 -m pip install edge-tts
    py -3 TOOLS\\generate_voices.py            (add --fresh to re-record everything)

Writes assets/voices/<voice>/<id>.mp3 and assets/voices/manifest.json. The game plays the files
offline with 3-D audio; nothing is generated while playing. Only the game's own lines are sent.
Natural delivery: each sentence in each voice gets its own small tempo/pitch offset, so lines
never sound machine-identical; voices are kept light (no heavy bass).
"""
import asyncio, json, os, hashlib, shutil, sys
try:
    import edge_tts
except ImportError:
    sys.exit("Install first:  py -3 -m pip install edge-tts")

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
OUT = os.path.join(ROOT, "voices")
A, Hh = "he-IL-AvriNeural", "he-IL-HilaNeural"
# name: (neural voice, rate %, pitch Hz)  -- deliberately no deep pitch drops
VOICES = {
    "m_mid": (A, 0, 3), "m_deep": (A, -3, -6), "m_young": (A, 6, 14), "m_elder": (A, -9, 1), "m_tough": (A, 3, -3),
    "f_mid": (Hh, 0, 2), "f_warm": (Hh, -3, -4), "f_young": (Hh, 6, 12), "f_elder": (Hh, -9, -1),
}
MALE = [v for v in VOICES if v.startswith("m_")]
FEMALE = [v for v in VOICES if v.startswith("f_")]
REACT = {
    "angry": ["מה יש לך?!", "אתה עיוור?!", "תסתכל על הכביש!", "וואו, באמת?!", "נהג גרוע!", "מה הבעיה שלך?!",
              "היי, תיזהר!", "סליחה?!", "לאט לאט!", "היי! זה האוטו שלי!", "גנב! תחזיר את הרכב!", "מישהו, תעזרו!",
              "קדימה, זוז!", "נו כבר!", "זוז מהדרך!", "עצור! משטרה!", "תעצור בצד!", "ידיים למעלה!"],
    "scared": ["וואי! כמעט דרסת אותי!", "תאט!", "תסתכל לאן אתה נוסע!", "הצילו!", "תברחו!", "אוי!"],
    "happy": ["שלום", "בוקר טוב", "מה נשמע?", "יום יפה היום", "איזה חום היום", "היי אחי",
              "סליחה, איפה החוף?", "יפהפה!", "אפשר תמונה?"],
    "chat": [],
}
MOOD = {"angry": (10, 6, "+15%"), "scared": (12, 10, "+8%"), "happy": (2, 3, "+0%"), "chat": (0, 0, "+0%")}

def line_id(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:10]

def jitter(text, voice):
    h = int(hashlib.md5((voice + "|" + text).encode("utf-8")).hexdigest()[:8], 16)
    return (h % 11) - 5, ((h >> 8) % 11) - 5   # rate -5..+5 %, pitch -5..+5 Hz

def chat_jobs(jobs):
    bank = json.load(open(os.path.join(ROOT, "chat48_bank.json"), encoding="utf-8"))
    def fem(t):
        for a, b in bank["fem"]:
            t = t.replace(a, b)
        return t
    common = bank["open"] + bank["follow"] + bank["busy"] + [p["echo"] for p in bank["places"].values()] + list(bank["dirs"].values())
    common += bank["fallback"]["friendly"] + bank["fallback"]["grumpy"]
    male, female = list(bank["names_m"]), list(bank["names_f"])
    for it in bank["intents"].values():
        common += it.get("friendly", []) + it.get("grumpy", [])
        male += it.get("m", []); female += it.get("f", [])
    for t in common + male:
        for v in MALE: jobs.setdefault((t, "chat"), set()).add(v)
    for t in common:
        for v in FEMALE: jobs.setdefault((fem(t), "chat"), set()).add(v)
    for t in female:
        for v in FEMALE: jobs.setdefault((t, "chat"), set()).add(v)

async def main():
    if "--fresh" in sys.argv and os.path.isdir(OUT):
        shutil.rmtree(OUT)
    jobs = {}
    for mood, texts in REACT.items():
        for t in texts:
            for v in VOICES: jobs.setdefault((t, mood), set()).add(v)
    chat_jobs(jobs)
    manifest = {"voices": list(VOICES), "lines": {}}
    work = []
    for (text, mood), voices in jobs.items():
        lid = line_id(text)
        e = manifest["lines"].setdefault(text, {"id": lid, "mood": mood, "voices": []})
        for v in sorted(voices):
            work.append((text, mood, v, lid, e))
    sem = asyncio.Semaphore(6)
    done = 0
    async def one(text, mood, v, lid, e):
        nonlocal done
        base, rate, pitch = VOICES[v]
        mr, mp, vol = MOOD[mood]
        jr, jp = jitter(text, v)
        out = os.path.join(OUT, v, lid + ".mp3")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if not (os.path.exists(out) and os.path.getsize(out) > 500):
            async with sem:
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(text, base, rate=f"{rate + mr + jr:+d}%", pitch=f"{pitch + mp + jp:+d}Hz", volume=vol).save(out)
                        break
                    except Exception as ex:
                        if attempt == 2: print("failed:", v, text, ex)
                        await asyncio.sleep(2)
        if os.path.exists(out) and os.path.getsize(out) > 500:
            e["voices"].append(v)
        done += 1
        if done % 100 == 0: print(f"{done}/{len(work)}", flush=True)
    await asyncio.gather(*(one(*w) for w in work))
    for e in manifest["lines"].values(): e["voices"].sort()
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print("done", len(work), "->", os.path.abspath(OUT))

asyncio.run(main())
