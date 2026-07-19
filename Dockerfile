# Node 24+ is required: src/config/prisma.js imports the Prisma-generated
# client.ts directly and relies on Node's native TypeScript type-stripping
# (unflagged since Node 23.6), not a build/transpile step.
FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
