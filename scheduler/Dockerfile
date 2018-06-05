FROM seanahn/gurp-scheduler
LABEL maintainer "seokchan.ahn@kaist.ac.kr"

WORKDIR /workspace/scheduler

RUN rm yarn.lock
ADD package.json .

RUN yarn
