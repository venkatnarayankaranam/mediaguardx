export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-dark-700 rounded w-3/4"></div>
      <div className="h-4 bg-dark-700 rounded w-1/2"></div>
      <div className="h-4 bg-dark-700 rounded w-5/6"></div>
    </div>
  );
}

