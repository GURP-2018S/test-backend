# FROM node:carbon
# LABEL maintainer "seokchan.ahn@kaist.ac.kr"
#
# RUN apt-get update && \
#     apt-get install -y sudo vim git
# WORKDIR workspace
# ADD package.json .
#
# RUN yarn && rm package.json

FROM python:3.6
LABEL maintainer "seokchan.ahn@kaist.ac.kr"

RUN apt-get update && \
    apt-get install -y sudo vim git

RUN pip install --upgrade pip && pip install radish-bdd && pip install selenium

RUN curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash - && \
    sudo apt-get install -y nodejs

RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - && \
echo 'deb https://dl.yarnpkg.com/debian/ stable main' | sudo tee /etc/apt/sources.list.d/yarn.list && \
sudo apt-get update && sudo apt-get install -y yarn

WORKDIR /workspace/scheduler

ADD package.json .
RUN yarn && rm package.json

ENV PATH "/usr/local/bin:${PATH}"
