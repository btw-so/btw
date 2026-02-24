FROM --platform=linux/amd64 node:18-slim

RUN mkdir -p /a1-app
WORKDIR /a1-app

ENV PATH /a1-app/node_modules/.bin:$PATH

COPY package.json /a1-app/package.json
COPY package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /a1-app/node_modules

COPY . /a1-app

EXPOSE 9100

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "9100"]
