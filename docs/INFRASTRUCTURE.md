# Infrastructure

## Environments

| Environment | API | Database | Redis | Payments | Storage |
|---|---|---|---|---|---|
| Local | localhost:4000 | Docker Postgres or Neon | optional | stub | local disk |
| Staging | Render (`DEPLOY_ENV=staging`) | dedicated Neon branch/project | Render Key Value | stub / test keys | local or staging bucket |
| Production | production API host | dedicated Neon project | managed Redis | Paystack/Ozow live keys | production bucket |

Cloud staging deploy steps: [RENDER_NEON.md](./RENDER_NEON.md) (`render.yaml` Blueprint).

Never share production and staging credentials, databases, or object-storage buckets.

## Secrets

Store secrets in a managed vault (GitHub Environments, Doppler, or cloud secret manager). Rotate `MFA_ENC_KEY`, Paystack keys, and database credentials at least quarterly.

## DNS / TLS

Terminate TLS at the load balancer. API and apps must use HTTPS in production. CORS_ORIGINS must list only real production origins.

## Autoscaling

The API is stateless aside from Postgres and Redis. Horizontal replicas are safe once `REDIS_URL` is set so rate limits and locks are shared.

## CDN

Host Customer, Driver, and Ops static builds on a CDN (Cloudflare Pages, Netlify, or S3+CloudFront). Mobile shells are Capacitor wrappers around those builds.

## Parity

Staging must use the same Prisma migrations, the same container image tag, and the same feature flags as production, with test credentials only.
