/**
 * Railway injects RAILWAY_PUBLIC_DOMAIN into the container, so the canonical URL
 * resolves itself on every boot and survives a regenerated domain. PUBLIC_URL
 * overrides it when the deployment sits behind a custom domain or a CDN.
 */
module.exports = ({ env }) => {
  const railwayDomain = env('RAILWAY_PUBLIC_DOMAIN');
  const url = env('PUBLIC_URL', railwayDomain ? `https://${railwayDomain}` : undefined);

  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    app: {
      keys: env.array('APP_KEYS'),
    },
    // Railway's edge terminates TLS and overwrites X-Forwarded-For, so the
    // leftmost entry is trustworthy and Koa can be told to read it.
    proxy: true,
    ...(url ? { url } : {}),
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};
