FROM node:20-alpine
WORKDIR /app
COPY server.js package.json ./
ENV PORT=3099
EXPOSE 3099
USER node
CMD ["node", "server.js"]
