# Works on any container host (Render, Cloud Run, Fly, ...). ffmpeg is a
# runtime requirement: the server extracts audio (and later renders exports) with it.
FROM node:22-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production
# Hosts inject PORT; 3000 is only the local default.
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
