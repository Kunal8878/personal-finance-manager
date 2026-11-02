import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, THEMES, ThemeId } from '../context/ThemeContext';

interface ThemeSwitcherProps {
  /** compact = just the icon button, full = label + icon */
  variant?: 'compact' | 'full';
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ variant = 'compact' }) => {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 rounded-xl border transition-colors
          ${open
            ? 'bg-finance-elevated border-finance-primary text-finance-primary'
            : 'bg-finance-card border-finance-border text-finance-muted hover:text-finance-text hover:border-finance-primary/50'
          }
          ${variant === 'full' ? 'px-3 py-2 text-xs font-semibold' : 'p-2'}
        `}
        aria-label="Switch theme"
        title="Switch theme"
      >
        <Palette className="w-4 h-4" />
        {variant === 'full' && <span>Theme</span>}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-56 z-50 rounded-2xl border border-finance-border shadow-2xl overflow-hidden"
          style={{ backgroundColor: 'var(--t-elevated)', boxShadow: '0 8px 32px var(--t-shadow)' }}
        >
          <div className="px-3 py-2.5 border-b border-finance-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-finance-muted">Choose Theme</p>
          </div>

          <div className="py-1.5 space-y-0.5">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${theme === t.id
                    ? 'text-finance-primary'
                    : 'text-finance-text hover:bg-finance-card'
                  }
                `}
              >
                {/* Colour swatches */}
                <div className="flex gap-1 flex-shrink-0">
                  {t.swatches.map((color, i) => (
                    <span
                      key={i}
                      className="theme-preview-dot ring-1 ring-black/10"
                      style={{ backgroundColor: color, width: 10, height: 10 }}
                    />
                  ))}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight truncate">{t.label}</p>
                  <p className="text-[10px] text-finance-muted leading-tight truncate">{t.description}</p>
                </div>

                {theme === t.id && <Check className="w-3.5 h-3.5 text-finance-primary flex-shrink-0" />}
              </button>
            ))}
          </div>

          <div className="px-3 py-2 border-t border-finance-border">
            <p className="text-[10px] text-finance-muted">Saved automatically</p>
          </div>
        </div>
      )}
    </div>
  );
};
