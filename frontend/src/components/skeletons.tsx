export function PostCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-stone-200" />
        <div className="h-3 bg-stone-200 rounded w-24" />
        <div className="h-3 bg-stone-100 rounded w-16 ml-auto" />
      </div>
      <div className="h-5 bg-stone-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-stone-100 rounded w-full mb-1" />
      <div className="h-3 bg-stone-100 rounded w-5/6 mb-3" />
      <div className="flex gap-2">
        <div className="h-5 bg-stone-100 rounded-full w-16" />
        <div className="h-5 bg-stone-100 rounded-full w-14" />
      </div>
    </div>
  );
}

export function ColabCardSkeleton() {
  return (
    <div className="card animate-pulse h-44">
      <div className="h-5 bg-stone-200 rounded w-2/3 mb-3" />
      <div className="h-3 bg-stone-100 rounded w-full mb-1" />
      <div className="h-3 bg-stone-100 rounded w-4/5 mb-4" />
      <div className="flex gap-2 mt-auto">
        <div className="h-5 bg-stone-100 rounded-full w-16" />
        <div className="h-5 bg-stone-100 rounded-full w-20" />
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-stone-200" />
          <div className="flex-1">
            <div className="h-6 bg-stone-200 rounded w-32 mb-2" />
            <div className="h-3 bg-stone-100 rounded w-48 mb-2" />
            <div className="h-3 bg-stone-100 rounded w-24" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="card animate-pulse h-20" />
        ))}
      </div>
    </div>
  );
}
