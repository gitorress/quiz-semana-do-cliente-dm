const express = require('express');
const pool = require('../db/pool');
const { autenticar, exigirAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(autenticar, exigirAdmin);

// GET /api/admin/fases -> lista fases com config de liberacao (para o painel)
router.get('/fases', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM fases ORDER BY numero ASC');
  res.json({ fases: rows });
});

// PUT /api/admin/fases/:id -> atualizar dia_liberacao / ativo (liberacao manual)
router.put('/fases/:id', async (req, res) => {
  const { id } = req.params;
  const { diaLiberacao, ativo } = req.body;

  const { rows } = await pool.query(
    `UPDATE fases SET
       dia_liberacao = COALESCE($2, dia_liberacao),
       ativo = COALESCE($3, ativo)
     WHERE id = $1 RETURNING *`,
    [id, diaLiberacao ?? null, typeof ativo === 'boolean' ? ativo : null]
  );

  if (rows.length === 0) return res.status(404).json({ erro: 'Fase não encontrada.' });
  res.json({ fase: rows[0] });
});

// GET /api/admin/ranking -> mesmo ranking geral, disponivel tambem dentro do painel admin
router.get('/ranking', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT usuario_id, nome, email_corporativo, pontuacao_total, tempo_total_seg, ultima_conclusao_em, fases_concluidas
     FROM ranking_view
     ORDER BY pontuacao_total DESC, tempo_total_seg ASC, ultima_conclusao_em ASC NULLS LAST`
  );
  const ranking = rows.map((r, index) => ({
    posicao: index + 1,
    usuarioId: r.usuario_id,
    nome: r.nome,
    email: r.email_corporativo,
    pontuacaoTotal: r.pontuacao_total,
    tempoTotalSeg: r.tempo_total_seg,
    fasesConcluidas: r.fases_concluidas,
    ultimaConclusaoEm: r.ultima_conclusao_em
  }));
  res.json({ ranking });
});

// GET /api/admin/participantes -> quem jogou, fase a fase (para conferencia detalhada)
router.get('/participantes', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.nome, u.email_corporativo, f.numero, f.titulo AS fase, p.status,
           p.pontuacao_obtida, p.tempo_gasto_seg, p.fim_em
    FROM usuarios u
    LEFT JOIN progresso_usuario_fase p ON p.usuario_id = u.id
    LEFT JOIN fases f ON f.id = p.fase_id
    ORDER BY u.nome ASC, f.numero ASC NULLS LAST
  `);
  res.json({ participantes: rows });
});

module.exports = router;
