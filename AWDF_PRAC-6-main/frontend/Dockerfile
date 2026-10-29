FROM node:18 AS build
WORKDIR /app
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview", "--", "--host"]
