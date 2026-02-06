interface StatusBadgeProps {
  status: 'authentic' | 'suspected' | 'deepfake';
  size?: 'sm' | 'md' | 'lg';
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const styles = {
    authentic: 'bg-green-500/20 text-green-400 border-green-500/30',
    suspected: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    deepfake: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const labels = {
    authentic: 'Authentic',
    suspected: 'Suspected',
    deepfake: 'Deepfake',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${styles[status]} ${sizes[size]}`}
    >
      {labels[status]}
    </span>
  );
}

