/** Content approval is independent of Vercel's hosting environment. */
export function deploymentMode(
  contentMode: string | undefined,
): 'prototype' | 'approved' {
  if (contentMode === undefined || contentMode === 'prototype')
    return 'prototype';
  if (contentMode === 'approved') return 'approved';
  throw Error(
    `Unsupported DAR_CONTENT_MODE ${JSON.stringify(contentMode)}. Use prototype or approved.`,
  );
}
