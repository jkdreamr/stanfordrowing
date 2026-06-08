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

export default function FilterTabs({ tabs, active, onChange, className = '' }: FilterTabsProps) {
  return (
    <div
      className={`no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 ${className}`}
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
            className={`focus-ring flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold tracking-wide transition-all duration-200 active:scale-95 touch-manipulation ${
              isActive
                ? 'bg-charcoal text-bone shadow-sm'
                : 'border border-white/10 text-charcoal-muted hover:bg-white/5 hover:text-charcoal'
            }`}
          >
            {tab.icon && <Icon name={tab.icon} size={14} fill={isActive} />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
