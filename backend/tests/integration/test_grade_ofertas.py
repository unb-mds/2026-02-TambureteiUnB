from app.models.disciplina import Disciplina
from app.models.turma import Turma


def add_subject(db, code, name, semesters):
    subject = Disciplina(codigo=code, nome=name, slug=code.lower(), departamento="FCTE")
    db.add(subject)
    db.flush()
    for i, semester in enumerate(semesters):
        db.add(Turma(disciplina_id=subject.id, codigo_turma=str(i), semestre=semester, horario="35M12"))
    db.commit()
    return subject


def test_semesters_are_distinct_and_descending(client, db):
    add_subject(db, "GRADE001", "Oferta de teste", ["2026.2", "2027.1", "2027.1"])
    response = client.get("/turmas/semestres")
    assert response.status_code == 200
    values = response.json()
    assert values == sorted(set(values), reverse=True)
    assert "2027.1" in values


def test_search_filters_semester_before_limit(client, db):
    add_subject(db, "GRADE001", "A sem oferta", [])
    add_subject(db, "GRADE002", "B semestre anterior", ["2026.2"])
    wanted = add_subject(db, "GRADE003", "C próxima oferta", ["2027.1"])
    response = client.get("/cadeiras", params={"codigo": "GRADE", "apenas_com_turmas": True, "semestre": "2027.1", "limit": 1})
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [wanted.id]


def test_unknown_semester_does_not_reuse_old_offers(client, db):
    add_subject(db, "GRADE001", "Oferta anterior", ["2026.2"])
    response = client.get("/cadeiras", params={"codigo": "GRADE", "apenas_com_turmas": True, "semestre": "2028.1"})
    assert response.status_code == 200
    assert response.json() == []


def test_name_search_ignores_accents_spacing_and_word_order(client, db):
    wanted = add_subject(db, "GRADE004", "CÁLCULO DE PROBABILIDADE", ["2027.1"])
    for term in ["calculo", "cálculo", "  probabilidade   CALCULO  "]:
        response = client.get("/cadeiras", params={"q": term, "semestre": "2027.1"})
        assert response.status_code == 200
        assert wanted.id in [item["id"] for item in response.json()]
    response = client.get("/cadeiras", params={"q": "%", "semestre": "2027.1"})
    assert response.json() == []


def test_catalog_returns_offering_locations_independently_from_department(client, db):
    subject = add_subject(db, "CAMP001", "Cálculo de teste", ["2026.2", "2025.1"])
    subject.departamento = "Departamento de Matemática"
    classes = db.query(Turma).filter(Turma.disciplina_id == subject.id).order_by(Turma.id).all()
    classes[0].local = "FCTE - I9"
    classes[1].local = "ICC - AT 10"
    db.commit()
    response = client.get("/cadeiras", params={"codigo":"CAMP001", "semestre":"2026.2"})
    assert response.status_code == 200
    assert response.json()[0]["locais_oferta"] == ["FCTE - I9"]
    assert response.json()[0]["departamento"] == "Departamento de Matemática"
    response = client.get("/catalogo/cadeiras", params={"codigo":"CAMP001"})
    assert response.status_code == 200
    assert set(response.json()["items"][0]["locais_oferta"]) == {"FCTE - I9", "ICC - AT 10"}
