# We select a Java image instead of a node one
# As we need the JRE for our DynamoDB tests
FROM adoptopenjdk:11-jre-hotspot

# Listen address defaults to 0.0.0.0:8080
ARG HOST=0.0.0.0
ARG PORT=8080
EXPOSE 8080

# Install Node, NPM, Yarn
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash
RUN apt-get install -y nodejs
RUN npm install -g yarn

# Create directory
RUN mkdir -p /opt/node_app
WORKDIR /opt/node_app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install

# Add local bin folder to path
ENV PATH /opt/node_app/node_modules/.bin:$PATH

# Copy project files
COPY . .

# Run start script
RUN chmod +x scripts/docker/cmd.sh
CMD ["./scripts/docker/cmd.sh"]

