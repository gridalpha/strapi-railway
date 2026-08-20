/**
 * Media storage.
 *
 * With a Railway object-storage bucket attached, media goes to S3 and Strapi
 * serves it through presigned URLs. That combination is deliberate: a Railway
 * managed bucket has no anonymous read, so `ACL: 'private'` is what makes the
 * provider report `isPrivate() === true`, which is the flag Strapi checks before
 * calling `getSignedUrl()`. Strapi signs on the Media Library endpoints *and* on
 * the document service, so media embedded in entries is signed for anonymous
 * Content API readers too.
 *
 * Two traps live here:
 *   - `baseUrl` must stay unset. The provider's `isUrlFromBucket()` returns false
 *     whenever a baseUrl is configured, and the unsigned URL is handed back
 *     instead — every image 403s while the deployment looks healthy.
 *   - path-style addressing keeps the bucket name in the URL path, which is what
 *     `isUrlFromBucket()` matches on for a non-AWS endpoint.
 *
 * With no bucket configured it falls back to the local provider, which writes
 * into public/uploads and needs a volume mounted there to survive a redeploy.
 */
module.exports = ({ env }) => {
  const endpoint = env('AWS_ENDPOINT');
  const bucket = env('AWS_BUCKET');
  const accessKeyId = env('AWS_ACCESS_KEY_ID');
  const secretAccessKey = env('AWS_SECRET_ACCESS_KEY');
  const useS3 = Boolean(endpoint && bucket && accessKeyId && secretAccessKey);

  const upload = useS3
    ? {
        config: {
          provider: 'aws-s3',
          providerOptions: {
            s3Options: {
              credentials: { accessKeyId, secretAccessKey },
              endpoint,
              region: env('AWS_REGION', 'auto'),
              forcePathStyle: env.bool('AWS_FORCE_PATH_STYLE', true),
              params: {
                Bucket: bucket,
                ACL: env('AWS_ACL', 'private'),
                signedUrlExpires: env.int('AWS_SIGNED_URL_EXPIRES', 604800),
              },
            },
          },
          actionOptions: { upload: {}, uploadStream: {}, delete: {} },
        },
      }
    : {
        config: {
          provider: 'local',
          providerOptions: { sizeLimit: env.int('UPLOAD_SIZE_LIMIT', 209715200) },
          actionOptions: { upload: {}, uploadStream: {}, delete: {} },
        },
      };

  return {
    'users-permissions': {
      config: {
        jwtSecret: env('JWT_SECRET'),
      },
    },
    upload,
  };
};
