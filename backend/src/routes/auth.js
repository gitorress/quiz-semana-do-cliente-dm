const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { nome, email } = req.body;

    if (!nome || !nome.trim() || !email || !email.trim()) {
      return res.status(400).json({ erro: 'Informe nome e e-mail corporativo.' });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const dominioPermitido = (process.env.ALLOWED_EMAIL_DOMAIN || '').toLowerCase();

    if (dominioPermitido && !emailNormalizado.endsWith(dominioPermitido)) {
      return res.status(403).json({
        erro: `Use seu e-mail corporativo (${dominioPermitido}) para entrar na Operacao Persona.`
      });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = adminEmails.includes(emailNormalizado);

    // upsert do usuario
     const result = await pool.query(
      `INSERT INTO usuarios (nome, email_corporativo, is_admin)
       VALUES ($1, $2, $3)
       ON CONFLICT (email_corporativo)
       DO UPDATE SET nome = EXCLUDED.nome, is_admin = EXCLUDED.is_admin
       RETURNING id, nome, email_corporativo, is_admin`,
      [nome.trim(), emailNormalizado, isAdmin]
    );

    const usuario = result.rows[0];

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email_corporativo,
        isAdmin: usuario.is_admin
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    res.json({ token, usuario });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno ao autenticar.' });
  }
});

module.exports = router;
