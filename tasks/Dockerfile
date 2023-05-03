FROM --platform=linux/amd64 node:16
# FROM node:11.12.0-alpine

# create an app directory and use it as working directory
RUN mkdir -p /tasks
WORKDIR /tasks

# setting up directory for node_modules to bin path so that containers folder can be used
ENV PATH /tasks/node_modules/.bin:$PATH

COPY package.json /tasks/package.json
COPY package.json /tmp/package.json
RUN npm config set unsafe-perm true
RUN cd /tmp && npm install
# COPY package-lock.json /tasks/package-lock.json

# # RUN apk add --no-cache --virtual .gyp

# # RUN apk add --no-cache --virtual python

# # RUN apk add --no-cache --virtual make

# # RUN apk add --no-cache --virtual g++

# # RUN apk add --no-cache autoconf automake

# RUN apk add --no-cache nasm pkgconfig libtool build-base zlib-dev

# RUN npm install        

RUN npm install pm2@latest -g
RUN npm install db-migrate -g
RUN npm install cross-env -g

COPY . /tasks
RUN cp -a /tmp/node_modules /tasks/node_modules

# allow port 3210 to be publicly available
EXPOSE 3210

# run command
CMD pm2 start pm2.json && tail -f /dev/null
