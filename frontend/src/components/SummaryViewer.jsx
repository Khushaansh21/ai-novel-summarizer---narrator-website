import { useState } from "react";

export default function SummaryViewer({ finalSummary, chunkSummaries }) {
  const [showChunks, setShowChunks] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800/70 bg-gradient-to-b from-slate-900/40 to-slate-950/10 p-6 overflow-hidden">
        <h2 className="text-base font-semibold text-slate-100">
          Final Book Summary
        </h2>

        <div className="mt-3 max-h-40 overflow-y-auto pr-2 text-sm leading-relaxed text-slate-200/95">
          {!finalSummary ? (
            <p className="text-slate-400">
              Your book summary will appear here after processing.
            </p>
          ) : (
            finalSummary.split("\n").map((line, idx) => (
              <p key={idx} className="mb-1 whitespace-pre-wrap">
                {line}
              </p>
            ))
          )}
        </div>
      </div>

      {chunkSummaries && chunkSummaries.length > 0 && (
        <div className="rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">
                View section-by-section summaries
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Get detailed summaries for each chapter of your book.
              </p>
            </div>

            <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/30 shadow-[0_0_0_4px_rgba(99,102,241,0.10)]">
              <div className="grid grid-cols-2 grid-rows-2 gap-1 p-1">
                <div className="h-2.5 w-2.5 rounded bg-accent/70" />
                <div className="h-2.5 w-2.5 rounded bg-sky-500/40" />
                <div className="h-2.5 w-2.5 rounded bg-accent/30" />
                <div className="h-2.5 w-2.5 rounded bg-sky-500/60" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowChunks((prev) => !prev)}
            className="mt-4 inline-flex items-center rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            {showChunks ? "Hide summaries" : "View summaries"}
          </button>

          {showChunks && (
            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-1">
              {chunkSummaries.map((chunk, idx) => (
                <details
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"
                  open={idx === 0}
                >
                  <summary className="cursor-pointer text-xs font-semibold text-slate-200">
                    Section {idx + 1}
                  </summary>
                  <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                    {chunk.split("\n").map((line, lineIdx) => (
                      <p key={lineIdx} className="mb-1 whitespace-pre-wrap">
                        {line}
                      </p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

