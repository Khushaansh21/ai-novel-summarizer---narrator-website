import { useCallback, useState } from "react";

export default function UploadPDF({ onFileSelected, uploadProgress }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback(
    (files) => {
      const file = files?.[0];
      if (!file) return;
      if (file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      onFileSelected?.(file);
    },
    [onFileSelected]
  );

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const borderClasses = isDragging
    ? "border-accent bg-accentSoft/10"
    : "border-dashed border-slate-700/80 bg-slate-950/20";

  return (
    <div
      className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 p-10 text-center transition ${borderClasses}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => document.getElementById("pdf-input").click()}
    >
        <input
          id="pdf-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/40 border border-slate-800 shadow-[0_0_0_4px_rgba(99,102,241,0.12)]">
          <span className="text-2xl" aria-hidden>
            📄
          </span>
        </div>

        <p className="mt-5 text-sm font-semibold text-slate-200">
          Drag &amp; drop your PDF here, or{" "}
          <span className="text-accent underline underline-offset-2">
            browse files
          </span>
        </p>
        <p className="mt-2 text-xs text-slate-400">
          We only process the file locally with your own OS/browser.
        </p>

        {typeof uploadProgress === "number" && uploadProgress > 0 && (
          <div className="mt-6 w-full">
            <div className="flex justify-between text-[11px] text-slate-300 mb-2">
              <span>Upload</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900/70">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
  );
}

