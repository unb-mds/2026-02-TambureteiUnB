-- =====================================================================
-- PROJETO TAMBURETEI UnB - ESQUEMA RELACIONAL OFICIAL (PostgreSQL 17)
-- Baseado no PROJECT_CONTEXT.md e na documentação técnica (MDS 2026/2)
-- Sincronizado integralmente com o baseline Alembic revisão 010_curadorias (Head)
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
    modalidade VARCHAR(50),
    area_geral VARCHAR(100),
    area_especifica VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplinas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30),
    slug VARCHAR(150) NOT NULL UNIQUE,
    nome VARCHAR(150) NOT NULL,
    departamento VARCHAR(255),
    creditos INT CHECK (creditos > 0),
    carga_horaria INT CHECK (carga_horaria > 0),
    ementa TEXT,
    pre_requisitos TEXT,
    co_requisitos TEXT,
    equivalencias TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relação N:N entre Curso e Disciplina (matriz curricular por curso)
CREATE TABLE IF NOT EXISTS cursos_disciplinas (
    id SERIAL PRIMARY KEY,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    periodo_sugerido INT CHECK (periodo_sugerido > 0), -- NULL para optativas livres
    is_obrigatoria BOOLEAN NOT NULL DEFAULT TRUE,
    natureza VARCHAR(50) NOT NULL DEFAULT 'Obrigatoria',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curso_disciplina UNIQUE (curso_id, disciplina_id)
);

-- =====================================================================
-- 3. CORPO DOCENTE E TURMAS (OFERTAS SEMESTRAIS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS professores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    departamento VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Oferta concreta da disciplina em determinado semestre (ex.: Turma 01 Manhã vs Turma 02 Tarde)
CREATE TABLE IF NOT EXISTS turmas (
    id SERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    codigo_turma VARCHAR(10) NOT NULL, -- Ex: '01', '02', 'A'
    semestre VARCHAR(10) NOT NULL,     -- Ex: '2026.1'
    horario VARCHAR(255),              -- Ex: '35M12' (manhã) ou '35T23' (tarde)
    local VARCHAR(255),                -- Ex: 'UED - Sala 102'
    capacidade INT,
    matriculados INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_disciplina_turma_semestre UNIQUE (disciplina_id, codigo_turma, semestre)
);

-- Relação N:N entre Turmas e Professores (suporta co-docência com 2 ou mais docentes)
CREATE TABLE IF NOT EXISTS turmas_professores (
    turma_id INT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    professor_id INT NOT NULL REFERENCES professores(id) ON DELETE CASCADE,
    PRIMARY KEY (turma_id, professor_id)
);

-- =====================================================================
-- 4. MÉTRICAS ACADÊMICAS HISTÓRICAS E CONSOLIDADAS (DPO / INEP / LAI)
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
    amostragem_suprimida_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_disciplina_ano_semestre UNIQUE (disciplina_id, ano, semestre)
);

-- Métricas agregadas consolidadas por disciplina (RN07 - LGPD)
CREATE TABLE IF NOT EXISTS metricas_consolidadas (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    matriculados INT NOT NULL DEFAULT 0,
    aprovados INT NOT NULL DEFAULT 0,
    reprovados_nota INT NOT NULL DEFAULT 0,
    reprovados_falta INT NOT NULL DEFAULT 0,
    trancamentos INT NOT NULL DEFAULT 0,
    taxa_aprovacao_acumulada NUMERIC(5, 2),
    total_turmas_suprimidas INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_metrica_consolidada_disciplina UNIQUE (disciplina_id)
);

-- Métricas históricas de fluxo e evasão por curso (INEP / Censo da Educação Superior)
CREATE TABLE IF NOT EXISTS metricas_cursos (
    id BIGSERIAL PRIMARY KEY,
    curso_id INT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    ano INT NOT NULL,
    vagas_totais INT NOT NULL DEFAULT 0,
    inscritos_total INT NOT NULL DEFAULT 0,
    ingressantes INT NOT NULL DEFAULT 0,
    matriculados INT NOT NULL DEFAULT 0,
    concluintes INT NOT NULL DEFAULT 0,
    trancados INT NOT NULL DEFAULT 0,
    desvinculados INT NOT NULL DEFAULT 0,
    taxa_sucesso NUMERIC(5, 2),
    taxa_evasao NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_curso_ano UNIQUE (curso_id, ano)
);

