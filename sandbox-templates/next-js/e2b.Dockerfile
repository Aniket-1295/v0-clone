# You can use most Debian-based base images
#
# Rebuild (replaces the template every chat uses; run from this folder):
#   npx @e2b/cli@2.22.3 template create v0-version-final-next --cmd "/compile_page.sh" --memory-mb 2048 --cpu-count 2
# The sandbox runs `next dev` (~700 MB once warm); 2048 MB leaves room for npm installs.
FROM node:20-slim

# Install curl
RUN apt-get update && apt-get install -y curl && apt-get clean && rm -rf /var/lib/apt/lists/*

# npm's audit and fund requests nearly exhaust memory next to the dev server; skip them.
RUN npm config set audit false && npm config set fund false && npm config set progress false

COPY compile_page.sh /compile_page.sh
RUN chmod +x /compile_page.sh

# Install dependencies and customize sandbox
WORKDIR /home/user/nextjs-app

RUN npx --yes create-next-app@16.1.1 . --yes

RUN npx --yes shadcn@2.6.3 init --yes -b neutral --force
RUN npx --yes shadcn@2.6.3 add --all --yes

# Move the Nextjs app to the home directory and remove the nextjs-app directory
RUN mv /home/user/nextjs-app/* /home/user/ && rm -rf /home/user/nextjs-app