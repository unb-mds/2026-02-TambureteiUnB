import pytest

from app.api.schemas.doacao import DoacaoCreate
from app.core.config import settings
from app.models.estatistica_consolidada import EstatisticaConsolidada
from app.models.metrica import MetricaAcademica, MetricaConsolidada
from app.models.turma import Turma
from app.models.usuario import Usuario
from app.services.doacao_service import doacao_service

A = dict(aprov=70, nota=20, falta=5, tranc=5)
B = dict(aprov=60, nota=30, falta=5, tranc=5)
RECALCULAR = "/estatisticas-consolidadas/turmas/{}/recalcular"


@pytest.fixture
def turma(db, disciplina, professor_1):
    t = Turma(disciplina_id=disciplina.id, codigo_turma="01", semestre="2026.1", professores=[professor_1])
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


def _doar(db, turma, n, aprov, nota, falta, tranc, avaliar=True):
    u = Usuario(nome=f"Aluno {n}", email=f"aluno{n}.oficial@unb.br", password_hash="hash", role="STUDENT")
    db.add(u)
    db.commit()
    db.refresh(u)
    dados = DoacaoCreate(
        semestre_referencia="2026.1",
        taxa_aprovacao=aprov,
        taxa_reprovacao_nota=nota,
        taxa_reprovacao_falta=falta,
        taxa_trancamento=tranc,
    )
    doacao = doacao_service.criar_doacao(db, turma.id, u.id, dados)
    if avaliar:
        doacao_service.avaliar_consenso(db, turma.id, "2026.1")
        db.commit()
        db.refresh(doacao)
    return doacao


def _oficiais(db, turma):
    return db.query(EstatisticaConsolidada).filter_by(turma_id=turma.id).all()


