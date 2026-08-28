const express = require('express');
const pool = require('../db/pool');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// Dia atual do evento: por padrao usa a data real, mas pode ser fixado via
// env EVENTO_DIA_ATUAL para testes/homologacao (1, 2, 3 ou 4).
function diaAtualDoEvento() {
  if (process.env.EVENTO_DIA_ATUAL) return Number(process.env.EVENTO_DIA_ATUAL);
  const inicio = new Date(process.env.EVENTO_DATA_INICIO || '2026-09-01T00:00:00-03:00');
  const agora = new Date();
  const diffDias = Math.floor((agora - inicio) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(Math.max(diffDias, 1), 4);
}

// GET /api/fases -> hub: lista todas as fases com status do usuario logado
router.get('/', async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const diaAtual = diaAtualDoEvento();

    const { rows: fases } = await pool.query(
      `SELECT id, numero, chave, titulo, tema, icone, cor_hex, dia_liberacao, ativo
       FROM fases ORDER BY numero ASC`
    );

    const { rows: progresso } = await pool.query(
      `SELECT fase_id, status, pontuacao_obtida, tempo_gasto_seg
       FROM progresso_usuario_fase WHERE usuario_id = $1`,
      [usuarioId]
    );
    const progressoPorFase = Object.fromEntries(progresso.map((p) => [p.fase_id, p]));

    const { rows: totaisPerguntas } = await pool.query(
      `SELECT fase_id, COUNT(*)::int AS total FROM perguntas GROUP BY fase_id`
    );
    const totalPorFase = Object.fromEntries(totaisPerguntas.map((t) => [t.fase_id, t.total]));

    const hub = fases.map((f) => {
      const p = progressoPorFase[f.id];
      let status;
      if (p && p.status === 'concluida') status = 'concluida';
      else if (!f.ativo || f.dia_liberacao > diaAtual) status = 'bloqueada';
      else status = p ? p.status : 'disponivel';

      return {
        id: f.id,
        numero: f.numero,
        chave: f.chave,
        titulo: f.titulo,
        tema: f.tema,
        icone: f.icone,
        corHex: f.cor_hex,
        diaLiberacao: f.dia_liberacao,
        totalPerguntas: totalPorFase[f.id] || 0,
        status,
        pontuacaoObtida: p ? p.pontuacao_obtida : 0
      };
    });

    res.json({ diaAtual, fases: hub });
  } catch (err) {
    console.error('Erro ao listar fases:', err);
    res.status(500).json({ erro: 'Erro ao carregar o quiz.' });
  }
});

