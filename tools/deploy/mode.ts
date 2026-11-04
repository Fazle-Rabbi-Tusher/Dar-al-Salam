export function deploymentMode(
  environment: string | undefined,
): 'preview' | 'production' {
  if (environment === 'preview' || environment === 'development')
    return 'preview';
  if (environment === undefined || environment === 'production')
    return 'production';
  throw Error(
    `Unsupported VERCEL_ENV ${JSON.stringify(environment)}. Use preview or production.`,
  );
}
