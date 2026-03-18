import { useState } from "react";

export default function SummaryViewer({ finalSummary, chunkSummaries }) {
  const [showChunks, setShowChunks] = useState(false);

  if (!finalSummary) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        Your book summary will appear here after processing.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-3 text-lg font-semibold text-slate-100">
          Final Book Summary
        </h2>
        <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-ul:list-disc prose-li:marker:text-accent">
          {finalSummary.split("\n").map((line, idx) => (
            <p key={idx} className="mb-1 whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>
      </div>

      {chunkSummaries && chunkSummaries.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <button
            onClick={() => setShowChunks((prev) => !prev)}
            className="flex w-full items-center justify-between text-sm font-medium text-slate-200"
          >
            <span>View section-by-section summaries</span>
            <span className="text-xs text-accent">
              {showChunks ? "Hide" : "Show"}
            </span>
          </button>
          {showChunks && (
            <div className="mt-3 space-y-3 max-h-64 overflow-y-auto pr-1">
              {chunkSummaries.map((chunk, idx) => (
                <details
                  key={idx}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-3"
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

