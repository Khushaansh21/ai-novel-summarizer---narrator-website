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
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 md:px-6 md:py-10">
        {/* ambient background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-40 top-0 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -right-32 top-40 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[32rem] -translate-x-1/2 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent blur-2xl" />
        </div>

        <header className="space-y-6">
          <nav className="flex items-center justify-between rounded-full border border-slate-800/70 bg-slate-950/70 px-4 py-2 shadow-[0_18px_80px_rgba(15,23,42,0.9)] backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent via-amber-400 to-sky-400 text-xs font-bold shadow-lg shadow-accent/40">
                BN
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Book Narrator
                </p>
                <p className="text-[11px] text-slate-500">
                  Turn books into stories you can listen to
                </p>
              </div>
            </div>
            
          </nav>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-300 shadow-[0_14px_45px_rgba(15,23,42,1)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_0_4px_rgba(234,179,8,0.45)]" />
                <span className="font-semibold text-accent">New</span>
                <span>Story-style summaries, read aloud for you.</span>
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl md:leading-tight">
                  Turn dense PDF books into{" "}
                  <span className="bg-gradient-to-r from-accent via-amber-300 to-sky-400 bg-clip-text text-transparent">
                    listenable stories
                  </span>{" "}
                  in minutes.
                </h1>
                <p className="max-w-xl text-sm text-slate-300">
                  Drop in any book. Your local AI will extract the key ideas,
                  rewrite them as an engaging narration, and stream it as audio
                  you can play, pause, and revisit anytime.
                </p>
              </div>
              <dl className="grid max-w-xl grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 shadow-inner shadow-black/50">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    AI summaries
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-50">
                    Story-like, not bullet dumps
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 shadow-inner shadow-black/50">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    Local-first
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-50">
                    Runs on your machine
                  </dd>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2.5 shadow-inner shadow-black/50">
                  <dt className="text-[11px] uppercase tracking-wide text-slate-400">
                    Audio narration
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-50">
                    Natural, adjustable voices
                  </dd>
                </div>
              </dl>
            </div>

            <div className="hidden md:block">
              <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-900/40 to-slate-900/90 p-5 shadow-[0_22px_80px_rgba(15,23,42,0.95)] backdrop-blur">
                <div className="absolute -right-5 -top-4 rounded-full bg-slate-900/90 px-3 py-1 text-[11px] text-slate-300 border border-slate-700/80 shadow-lg shadow-black/60">
                  <span className="font-semibold text-accent">Tip</span>{" "}
                  Perfect for revising long textbooks.
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Preview
                  </p>
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-3 text-xs text-slate-200 shadow-inner shadow-black/60">
                    “In this chapter, we journey with the author through the
                    core idea of compounding — how tiny, consistent actions
                    quietly build life-changing results over time…”
                  </div>
                  <div
                    className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-950/80 px-3 py-2 text-[11px] text-slate-300 cursor-pointer transition hover:border-accent/60 hover:bg-slate-900/90"
                    onClick={handlePreviewNarration}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handlePreviewNarration();
                      }
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">

                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accentSoft/60 text-xs">
                        🔊
                      </div>
                      <div className="leading-tight">
                        <p className="font-semibold text-slate-100">
                          Audio narrator
                        </p>
                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section className="space-y-4">
            <UploadPDF
              onFileSelected={handleFileSelected}
              uploadProgress={uploadProgress}
            />

            {isProcessing && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 shadow-[0_18px_60px_rgba(15,23,42,0.95)]">
                <LoadingIndicator label={statusMessage} />
              </div>
            )}

            <AudioNarrator text={finalSummary} />
          </section>

          <section className="space-y-3">
            <SummaryViewer
              finalSummary={finalSummary}
              chunkSummaries={chunkSummaries}
            />
          </section>
        </main>

        {statusMessage && !isProcessing && (
          <p className="text-xs text-slate-400">{statusMessage}</p>
        )}

        <footer className="mt-2 border-t border-slate-900/80 pt-4 text-[13px] text-slate-500">
          <p>
            Built with creative mindset by {" "}
            <span className="font-semibold text-slate-300">Khushaansh Kumar</span>{" "}
            
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

