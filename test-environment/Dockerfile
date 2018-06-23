FROM seanahn/gurp-scheduler
LABEL maintainer="seokchan.ahn@kaist.ac.kr"

# Install packages for test environment
WORKDIR /workspace/test-environment

COPY package.json .
RUN yarn
