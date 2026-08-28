require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const fasesRoutes = require('./routes/fases');
const rankingRoutes = require('./routes/ranking');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
  })
);

// Rate limit basico para proteger contra brute-force nas rotas de login/resposta
const limiter = rateLimit({ windowMs: 60 * 1000, max: 60 });
app.use('/api/', limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', servico: 'dm-escape-room-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/fases', fasesRoutes);
app.use('/api/ranking', rankingRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ erro: 'Rota nao encontrada.' }));

// Tratador de erros genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Operacao Persona - backend rodando na porta ${PORT}`);
});
