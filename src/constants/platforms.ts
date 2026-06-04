/**
 * Per-platform presentation config: display name, Lucide icon, brand-ish accent
 * colour (hex, e.g. for the card placeholder), and Tailwind badge classes.
 *
 * Colours: Instagram=pink, Facebook=blue, LinkedIn=blue-dark (indigo),
 * WhatsApp=green, Email=amber.
 */

import { Facebook, Instagram, Linkedin, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import type { SocialPlatform } from '@/types';

export interface PlatformConfig {
  name: string;
  icon: LucideIcon;
  /** Brand accent as a hex colour (used for placeholder icon tint). */
  color: string;
  /** Tailwind text colour class for badges. */
  textColor: string;
  /** Tailwind background colour class for badges. */
  bgColor: string;
}

export const PLATFORM_CONFIG: Record<SocialPlatform, PlatformConfig> = {
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    color: '#E1306C',
    textColor: 'text-pink-700 dark:text-pink-300',
    bgColor: 'bg-pink-100 dark:bg-pink-900/40',
  },
  facebook: {
    name: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    textColor: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    textColor: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#F59E0B',
    textColor: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
  },
};

/** Display order for tabs / pickers. */
export const PLATFORM_ORDER: SocialPlatform[] = [
  'instagram',
  'facebook',
  'linkedin',
  'whatsapp',
  'email',
];
