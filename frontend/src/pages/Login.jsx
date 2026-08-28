import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, salvarSessao } from '../api.js';

export default function Login() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { token, usuario } = await api.login(nome, email);
      salvarSessao(token, usuario);
      navigate('/hub');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="tela-cheia login-tela">
      <div className="login-box">
        <img src="/logo-dm.png" alt="DM" />
        <h1>Quiz Semana do Cliente</h1>
        <p>Teste seus conhecimentos sobre Experiência do Cliente e NPS · use seu e-mail corporativo para entrar</p>

        {erro && <div className="erro-msg">{erro}</div>}

        <form onSubmit={enviar}>
          <input
            className="campo"
            placeholder="Seu nome completo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
          <input
            className="campo"
            type="email"
            placeholder="seu.nome@vocedm.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn btn-amarelo" style={{ width: '100%' }} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Começar o quiz'}
          </button>
        </form>
      </div>
    </div>
  );
}
