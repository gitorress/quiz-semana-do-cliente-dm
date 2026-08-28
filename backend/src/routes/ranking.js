const express = require('express');
const pool = require('../db/pool');
const { autenticar } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar);

// GET /api/ranking -> ranking geral
// Criterios: 1) maior pontuacao 2) menor tempo total 3) conclusao mais antiga
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT usuario_id, nome, pontuacao_total, tempo_total_seg, ultima_conclusao_em, fases_concluidas
       FROM ranking_view
       ORDER BY pontuacao_total DESC, tempo_total_seg ASC, ultima_conclusao_em ASC NULLS LAST`
    );

    const ranking = rows.map((r, index) => ({
      posicao: index + 1,
      usuarioId: r.usuario_id,
      nome: r.nome,
      pontuacaoTotal: r.pontuacao_total,
      tempoTotalSeg: r.tempo_total_seg,
      fasesConcluidas: r.fases_concluidas,
      ultimaConclusaoEm: r.ultima_conclusao_em
    }));

    res.json({ ranking });
  } catch (err) {
    console.error('Erro ao carregar ranking:', err);
    res.status(500).json({ erro: 'Erro ao carregar ranking.' });
  }
});

module.exports = router;