-- =====================================================================
-- 5. CROWDSOURCING DISCENTE ("JÁ CURSEI" E DOAÇÕES DE ESTATÍSTICAS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS situacoes_disciplinas (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    situacao VARCHAR(20) NOT NULL CHECK (situacao IN ('APROVADO', 'REPROVADO_NOTA', 'REPROVADO_FALTA', 'TRANCOU')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_disciplina_situacao UNIQUE (usuario_id, disciplina_id)
);

CREATE TABLE IF NOT EXISTS doacoes_estatisticas (
    id BIGSERIAL PRIMARY KEY,
    turma_id INT NOT NULL REFERENCES turmas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    semestre_referencia VARCHAR(10) NOT NULL, -- Ex: '2026.1'
    taxa_aprovacao NUMERIC(5, 2) NOT NULL CHECK (taxa_aprovacao >= 0 AND taxa_aprovacao <= 100),
    taxa_reprovacao_nota NUMERIC(5, 2) NOT NULL CHECK (taxa_reprovacao_nota >= 0 AND taxa_reprovacao_nota <= 100),
    taxa_reprovacao_falta NUMERIC(5, 2) NOT NULL CHECK (taxa_reprovacao_falta >= 0 AND taxa_reprovacao_falta <= 100),
    taxa_trancamento NUMERIC(5, 2) NOT NULL CHECK (taxa_trancamento >= 0 AND taxa_trancamento <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'CONSOLIDADA', 'DESCARTADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_usuario_turma_semestre_doacao UNIQUE (usuario_id, turma_id, semestre_referencia),
    CONSTRAINT chk_soma_taxas_cem CHECK (
        (taxa_aprovacao + taxa_reprovacao_nota + taxa_reprovacao_falta + taxa_trancamento) = 100.00
    )
);

-- =====================================================================
-- 6. CONTEÚDOS DA DISCIPLINA (RESUMOS, LINKS, PROVAS PÚBLICAS, DICAS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS conteudos (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    turma_id INT REFERENCES turmas(id) ON DELETE SET NULL, -- Vínculo opcional com a turma específica
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(30) NOT NULL CONSTRAINT chk_tipo_conteudo CHECK (tipo IN ('LINK_UTIL', 'RESUMO', 'PROVA_ANTIGA', 'DICA', 'ARQUIVO')),
    url_origem TEXT,
    caminho_arquivo VARCHAR(64),
    formato VARCHAR(3),
    tamanho_bytes INTEGER,
    status_moderacao VARCHAR(20),
    semestre VARCHAR(10), -- Ex: '2024.1'
    status_curadoria VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK (status_curadoria IN ('PENDENTE', 'APROVADO', 'RECUSADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conteudos_caminho_arquivo UNIQUE (caminho_arquivo),
    CONSTRAINT chk_origem_conteudo CHECK ((caminho_arquivo IS NOT NULL AND url_origem IS NULL AND formato IS NOT NULL AND tamanho_bytes IS NOT NULL AND status_moderacao IS NOT NULL) OR (tipo <> 'ARQUIVO' AND url_origem IS NOT NULL AND caminho_arquivo IS NULL AND formato IS NULL AND tamanho_bytes IS NULL AND status_moderacao IS NULL)),
    CONSTRAINT chk_conteudo_formato CHECK (formato IS NULL OR formato IN ('pdf', 'png', 'jpg')),
    CONSTRAINT chk_conteudo_tamanho CHECK (tamanho_bytes IS NULL OR tamanho_bytes > 0),
    CONSTRAINT chk_conteudo_titulo CHECK (length(trim(titulo)) > 0),
    CONSTRAINT chk_conteudo_moderacao CHECK (status_moderacao IS NULL OR status_moderacao IN ('ativo', 'em_analise', 'bloqueado', 'excluido'))
);

-- =====================================================================
-- 7. COMENTÁRIOS E DISCUSSÕES ACADÊMICAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS comentarios (
    id BIGSERIAL PRIMARY KEY,
    disciplina_id INT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
    turma_id INT REFERENCES turmas(id) ON DELETE SET NULL, -- Relato sobre a matéria em geral ou turma específica
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    autor_alias VARCHAR(50) NOT NULL DEFAULT 'Estudante Anônimo',
    topico_dificuldade VARCHAR(150),
    conteudo TEXT NOT NULL,
    parent_id BIGINT REFERENCES comentarios(id) ON DELETE CASCADE, -- Respostas em thread
    status_moderacao VARCHAR(20) NOT NULL DEFAULT 'PUBLICADO' CHECK (status_moderacao IN ('PUBLICADO', 'PENDENTE', 'OCULTO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 8. VOTOS ÚTEIS (UPVOTES DE RELEVÂNCIA)
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
-- 9. ÍNDICES PARA CONSULTAS DE ALTA PERFORMANCE (< 300ms)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_cursos_slug ON cursos(slug);
CREATE INDEX IF NOT EXISTS idx_disciplinas_slug ON disciplinas(slug);
CREATE INDEX IF NOT EXISTS idx_disciplinas_codigo ON disciplinas(codigo);
CREATE INDEX IF NOT EXISTS idx_disciplinas_nome ON disciplinas(nome);
CREATE INDEX IF NOT EXISTS idx_disciplinas_departamento ON disciplinas(departamento);
CREATE INDEX IF NOT EXISTS idx_cursos_disciplinas_curso ON cursos_disciplinas(curso_id);
CREATE INDEX IF NOT EXISTS idx_cursos_disciplinas_disciplina ON cursos_disciplinas(disciplina_id);

CREATE INDEX IF NOT EXISTS idx_professores_nome ON professores(nome);
CREATE INDEX IF NOT EXISTS idx_turmas_disciplina ON turmas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_turmas_semestre ON turmas(semestre);
CREATE INDEX IF NOT EXISTS idx_turmas_professores_professor ON turmas_professores(professor_id);

CREATE INDEX IF NOT EXISTS idx_metricas_disciplina_ano ON metricas_academicas(disciplina_id, ano);
CREATE INDEX IF NOT EXISTS idx_metricas_consolidadas_disciplina ON metricas_consolidadas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_metricas_cursos_curso_ano ON metricas_cursos(curso_id, ano);
CREATE INDEX IF NOT EXISTS idx_situacoes_disciplina ON situacoes_disciplinas(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_doacoes_turma_status ON doacoes_estatisticas(turma_id, status);
CREATE INDEX IF NOT EXISTS idx_doacoes_usuario ON doacoes_estatisticas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_conteudos_disciplina_tipo ON conteudos(disciplina_id, tipo, status_curadoria);
CREATE INDEX IF NOT EXISTS ix_conteudos_arquivos_disciplina_status ON conteudos(disciplina_id, tipo, status_curadoria, status_moderacao, id);
CREATE INDEX IF NOT EXISTS idx_conteudos_turma ON conteudos(turma_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_disciplina ON comentarios(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_turma ON comentarios(turma_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_parent ON comentarios(parent_id);
CREATE INDEX IF NOT EXISTS idx_votos_target ON votos_uteis(target_type, target_id);

-- Métricas históricas agregadas de exemplo
INSERT INTO metricas_academicas (disciplina_id, ano, semestre, matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos, taxa_aprovacao, amostragem_suprimida_lgpd)
SELECT id, 2024, 1, 85, 55, 18, 5, 7, 64.71, false
FROM disciplinas WHERE slug = 'calculo-1'
ON CONFLICT DO NOTHING;

INSERT INTO metricas_academicas (disciplina_id, ano, semestre, matriculados, aprovados, reprovados_nota, reprovados_falta, trancamentos, taxa_aprovacao, amostragem_suprimida_lgpd)
SELECT id, 2024, 1, 60, 48, 6, 2, 4, 80.00, false
FROM disciplinas WHERE slug = 'algoritmos-e-programacao-de-computadores'
ON CONFLICT DO NOTHING;

-- =====================================================================
-- 10. CONTROLE DE VERSÃO DE MIGRAÇÕES (ALEMBIC)
-- =====================================================================
-- Decisoes de curadoria preservam a autoria administrativa e o historico.
CREATE TABLE IF NOT EXISTS curadorias (
    id BIGSERIAL PRIMARY KEY,
    conteudo_id BIGINT NOT NULL UNIQUE REFERENCES conteudos(id) ON DELETE RESTRICT,
    moderador_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    perfil_moderador VARCHAR(20) NOT NULL,
    status_anterior VARCHAR(20) NOT NULL,
    status_novo VARCHAR(20) NOT NULL,
    justificativa TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_curadoria_perfil CHECK (perfil_moderador IN ('MODERATOR', 'ADMIN')),
    CONSTRAINT chk_curadoria_anterior CHECK (status_anterior = 'PENDENTE'),
    CONSTRAINT chk_curadoria_novo CHECK (status_novo IN ('APROVADO', 'RECUSADO')),
    CONSTRAINT chk_curadoria_justificativa CHECK (justificativa IS NULL OR length(justificativa) <= 1000),
    CONSTRAINT chk_curadoria_recusa CHECK (status_novo <> 'RECUSADO' OR (justificativa IS NOT NULL AND length(trim(justificativa)) > 0))
);

CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('010_curadorias') ON CONFLICT (version_num) DO UPDATE SET version_num = '010_curadorias';
