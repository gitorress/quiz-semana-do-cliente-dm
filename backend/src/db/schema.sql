-- Schema: Quiz Semana do Cliente DM - CX, Voz do Cliente e NPS
-- PostgreSQL

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email_corporativo VARCHAR(150) UNIQUE NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fases (
  id SERIAL PRIMARY KEY,
  numero INTEGER UNIQUE NOT NULL,
  chave VARCHAR(50) UNIQUE NOT NULL,       -- ex: 'fase1'
  titulo VARCHAR(150) NOT NULL,
  tema VARCHAR(150) NOT NULL,              -- tema/assunto da fase (ex: "Especialista em NPS")
  icone VARCHAR(10) NOT NULL DEFAULT '⭐',  -- emoji/icone representando o tema (nao e foto de pessoa)
  cor_hex VARCHAR(7) NOT NULL,
  dia_liberacao INTEGER NOT NULL,          -- 1, 2, 3 ou 4
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Banco de perguntas do quiz. Cada fase tem N perguntas (minimo 3).
-- 'opcoes' guarda um array JSON [{id, texto}], 'resposta_correta_id' guarda
-- o id da opcao certa e NUNCA e enviado ao frontend antes da resposta.
-- 'explicacao' e mostrada como feedback educativo depois de responder.
CREATE TABLE IF NOT EXISTS perguntas (
  id SERIAL PRIMARY KEY,
  fase_id INTEGER NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  enunciado TEXT NOT NULL,
  opcoes JSONB NOT NULL,
  resposta_correta_id VARCHAR(10) NOT NULL,
  explicacao TEXT,
  pontos INTEGER NOT NULL DEFAULT 100,
  UNIQUE (fase_id, ordem)
);

CREATE TABLE IF NOT EXISTS progresso_usuario_fase (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fase_id INTEGER NOT NULL REFERENCES fases(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('bloqueada','disponivel','em_andamento','concluida')),
  inicio_em TIMESTAMPTZ,
  fim_em TIMESTAMPTZ,
  tempo_gasto_seg INTEGER,
  pontuacao_obtida INTEGER NOT NULL DEFAULT 0,
  UNIQUE (usuario_id, fase_id)
);

-- Registra a resposta de cada usuario para cada pergunta (1 tentativa por pergunta)
CREATE TABLE IF NOT EXISTS respostas_usuario_pergunta (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pergunta_id INTEGER NOT NULL REFERENCES perguntas(id) ON DELETE CASCADE,
  opcao_selecionada VARCHAR(10) NOT NULL,
  correta BOOLEAN NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, pergunta_id)
);