class TestConsolidacaoAutomatica:
    def test_quorum_atingido_grava_oficial_validada(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        _doar(db, turma, 1, **A)
        assert _oficiais(db, turma) == []
        _doar(db, turma, 2, **A)
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0
        assert oficial.status == "VALIDADO"
        assert oficial.semestre_referencia == "2026.1"

    def test_oficial_nao_e_sobrescrita_por_outro_grupo(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4, 5):
            _doar(db, turma, n, **B)
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0


class TestRecalculoAdministrativo:
    def test_admin_substitui_a_oficial(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4, 5):
            _doar(db, turma, n, **B)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["taxa_aprovacao"] == 60.0
        assert r.json()["status"] == "VALIDADO"
        assert len(_oficiais(db, turma)) == 1

    def test_sem_quorum_retorna_409(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 3)
        _doar(db, turma, 1, **A)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 409
        assert "quórum" in r.json()["detail"]
        assert _oficiais(db, turma) == []

    def test_empate_retorna_409_e_preserva_a_oficial(self, client, db, turma, admin_headers, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        for n in (3, 4):
            _doar(db, turma, n, **B)
        r = client.post(RECALCULAR.format(turma.id), headers=admin_headers)
        assert r.status_code == 409
        (oficial,) = _oficiais(db, turma)
        assert float(oficial.taxa_aprovacao) == 70.0

    def test_estudante_recebe_403(self, client, turma, student_headers):
        assert client.post(RECALCULAR.format(turma.id), headers=student_headers).status_code == 403

    def test_sem_autenticacao_retorna_401(self, client, turma):
        assert client.post(RECALCULAR.format(turma.id)).status_code == 401

    def test_turma_inexistente_retorna_404(self, client, admin_headers):
        assert client.post(RECALCULAR.format(999999), headers=admin_headers).status_code == 404

    def test_semestre_invalido_retorna_422(self, client, turma, admin_headers):
        r = client.post(RECALCULAR.format(turma.id) + "?semestre=invalido", headers=admin_headers)
        assert r.status_code == 422


class TestListagem:
    def test_lista_publica_sem_dados_de_usuario(self, client, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        for n in (1, 2):
            _doar(db, turma, n, **A)
        r = client.get("/estatisticas-consolidadas", params={"turma_id": turma.id})
        assert r.status_code == 200
        (item,) = r.json()
        assert item["taxa_aprovacao"] == 70.0
        assert "usuario_id" not in item

    def test_semestre_invalido_retorna_422(self, client):
        assert client.get("/estatisticas-consolidadas?semestre=invalido").status_code == 422


class TestPrecedenciaPizzaSobreHistorico:
    def test_pizza_aprovada_substitui_estatistica_de_historico(self, db, turma, monkeypatch):
        monkeypatch.setattr(settings, "QUORUM_MINIMO_DOACOES", 2)
        ec_hist = EstatisticaConsolidada(
            turma_id=turma.id,
            disciplina_id=turma.disciplina_id,
            semestre_referencia="2026.1",
            taxa_aprovacao=50,
            taxa_reprovacao_nota=30,
            taxa_reprovacao_falta=10,
            taxa_trancamento=10,
            total_amostras=3,
            origem="HISTORICO_SIGAA",
            amostragem_suprimida_lgpd=True,
            status="VALIDADO",
        )
        db.add(ec_hist)
        db.commit()

        _doar(db, turma, 10, **A)
        db.refresh(ec_hist)
        assert ec_hist.origem == "HISTORICO_SIGAA"
        assert float(ec_hist.taxa_aprovacao) == 50.0

        _doar(db, turma, 11, **A)
        (oficial,) = _oficiais(db, turma)
        assert oficial.origem == "DOACAO_QUORUM"
        assert oficial.amostragem_suprimida_lgpd is False
        assert oficial.total_amostras == 0
        assert float(oficial.taxa_aprovacao) == 70.0
        assert float(oficial.taxa_reprovacao_nota) == 20.0

    def test_status_turmas_identifica_pizza_historico_e_doacao_usuario(
        self, client, db, disciplina, professor_1, student_headers, student_user
    ):
        t_pizza = Turma(
            disciplina_id=disciplina.id,
            codigo_turma="01",
            semestre="2025.2",
            professores=[professor_1],
        )
        t_hist = Turma(
            disciplina_id=disciplina.id,
            codigo_turma="02",
            semestre="2025.1",
            professores=[professor_1],
        )
        db.add_all([t_pizza, t_hist])
        db.flush()

        db.add_all(
            [
                EstatisticaConsolidada(
                    turma_id=t_pizza.id,
                    disciplina_id=disciplina.id,
                    semestre_referencia="2025.2",
                    taxa_aprovacao=80,
                    taxa_reprovacao_nota=10,
                    taxa_reprovacao_falta=5,
                    taxa_trancamento=5,
                    origem="DOACAO_QUORUM",
                    amostragem_suprimida_lgpd=False,
                    status="VALIDADO",
                ),
                EstatisticaConsolidada(
                    turma_id=t_hist.id,
                    disciplina_id=disciplina.id,
                    semestre_referencia="2025.1",
                    taxa_aprovacao=60,
                    taxa_reprovacao_nota=20,
                    taxa_reprovacao_falta=10,
                    taxa_trancamento=10,
                    total_amostras=6,
                    origem="HISTORICO_SIGAA",
                    amostragem_suprimida_lgpd=False,
                    status="VALIDADO",
                ),
            ]
        )
        db.commit()

        # Estudante doa apenas para t_hist (abaixo do quorum, ainda sem pizza oficial)
        doacao_service.criar_doacao(
            db,
            t_hist.id,
            student_user.id,
            DoacaoCreate(
                semestre_referencia="2025.1",
                taxa_aprovacao=65,
                taxa_reprovacao_nota=20,
                taxa_reprovacao_falta=10,
                taxa_trancamento=5,
            ),
        )

        resp = client.post(
            "/perfil/turmas-estatisticas/status",
            headers=student_headers,
            json={
                "itens": [
                    {
                        "codigo": disciplina.codigo,
                        "turma": "1",
                        "semestre": "2025.2",
                        "professores": [professor_1.nome],
                    },
                    {
                        "codigo": disciplina.codigo,
                        "turma": "02",
                        "semestre": "2025.1",
                        "professores": [professor_1.nome],
                    },
                ]
            },
        )
        assert resp.status_code == 200
        itens = resp.json()["itens"]
        assert itens[0]["turma_id"] == t_pizza.id
        assert itens[0]["ja_possui_pizza"] is True
        assert itens[0]["ja_possui_historico"] is False

        assert itens[1]["turma_id"] == t_hist.id
        assert itens[1]["ja_possui_pizza"] is False
        assert itens[1]["ja_possui_historico"] is True
        assert itens[1]["ja_enviada_usuario"] is True


class TestModeracaoPizzas:
    def test_upload_apenas_imagem_vai_para_moderacao_e_permite_aprovacao_direta(
        self, client, db, turma, student_headers, admin_headers, tmp_path, monkeypatch
    ):
        monkeypatch.setattr(settings, "PIZZAS_DIR", tmp_path / "pizzas")

        # Cria registro previo de historico que deve ser substituido apos aprovacao da pizza
        db.add(
            EstatisticaConsolidada(
                turma_id=turma.id,
                disciplina_id=turma.disciplina_id,
                semestre_referencia="2026.1",
                taxa_aprovacao=50,
                taxa_reprovacao_nota=30,
                taxa_reprovacao_falta=10,
                taxa_trancamento=10,
                total_amostras=2,
                origem="HISTORICO_SIGAA",
                amostragem_suprimida_lgpd=True,
                status="VALIDADO",
            )
        )
        db.commit()

        png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32
        up = client.post(
            f"/turmas/{turma.id}/doacoes/upload",
            headers=student_headers,
            data={"semestre_referencia": "2026.1"},
            files={"arquivo": ("pizza.png", png_bytes, "image/png")},
        )
        assert up.status_code == 201, up.text
        created = up.json()
        assert created["tipo_envio"] == "IMAGEM"
        assert created["possui_imagem"] is True
        assert created["taxa_aprovacao"] is None
        assert created["status"] == "PENDENTE"

        # Estudante nao acessa imagem privada nem fila de moderacao
        assert client.get("/moderacao/pizzas", headers=student_headers).status_code == 403
        assert client.get(f"/moderacao/pizzas/{created['id']}/imagem", headers=student_headers).status_code == 403

        fila = client.get("/moderacao/pizzas", headers=admin_headers)
        assert fila.status_code == 200
        grupos = fila.json()["grupos_semestre"]
        assert len(grupos) == 1
        assert grupos[0]["semestre"] == "2026.1"
        item = grupos[0]["itens"][0]
        assert item["tipo_envio"] == "IMAGEM"
        assert item["selo_verde"] is True
        assert item["possui_imagem"] is True

        img_resp = client.get(f"/moderacao/pizzas/{created['id']}/imagem", headers=admin_headers)
        assert img_resp.status_code == 200
        assert img_resp.content == png_bytes

        # Sem informar percentuais no momento da aprovacao falha 422
        falta_taxas = client.patch(
            f"/moderacao/pizzas/{created['id']}/decisao",
            headers=admin_headers,
            json={"status": "CONSOLIDADA"},
        )
        assert falta_taxas.status_code == 422

        dec = client.patch(
            f"/moderacao/pizzas/{created['id']}/decisao",
            headers=admin_headers,
            json={
                "status": "CONSOLIDADA",
                "taxa_aprovacao": 96.4,
                "taxa_reprovacao_nota": 3.6,
                "taxa_reprovacao_falta": 0,
                "taxa_trancamento": 0,
                "justificativa": "Valores lidos do print oficial do SIGAA.",
            },
        )
        assert dec.status_code == 200, dec.text
        assert dec.json()["status"] == "CONSOLIDADA"

        db.expire_all()
        (oficial,) = _oficiais(db, turma)
        assert oficial.origem == "DOACAO_QUORUM"
        assert oficial.amostragem_suprimida_lgpd is False
        assert float(oficial.taxa_aprovacao) == 96.4

    def test_texto_manual_agrupado_exige_cinco_outros_iguais_para_selo_verde(
        self, client, db, turma, admin_headers, monkeypatch
    ):
        monkeypatch.setattr(settings, "MIN_OUTROS_FORMULARIOS_IGUAIS_PIZZA", 5)

        for n in range(1, 6):
            _doar(db, turma, 200 + n, **A, avaliar=False)

        fila_parcial = client.get("/moderacao/pizzas", headers=admin_headers).json()
        assert fila_parcial["total_itens"] == 1
        assert fila_parcial["total_envios_pendentes"] == 5
        item_parcial = fila_parcial["grupos_semestre"][0]["itens"][0]
        assert item_parcial["tipo_envio"] == "TEXTO"
        assert item_parcial["quantidade_envios"] == 5
        assert item_parcial["outros_iguais"] == 4
        assert item_parcial["selo_verde"] is False

        # 6o envio (5 outros iguais ao representante) habilita o selo verde visual
        _doar(db, turma, 206, **A, avaliar=False)

        fila_pronta = client.get("/moderacao/pizzas", headers=admin_headers).json()
        item_pronto = fila_pronta["grupos_semestre"][0]["itens"][0]
        assert item_pronto["quantidade_envios"] == 6
        assert item_pronto["outros_iguais"] == 5
        assert item_pronto["selo_verde"] is True

        aprovado = client.patch(
            f"/moderacao/pizzas/{item_pronto['id']}/decisao",
            headers=admin_headers,
            json={"status": "CONSOLIDADA"},
        )
        assert aprovado.status_code == 200
        assert aprovado.json()["doacoes_atualizadas"] == 6
        assert client.get("/moderacao/pizzas", headers=admin_headers).json()["total_itens"] == 0

    def test_moderador_pode_aprovar_manual_mesmo_sem_selo_verde(
        self, client, db, turma, admin_headers, monkeypatch
    ):
        monkeypatch.setattr(settings, "MIN_OUTROS_FORMULARIOS_IGUAIS_PIZZA", 5)
        doacao = _doar(db, turma, 250, **A, avaliar=False)

        fila = client.get("/moderacao/pizzas", headers=admin_headers).json()
        item = fila["grupos_semestre"][0]["itens"][0]
        assert item["id"] == doacao.id
        assert item["selo_verde"] is False

        aprovado = client.patch(
            f"/moderacao/pizzas/{item['id']}/decisao",
            headers=admin_headers,
            json={"status": "CONSOLIDADA"},
        )
        assert aprovado.status_code == 200
        assert aprovado.json()["status"] == "CONSOLIDADA"
        assert aprovado.json()["doacoes_atualizadas"] == 1
        (oficial,) = _oficiais(db, turma)
        assert oficial.origem == "DOACAO_QUORUM"

        ma = (
            db.query(MetricaAcademica)
            .filter_by(disciplina_id=turma.disciplina_id, ano=2026, semestre=1)
            .one()
        )
        assert ma.amostragem_suprimida_lgpd is False
        assert float(ma.taxa_aprovacao) == 70.0
        mc = db.query(MetricaConsolidada).filter_by(disciplina_id=turma.disciplina_id).one()
        assert float(mc.taxa_aprovacao_acumulada) == 70.0
        assert mc.reprovados_nota > 0
        assert mc.reprovados_falta > 0
        assert mc.trancamentos > 0

    def test_upload_com_arredondamento_sigaa_99_9_e_conta_admin(
        self, client, turma, admin_headers
    ):
        resp = client.post(
            f"/turmas/{turma.id}/doacoes/upload",
            headers=admin_headers,
            data={
                "semestre_referencia": "2026.1",
                "taxa_aprovacao": "73.3",
                "taxa_reprovacao_nota": "17.3",
                "taxa_reprovacao_falta": "5.3",
                "taxa_trancamento": "4",
            },
        )
        assert resp.status_code == 201, resp.text
        body = resp.json()
        assert body["tipo_envio"] == "TEXTO"
        assert body["status"] == "PENDENTE"
        assert (
            body["taxa_aprovacao"]
            + body["taxa_reprovacao_nota"]
            + body["taxa_reprovacao_falta"]
            + body["taxa_trancamento"]
        ) == 100.0