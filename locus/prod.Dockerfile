FROM --platform=linux/amd64 node:16
# FROM node:11.12.0-alpine

# create an app directory and use it as working directory
RUN mkdir -p /list
WORKDIR /list

# setting up directory for node_modules to bin path so that containers folder can be used
ENV PATH /list/node_modules/.bin:$PATH

COPY package.json /list/package.json
COPY package.json /tmp/package.json
RUN npm config set unsafe-perm true
RUN cd /tmp && npm install --force
# COPY package-lock.json /tasks/package-lock.json

# # RUN apk add --no-cache --virtual .gyp

# # RUN apk add --no-cache --virtual python

# # RUN apk add --no-cache --virtual make

# # RUN apk add --no-cache --virtual g++

# # RUN apk add --no-cache autoconf automake

# RUN apk add --no-cache nasm pkgconfig libtool build-base zlib-dev

# RUN npm install        

RUN npm install pm2@6.0.5 -g
RUN npm install db-migrate -g
RUN npm install cross-env -g

COPY . /list
RUN cp -a /tmp/node_modules /list/node_modules

# allow port 3006 to be publicly available
EXPOSE 9300

# RUN npm run build

# run command
CMD pm2 start pm2-prod.json && tail -f /dev/null
