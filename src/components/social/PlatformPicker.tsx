import { Check } from 'lucide-react';
import { PLATFORM_CONFIG, PLATFORM_ORDER } from '@/constants/platforms';
import type { SocialPlatform } from '@/types';
import { cn } from '@/utils/cn';

interface PlatformPickerProps {
  value: SocialPlatform[];
  onChange: (value: SocialPlatform[]) => void;
  /** When true (default) multiple platforms can be selected. */
  multiple?: boolean;
}

/** Chip selector for one or many platforms, coloured per platform. */
export function PlatformPicker({ value, onChange, multiple = true }: PlatformPickerProps) {
  const toggle = (platform: SocialPlatform) => {
    if (!multiple) {
      onChange([platform]);
      return;
    }
    onChange(value.includes(platform) ? value.filter((p) => p !== platform) : [...value, platform]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PLATFORM_ORDER.map((platform) => {
        const config = PLATFORM_CONFIG[platform];
        const Icon = config.icon;
        const active = value.includes(platform);
        return (
          <button
            key={platform}
            type="button"
            onClick={() => toggle(platform)}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? cn(config.bgColor, config.textColor, 'border-transparent')
                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {config.name}
            {active && multiple && <Check className="h-3 w-3" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
