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
    ? "border-accent bg-accentSoft/30"
    : "border-dashed border-slate-600 bg-slate-900/40";

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-200">
        Upload PDF Book
      </label>
      <div
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-8 text-center transition ${borderClasses}`}
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
        <div className="mb-3 h-10 w-10 rounded-full bg-accentSoft/60 text-accent flex items-center justify-center">
          <span className="text-2xl">📚</span>
        </div>
        <p className="text-sm text-slate-200">
          Drag &amp; drop your PDF here, or{" "}
          <span className="font-semibold text-accent underline">
            browse files
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          We only process the file locally with your own AI server.
        </p>

        {typeof uploadProgress === "number" && uploadProgress > 0 && (
          <div className="mt-4 w-full">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>Upload progress</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