CREATE INDEX IF NOT EXISTS idx_progresso_usuario ON progresso_usuario_fase(usuario_id);
CREATE INDEX IF NOT EXISTS idx_progresso_fase ON progresso_usuario_fase(fase_id);
CREATE INDEX IF NOT EXISTS idx_respostas_usuario ON respostas_usuario_pergunta(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perguntas_fase ON perguntas(fase_id);

-- View de ranking: soma pontuacao e tempo de todas as fases concluidas por usuario.
-- Usada tanto no Ranking Geral quanto no painel Admin.
CREATE OR REPLACE VIEW ranking_view AS
SELECT
  u.id AS usuario_id,
  u.nome,
  u.email_corporativo,
  COALESCE(SUM(p.pontuacao_obtida), 0) AS pontuacao_total,
  COALESCE(SUM(p.tempo_gasto_seg), 0) AS tempo_total_seg,
  MAX(p.fim_em) AS ultima_conclusao_em,
  COUNT(p.id) FILTER (WHERE p.status = 'concluida') AS fases_concluidas
FROM usuarios u
LEFT JOIN progresso_usuario_fase p ON p.usuario_id = u.id AND p.status = 'concluida'
GROUP BY u.id, u.nome, u.email_corporativo;

-- =========================================================
-- SEED: 5 fases do Quiz Semana do Cliente DM
-- Calendario de 4 dias:
--   Dia 1 -> Fase 1 | Dia 2 -> Fase 2 | Dia 3 -> Fase 3 | Dia 4 -> Fase 4 e Fase 5
-- =========================================================
INSERT INTO fases (numero, chave, titulo, tema, icone, cor_hex, dia_liberacao)
VALUES
  (1, 'fase1', 'Mentalidade Cliente no Centro', 'Cultura centrada no cliente', '🎯', '#202ad0', 1),
  (2, 'fase2', 'Decifrando a Voz do Cliente',   'Notas, comentários e feedback', '💬', '#ff9a98', 2),
  (3, 'fase3', 'Investigador de Pesquisas',     'Metodologia de pesquisas',      '🔍', '#68e699', 3),
  (4, 'fase4', 'Especialista em NPS',           'Metodologia NPS',               '📊', '#7df4ed', 4),
  (5, 'fase5', 'Mestre da Experiência',         'Closed Loop e cultura de CX',   '🏆', '#ffc000', 4)
ON CONFLICT (numero) DO NOTHING;

-- ---------- Fase 1: Mentalidade Cliente no Centro ----------
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 1,
  'Um cliente entra em contato relatando um problema que não pertence à sua área. Qual atitude representa melhor uma cultura centrada no cliente?',
  '[{"id":"a","texto":"Informar que não é responsabilidade da sua área e encerrar o atendimento."},{"id":"b","texto":"Direcionar o cliente para procurar outro canal sozinho."},{"id":"c","texto":"Ajudar o cliente a encontrar a solução ou encaminhá-lo corretamente."},{"id":"d","texto":"Registrar a reclamação apenas se for algo recorrente."}]'::jsonb,
  'c', 'Empresas centradas no cliente não transferem problemas, ajudam a resolvê-los. O cliente enxerga uma única empresa, não departamentos separados.', 100
FROM fases WHERE chave = 'fase1'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 2,
  'Qual dessas situações tem maior potencial de impactar negativamente a experiência do cliente?',
  '[{"id":"a","texto":"Um processo demorar alguns minutos a mais."},{"id":"b","texto":"O cliente precisar repetir a mesma informação para diferentes atendentes."},{"id":"c","texto":"Receber uma comunicação por e-mail."},{"id":"d","texto":"Utilizar mais de um canal de atendimento."}]'::jsonb,
  'b', 'Repetição de informações gera esforço e frustração, sendo um dos principais fatores associados à insatisfação dos clientes.', 100
FROM fases WHERE chave = 'fase1'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 3,
  'Quando dizemos que a experiência do cliente é responsabilidade de todos, isso significa que:',
  '[{"id":"a","texto":"Todos devem responder pesquisas."},{"id":"b","texto":"Todos influenciam direta ou indiretamente a percepção do cliente."},{"id":"c","texto":"Todos devem trabalhar no atendimento."},{"id":"d","texto":"Apenas gestores são responsáveis pelos resultados."}]'::jsonb,
  'b', 'Mesmo áreas sem contato direto impactam processos, sistemas, produtos e decisões que afetam a jornada do cliente.', 100
FROM fases WHERE chave = 'fase1'
ON CONFLICT (fase_id, ordem) DO NOTHING;

-- ---------- Fase 2: Decifrando a Voz do Cliente ----------
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 1,
  'Um cliente avalia a empresa com nota 10, mas deixa um comentário negativo. O que deve ter maior atenção?',
  '[{"id":"a","texto":"Apenas a nota."},{"id":"b","texto":"Apenas o comentário."},{"id":"c","texto":"A combinação da nota e do comentário."},{"id":"d","texto":"Nenhum dos dois."}]'::jsonb,
  'c', 'As notas mostram o resultado, mas os comentários ajudam a entender os motivos e encontrar oportunidades de melhoria.', 100
FROM fases WHERE chave = 'fase2'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 2,
  'Qual é o principal risco de tomar decisões sem ouvir os clientes?',
  '[{"id":"a","texto":"Aumentar os custos da empresa."},{"id":"b","texto":"Investir em melhorias que não resolvem as dores reais dos clientes."},{"id":"c","texto":"Receber mais pesquisas respondidas."},{"id":"d","texto":"Melhorar indicadores muito rápido."}]'::jsonb,
  'b', 'Sem ouvir o cliente, a empresa corre o risco de resolver problemas internos enquanto ignora o que realmente gera valor para quem utiliza seus produtos.', 100
FROM fases WHERE chave = 'fase2'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 3,
  'Uma pesquisa recebeu poucas respostas. O que isso pode indicar?',
  '[{"id":"a","texto":"Que todos os clientes estão satisfeitos."},{"id":"b","texto":"Que a pesquisa não necessariamente representa toda a base de clientes."},{"id":"c","texto":"Que o resultado pode ser considerado definitivo."},{"id":"d","texto":"Que não há nenhuma oportunidade de melhoria."}]'::jsonb,
  'b', 'Uma baixa amostra pode limitar a representatividade dos resultados e exigir análises complementares.', 100
FROM fases WHERE chave = 'fase2'
ON CONFLICT (fase_id, ordem) DO NOTHING;

-- ---------- Fase 3: Investigador de Pesquisas ----------
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 1,
  'Em uma pesquisa, o que é mais importante: quantidade ou qualidade das respostas?',
  '[{"id":"a","texto":"Apenas quantidade."},{"id":"b","texto":"Apenas qualidade."},{"id":"c","texto":"Ambas são importantes para gerar análises confiáveis."},{"id":"d","texto":"Nenhuma delas."}]'::jsonb,
  'c', 'Muitas respostas geram maior confiança estatística, mas respostas detalhadas ajudam a entender os motivos por trás dos resultados.', 100
FROM fases WHERE chave = 'fase3'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 2,
  'Qual destas práticas aumenta a chance de um cliente responder uma pesquisa?',
  '[{"id":"a","texto":"Pesquisa curta e objetiva."},{"id":"b","texto":"Formulário com dezenas de perguntas."},{"id":"c","texto":"Linguagem técnica e corporativa."},{"id":"d","texto":"Solicitar várias pesquisas seguidas."}]'::jsonb,
  'a', 'Quanto menor o esforço para responder, maior tende a ser a participação do cliente.', 100
FROM fases WHERE chave = 'fase3'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 3,
  'O que diferencia um dado de um insight?',
  '[{"id":"a","texto":"Não existe diferença."},{"id":"b","texto":"Um dado mostra o que aconteceu; um insight ajuda a explicar por que aconteceu e o que fazer."},{"id":"c","texto":"Insight é apenas um gráfico."},{"id":"d","texto":"Dado é sempre mais importante."}]'::jsonb,
  'b', 'Insights transformam informações em ações capazes de melhorar a experiência do cliente.', 100
FROM fases WHERE chave = 'fase3'
ON CONFLICT (fase_id, ordem) DO NOTHING;

-- ---------- Fase 4: Especialista em NPS ----------
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 1,
  'O cliente avaliou a empresa com nota 8. Como ele é classificado no NPS?',
  '[{"id":"a","texto":"Promotor."},{"id":"b","texto":"Neutro."},{"id":"c","texto":"Detrator."},{"id":"d","texto":"Cliente fiel."}]'::jsonb,
  'b', 'Na metodologia NPS, notas 7 e 8 são consideradas neutras, ou passivas.', 100
FROM fases WHERE chave = 'fase4'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 2,
  'Por que uma empresa acompanha a evolução do NPS ao longo do tempo?',
  '[{"id":"a","texto":"Apenas para divulgar números."},{"id":"b","texto":"Para entender se as ações implementadas estão melhorando ou piorando a experiência."},{"id":"c","texto":"Porque é obrigatório."},{"id":"d","texto":"Para substituir todos os demais indicadores."}]'::jsonb,
  'b', 'O valor está na tendência e não apenas no número isolado de um determinado período.', 100
FROM fases WHERE chave = 'fase4'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 3,
  'Um aumento do NPS significa que:',
  '[{"id":"a","texto":"Não existem mais problemas na jornada."},{"id":"b","texto":"Todos os clientes estão satisfeitos."},{"id":"c","texto":"A percepção geral melhorou, mas ainda é necessário entender os pontos de atenção."},{"id":"d","texto":"As pesquisas podem ser encerradas."}]'::jsonb,
  'c', 'Mesmo com bons resultados, sempre existem oportunidades de evolução na experiência.', 100
FROM fases WHERE chave = 'fase4'
ON CONFLICT (fase_id, ordem) DO NOTHING;

-- ---------- Fase 5: Mestre da Experiência ----------
INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 1,
  'Um comentário de cliente aparece apenas uma vez. Ele deve ser ignorado?',
  '[{"id":"a","texto":"Sim, porque aconteceu apenas uma vez."},{"id":"b","texto":"Não, pois pode indicar uma oportunidade ou risco relevante que merece investigação."},{"id":"c","texto":"Sim, porque não impacta indicadores."},{"id":"d","texto":"Apenas se for uma reclamação."}]'::jsonb,
  'b', 'Grandes problemas podem aparecer inicialmente em poucos relatos.', 100
FROM fases WHERE chave = 'fase5'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 2,
  'Qual destas ações demonstra melhor o fechamento de ciclo, também conhecido como Closed Loop?',
  '[{"id":"a","texto":"Coletar feedbacks e armazená-los."},{"id":"b","texto":"Medir a satisfação uma única vez."},{"id":"c","texto":"Ouvir o cliente, agir sobre o problema e acompanhar o resultado."},{"id":"d","texto":"Publicar os indicadores mensalmente."}]'::jsonb,
  'c', 'O verdadeiro valor do feedback acontece quando ele gera ação e melhoria.', 100
FROM fases WHERE chave = 'fase5'
ON CONFLICT (fase_id, ordem) DO NOTHING;

INSERT INTO perguntas (fase_id, ordem, enunciado, opcoes, resposta_correta_id, explicacao, pontos)
SELECT id, 3,
  'Imagine que sua equipe recebeu um feedback negativo recorrente sobre um processo. Qual seria a atitude mais alinhada à cultura de experiência?',
  '[{"id":"a","texto":"Justificar por que o processo existe."},{"id":"b","texto":"Questionar a opinião dos clientes."},{"id":"c","texto":"Investigar a causa raiz e buscar melhorias."},{"id":"d","texto":"Esperar novas reclamações."}]'::jsonb,
  'c', 'A experiência do cliente evolui quando feedbacks são transformados em melhorias concretas.', 100
FROM fases WHERE chave = 'fase5'
ON CONFLICT (fase_id, ordem) DO NOTHING;
