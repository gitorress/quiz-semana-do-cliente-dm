import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import HeaderDM from '../components/HeaderDM.jsx';

const ICONE_STATUS = {
  bloqueada: '🔒',
  disponivel: '▶',
  em_andamento: '📝',
  concluida: '✅'
};

export default function Hub() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.listarFases().then(setDados).catch((e) => setErro(e.message));
  }, []);

  const pontuacaoTotal = dados?.fases?.reduce((acc, f) => acc + (f.pontuacaoObtida || 0), 0) || 0;

  return (
    <div className="tela-cheia">
      <HeaderDM pontuacaoTotal={pontuacaoTotal} />
      <div className="container">
        <div className="card">
          <h2>Quiz Semana do Cliente  Dia {dados?.diaAtual ?? '...'}</h2>
          <p>
            São 5 fases sobre Experiência do Cliente, Voz do Cliente e NPS. A cada dia, novas
            fases são liberadas. Responda as perguntas e acumule pontos para o Ranking Geral.
          </p>

          {erro && <div className="erro-msg">{erro}</div>}

          <div className="hub-timeline">
            {dados?.fases?.map((f) => (
              <div
                key={f.id}
                className={`fase-node ${f.status === 'bloqueada' ? 'bloqueada' : ''}`}
                style={{ background: f.corHex }}
                onClick={() => f.status !== 'bloqueada' && navigate(`/fase/${f.chave}`)}
              >
                <span className="status-badge">{ICONE_STATUS[f.status]}</span>
                <div className="fase-node-icone">{f.icone}</div>
                <strong>{f.titulo}</strong>
                <div className="persona">{f.totalPerguntas} perguntas</div>
                {f.status === 'concluida' && <div className="persona">{f.pontuacaoObtida} pts</div>}
                {f.status === 'bloqueada' && <div className="persona">Libera no dia {f.diaLiberacao}</div>}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <button className="btn btn-secundario" onClick={() => navigate('/ranking')}>
              Ver Ranking Geral
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
