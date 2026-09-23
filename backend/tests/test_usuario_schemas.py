import pytest
from pydantic import ValidationError
from app.api.schemas.usuario import UsuarioCreate, UsuarioLogin


class TestUsuarioCreateSchema:
    def test_usuario_valido(self):
        usuario = UsuarioCreate(
            nome="Aluno da Silva",
            email="ALUNO@ALUNO.UNB.BR",
            senha="SenhaForte123!"
        )
        assert usuario.nome == "Aluno da Silva"
        assert usuario.email == "aluno@aluno.unb.br"
        assert usuario.senha == "SenhaForte123!"

    def test_usuario_nome_com_acentos(self):
        usuario = UsuarioCreate(
            nome="José de Araújo Conceição",
            email="jose@unb.br",
            senha="SenhaForte123!"
        )
        assert usuario.nome == "José de Araújo Conceição"

    def test_nome_muito_curto(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Al",
                email="aluno@unb.br",
                senha="SenhaForte123!"
            )
        assert "O campo nome deve ter no mínimo 3 caracteres." in str(exc.value)

    def test_nome_com_numeros(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno 123",
                email="aluno@unb.br",
                senha="SenhaForte123!"
            )
        assert "O nome deve conter apenas letras e espaços" in str(exc.value)

    def test_email_invalido(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="email_sem_arroba",
                senha="SenhaForte123!"
            )
        assert "value is not a valid email address" in str(exc.value)

    def test_senha_menos_de_8_caracteres(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="Aa1!"
            )
        assert "A senha deve possuir pelo menos 8 caracteres." in str(exc.value)


    def test_senha_sem_maiuscula(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="senhaforte123!"
            )
        assert "A senha deve conter pelo menos uma letra maiúscula" in str(exc.value)

    def test_senha_sem_minuscula(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="SENHAFORTE123!"
            )
        assert "A senha deve conter pelo menos uma letra minúscula" in str(exc.value)

    def test_senha_sem_numero(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="SenhaForteExclamacao!"
            )
        assert "A senha deve conter pelo menos um número" in str(exc.value)

    def test_senha_sem_caractere_especial(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="SenhaForte123"
            )
        assert "A senha deve conter pelo menos um caractere especial" in str(exc.value)

    def test_senha_mais_de_72_caracteres(self):
        with pytest.raises(ValidationError) as exc:
            UsuarioCreate(
                nome="Aluno da Silva",
                email="aluno@unb.br",
                senha="A" * 70 + "1!a"
            )
        assert "A senha não pode ultrapassar 72 caracteres." in str(exc.value)



class TestUsuarioLoginSchema:
    def test_login_valido(self):
        login = UsuarioLogin(
            email="TESTE@UNB.BR",
            senha="QualquerSenha123"
        )
        assert login.email == "teste@unb.br"
        assert login.senha == "QualquerSenha123"

    def test_login_email_invalido(self):
        with pytest.raises(ValidationError):
            UsuarioLogin(
                email="nao-eh-email",
                senha="123"
            )
