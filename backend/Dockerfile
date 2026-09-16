# Nox backend image (API + execution worker), deployed on Render.
# Single-service (free tier): CMD bun scripts/serve-all.js
# Split setup (paid worker): web CMD bun src/index.js,
#                            worker CMD bun workers/runner.js
FROM oven/bun:1.3-slim

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY workers ./workers
COPY scripts ./scripts

ENV NODE_ENV=production
EXPOSE 4000

CMD ["bun", "scripts/serve-all.js"]
