# Node.js version specified in .nvmrc
# Does not use a slim build
FROM node:14.16.0-buster

# Listen address defaults to 0.0.0.0:8080
ARG HOST=0.0.0.0
ARG PORT=8080
EXPOSE 8080

RUN apt-get update -y \
  && apt-get install default-jre -y \
  && apt-get install default-jdk -y

# Create directory
RUN mkdir -p /opt/node_app && chown node:node /opt/node_app
WORKDIR /opt/node_app

# https://github.com/nodejs/docker-node/blob/master/docs/BestPractices.md#non-root-user
USER node

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Add local bin folder to path
ENV PATH /opt/node_app/node_modules/.bin:$PATH

# Copy project files
COPY --chown=node:node . .

# Run start script
RUN chmod +x scripts/docker/cmd.sh
CMD ["./scripts/docker/cmd.sh"]

