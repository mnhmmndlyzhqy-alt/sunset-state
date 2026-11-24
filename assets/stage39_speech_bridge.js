// ES-module bridge: exposes the Hebrew speech engine to the classic-script game.
import SpeechEngine, { Priority, VOICE_PROFILES } from "./speech/speech-engine.js";
globalThis.SunsetSpeech = { SpeechEngine, Priority, VOICE_PROFILES };
globalThis.dispatchEvent?.(new Event("sunset-speech-ready"));
