FROM python:3.6
LABEL maintainer "seokchan.ahn@kaist.ac.kr"

RUN apt-get update && \
    apt-get install -y sudo vim git

RUN pip install --upgrade pip && pip install radish-bdd && pip install selenium

WORKDIR workspace
