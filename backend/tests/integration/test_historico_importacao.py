from unittest.mock import patch

from app.core.config import settings
from app.models.amostra_historico import AmostraHistorico
from app.models.disciplina import Disciplina
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.models.turma import Turma


def _gerar_texto_historico(matricula: str, situacao: str = "APR", nota: str = "MS") -> str:
    integralizado = "60" if situacao == "APR" else "0"
    return f"""
SIGAA - Sistema Integrado de Gestão de Atividades Acadêmicas
UnB - Universidade de Brasília
Histórico Escolar - Emitido em: 21/11/2026 às 21:23
Nome: DISCENTE ANONIMIZADO
Matrícula: {matricula}
Curso: ENGENHARIA DE SOFTWARE/FCTE - BACHARELADO - DIURNO
Status: ATIVO    IRA: 4.1000    MP: 4.2000
Currículo: 6360/2 - 2024.2
Ano / Período Letivo Inicial: 2025.1
Período Letivo Atual: 4
Componentes Curriculares Cursados/Cursando
Ano/Período Letivo Componente Curricular CH Turma Freq % Nota Situação
2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  02  100,0  {nota}  {situacao}
LUCAS URSULINO BOAVENTURA (60h)
2026.2  FGA0312  MÉTODOS DE DESENVOLVIMENTO DE SOFTWARE  60  01  100,0  -  MATR
Dra. CARLA SILVA ROCHA AGUIAR (60h)
Legenda
Carga Horária Integralizada/Pendente
Exigido 2985 h 540 h 0 h 3525 h
Integralizado {integralizado} h 0 h 0 h {integralizado} h
Pendente 2925 h 540 h 0 h 3465 h
Para verificar a autenticidade deste documento entre em https://sig.unb.br/sigaa/documentos/ informando a matrícula, data de emissão
e o código de verificação: 30330eba4c
"""


class _FakePage:
    def __init__(self, texto: str):
        self._texto = texto

    def extract_text(self, extraction_mode=None):
        return self._texto


class _FakeReader:
    def __init__(self, texto: str):
        self.pages = [_FakePage(texto)]


def test_importar_historico_exige_autenticacao(client):
    resp = client.post(
        "/perfil/importar-historico",
        files={"arquivo": ("historico.pdf", b"%PDF-1.4", "application/pdf")},
    )
    assert resp.status_code == 401


def test_importar_historico_rejeita_arquivo_nao_pdf(client, headers):
    resp = client.post(
        "/perfil/importar-historico",
        headers=headers,
        files={"arquivo": ("historico.txt", b"nao pdf", "text/plain")},
    )
    assert resp.status_code == 415


