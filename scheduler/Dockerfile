FROM seanahn/gurp-scheduler
LABEL maintainer="seokchan.ahn@kaist.ac.kr"

# Install packages for test environment
WORKDIR /workspace/test-environment

COPY package.json .

RUN yarn

# Install packages for scheduler
WORKDIR /workspace/scheduler

COPY package.json .

RUN yarn
