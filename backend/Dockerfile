# Nox backend image (API + execution worker), deployed on Render.
# Free tier: single service `bun scripts/serve-all.js` (API+worker together)
# Split (current: nox-aaqu web + nox-1-a7zz worker):
#   web    Docker Command = bun src/index.js
#   worker Docker Command = bun workers/runner.js
FROM oven/bun:1.3-slim

# Python runner needs python3 (not in bun:slim) — needed for Python challenges.
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/* && ln -sf /usr/bin/python3 /usr/bin/python && python --version && pip3 --version

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile

COPY src ./src
COPY workers ./workers
COPY scripts ./scripts

ENV NODE_ENV=production
ENV PORT=4000
ENV NOX_PYTHON=python3
EXPOSE 4000

# Default for web; worker service overrides to `bun workers/runner.js` in Render.
CMD ["bun", "src/index.js"]