def test_importar_historico_dedup_e_rn07(client, db, headers, monkeypatch):
    monkeypatch.setattr(settings, "HISTORICO_MIN_AMOSTRAS", 3)

    disc_oo = Disciplina(
        codigo="FGA0158",
        nome="Orientação a Objetos",
        slug="orientacao-a-objetos",
        departamento="FCTE",
        carga_horaria=60,
    )
    disc_mds = Disciplina(
        codigo="FGA0312",
        nome="Métodos de Desenvolvimento de Software",
        slug="metodos-de-desenvolvimento-de-software",
        departamento="FCTE",
        carga_horaria=60,
    )
    db.add_all([disc_oo, disc_mds])
    db.commit()

    # 1. Primeiro aluno envia o histórico -> cria turma histórica + 1 amostra (abaixo do limiar RN07=3)
    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(_gerar_texto_historico("251037401", "APR", "SS")),
    ):
        r1 = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )
    assert r1.status_code == 200, r1.text
    body1 = r1.json()
    assert body1["contribuicao"]["novas_contribuicoes"] == 1
    assert body1["contribuicao"]["duplicadas_ignoradas"] == 0
    assert len(body1["cursadas"]) == 1
    assert len(body1["cursando"]) == 1

    # Turma histórica de 2025.2 foi criada, mas estatística pública está suprimida (RN07)
    turma = db.query(Turma).filter_by(disciplina_id=disc_oo.id, codigo_turma="02", semestre="2025.2").one()
    assert len(turma.professores) == 1
    ec = db.query(EstatisticaConsolidada).filter_by(turma_id=turma.id, semestre_referencia="2025.2").one()
    assert ec.total_amostras == 1
    assert ec.amostragem_suprimida_lgpd is True

    turmas_api = client.get(f"/turmas?disciplina_id={disc_oo.id}").json()
    assert turmas_api[0]["estatistica"] is None
    assert client.get(f"/catalogo/cadeiras/{disc_oo.id}/estatisticas", headers=headers).json()["semestres"] == []

    # 2. Mesmo aluno reenvia o mesmo histórico -> deduplicado pelo hash
    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(_gerar_texto_historico("251037401", "APR", "SS")),
    ):
        r_dup = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )
    assert r_dup.status_code == 200
    assert r_dup.json()["contribuicao"]["novas_contribuicoes"] == 0
    assert r_dup.json()["contribuicao"]["duplicadas_ignoradas"] == 1
    assert db.query(AmostraHistorico).count() == 1

    # 3. Mais 2 alunos distintos enviam -> atinge limiar RN07=3 e libera exibição pública
    for mat, sit, nota in [("251037402", "APR", "MS"), ("251037403", "REP", "MI")]:
        with patch(
            "app.services.historico_parser_service.PdfReader",
            return_value=_FakeReader(_gerar_texto_historico(mat, sit, nota)),
        ):
            res = client.post(
                "/perfil/importar-historico",
                headers=headers,
                files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
            )
            assert res.status_code == 200

    db.expire_all()
    ec_atualizada = db.query(EstatisticaConsolidada).filter_by(turma_id=turma.id).one()
    assert ec_atualizada.total_amostras == 3
    assert ec_atualizada.amostragem_suprimida_lgpd is False
    assert ec_atualizada.qtd_ss == 1
    assert ec_atualizada.qtd_ms == 1
    assert ec_atualizada.qtd_mi == 1

    turmas_api_liberada = client.get(f"/turmas?disciplina_id={disc_oo.id}").json()
    assert turmas_api_liberada[0]["estatistica"] is not None
    assert turmas_api_liberada[0]["estatistica"]["status"] == "VALIDADO"

    consolidadas = client.get(f"/estatisticas-consolidadas?turma_id={turma.id}").json()
    assert len(consolidadas) == 1
    assert consolidadas[0]["total_amostras"] == 3

    serie = client.get(f"/catalogo/cadeiras/{disc_oo.id}/estatisticas", headers=headers).json()
    assert len(serie["semestres"]) == 1
    assert serie["semestres"][0]["semestre_referencia"] == "2025.2"

    ma = db.query(MetricaAcademica).filter_by(disciplina_id=disc_oo.id, ano=2025, semestre=2).one()
    assert ma.matriculados == 3
    assert ma.aprovados == 2
    assert ma.amostragem_suprimida_lgpd is False

    mc = db.query(MetricaConsolidada).filter_by(disciplina_id=disc_oo.id).one()
    assert mc.matriculados == 3
    assert mc.aprovados == 2
    assert mc.taxa_aprovacao_acumulada is not None


def test_importar_historico_com_disciplina_repetida_no_mesmo_pdf_nao_quebra(client, db, headers):
    disc = Disciplina(
        codigo="FGA0158",
        nome="Orientação a Objetos",
        slug="orientacao-a-objetos-dup",
        departamento="FCTE",
        carga_horaria=60,
    )
    db.add(disc)
    db.commit()

    texto_duplicado = (
        _gerar_texto_historico("251099999", "APR", "SS").replace(
            "Legenda",
            "2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  02  100,0  SS  APR\nLUCAS URSULINO BOAVENTURA (60h)\nLegenda",
        )
    )
    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(texto_duplicado),
    ):
        resp = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )
    assert resp.status_code == 200, resp.text
    assert resp.json()["contribuicao"]["novas_contribuicoes"] == 1
    assert resp.json()["contribuicao"]["duplicadas_ignoradas"] == 1


def test_dedup_hash_preserva_identidade_quando_historico_dedup_secret_esta_fixo(monkeypatch):
    from app.core.config import settings
    from app.services.historico_importacao_service import _gerar_dedup_hash

    monkeypatch.setattr(settings, "HISTORICO_DEDUP_SECRET", "chave-dedup-estavel")
    monkeypatch.setattr(settings, "SECRET_KEY", "jwt-chave-1")
    h1 = _gerar_dedup_hash("251012345", "MAT0025", "2025.2")

    monkeypatch.setattr(settings, "SECRET_KEY", "jwt-chave-rotacionada-2")
    h2 = _gerar_dedup_hash("251012345", "MAT0025", "2025.2")

    assert h1 == h2


