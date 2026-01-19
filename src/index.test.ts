import { describe, it, expect } from 'vitest';
import { version } from './index';

describe('Index', () => {
  it('exports version', () => {
    expect(version).toBe('1.0.0');
  });
});
