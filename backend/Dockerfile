FROM node:20-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY .env* ./

EXPOSE 4000 4001 4002

# Ao iniciar: se GIT_REPO_URL estiver configurada, clona/puxa a branch do ambiente (main, test ou dev) antes de rodar
CMD ["sh", "-c", "\
  if [ \"$AMBIENTE\" = \"PROD\" ]; then BRANCH=${PROD_BRANCH:-main}; \
  elif [ \"$AMBIENTE\" = \"TEST\" ] || [ \"$AMBIENTE\" = \"TESTE\" ]; then BRANCH=${TEST_BRANCH:-test}; \
  else BRANCH=${DEV_BRANCH:-dev}; fi; \
  export GIT_BRANCH=$BRANCH; \
  if [ -n \"$GIT_REPO_URL\" ] && echo \"$GIT_REPO_URL\" | grep -qv \"SEU_USUARIO\"; then \
    echo \"[Git] Puxando branch '$BRANCH' de $GIT_REPO_URL...\"; \
    rm -rf /tmp/repo && git clone --depth 1 -b \"$BRANCH\" \"$GIT_REPO_URL\" /tmp/repo && cp -r /tmp/repo/backend/* /app/; \
  fi; \
  node server.js"]
