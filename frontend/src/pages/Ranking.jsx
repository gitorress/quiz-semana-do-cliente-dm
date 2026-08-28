import React, { useEffect, useState } from 'react';
import { api, obterUsuario } from '../api.js';
import HeaderDM from '../components/HeaderDM.jsx';

function formatarTempo(segundos) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
}

const MEDALHAS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [erro, setErro] = useState('');
  const usuario = obterUsuario();

  useEffect(() => {
    api.ranking().then((d) => setRanking(d.ranking)).catch((e) => setErro(e.message));
  }, []);

  const top3 = ranking.slice(0, 3);
  const restante = ranking.slice(3);

  return (
    <div className="tela-cheia">
      <HeaderDM />
      <div className="container">
        <div className="card">
          <h2>Ranking Geral</h2>
          <p>Os 3 primeiros colocados (por pontuação e, em caso de empate, por menor tempo) são os grandes vencedores da Semana do Cliente.</p>
          {erro && <div className="erro-msg">{erro}</div>}

          {top3.length > 0 && (
            <div className="podio">
              {top3.map((r) => (
                <div key={r.usuarioId} className={`podio-item podio-${r.posicao}`}>
                  <span className="medalha">{MEDALHAS[r.posicao]}</span>
                  <div className="nome">{r.nome}</div>
                  <div className="pontos">{r.pontuacaoTotal} pts · {formatarTempo(r.tempoTotalSeg)}</div>
                </div>
              ))}
            </div>
          )}

          <table className="ranking-tabela">
            <thead>
              <tr>
                <th>Pos.</th><th>Nome</th><th>Pontuação</th><th>Tempo total</th><th>Fases</th>
              </tr>
            </thead>
            <tbody>
              {[...top3, ...restante].map((r) => (
                <tr key={r.usuarioId} className={usuario?.id === r.usuarioId ? 'eu' : ''}>
                  <td>
                    <span className="posicao-badge">{MEDALHAS[r.posicao] || r.posicao}</span>
                  </td>
                  <td>{r.nome}</td>
                  <td>{r.pontuacaoTotal} pts</td>
                  <td>{formatarTempo(r.tempoTotalSeg)}</td>
                  <td>{r.fasesConcluidas}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
