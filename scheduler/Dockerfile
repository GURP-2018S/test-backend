FROM seanahn/gurp-scheduler
LABEL maintainer="seokchan.ahn@kaist.ac.kr"

# Install packages for scheduler
WORKDIR /workspace/scheduler

COPY package.json yarn.lock ./
RUN yarn
