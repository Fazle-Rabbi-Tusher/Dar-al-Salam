import { describe, it, expect } from 'vitest';
import { deploymentMode } from './mode';
import config from '../../vercel.json';
describe('Vercel build context', () => {
  it('allows explicitly identified preview and development deployments', () => {
    expect(deploymentMode('preview')).toBe('preview');
    expect(deploymentMode('development')).toBe('preview');
  });
  it('keeps production checks for production and unspecified contexts', () => {
    expect(deploymentMode('production')).toBe('production');
    expect(deploymentMode(undefined)).toBe('production');
  });
  it('refuses unknown deployment contexts', () =>
    expect(() => deploymentMode('staging')).toThrow(/Unsupported VERCEL_ENV/));
  it('routes app deep links without rewriting world files or developer pages', () => {
    expect(config.outputDirectory).toBe('dist');
    expect(config.rewrites.map((r) => r.source)).toEqual([
      '/c/:id',
      '/about',
      '/list',
    ]);
    expect(config.rewrites.every((r) => r.destination === '/index.html')).toBe(
      true,
    );
  });
});
