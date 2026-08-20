const path = require('path');

/**
 * Defaults to Railway's managed Postgres via ${{Postgres.DATABASE_URL}}.
 * The discrete DATABASE_* variables stay available so a deployment can be
 * pointed at an external database without editing the repo.
 */
module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'postgres');

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 0), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        // DATABASE_URL and the discrete keys are mutually exclusive on purpose.
        // node-postgres merges a parsed connection string *over* explicit keys,
        // so supplying both silently ignores half of what is set and misreports
        // the database name in Strapi's own startup banner.
        ...(env('DATABASE_URL')
          ? { connectionString: env('DATABASE_URL') }
          : {
              host: env('DATABASE_HOST', 'localhost'),
              port: env.int('DATABASE_PORT', 5432),
              database: env('DATABASE_NAME', 'strapi'),
              user: env('DATABASE_USERNAME', 'strapi'),
              password: env('DATABASE_PASSWORD', 'strapi'),
            }),
        // Railway's private network is internal, so TLS is off by default.
        // An external Postgres usually needs DATABASE_SSL=true.
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 0), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
  };

  if (!connections[client]) {
    throw new Error(`Unsupported DATABASE_CLIENT: ${client}. Use "postgres", "mysql" or "sqlite".`);
  }

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
