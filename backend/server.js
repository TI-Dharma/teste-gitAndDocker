const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

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

const env = carregarEnv();
const rawEnv = (env.AMBIENTE || env.NODE_ENV || 'DEV').toUpperCase().trim();
const AMBIENTE = rawEnv === 'TESTE' ? 'TEST' : rawEnv;

const PORTAS_BACK = {
  PROD: Number(env.PROD_BACK_PORT) || 4000,
  TEST: Number(env.TEST_BACK_PORT) || 4001,
  DEV: Number(env.DEV_BACK_PORT) || 4002
};

const PORTAS_FRONT = {
  PROD: Number(env.PROD_FRONT_PORT) || 3000,
  TEST: Number(env.TEST_FRONT_PORT) || 3001,
  DEV: Number(env.DEV_FRONT_PORT) || 3002
};

const PORT = Number(env.PORT) || PORTAS_BACK[AMBIENTE] || 4002;
const FRONT_PORT = PORTAS_FRONT[AMBIENTE] || 3002;

// Array em memória (sem banco de dados)
let nomes = [
  { id: 1, nome: 'João Silva', criadoEm: new Date().toISOString() },
  { id: 2, nome: 'Maria Oliveira', criadoEm: new Date().toISOString() },
  { id: 3, nome: 'Carlos Souza', criadoEm: new Date().toISOString() }
];
let proximoId = 4;

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/^\/api/, '') || '/';

  // GET /nomes -> Lista todos ou filtra por ?nome=...
  if (req.method === 'GET' && pathname === '/nomes') {
    const termoBusca = (
      parsedUrl.searchParams.get('nome') ||
      parsedUrl.searchParams.get('busca') ||
      parsedUrl.searchParams.get('q') ||
      ''
    ).trim().toLowerCase();

    const resultado = termoBusca
      ? nomes.filter((item) => item.nome.toLowerCase().includes(termoBusca))
      : nomes;

    return sendJson(res, 200, resultado);
  }

  // POST /nomes -> Grava um novo nome no array
  if (req.method === 'POST' && pathname === '/nomes') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const dados = JSON.parse(body || '{}');
        const nomeLimpo = (dados.nome || '').trim();

        if (!nomeLimpo) {
          return sendJson(res, 400, { erro: 'O campo "nome" é obrigatório.' });
        }

        const novoRegistro = {
          id: proximoId++,
          nome: nomeLimpo,
          criadoEm: new Date().toISOString()
        };

        nomes.push(novoRegistro);
        return sendJson(res, 201, novoRegistro);
      } catch (err) {
        return sendJson(res, 400, { erro: 'JSON inválido no corpo da requisição.' });
      }
    });
    return;
  }

  // DELETE /nomes/:id -> Remove um item do array
  if (req.method === 'DELETE' && pathname.startsWith('/nomes/')) {
    const id = Number(pathname.split('/')[2]);
    const index = nomes.findIndex((item) => item.id === id);

    if (index === -1) {
      return sendJson(res, 404, { erro: 'Nome não encontrado.' });
    }

    const removido = nomes.splice(index, 1)[0];
    return sendJson(res, 200, { mensagem: 'Removido com sucesso.', item: removido });
  }

  // Rota raiz / status
  if (req.method === 'GET' && (pathname === '/' || pathname === '/status')) {
    return sendJson(res, 200, {
      status: 'online',
      ambiente: AMBIENTE,
      backPort: PORT,
      frontPort: FRONT_PORT,
      mensagem: `API de Nomes rodando no ambiente ${AMBIENTE}`
    });
  }

  return sendJson(res, 404, { erro: 'Rota não encontrada.' });
});

server.listen(PORT, () => {
  console.log(`[${AMBIENTE}] Servidor Backend rodando em http://localhost:${PORT}`);
});
