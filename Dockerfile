# syntax=docker/dockerfile:1

FROM node:20.8.0-slim

WORKDIR /app

COPY . .

RUN apt-get update
RUN apt-get install gcc openrc openssh-server sshpass cron tzdata nano curl util-linux -y
RUN npm ci
RUN npx prisma generate

# Fix time zone
RUN cp /usr/share/zoneinfo/Israel /etc/localtime
RUN echo "Israel" > /etc/timezone
ENV TZ Israel

# Add proper SSH-RSA support
RUN echo "HostKeyAlgorithms +ssh-rsa,ssh-dss" >> /etc/ssh/ssh_config
RUN echo "StrictHostKeyChecking no" >> /etc/ssh/ssh_config

# Add the main job script
COPY get-sites.sh /app/get-sites.sh
RUN chmod +x /app/get-sites.sh

# Copy the script into the image
COPY setup-cron.sh /app/setup-cron.sh
RUN chmod +x /app/setup-cron.sh

# Add cron rule to call queue_and_run.sh
RUN crontab -l | { cat; echo "*/5 * * * * /bin/bash /app/get-sites.sh"; } | crontab -

EXPOSE 6001

CMD ["bash", "-c", "./setup-cron.sh && cron && npm start"]
