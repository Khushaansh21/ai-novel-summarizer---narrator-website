import { useEffect, useRef, useState } from "react";

function getSupportMessage() {
  if (!("speechSynthesis" in window)) {
    return "Your browser does not support the Web Speech API. Try using a recent version of Chrome or Edge on desktop.";
  }
  return null;
}

function normalizeForSpeech(input) {
  if (!input) return "";

  // Make bullets and headings more speakable.
  let text = input
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s*[-*•]\s+/gm, "• ")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .trim();

  // Add tiny pauses after bullet markers.
  text = text.replace(/^•\s+/gm, "• ");
  text = text.replace(/•\s+/g, "• ");

  return text;
}

function splitIntoSpeakableChunks(text, maxChars = 900) {
  const cleaned = normalizeForSpeech(text);
  if (!cleaned) return [];

  // Split by blank lines first (sections), then by sentences if needed.
  const blocks = cleaned.split(/\n\s*\n/g).map((b) => b.trim()).filter(Boolean);
  const chunks = [];

  const pushWithSentenceSplitting = (block) => {
    if (block.length <= maxChars) {
      chunks.push(block);
      return;
    }

    const sentences = block
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let current = "";
    for (const s of sentences) {
      const next = current ? `${current} ${s}` : s;
      if (next.length <= maxChars) {
        current = next;
      } else {
        if (current) chunks.push(current);
        current = s.length <= maxChars ? s : s.slice(0, maxChars);
      }
    }
    if (current) chunks.push(current);
  };

  for (const block of blocks) {
    pushWithSentenceSplitting(block);
  }

  return chunks;
}

function pickPreferredVoice(voices) {
  if (!voices || voices.length === 0) return null;

  const byLang = (lang) => voices.filter((v) => (v.lang || "").toLowerCase() === lang);
  const contains = (needle) => (v) => (v.name || "").toLowerCase().includes(needle);

  // Prefer Indian English voices if available.
  const enIn = byLang("en-in");
  const bestEnIn =
    enIn.find(contains("google")) ||
    enIn.find(contains("microsoft")) ||
    enIn[0];
  if (bestEnIn) return bestEnIn;

  // Next-best: any voice that looks India-related.
  const indiaNamed =
    voices.find(contains("india")) ||
    voices.find(contains("indian")) ||
    voices.find(contains("hindi"));
  if (indiaNamed) return indiaNamed;

  // Fall back to US/UK English.
  const enUs = byLang("en-us");
  const enGb = byLang("en-gb");
  return enGb[0] || enUs[0] || voices[0];
}

export default function AudioNarrator({ text }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [voices, setVoices] = useState([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState("");

  const speakQueueRef = useRef([]);
  const queueIndexRef = useRef(0);
  const totalCharsRef = useRef(0);
  const spokenCharsRef = useRef(0);
  const activeUtteranceRef = useRef(null);

  useEffect(() => {
    // Reset playback state when text changes
    stopPlayback();
    setProgress(0);
  }, [text]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const v = window.speechSynthesis.getVoices();
      setVoices(v);
      const preferred = pickPreferredVoice(v);
      if (preferred && !selectedVoiceURI) {
        setSelectedVoiceURI(preferred.voiceURI);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPlayback = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speakQueueRef.current = [];
    queueIndexRef.current = 0;
    totalCharsRef.current = 0;
    spokenCharsRef.current = 0;
    activeUtteranceRef.current = null;
    setIsPlaying(false);
    setIsPaused(false);
  };

  const getSelectedVoice = () => {
    if (!voices || voices.length === 0) return null;
    if (!selectedVoiceURI) return pickPreferredVoice(voices);
    return voices.find((v) => v.voiceURI === selectedVoiceURI) || pickPreferredVoice(voices);
  };

  const speakNext = () => {
    const queue = speakQueueRef.current;
    const idx = queueIndexRef.current;
    if (!queue || idx >= queue.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      return;
    }

    const chunk = queue[idx];
    const utterance = new SpeechSynthesisUtterance(chunk);

    const voice = getSelectedVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "en-IN";
    } else {
      utterance.lang = "en-IN";
    }

    // "Enthusiastic storyteller" tuning (more natural + clear).
    utterance.rate = 0.95;
    utterance.pitch = 1.12;
    utterance.volume = 1.0;

    utterance.onboundary = (event) => {
      if (event.charIndex == null || totalCharsRef.current <= 0) return;
      const p = Math.min(
        100,
        Math.round(
          ((spokenCharsRef.current + event.charIndex) / totalCharsRef.current) *
            100
        )
      );
      setProgress(p);
    };

    utterance.onend = () => {
      spokenCharsRef.current += chunk.length;
      queueIndexRef.current += 1;
      speakNext();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    activeUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlay = () => {
    if (!text || !("speechSynthesis" in window)) return;

    // Resume if paused
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    stopPlayback();

    const queue = splitIntoSpeakableChunks(text, 900);
    if (queue.length === 0) return;

    speakQueueRef.current = queue;
    queueIndexRef.current = 0;
    totalCharsRef.current = queue.reduce((sum, c) => sum + c.length, 0);
    spokenCharsRef.current = 0;
    setProgress(0);

    speakNext();
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    stopPlayback();
    setProgress(0);
  };

  const supportMessage =
    typeof window !== "undefined" ? getSupportMessage() : null;

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/30 to-slate-950/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100">Audio Narration</h2>
          <p className="mt-1 text-xs text-slate-400">
            Listen to the summary as a narrated story.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePlay}
            disabled={!text || !!supportMessage}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-800"
          >
            {isPlaying && !isPaused ? "Playing..." : "Play"}
          </button>
          <button
            onClick={handlePause}
            disabled={!isPlaying || !!supportMessage}
            className="rounded-full border border-slate-700 bg-slate-900/20 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            Pause
          </button>
          <button
            onClick={handleStop}
            disabled={(!isPlaying && !isPaused) || !!supportMessage}
            className="rounded-full border border-slate-700 bg-slate-900/20 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-500"
          >
            Stop
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-[11px] text-slate-400">Narrator voice</label>
        <select
          value={selectedVoiceURI}
          onChange={(e) => setSelectedVoiceURI(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/40 px-3 py-2 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-accent/60"
          disabled={voices.length === 0 || !!supportMessage}
        >
          {voices.length === 0 ? (
            <option value="" disabled>
              Rishi - en-IN
            </option>
          ) : (
            voices
              .slice()
              .sort((a, b) => (a.lang || "").localeCompare(b.lang || ""))
              .map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} - {v.lang}
                </option>
              ))
          )}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Narration progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/60 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-sky-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {supportMessage && (
        <p className="mt-3 text-[11px] text-amber-300">{supportMessage}</p>
      )}
    </div>
  );
}

