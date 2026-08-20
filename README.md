# Strapi on Railway

[Strapi 5](https://strapi.io) packaged for Railway: Postgres for content, Railway
object storage for media, and a Docker build that ships the admin panel prebuilt.

## Topology

| Service | Public | Purpose |
|---|---|---|
| `strapi` | yes | Strapi 5 — admin panel at `/admin`, REST at `/api`, health at `/_health` |
| `Postgres` | no | content, users, admin accounts |
| bucket | no | media library (S3-compatible, presigned reads) |

## How media works

Railway's managed buckets have no anonymous read: a plain `GET` on an object is
`403` regardless of the ACL sent at upload. Strapi handles that natively, but only
when the provider reports the bucket as private — so `config/plugins.js` sets
`ACL: private`, which makes `isPrivate()` true and switches Strapi to presigned
URLs. Signing happens on the Media Library endpoints *and* on the document
service, so media embedded in entries is signed for anonymous Content API readers
too.

Two things must stay as they are:

- **`baseUrl` is deliberately unset.** The provider's `isUrlFromBucket()` returns
  `false` whenever a `baseUrl` is configured and hands back the unsigned URL, so
  setting one makes every image 403 while the deployment still looks healthy.
- **Path-style addressing is on.** It keeps the bucket name in the URL path, which
  is what `isUrlFromBucket()` matches against for a non-AWS endpoint.

`AWS_SIGNED_URL_EXPIRES` defaults to 604800 (7 days, the SigV4 maximum). If a
static site generator bakes media URLs at build time, rebuild more often than that
or put a CDN in front.

With the `AWS_*` variables unset the repo falls back to the local upload provider,
which writes to `public/uploads` and then needs a volume mounted there.

## Variables

Required — all six are plain random secrets and must stay stable across restarts,
since rotating them invalidates issued tokens and encrypted data:

`APP_KEYS` (comma-separated list), `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`,
`TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`.

Everything else has a working default. `PUBLIC_URL` overrides the canonical URL,
which otherwise derives itself from `RAILWAY_PUBLIC_DOMAIN` on every boot.

## First run

Open `/admin` and register the first administrator. Strapi ships no default
credentials, but the registration form is open until somebody claims it — so
register immediately after the first deploy.

## Content types

Strapi disables the Content-Type Builder whenever `NODE_ENV=production`, because
adding a type writes files to disk and needs a restart. That is upstream's design,
not a limitation of this deployment: content types are code, authored in
development and shipped through git.

```bash
git clone https://github.com/gridalpha/strapi-railway && cd strapi-railway
npm install && npm run develop      # SQLite, Content-Type Builder available
# build your types in the admin, then
git add src/api && git commit -m "add content types" && git push
```

Railway rebuilds on push and the new types appear in the Content Manager.

An example `Article` collection type ships in `src/api/article` so a fresh
deployment has something to edit on arrival. Delete that directory when you no
longer want it.

## Scaling

Ships at one replica. Strapi runs cron jobs in-process with no leader election, so
anything added to `config/cron.js` would run once per replica. Media on object
storage means the app itself holds no local state, so raising replicas is safe once
that caveat is handled.

## Local development

```bash
npm install
cp .env.example .env   # fill in the six secrets
npm run develop        # SQLite, no external services needed
```
