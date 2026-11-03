// Usa a configuração vinda do .env pelo servidor do front, ou deduz pela porta atual do navegador
function resolverConfigAmbiente() {
  if (window.ENV_CONFIG) {
    return window.ENV_CONFIG;
  }

  const portaAtual = Number(window.location.port);
  if (portaAtual === 3000) {
    return { ambiente: 'PROD', branch: 'main', frontPort: 3000, backPort: 4000, apiUrl: 'http://localhost:4000/nomes' };
  }
  if (portaAtual === 3001) {
    return { ambiente: 'TEST', branch: 'test', frontPort: 3001, backPort: 4001, apiUrl: 'http://localhost:4001/nomes' };
  }
  return { ambiente: 'DEV', branch: 'dev', frontPort: 3002, backPort: 4002, apiUrl: 'http://localhost:4002/nomes' };
}

const CONFIG = resolverConfigAmbiente();
const API_URL = CONFIG.apiUrl;

const formCadastro = document.getElementById('form-cadastro');
const inputNovoNome = document.getElementById('input-novo-nome');
const msgFeedback = document.getElementById('msg-feedback');

const inputBusca = document.getElementById('input-busca');
const btnBuscar = document.getElementById('btn-buscar');
const btnLimpar = document.getElementById('btn-limpar');

const listaNomes = document.getElementById('lista-nomes');
const contador = document.getElementById('contador');
const apiStatus = document.getElementById('api-status');

function mostrarFeedback(texto, tipo = 'sucesso') {
  msgFeedback.textContent = texto;
  msgFeedback.className = `feedback ${tipo}`;
  setTimeout(() => {
    msgFeedback.textContent = '';
  }, 3000);
}

// Consulta nomes na API (com ou sem filtro)
async function consultarNomes(termo = '') {
  try {
    const url = termo
      ? `${API_URL}?nome=${encodeURIComponent(termo)}`
      : API_URL;

    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error('Erro ao consultar API');

    const dados = await resposta.json();
    renderizarLista(dados);

    apiStatus.textContent = `Ambiente: ${CONFIG.ambiente} (branch: ${CONFIG.branch || 'main'}) | Front: ${CONFIG.frontPort} | Back: ${CONFIG.backPort}`;
    apiStatus.className = 'status-badge online';
  } catch (erro) {
    apiStatus.textContent = `Ambiente: ${CONFIG.ambiente} (branch: ${CONFIG.branch || 'main'}) | API Offline (porta ${CONFIG.backPort})`;
    apiStatus.className = 'status-badge offline';
    listaNomes.innerHTML = `<li class="vazio">Não foi possível conectar ao backend em http://localhost:${CONFIG.backPort}</li>`;
    contador.textContent = '0';
  }
}

// Renderiza os nomes na tela
function renderizarLista(nomes) {
  contador.textContent = nomes.length;
  listaNomes.innerHTML = '';

  if (nomes.length === 0) {
    listaNomes.innerHTML = '<li class="vazio">Nenhum nome encontrado.</li>';
    return;
  }

  nomes.forEach((item) => {
    const li = document.createElement('li');

    const infoDiv = document.createElement('div');
    infoDiv.className = 'nome-info';

    const spanNome = document.createElement('span');
    spanNome.className = 'nome-texto';
    spanNome.textContent = item.nome;

    const spanMeta = document.createElement('span');
    spanMeta.className = 'nome-meta';
    spanMeta.textContent = `ID: #${item.id}`;

    infoDiv.appendChild(spanNome);
    infoDiv.appendChild(spanMeta);

    const btnRemover = document.createElement('button');
    btnRemover.className = 'btn-delete';
    btnRemover.textContent = 'Excluir';
    btnRemover.onclick = () => removerNome(item.id);

    li.appendChild(infoDiv);
    li.appendChild(btnRemover);
    listaNomes.appendChild(li);
  });
}

// Grava um novo nome na API
formCadastro.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = inputNovoNome.value.trim();
  if (!nome) return;

  try {
    const resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome })
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      throw new Error(erro.erro || 'Erro ao gravar');
    }

    inputNovoNome.value = '';
    mostrarFeedback(`Nome "${nome}" gravado com sucesso!`, 'sucesso');
    consultarNomes(inputBusca.value.trim());
  } catch (erro) {
    mostrarFeedback(erro.message, 'erro');
  }
});

// Remove um nome pelo ID
async function removerNome(id) {
  try {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    consultarNomes(inputBusca.value.trim());
  } catch (erro) {
    mostrarFeedback('Erro ao remover nome.', 'erro');
  }
}

// Eventos de busca
btnBuscar.addEventListener('click', () => {
  consultarNomes(inputBusca.value.trim());
});

inputBusca.addEventListener('input', () => {
  consultarNomes(inputBusca.value.trim());
});

btnLimpar.addEventListener('click', () => {
  inputBusca.value = '';
  consultarNomes('');
});

// Carrega a lista inicial ao abrir a página
consultarNomes();
