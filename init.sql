-- =====================================================================
-- PROJETO TAMBURETEI UnB - ESQUEMA RELACIONAL OFICIAL (PostgreSQL 17)
-- Baseado no PROJECT_CONTEXT.md e na documentação técnica (MDS 2026/2)
-- =====================================================================

-- Extensão para geração nativa de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 1. TABELA DE USUÁRIOS (Privacy by Design - sem matrícula/CPF)
-- =====================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'MODERATOR', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. ESTRUTURA ACADÊMICA E INSTITUCIONAL (CURSOS E DISCIPLINAS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS cursos (
    id SERIAL PRIMARY KEY,
    codigo_mec VARCHAR(20) UNIQUE,
    nome VARCHAR(150) NOT NULL,
    campus VARCHAR(100) NOT NULL DEFAULT 'FCTE - Gama',
    grau VARCHAR(50) DEFAULT 'Bacharelado',
    turno VARCHAR(50) DEFAULT 'Diurno',
    slug VARCHAR(150) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplinas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) INDEX,
    slug VARCHAR(150) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    departamento VARCHAR(100),
    creditos INT CHECK (creditos > 0),
    carga_horaria INT CHECK (carga_horaria > 0),
    ementa TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relação N:N entre Curso e Disciplina (matriz curricular por curso)
CREATE TABLE IF NOT EXISTS cursos_disciplinas (
    id SERIAL PRIMARY KEY,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    periodo_sugerido INT CHECK (periodo_sugerido > 0), -- NULL para optativas livres
    is_obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curso_disciplina UNIQUE (curso_id, disciplina_id)
);

-- =====================================================================
-- 3. MÉTRICAS ACADÊMICAS HISTÓRICAS (DPO / INEP / LAI)
-- =====================================================================
CREATE TABLE IF NOT EXISTS metricas_academicas (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    ano INT NOT NULL,
    semestre INT NOT NULL CHECK (semestre IN (1, 2)),
    matriculados INT NOT NULL DEFAULT 0,
    aprovados INT NOT NULL DEFAULT 0,
    reprovados_nota INT NOT NULL DEFAULT 0,
    reprovados_falta INT NOT NULL DEFAULT 0,
    trancamentos INT NOT NULL DEFAULT 0,
    taxa_aprovacao NUMERIC(5, 2), -- Ex: 78.50%
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_disciplina_ano_semestre UNIQUE (disciplina_id, ano, semestre)
);

-- =====================================================================
-- 4. CROWDSOURCING DISCENTE ("JÁ CURSEI ESSA MATÉRIA")
-- =====================================================================
CREATE TABLE IF NOT EXISTS situacoes_disciplinas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    situacao VARCHAR(20) NOT NULL CHECK (situacao IN ('APROVADO', 'REPROVADO_NOTA', 'REPROVADO_FALTA', 'TRANCOU')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_disciplina_situacao UNIQUE (usuario_id, disciplina_id)
);

-- =====================================================================
-- 5. CONTEÚDOS DA DISCIPLINA (RESUMOS, LINKS, PROVAS PÚBLICAS, DICAS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS conteudos (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA')),
    url_origem TEXT NOT NULL,
    semestre VARCHAR(10), -- Ex: '2024.1'
    status_curadoria VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status_curadoria IN ('PENDENTE', 'APROVADO', 'RECUSADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 6. COMENTÁRIOS E DISCUSSÕES ACADÊMICAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS comentarios (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    autor_alias VARCHAR(50) NOT NULL DEFAULT 'Estudante Anônimo',
    topico_dificuldade VARCHAR(150),
    conteudo TEXT NOT NULL,
    parent_id BIGINT REFERENCES comentarios(id) ON DELETE CASCADE, -- Respostas em thread
    status_moderacao VARCHAR(20) NOT NULL DEFAULT 'PUBLICADO' CHECK (status_moderacao IN ('PUBLICADO', 'PENDENTE', 'OCULTO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 7. VOTOS ÚTEIS (UPVOTES DE RELEVÂNCIA)
-- =====================================================================
CREATE TABLE IF NOT EXISTS votos_uteis (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('CONTEUDO', 'COMENTARIO')),
    target_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_target_voto UNIQUE (usuario_id, target_type, target_id)
);

-- =====================================================================
-- 8. ÍNDICES PARA CONSULTAS DE ALTA PERFORMANCE (< 300ms)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_cursos_slug ON cursos(slug);
CREATE INDEX IF NOT EXISTS idx_disciplinas_slug ON disciplinas(slug);
CREATE INDEX IF NOT EXISTS idx_disciplinas_codigo ON disciplinas(codigo);
CREATE INDEX IF NOT EXISTS idx_cursos_disciplinas_curso ON cursos_disciplinas(curso_id);
CREATE INDEX IF NOT EXISTS idx_cursos_disciplinas_disciplina ON cursos_disciplinas(disciplina_id);

CREATE INDEX IF NOT EXISTS idx_metricas_disciplina_ano ON metricas_academicas(disciplina_id, ano);
CREATE INDEX IF NOT EXISTS idx_situacoes_disciplina ON situacoes_disciplinas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_conteudos_disciplina_tipo ON conteudos(disciplina_id, tipo, status_curadoria);
CREATE INDEX IF NOT EXISTS idx_comentarios_disciplina ON comentarios(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_parent ON comentarios(parent_id);
CREATE INDEX IF NOT EXISTS idx_votos_target ON votos_uteis(target_type, target_id);

-- =====================================================================
-- 9. DADOS INICIAIS DE TESTE (SEEDS - UnB / FCTE Gama)
-- =====================================================================
INSERT INTO cursos (codigo_mec, nome, campus, grau, turno, slug) VALUES 
('118928', 'Engenharia de Software', 'FCTE - Gama', 'Bacharelado', 'Diurno', 'engenharia-de-software'),
('118924', 'Engenharia Aeroespacial', 'FCTE - Gama', 'Bacharelado', 'Diurno', 'engenharia-aeroespacial'),
('118925', 'Engenharia Automotiva', 'FCTE - Gama', 'Bacharelado', 'Diurno', 'engenharia-automotiva')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO disciplinas (codigo, slug, nome, departamento, creditos, carga_horaria, ementa) VALUES 
('FGA0168', 'metodos-de-desenvolvimento-de-software', 'Métodos de Desenvolvimento de Software', 'FGA/FCTE', 4, 60, 'Processos e metodologias ágeis de desenvolvimento de software, engenharia de requisitos, testes automatizados, integração contínua e arquitetura em camadas.'),
('MAT0025', 'calculo-1', 'Cálculo 1', 'MAT', 6, 90, 'Funções de uma variável real, limites, continuidade, derivadas e suas aplicações, integrais e teorema fundamental do cálculo.'),
('FGA0158', 'algoritmos-e-programacao-de-computadores', 'Algoritmos e Programação de Computadores', 'FGA/FCTE', 6, 90, 'Fundamentos de programação, estruturas de controle, tipos estruturados, ponteiros, alocação dinâmica e modularização.'),
('FGA0147', 'estrutura-de-dados-1', 'Estruturas de Dados 1', 'FGA/FCTE', 4, 60, 'Tipos abstratos de dados, listas, filas, pilhas, árvores binárias, algoritmos de ordenação e busca assintótica.')
ON CONFLICT (slug) DO NOTHING;

-- Associação das matérias à matriz de Engenharia de Software
INSERT INTO cursos_disciplinas (curso_id, disciplina_id, periodo_sugerido, is_obrigatoria)
SELECT c.id, d.id, 1, TRUE 
FROM cursos c, disciplinas d 
WHERE c.slug = 'engenharia-de-software' AND d.slug IN ('calculo-1', 'algoritmos-e-programacao-de-computadores')
ON CONFLICT DO NOTHING;

INSERT INTO cursos_disciplinas (curso_id, disciplina_id, periodo_sugerido, is_obrigatoria)
SELECT c.id, d.id, 2, TRUE 
FROM cursos c, disciplinas d 
WHERE c.slug = 'engenharia-de-software' AND d.slug = 'estrutura-de-dados-1'
ON CONFLICT DO NOTHING;

INSERT INTO cursos_disciplinas (curso_id, disciplina_id, periodo_sugerido, is_obrigatoria)
SELECT c.id, d.id, 3, TRUE 
FROM cursos c, disciplinas d 
WHERE c.slug = 'engenharia-de-software' AND d.slug = 'metodos-de-desenvolvimento-de-software'
ON CONFLICT DO NOTHING;

-- Métricas históricas agregadas de exemplo
INSERT INTO metricas_academicas (disciplina_id, ano, semestre, matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos, taxa_aprovacao)
SELECT id, 2024, 1, 85, 55, 18, 5, 7, 64.71
FROM disciplinas WHERE slug = 'calculo-1'
ON CONFLICT DO NOTHING;

INSERT INTO metricas_academicas (disciplina_id, ano, semestre, matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos, taxa_aprovacao)
SELECT id, 2024, 1, 60, 48, 6, 2, 4, 80.00
FROM disciplinas WHERE slug = 'algoritmos-e-programacao-de-computadores'
ON CONFLICT DO NOTHING;
