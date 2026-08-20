/**
 * The admin panel's default CSP only allows media from 'self', so bucket-hosted
 * uploads render as broken tiles in the Media Library unless the storage host is
 * added to img-src and media-src. The host is derived from AWS_ENDPOINT so the
 * deployment never needs a second variable holding the same hostname.
 */
const storageHosts = (endpoint, bucket) => {
  if (!endpoint) return [];
  try {
    const { host } = new URL(endpoint.startsWith('http') ? endpoint : `https://${endpoint}`);
    // Both addressing styles: path-style keeps the bucket in the path, and
    // virtual-host style puts it in the hostname.
    return bucket ? [host, `${bucket}.${host}`] : [host];
  } catch {
    return [];
  }
};

module.exports = ({ env }) => {
  const hosts = storageHosts(env('AWS_ENDPOINT'), env('AWS_BUCKET'));
  const mediaSrc = ["'self'", 'data:', 'blob:', ...hosts];

  return [
    'strapi::logger',
    'strapi::errors',
    {
      name: 'strapi::security',
      config: {
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            'connect-src': ["'self'", 'https:'],
            'img-src': mediaSrc,
            'media-src': mediaSrc,
            upgradeInsecureRequests: null,
          },
        },
      },
    },
    'strapi::cors',
    'strapi::poweredBy',
    'strapi::query',
    'strapi::body',
    'strapi::session',
    'strapi::favicon',
    'strapi::public',
  ];
};
