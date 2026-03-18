export default function LoadingIndicator({ label = "Processing book..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      <p className="text-sm text-slate-300">{label}</p>
    </div>
  );
}

