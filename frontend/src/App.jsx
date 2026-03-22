import { useState } from "react";
import UploadPDF from "./components/UploadPDF.jsx";
import SummaryViewer from "./components/SummaryViewer.jsx";
import AudioNarrator from "./components/AudioNarrator.jsx";
import LoadingIndicator from "./components/LoadingIndicator.jsx";
import { uploadAndSummarizePdf } from "./services/api.js";

function App() {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [finalSummary, setFinalSummary] = useState("");
  const [chunkSummaries, setChunkSummaries] = useState([]);

  const handlePreviewNarration = () => {
    const previewText =
      "In this chapter, we journey with the author through the core idea of compounding — how tiny, consistent actions quietly build life-changing results over time.";

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // Match the main narrator's support messaging.
      alert(
        "Your browser does not support speech playback. Try a recent version of Chrome or Edge on desktop."
      );
      return;
    }

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(previewText);

    try {
      const voices = synth.getVoices();
      if (voices && voices.length > 0) {
        // Pick a reasonable default similar to the main narrator.
        const enIn = voices.find((v) =>
          (v.lang || "").toLowerCase().startsWith("en-in")
        );
        const enUs = voices.find((v) =>
          (v.lang || "").toLowerCase().startsWith("en-us")
        );
        const enGb = voices.find((v) =>
          (v.lang || "").toLowerCase().startsWith("en-gb")
        );
        utterance.voice = enIn || enGb || enUs || voices[0];
        utterance.lang = utterance.voice.lang || "en-IN";
      } else {
        utterance.lang = "en-IN";
      }
    } catch {
      utterance.lang = "en-IN";
    }

    // Keep the same "enthusiastic storyteller" tuning as AudioNarrator.
    utterance.rate = 0.95;
    utterance.pitch = 1.12;
    utterance.volume = 1.0;

    synth.speak(utterance);
  };

  const handleFileSelected = async (file) => {
    setFinalSummary("");
    setChunkSummaries([]);
    setStatusMessage("Uploading PDF...");
    setIsProcessing(true);
    setUploadProgress(0);

    try {
      const result = await uploadAndSummarizePdf(file, (progress) => {
        setUploadProgress(progress);
        if (progress >= 100) {
          setStatusMessage("Extracting text and summarizing with AI...");
        }
      });

      setFinalSummary(result.summary);
      setChunkSummaries(result.chunkSummaries || []);
      setStatusMessage("Done! Enjoy your narrated summary.");
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error.response?.data?.details ||
          error.response?.data?.error ||
          error.message ||
          "Something went wrong while processing the PDF."
      );
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-50">
      <div className="relative mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
        {/* ambient background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="absolute right-0 top-40 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-72 w-[38rem] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute left-0 right-0 top-0 h-px bg-gradient-to-r from-indigo-500/0 via-indigo-500/70 to-sky-500/0" />
        </div>

        <header className="flex justify-center text-center">
          <div className="leading-tight">
            <p className="text-sm font-extrabold uppercase tracking-[0.35em] text-slate-300 md:text-base">
              BOOK SUMMARIZER & NARRATOR 
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Turn books into stories you can listen to
            </p>
          </div>
        </header>

        {/* hero + preview */}
        <div className="mt-12 grid gap-8 md:grid-cols-[1fr_420px] md:items-start">
          <section>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              Turn dense PDF books into{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-indigo-200 to-sky-300 bg-clip-text text-transparent">
                listenable stories
              </span>{" "}
              in minutes.
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300">
              Drop in any book. Your local AI will extract the key ideas,
              rewrite them as an engaging narration, and stream it as audio you
              can play, pause, and revisit anytime.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]">
                <div className="flex items-center gap-2">
                  
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
                    AI SUMMARIES
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-100">
                  Story-like, not bullet dumps
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]">
                <div className="flex items-center gap-2">
                  
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
                    FAST ANALYZE
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-100">
                  Scan large book in seconds
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/20 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(99,102,241,0.08)]">
                <div className="flex items-center gap-2">
                 
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-300">
                    AUDIO NARRATION
                  </p>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-100">
                  Natural, adjustable voices
                </p>
              </div>
            </div>
          </section>

          <section>
            <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-b from-slate-900/40 to-slate-950/20 p-5 shadow-[0_22px_80px_rgba(15,23,42,0.55)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-400">
                PREVIEW
              </p>

              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4 text-sm leading-relaxed text-slate-200/95">
                “In this chapter, we journey with the author through the core idea
                of compounding — how tiny, consistent actions quietly build life-changing results
                over time…”
              </div>

              <button
                type="button"
                className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 px-4 py-3 text-left transition hover:border-accent/60"
                onClick={handlePreviewNarration}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/40 border border-slate-800 shadow-[0_0_0_4px_rgba(99,102,241,0.08)]">
                    🔊
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">
                      Audio narrator
                    </p>
                    <p className="text-[11px] text-slate-400">voices</p>
                  </div>
                </div>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-1/3 rounded-full bg-accent" />
                </div>
              </button>
            </div>
          </section>
        </div>

        {/* main panel */}
        <div className="mt-6 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-950/30 to-slate-950/10 backdrop-blur">
          <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <UploadPDF
                onFileSelected={handleFileSelected}
                uploadProgress={uploadProgress}
              />

              {isProcessing ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_60px_rgba(15,23,42,0.95)]">
                  <LoadingIndicator label={statusMessage} />
                </div>
              ) : (
                <AudioNarrator text={finalSummary} />
              )}
            </div>

            <div className="space-y-6">
              <SummaryViewer
                finalSummary={finalSummary}
                chunkSummaries={chunkSummaries}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

