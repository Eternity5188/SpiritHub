import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, actionHref, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-stone-400" />
      </div>
      <p className="text-stone-700 font-semibold text-base mb-1">{title}</p>
      {description && <p className="text-stone-400 text-sm mb-5 max-w-xs">{description}</p>}
      {actionLabel && actionHref && (
        <Link to={actionHref} className="btn-primary text-sm px-4 py-2">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-sm px-4 py-2">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
