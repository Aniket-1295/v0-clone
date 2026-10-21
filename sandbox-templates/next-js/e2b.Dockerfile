# You can use most Debian-based base images
#
# This Dockerfile built the original 1 GB template `v0-version-final-next`. It no longer
# builds as-is (Oct 2026): `shadcn@2.6.3 add --all` fails because the registry index lists
# a component it does not serve. The app uses `v0-next-2gb` (see build-2gb.mjs), built on
# top of `v0-version-final-next` with the E2B SDK: same files and packages, npm audit/fund/
# progress turned off, and 2048 MB, since `next dev` uses ~700 MB once warm.
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