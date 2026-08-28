import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import HeaderDM from '../components/HeaderDM.jsx';

function formatarTempo(segundos) {
  if (!segundos && segundos !== 0) return '—';
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}m ${s}s`;
}

export default function Admin() {
  const [fases, setFases] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [participantes, setParticipantes] = useState([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('fases'); // fases | ranking | participantes

  function carregarFases() {
    api.adminListarFases().then((d) => setFases(d.fases)).catch((e) => setErro(e.message));
  }

  useEffect(() => {
    carregarFases();
    api.adminRanking().then((d) => setRanking(d.ranking)).catch((e) => setErro(e.message));
    api.adminParticipantes().then((d) => setParticipantes(d.participantes)).catch((e) => setErro(e.message));
  }, []);

  async function atualizar(id, payload) {
    setSalvando(id);
    try {
      await api.adminAtualizarFase(id, payload);
      carregarFases();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="tela-cheia">
      <HeaderDM />
      <div className="container">
        <div className="card">
          <h2>Painel Admin</h2>
          {erro && <div className="erro-msg">{erro}</div>}

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              className={abaAtiva === 'fases' ? 'btn btn-primario' : 'btn btn-secundario'}
              onClick={() => setAbaAtiva('fases')}
            >
              Liberação de Fases
            </button>
            <button
              className={abaAtiva === 'ranking' ? 'btn btn-primario' : 'btn btn-secundario'}
              onClick={() => setAbaAtiva('ranking')}
            >
              Ranking Geral
            </button>
            <button
              className={abaAtiva === 'participantes' ? 'btn btn-primario' : 'btn btn-secundario'}
              onClick={() => setAbaAtiva('participantes')}
            >
              Quem Jogou
            </button>
          </div>

          {abaAtiva === 'fases' && (
            <>
              <p>
                O calendário abaixo controla quando cada fase abre. Por padrão, isso acontece
                sozinho conforme a data real do evento mas você também pode forçar manualmente
                mudando o "dia de liberação" ou desativando uma fase aqui.
              </p>
              <table className="ranking-tabela">
                <thead>
                  <tr><th>#</th><th>Título</th><th>Tema</th><th>Dia de liberação</th><th>Ativo</th></tr>
                </thead>
                <tbody>
                  {fases.map((f) => (
                    <tr key={f.id}>
                      <td>{f.numero}</td>
                      <td>{f.icone} {f.titulo}</td>
                      <td>{f.tema}</td>
                      <td>
                        <select
                          value={f.dia_liberacao}
                          disabled={salvando === f.id}
                          onChange={(e) => atualizar(f.id, { diaLiberacao: Number(e.target.value) })}
                        >
                          <option value={1}>Dia 1</option>
                          <option value={2}>Dia 2</option>
                          <option value={3}>Dia 3</option>
                          <option value={4}>Dia 4</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={f.ativo}
                          disabled={salvando === f.id}
                          onChange={(e) => atualizar(f.id, { ativo: e.target.checked })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {abaAtiva === 'ranking' && (
            <table className="ranking-tabela">
              <thead>
                <tr><th>Pos.</th><th>Nome</th><th>E-mail</th><th>Pontuação</th><th>Tempo total</th><th>Fases concluídas</th></tr>
              </thead>
              <tbody>
                {ranking.map((r) => (
                  <tr key={r.usuarioId}>
                    <td>{r.posicao}</td>
                    <td>{r.nome}</td>
                    <td>{r.email}</td>
                    <td>{r.pontuacaoTotal} pts</td>
                    <td>{formatarTempo(r.tempoTotalSeg)}</td>
                    <td>{r.fasesConcluidas}/5</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {abaAtiva === 'participantes' && (
            <table className="ranking-tabela">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Fase</th><th>Status</th><th>Pontos</th><th>Tempo</th></tr>
              </thead>
              <tbody>
                {participantes.map((p, i) => (
                  <tr key={i}>
                    <td>{p.nome}</td>
                    <td>{p.email_corporativo}</td>
                    <td>{p.fase || '—'}</td>
                    <td>{p.status || 'não iniciou'}</td>
                    <td>{p.pontuacao_obtida ?? '—'}</td>
                    <td>{formatarTempo(p.tempo_gasto_seg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
