import { describe, it, expect } from 'vitest';
import { sanitizeUrl } from './url';

describe('sanitizeUrl', () => {
  it('passes through http(s)/mailto/tel', () => {
    expect(sanitizeUrl('https://acme.in')).toBe('https://acme.in');
    expect(sanitizeUrl('http://acme.in/x')).toBe('http://acme.in/x');
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(sanitizeUrl('tel:+919876543210')).toBe('tel:+919876543210');
  });

  it('upgrades a bare domain to https', () => {
    expect(sanitizeUrl('acme.in')).toBe('https://acme.in');
    expect(sanitizeUrl('sub.acme.co.in/path')).toBe('https://sub.acme.co.in/path');
  });

  it('blocks dangerous schemes', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(sanitizeUrl('  javascript:alert(1)  ')).toBeNull();
    expect(sanitizeUrl('data:text/html,<script>')).toBeNull();
    expect(sanitizeUrl('vbscript:msgbox')).toBeNull();
  });

  it('treats empty / nullish as no link', () => {
    expect(sanitizeUrl('')).toBeNull();
    expect(sanitizeUrl('   ')).toBeNull();
    expect(sanitizeUrl(null)).toBeNull();
    expect(sanitizeUrl(undefined)).toBeNull();
  });
});
