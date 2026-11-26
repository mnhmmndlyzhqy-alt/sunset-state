# Stage 53 resident speech

Residents retain their appearance-matched Hebrew voice profile and delivery rate across greetings, reactions and conversations. Individual reactions choose from short local line banks and remember recent phrases. Greetings follow the time of day and skip clear-weather remarks in rain. Shoppers, island arrivals, traffic, emergencies and police use their own reaction families.

Recorded dialogue uses the matching one of nine existing voice presets. The built-in Hebrew synthesizer covers new dialogue and missing, failed or damaged clips. Playback uses one shared priority queue across both paths. Urgent warnings can take priority over ambient small talk, and a conversation holds the channel across its short gaps. Pending requests are rechecked for range, scene, speaker and pause before playback. Subtitles show the currently playing reaction, with captions also available when sound is muted.

Recorded speech follows the in-game listener and actor in 3D. Both playback paths use distance and spatial filtering where supported. Nearby walls muffle speech, and the recorded bus softens it in cabins, shop interiors and underwater. The in-game effects mix fades down to 74% during conversations and high-priority speech and restores when the line ends or is cancelled. The speech slider, master mute and gesture-based activation remain in place.

## Verification

- `node --test QA/stage51_audio.cjs` covers 13 audio-graph and scheduler checks with a simulated browser gesture, transport failures, synthesis, speech priority, room filtering and audio settings.
- `node --test QA/stage53_voice_acceptance.cjs` runs the real Game and Stage 53 modules with simulated audio output. It loads the bundled manifest and local MP3 bytes, renders a new tenant reply into finite PCM, and checks real Game ducking, mute, captions and island actor membership.

Playback characteristics still depend on the browser and audio device. The checks exercise the runtime and graph without listening through a browser.
