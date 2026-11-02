import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 glass-card rounded-2xl text-center my-4 border border-finance-border/80">
      <div className="w-16 h-16 rounded-2xl bg-finance-border/50 flex items-center justify-center text-finance-emerald mb-4 border border-finance-emerald/20">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-bold text-finance-text mb-2">{title}</h3>
      <p className="text-sm text-finance-muted max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="px-5 py-2.5 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-semibold rounded-xl transition-colors shadow-lg shadow-finance-emerald/20 text-sm flex items-center gap-2"
          >
            <span>+</span> {actionText}
          </button>
        )}
        {secondaryActionText && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="px-5 py-2.5 bg-finance-card hover:bg-finance-border/60 text-finance-text font-medium rounded-xl border border-finance-border transition-colors text-sm"
          >
            {secondaryActionText}
          </button>
        )}
      </div>
    </div>
  );
};