// GET /api/fases/:chave -> detalhe da fase + perguntas (sem revelar resposta certa)
router.get('/:chave', async (req, res) => {
  try {
    const { chave } = req.params;
    const usuarioId = req.usuario.id;

    const { rows: faseRows } = await pool.query('SELECT * FROM fases WHERE chave = $1', [chave]);
    const fase = faseRows[0];
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada.' });

    const diaAtual = diaAtualDoEvento();
    if (!fase.ativo || fase.dia_liberacao > diaAtual) {
      return res.status(403).json({ erro: 'Esta fase ainda não foi liberada.' });
    }

    // Garante uma linha de progresso e marca inicio, se ainda nao houver
    const existente = await pool.query(
      'SELECT * FROM progresso_usuario_fase WHERE usuario_id = $1 AND fase_id = $2',
      [usuarioId, fase.id]
    );

    let progresso;
    if (existente.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO progresso_usuario_fase (usuario_id, fase_id, status, inicio_em)
         VALUES ($1, $2, 'em_andamento', now()) RETURNING *`,
        [usuarioId, fase.id]
      );
      progresso = inserted.rows[0];
    } else {
      progresso = existente.rows[0];
      if (progresso.status === 'disponivel') {
        const atualizado = await pool.query(
          `UPDATE progresso_usuario_fase SET status = 'em_andamento', inicio_em = COALESCE(inicio_em, now())
           WHERE id = $1 RETURNING *`,
          [progresso.id]
        );
        progresso = atualizado.rows[0];
      }
    }

    // Perguntas SEM a resposta correta
    const { rows: perguntas } = await pool.query(
      `SELECT id, ordem, enunciado, opcoes, pontos FROM perguntas
       WHERE fase_id = $1 ORDER BY ordem ASC`,
      [fase.id]
    );

    // Quais perguntas o usuario ja respondeu (para retomar de onde parou)
    const { rows: respondidas } = await pool.query(
      `SELECT pergunta_id, opcao_selecionada, correta FROM respostas_usuario_pergunta
       WHERE usuario_id = $1 AND pergunta_id = ANY($2::int[])`,
      [usuarioId, perguntas.map((p) => p.id)]
    );
    const respondidasPorId = Object.fromEntries(respondidas.map((r) => [r.pergunta_id, r]));

    res.json({
      fase: {
        id: fase.id,
        chave: fase.chave,
        titulo: fase.titulo,
        tema: fase.tema,
        icone: fase.icone,
        corHex: fase.cor_hex
      },
      perguntas: perguntas.map((p) => ({
        id: p.id,
        ordem: p.ordem,
        enunciado: p.enunciado,
        opcoes: p.opcoes,
        pontos: p.pontos,
        jaRespondida: Boolean(respondidasPorId[p.id]),
        opcaoSelecionada: respondidasPorId[p.id]?.opcao_selecionada || null,
        correta: respondidasPorId[p.id]?.correta ?? null
      })),
      progresso: {
        status: progresso.status,
        pontuacaoObtida: progresso.pontuacao_obtida
      }
    });
  } catch (err) {
    console.error('Erro ao carregar fase:', err);
    res.status(500).json({ erro: 'Erro ao carregar a fase.' });
  }
});

// POST /api/fases/:chave/perguntas/:perguntaId/responder
// Valida a resposta, concede pontos se acertou (uma unica tentativa por pergunta).
router.post('/:chave/perguntas/:perguntaId/responder', async (req, res) => {
  try {
    const { chave, perguntaId } = req.params;
    const { opcaoSelecionada } = req.body;
    const usuarioId = req.usuario.id;

    if (!opcaoSelecionada) return res.status(400).json({ erro: 'Selecione uma opção.' });

    const { rows: faseRows } = await pool.query('SELECT * FROM fases WHERE chave = $1', [chave]);
    const fase = faseRows[0];
    if (!fase) return res.status(404).json({ erro: 'Fase não encontrada.' });

    const { rows: perguntaRows } = await pool.query(
      'SELECT * FROM perguntas WHERE id = $1 AND fase_id = $2',
      [perguntaId, fase.id]
    );
    const pergunta = perguntaRows[0];
    if (!pergunta) return res.status(404).json({ erro: 'Pergunta não encontrada.' });

    const jaRespondeu = await pool.query(
      'SELECT * FROM respostas_usuario_pergunta WHERE usuario_id = $1 AND pergunta_id = $2',
      [usuarioId, pergunta.id]
    );
    if (jaRespondeu.rows.length > 0) {
      return res.status(400).json({
        erro: 'Você já respondeu esta pergunta.',
        correta: jaRespondeu.rows[0].correta
      });
    }

    const correta = pergunta.resposta_correta_id === opcaoSelecionada;
    const pontosGanhos = correta ? pergunta.pontos : 0;
    await pool.query(
      `INSERT INTO respostas_usuario_pergunta (usuario_id, pergunta_id, opcao_selecionada, correta)
       VALUES ($1, $2, $3, $4)`,
      [usuarioId, pergunta.id, opcaoSelecionada, correta]
    );

    if (pontosGanhos > 0) {
      await pool.query(
        `UPDATE progresso_usuario_fase SET pontuacao_obtida = pontuacao_obtida + $2
         WHERE usuario_id = $1 AND fase_id = $3`,
        [usuarioId, pontosGanhos, fase.id]
      );
    }

    // Verifica se todas as perguntas da fase ja foram respondidas -> conclui a fase
    const { rows: totalRows } = await pool.query(
      'SELECT COUNT(*)::int AS total FROM perguntas WHERE fase_id = $1',
      [fase.id]
    );
    const { rows: respondidasRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM respostas_usuario_pergunta r
       JOIN perguntas p ON p.id = r.pergunta_id
       WHERE r.usuario_id = $1 AND p.fase_id = $2`,
      [usuarioId, fase.id]
    );

    let faseConcluida = false;
    if (respondidasRows[0].total >= totalRows[0].total) {
      faseConcluida = true;
      const prog = await pool.query(
        'SELECT * FROM progresso_usuario_fase WHERE usuario_id = $1 AND fase_id = $2',
        [usuarioId, fase.id]
      );
      const inicioEm = prog.rows[0]?.inicio_em;
      const tempoGastoSeg = inicioEm
        ? Math.max(1, Math.floor((Date.now() - new Date(inicioEm).getTime()) / 1000))
        : null;

      await pool.query(
        `UPDATE progresso_usuario_fase SET status = 'concluida', fim_em = now(), tempo_gasto_seg = $2
         WHERE usuario_id = $1 AND fase_id = $3`,
        [usuarioId, tempoGastoSeg, fase.id]
      );
    }

    res.json({
      correta,
      pontosGanhos,
      faseConcluida,
      explicacao: pergunta.explicacao,
      respostaCorretaId: pergunta.resposta_correta_id
    });
  } catch (err) {
    console.error('Erro ao validar resposta:', err);
    res.status(500).json({ erro: 'Erro ao validar resposta.' });
  }
});

module.exports = router;
