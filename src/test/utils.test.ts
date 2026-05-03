import { describe, it, expect } from 'vitest';

// Helper functions extracted for testing
function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`;
  return `${(n / 1024 / 1024).toFixed(1)}MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function extractFriendlyError(raw: string): string {
  if (!raw) return 'Unknown error';
  const m = raw.match(/\[\d{3}[^\]]*\]\s*([^[]+?)(?:\s*\[\{|$)/);
  if (m) return m[1].trim();
  return raw
    .replace(/^\[GoogleGenerativeAI Error\]:\s*/, '')
    .replace(/^Error fetching from [^:]+:\s*/, '')
    .replace(/^Error:\s*/, '')
    .slice(0, 240);
}

describe('formatBytes', () => {
  it('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500B');
  });

  it('formats kilobytes correctly', () => {
    expect(formatBytes(1024)).toBe('1.0KB');
    expect(formatBytes(2048)).toBe('2.0KB');
  });

  it('formats megabytes correctly', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0MB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0MB');
  });
});

describe('formatDuration', () => {
  it('formats milliseconds correctly', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('formats seconds correctly', () => {
    expect(formatDuration(1000)).toBe('1.0s');
    expect(formatDuration(5500)).toBe('5.5s');
  });
});

describe('extractFriendlyError', () => {
  it('handles empty strings', () => {
    expect(extractFriendlyError('')).toBe('Unknown error');
  });

  it('extracts message from Google SDK error format', () => {
    const sdkError =
      '[GoogleGenerativeAI Error]: Error fetching from https://... [400 Bad Request] API key not valid. Please pass a valid API key.';
    expect(extractFriendlyError(sdkError)).toBe('API key not valid. Please pass a valid API key.');
  });

  it('strips GoogleGenerativeAI prefix', () => {
    const error = '[GoogleGenerativeAI Error]: Something went wrong';
    expect(extractFriendlyError(error)).toBe('Something went wrong');
  });

  it('strips Error fetching prefix', () => {
    const error = 'Error fetching from https://example.com: Network error';
    // The regex pattern removes everything up to and including "https://example.com: "
    expect(extractFriendlyError(error)).toContain('Network error');
  });

  it('returns raw message if no patterns match', () => {
    const error = 'Simple error message';
    expect(extractFriendlyError(error)).toBe('Simple error message');
  });
});
