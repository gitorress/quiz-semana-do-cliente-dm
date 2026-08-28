const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('quiz_token');
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const erro = new Error(data.erro || 'Erro na requisição.');
    erro.data = data;
    throw erro;
  }
  return data;
}

export const api = {
  login: (nome, email) => request('/auth/login', { method: 'POST', body: { nome, email } }),
  listarFases: () => request('/fases'),
  detalheFase: (chave) => request(`/fases/${chave}`),
  responderPergunta: (chave, perguntaId, opcaoSelecionada) =>
    request(`/fases/${chave}/perguntas/${perguntaId}/responder`, {
      method: 'POST',
      body: { opcaoSelecionada }
    }),
  ranking: () => request('/ranking'),
  adminListarFases: () => request('/admin/fases'),
  adminAtualizarFase: (id, payload) =>
    request(`/admin/fases/${id}`, { method: 'PUT', body: payload }),
  adminRanking: () => request('/admin/ranking'),
  adminParticipantes: () => request('/admin/participantes')
};

export function salvarSessao(token, usuario) {
  localStorage.setItem('quiz_token', token);
  localStorage.setItem('quiz_usuario', JSON.stringify(usuario));
}

export function obterUsuario() {
  const raw = localStorage.getItem('quiz_usuario');
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  localStorage.removeItem('quiz_token');
  localStorage.removeItem('quiz_usuario');
}

export function estaAutenticado() {
  return Boolean(getToken());
}