def test_importar_historico_preserva_nomes_limpos_com_titulo_orfao_vizinho(client, db, headers):
    disc_alg = Disciplina(
        codigo="MAT0031",
        nome="INTRODUCAO A ALGEBRA LINEAR",
        slug="introducao-a-algebra-linear",
        departamento="MAT",
        carga_horaria=90,
    )
    disc_vig = Disciplina(
        codigo="DSC0172",
        nome="VIGILÂNCIA EPIDEMIOLÓGICA PARTICIPATIVA",
        slug="vigilancia-epidemiologica-participativa",
        departamento="DSC",
        carga_horaria=30,
    )
    db.add_all([disc_alg, disc_vig])
    db.commit()

    texto = """
SIGAA - Sistema Integrado de Gestão de Atividades Acadêmicas
UnB - Universidade de Brasília
Histórico Escolar - Emitido em: 21/11/2026 às 21:23
Nome: DISCENTE ANONIMIZADO
Matrícula: 251088888
Curso: ENGENHARIA DE SOFTWARE/FCTE - BACHARELADO - DIURNO
Status: ATIVO    IRA: 4.1000    MP: 4.2000
Componentes Curriculares Cursados/Cursando
2025.2  MAT0031  INTRODUCAO A ALGEBRA LINEAR  90  01  78,0  MS  APR
Dr. FULANO DE TAL (90h)
VIGILÂNCIA EPIDEMIOLÓGICA PARTICIPATIVA
2026.1  #  DSC0172  30  01  100,0  SS  APR
Dra. LIGIA MARIA CANTARINO DA COSTA (30h)
Legenda
Carga Horária Integralizada/Pendente
Exigido 2985 h 540 h 0 h 3525 h
Integralizado 90 h 30 h 0 h 120 h
Para verificar a autenticidade deste documento entre em https://sig.unb.br/sigaa/documentos/ informando a matrícula, data de emissão
e o código de verificação: 30330eba4c
"""
    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(texto),
    ):
        resp = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )

    assert resp.status_code == 200, resp.text
    itens = {c["codigo"]: c for c in resp.json()["cursadas"]}
    assert itens["MAT0031"]["nome"] == "INTRODUCAO A ALGEBRA LINEAR"
    assert itens["DSC0172"]["nome"] == "VIGILÂNCIA EPIDEMIOLÓGICA PARTICIPATIVA"


def test_importar_historico_com_aproveitamentos_cump_nao_cria_amostra_sem_semestre(
    client, db, headers
):
    disc_pi = Disciplina(
        codigo="FGA0150",
        nome="Projeto Integrador de Engenharia 1",
        slug="projeto-integrador-de-engenharia-1",
        departamento="FCTE",
        carga_horaria=60,
    )
    disc_oo = Disciplina(
        codigo="FGA0158",
        nome="Orientação a Objetos",
        slug="orientacao-a-objetos",
        departamento="FCTE",
        carga_horaria=60,
    )
    db.add_all([disc_pi, disc_oo])
    db.commit()

    texto = """
SIGAA - Sistema Integrado de Gestão de Atividades Acadêmicas
UnB - Universidade de Brasília
Histórico Escolar - Emitido em: 24/11/2026 às 11:11
Nome: ESTUDANTE TESTE
Matrícula: 259000002
Curso: ENGENHARIA/FCTE - BACHARELADO - DIURNO
Status: ATIVO    IRA: 4.5000    MP: 4.5000
Componentes Curriculares Cursados/Cursando
-- * FGA0150 PROJETO INTEGRADOR DE ENGENHARIA 1 60 -- -- - CUMP
2026.1 ORIENTAÇÃO A OBJETOS
Dr. ANDRE LUIZ PERON MARTINS LANNA (60h) * FGA0158 60 01 90,0 SS APR
Legenda
Carga Horária Integralizada/Pendente
Exigido 2985 h 540 h 0 h 3525 h
Integralizado 120 h 0 h 0 h 120 h
Para verificar a autenticidade deste documento entre em https://sig.unb.br/sigaa/documentos/ informando a matrícula, data de emissão
e o código de verificação: abcd1234ef
"""
    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(texto),
    ):
        resp = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )

    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["cursadas"]) == 2
    assert body["contribuicao"]["total_elegiveis"] == 1
    assert body["contribuicao"]["novas_contribuicoes"] == 1
    assert db.query(AmostraHistorico).count() == 1
    assert db.query(Turma).filter(Turma.semestre == "--").count() == 0


