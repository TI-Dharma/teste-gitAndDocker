const http = require('http');
const fs = require('fs');
const path = require('path');

// Carrega variáveis dos arquivos .env (local e raiz, priorizando o modificado mais recentemente)
function carregarEnv() {
  const caminhos = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env')
  ].filter((p) => fs.existsSync(p));

  caminhos.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

  const env = {};
  for (const arquivo of caminhos) {
    const conteudo = fs.readFileSync(arquivo, 'utf-8');
    conteudo.split(/\r?\n/).forEach((linha) => {
      const limpa = linha.trim();
      if (!limpa || limpa.startsWith('#')) return;
      const idx = limpa.indexOf('=');
      if (idx === -1) return;
      const chave = limpa.slice(0, idx).trim();
      const valor = limpa.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      env[chave] = valor;
    });
  }
  return { ...env, ...process.env };
}

function obterConfig() {
  const env = carregarEnv();
  const rawEnv = (env.AMBIENTE || env.NODE_ENV || 'DEV').toUpperCase().trim();
  const ambiente = rawEnv === 'TESTE' ? 'TEST' : rawEnv;

  const portasBack = {
    PROD: Number(env.PROD_BACK_PORT) || 4000,
    TEST: Number(env.TEST_BACK_PORT) || 4001,
    DEV: Number(env.DEV_BACK_PORT) || 4002
  };

  const portasFront = {
    PROD: Number(env.PROD_FRONT_PORT) || 3000,
    TEST: Number(env.TEST_FRONT_PORT) || 3001,
    DEV: Number(env.DEV_FRONT_PORT) || 3002
  };

  const branches = {
    PROD: env.PROD_BRANCH || 'main',
    TEST: env.TEST_BRANCH || 'test',
    DEV: env.DEV_BRANCH || 'dev'
  };

  const frontPort = Number(env.PORT) || portasFront[ambiente] || 3002;
  const backPort = portasBack[ambiente] || 4002;
  const branch = env.GIT_BRANCH || branches[ambiente] || 'dev';

  return {
    ambiente,
    branch,
    frontPort,
    backPort,
    apiUrl: `http://localhost:${backPort}/nomes`
  };
}

const configInicial = obterConfig();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // Endpoint dinâmico que expõe as configurações do .env para o navegador
  if (urlPath === '/env-config.js') {
    const cfg = obterConfig();
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    return res.end(`window.ENV_CONFIG = ${JSON.stringify(cfg)};`);
  }

  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.join(__dirname, safePath);
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Arquivo não encontrado');
    }
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/plain' });
    res.end(content);
  });
});

server.listen(configInicial.frontPort, '0.0.0.0', () => {
  console.log(
    `[${configInicial.ambiente} | branch: ${configInicial.branch}] Frontend rodando em http://localhost:${configInicial.frontPort} (Back na porta ${configInicial.backPort})`
  );
});
