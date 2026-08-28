import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import HeaderDM from '../components/HeaderDM.jsx';

export default function Fase() {
  const { chave } = useParams();
  const navigate = useNavigate();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [opcaoSelecionada, setOpcaoSelecionada] = useState('');
  const [resultadoPergunta, setResultadoPergunta] = useState(null); // { correta, pontosGanhos, explicacao, respostaCorretaId }
  const [pontuacaoAcumulada, setPontuacaoAcumulada] = useState(0);
  const [finalizado, setFinalizado] = useState(false);

  useEffect(() => {
    setErro('');
    setIndiceAtual(0);
    setOpcaoSelecionada('');
    setResultadoPergunta(null);
    setFinalizado(false);
    setPontuacaoAcumulada(0);

    api
      .detalheFase(chave)
      .then((d) => {
        setDados(d);
        // pula perguntas ja respondidas anteriormente (retomar de onde parou)
        const primeiraNaoRespondida = d.perguntas.findIndex((p) => !p.jaRespondida);
        setIndiceAtual(primeiraNaoRespondida === -1 ? d.perguntas.length : primeiraNaoRespondida);
        setPontuacaoAcumulada(d.progresso.pontuacaoObtida || 0);
        if (primeiraNaoRespondida === -1) setFinalizado(true);
      })
      .catch((e) => setErro(e.message));
  }, [chave]);

  if (erro && !dados) {
    return (
      <div className="tela-cheia">
        <HeaderDM />
        <div className="container">
          <div className="erro-msg">{erro}</div>
          <button className="btn btn-secundario" onClick={() => navigate('/hub')}>
            Voltar ao Quiz
          </button>
        </div>
      </div>
    );
  }

  if (!dados) return null;

  const { fase, perguntas } = dados;
  const perguntaAtual = perguntas[indiceAtual];

  async function responder() {
    if (!opcaoSelecionada) return;
    try {
      const r = await api.responderPergunta(chave, perguntaAtual.id, opcaoSelecionada);
      setResultadoPergunta(r);
      if (r.pontosGanhos > 0) setPontuacaoAcumulada((p) => p + r.pontosGanhos);
      if (r.faseConcluida) setFinalizado(true);
    } catch (e) {
      setErro(e.message);
    }
  }

  function proximaPergunta() {
    setOpcaoSelecionada('');
    setResultadoPergunta(null);
    setIndiceAtual((i) => i + 1);
  }

  return (
    <div className="tela-cheia">
      <HeaderDM />
      <div className="container">
        <div className="fase-faixa" style={{ background: fase.corHex }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2>{fase.icone} {fase.titulo}</h2>
              <div className="squad">
                {fase.tema}
                {!finalizado && ` · Pergunta ${Math.min(indiceAtual + 1, perguntas.length)} de ${perguntas.length}`}
                {finalizado && ' · Fase concluída'}
              </div>
            </div>
            <div className="cronometro">{pontuacaoAcumulada} pts</div>
          </div>
        </div>

        {erro && <div className="erro-msg">{erro}</div>}

        {!finalizado && perguntaAtual && (
          <div className="card">
            <p className="pergunta-enunciado">{perguntaAtual.enunciado}</p>

            <div className="opcoes-lista">
              {perguntaAtual.opcoes.map((op) => {
                let classe = 'opcao-item';
                if (opcaoSelecionada === op.id && !resultadoPergunta) classe += ' selecionada';
                if (resultadoPergunta) {
                  if (op.id === resultadoPergunta.respostaCorretaId) classe += ' opcao-certa';
                  else if (op.id === opcaoSelecionada && !resultadoPergunta.correta) classe += ' opcao-errada';
                }
                return (
                  <div
                    key={op.id}
                    className={classe}
                    onClick={() => !resultadoPergunta && setOpcaoSelecionada(op.id)}
                  >
                    {op.texto}
                  </div>
                );
              })}
            </div>

            {!resultadoPergunta && (
              <button className="btn btn-primario" onClick={responder} disabled={!opcaoSelecionada}>
                Confirmar resposta
              </button>
            )}

            {resultadoPergunta && (
              <div className={`feedback-caixa ${resultadoPergunta.correta ? 'sucesso' : 'erro'}`}>
                {resultadoPergunta.correta ? (
                  <p>✅ Certa resposta! +{resultadoPergunta.pontosGanhos} pts</p>
                ) : (
                  <p>❌ Não foi dessa vez.</p>
                )}
                {resultadoPergunta.explicacao && (
                  <p className="explicacao-texto">{resultadoPergunta.explicacao}</p>
                )}
                <button className="btn btn-primario" onClick={proximaPergunta}>
                  {indiceAtual + 1 < perguntas.length ? 'Próxima pergunta' : 'Ver resultado da fase'}
                </button>
              </div>
            )}
          </div>
        )}

        {finalizado && (
          <div className="feedback-caixa sucesso">
            <h3>🎉 Fase concluída!</h3>
            <p>Você fez <strong>{pontuacaoAcumulada} pontos</strong> em "{fase.titulo}".</p>
            <button className="btn btn-primario" onClick={() => navigate('/hub')}>Voltar ao Quiz</button>
          </div>
        )}
      </div>
    </div>
  );
}
