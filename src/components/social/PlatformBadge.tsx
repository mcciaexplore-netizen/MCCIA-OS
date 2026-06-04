import { PLATFORM_CONFIG } from '@/constants/platforms';
import type { SocialPlatform } from '@/types';
import { cn } from '@/utils/cn';

/** Platform pill with platform-specific colour + icon. */
export function PlatformBadge({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const config = PLATFORM_CONFIG[platform];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {config.name}
    </span>
  );
}
