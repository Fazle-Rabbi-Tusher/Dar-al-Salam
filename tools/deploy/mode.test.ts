import { describe, it, expect } from 'vitest';
import { deploymentMode } from './mode';
import config from '../../vercel.json';
describe('Vercel content mode', () => {
  it('builds the prototype by default without requiring Vercel environment overrides', () => {
    expect(deploymentMode(undefined)).toBe('prototype');
    expect(deploymentMode('prototype')).toBe('prototype');
  });
  it('keeps strict content validation available for explicitly approved releases', () => {
    expect(deploymentMode('approved')).toBe('approved');
  });
  it('rejects unsupported content modes instead of silently accepting them', () =>
    expect(() => deploymentMode('production')).toThrow(
      /Unsupported DAR_CONTENT_MODE/,
    ));
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
