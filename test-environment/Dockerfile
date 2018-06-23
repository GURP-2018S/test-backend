FROM seanahn/gurp-scheduler
LABEL maintainer="seokchan.ahn@kaist.ac.kr"

# Install packages for test environment
WORKDIR /workspace/test-environment

# Install packages using Yarn
ADD package.json yarn.lock /workspace/test-environment/
RUN yarn