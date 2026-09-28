import pytest
from fastapi.testclient import TestClient

class TestAuthIntegration:
    def test_cadastro_com_email_generico_sucesso(self, client: TestClient):
        response = client.post(
            "/auth/register",
            json={
                "nome": "Estudante Gmail",
                "email": "estudante.teste@gmail.com",
                "senha": "SenhaForte123!",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "STUDENT"
        assert data["email"] == "estudante.teste@gmail.com"
        assert data["nome"] == "Estudante Gmail"
        assert "id" in data

        response_outlook = client.post(
            "/auth/register",
            json={
                "nome": "Estudante Outlook",
                "email": "estudante.teste@outlook.com",
                "senha": "SenhaForte123!",
            },
        )
        assert response_outlook.status_code == 201
        assert response_outlook.json()["role"] == "STUDENT"
        assert response_outlook.json()["email"] == "estudante.teste@outlook.com"

    def test_login_com_email_generico_sucesso(self, client: TestClient):
        client.post(
            "/auth/register",
            json={
                "nome": "Usuario Login Teste",
                "email": "usuario.login@provedor.com",
                "senha": "MinhaSenha123!",
            },
        )

        response = client.post(
            "/auth/login",
            json={
                "email": "usuario.login@provedor.com",
                "senha": "MinhaSenha123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_senha_incorreta_retorna_401(self, client: TestClient):
        client.post(
            "/auth/register",
            json={
                "nome": "Usuario Senha Errada",
                "email": "usuario.senha@dominio.com",
                "senha": "SenhaCorreta123!",
            },
        )

        response = client.post(
            "/auth/login",
            json={
                "email": "usuario.senha@dominio.com",
                "senha": "SenhaTotalmenteIncorreta999!",
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "E-mail ou senha inválidos"

    def test_cadastro_email_duplicado_retorna_400(self, client: TestClient):
        payload = {
            "nome": "Usuario Duplicado",
            "email": "duplicado@qualquer.com",
            "senha": "SenhaForte123!",
        }

        res1 = client.post("/auth/register", json=payload)
        assert res1.status_code == 201

        payload["email"] = "DUPLICADO@qualquer.com"
        res2 = client.post("/auth/register", json=payload)
        assert res2.status_code == 400
        assert res2.json()["detail"] == "E-mail já cadastrado na plataforma."

    def test_login_email_invalido_retorna_422(self, client: TestClient):
        response = client.post(
            "/auth/login",
            json={
                "email": "nao-eh-um-email",
                "senha": "QualquerSenha123!",
            },
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], list)

    def test_get_me_usuario_autenticado_sucesso(self, client: TestClient):
        # Cadastra
        client.post(
            "/auth/register",
            json={
                "nome": "Marina Souza",
                "email": "marina.souza@unb.br",
                "senha": "SenhaForte123!",
            },
        )

        # Login
        login_res = client.post(
            "/auth/login",
            json={
                "email": "marina.souza@unb.br",
                "senha": "SenhaForte123!",
            },
        )
        token = login_res.json()["access_token"]

        # GET /auth/me
        me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        me_data = me_res.json()
        assert me_data["nome"] == "Marina Souza"
        assert me_data["email"] == "marina.souza@unb.br"
        assert me_data["role"] == "STUDENT"

    def test_get_me_sem_token_retorna_401(self, client: TestClient):
        res = client.get("/auth/me")
        assert res.status_code == 401
