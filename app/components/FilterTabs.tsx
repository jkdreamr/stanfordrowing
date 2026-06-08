'use client';

import Icon from './Icon';

export interface FilterTab {
  key: string;
  label: string;
  icon?: string;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

/** Horizontal scrollable pill tabs (segmented filter). */
export default function FilterTabs({ tabs, active, onChange, className = '' }: FilterTabsProps) {
  return (
    <div
      className={`no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`focus-ring flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-200 active:scale-95 ${
              isActive
                ? 'bg-ink text-white shadow-sm'
                : 'border border-line bg-surface text-ink-soft hover:border-ink/30 hover:text-ink'
            }`}
          >
            {tab.icon && <Icon name={tab.icon} size={16} fill={isActive} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