def test_importar_historico_substitui_vinculo_poluido_de_professor(client, db, headers):
    from app.models.professor import Professor

    disc = Disciplina(
        codigo="FGA0158",
        nome="Orientação a Objetos",
        slug="orientacao-a-objetos-limpeza",
        departamento="FCTE",
        carga_horaria=60,
    )
    db.add(disc)
    db.flush()

    prof_poluido = Professor(
        nome="Orientação A Objetos Lucas Ursulino Boaventura",
        departamento="FCTE",
    )
    turma_existente = Turma(
        disciplina_id=disc.id,
        codigo_turma="02",
        semestre="2025.2",
        professores=[prof_poluido],
    )
    db.add_all([prof_poluido, turma_existente])
    db.commit()

    with patch(
        "app.services.historico_parser_service.PdfReader",
        return_value=_FakeReader(_gerar_texto_historico("251077777", "APR", "SS")),
    ):
        resp = client.post(
            "/perfil/importar-historico",
            headers=headers,
            files={"arquivo": ("historico.pdf", b"%PDF-1.4 ok", "application/pdf")},
        )

    assert resp.status_code == 200, resp.text
    db.expire_all()
    turma_atualizada = db.query(Turma).filter_by(id=turma_existente.id).one()
    nomes = [p.nome for p in turma_atualizada.professores]
    assert nomes == ["Lucas Ursulino Boaventura"]




def test_importacao_cadastra_turma_aprovada_mesmo_com_trancamento_e_amostra_duplicada(client, db, headers):
    disc = Disciplina(codigo="FGA0158", nome="Orientação a Objetos", slug="teste-tentativas", departamento="FCTE", carga_horaria=60)
    db.add(disc)
    db.commit()
    text = _gerar_texto_historico("251088888", "APR", "SS").replace(
        "2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  02  100,0  SS  APR",
        "2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  08  --  -  TRANC\nDocente Trancada (60h)\n2025.2  FGA0158  ORIENTAÇÃO A OBJETOS  60  07  100,0  SS  APR",
    )
    def upload():
        with patch("app.services.historico_parser_service.PdfReader", return_value=_FakeReader(text)):
            return client.post("/perfil/importar-historico", headers=headers, files={"arquivo":("historico.pdf",b"%PDF-1.4 ok","application/pdf")})
    response=upload()
    assert response.status_code == 200, response.text
    approved=db.query(Turma).filter_by(disciplina_id=disc.id,codigo_turma="07",semestre="2025.2").one_or_none()
    assert approved is not None
    # Simula um cadastro antigo que registrou apenas a turma trancada.
    db.delete(approved)
    db.commit()
    previous_count=db.query(AmostraHistorico).count()
    response=upload()
    assert response.status_code == 200, response.text
    approved=db.query(Turma).filter_by(disciplina_id=disc.id,codigo_turma="07",semestre="2025.2").one()
    assert db.query(AmostraHistorico).count() == previous_count
    donation=client.post(f"/turmas/{approved.id}/doacoes/upload",headers=headers,data={"semestre_referencia":"2025.2","taxa_aprovacao":"84","taxa_reprovacao_nota":"0","taxa_reprovacao_falta":"4","taxa_trancamento":"12"})
    assert donation.status_code == 201, donation.text
    assert donation.json()["turma_id"] == approved.id


def test_status_nao_substitui_numero_da_turma_pelo_mesmo_docente(client,db,headers):
    from app.models.professor import Professor
    subject=Disciplina(codigo="TST0999",nome="Disciplina teste",slug="status-turma-exata",departamento="FCTE")
    professor=Professor(nome="Docente Compartilhado",departamento="FCTE")
    db.add_all([subject,professor])
    db.flush()
    db.add(Turma(disciplina_id=subject.id,codigo_turma="08",semestre="2025.1",professores=[professor]))
    db.commit()
    response=client.post("/perfil/turmas-estatisticas/status",headers=headers,json={"itens":[{"codigo":"TST0999","turma":"07","semestre":"2025.1","professores":[professor.nome]}]})
    assert response.status_code == 200
    assert response.json()["itens"][0]["turma_id"] is None
