/** URL(params)에 따라 달라지는 화면이 준비되는 동안 보여 줄 자리 (즉시 이동용 App Shell) */
export function PageFallback() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8 sm:px-6" aria-hidden="true">
      <div className="h-8 w-2/3 animate-pulse rounded-xl bg-mist" />
      <div className="h-48 animate-pulse rounded-3xl bg-mist" />
      <div className="h-12 animate-pulse rounded-xl bg-mist" />
    </div>
  );
}
