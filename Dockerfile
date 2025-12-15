FROM ubuntu:22.04
USER root

RUN apt-get update && apt-get install -y \
        make \
        bash \
        git \
        openssh-client \
        curl \
        ca-certificates

COPY ./snyk-linux /usr/local/bin/snyk-linux2
RUN chmod +x /usr/local/bin/snyk-linux2

ENV SNYK_TOKEN=${SNYK_TOKEN}
ENV SNYK_API=${SNYK_API}

WORKDIR /app
CMD ["snyk-linux2", "test"]
