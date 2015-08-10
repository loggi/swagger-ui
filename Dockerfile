###
# swagger-ui-builder - https://github.com/loggi/swagger-ui/
# Container for building the swagger-ui static site
# docker run -v /my-docs:/opt/out loggi/swagger-ui-builder
# docker run -v /my-docs:/opt/out -v /my-yaml-files:/opt/in loggi/swagger-ui-builder
###

FROM    ubuntu:14.04
MAINTAINER dev@loggi.com

ENV     DEBIAN_FRONTEND noninteractive

RUN     apt-get update && apt-get install -y git npm nodejs openjdk-7-jre
RUN     ln -s /usr/bin/nodejs /usr/local/bin/node

ENV     OUTPUT_PATH /opt/out
ENV     INPUT_PATH /opt/in
WORKDIR /build
ADD     package.json    /build/package.json
RUN     npm install
ADD     .   /build
CMD     ./node_modules/gulp/bin/gulp.js build 
