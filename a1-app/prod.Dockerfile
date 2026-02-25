FROM --platform=linux/amd64 node:18-slim AS build

RUN mkdir -p /a1-app
WORKDIR /a1-app

COPY package.json /a1-app/package.json
RUN npm install

COPY . /a1-app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM --platform=linux/amd64 node:18-slim

RUN npm install -g serve@14

WORKDIR /a1-app
COPY --from=build /a1-app/dist /a1-app/dist

EXPOSE 9100

CMD ["serve", "-s", "dist", "-l", "9100"]
