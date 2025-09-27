FROM node:18-alpine

WORKDIR /app

# Install Chromium + required dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto \
    bash \
    && rm -rf /var/cache/*

# Tell Puppeteer to use the system-installed Chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8080
CMD ["npm", "start"]
