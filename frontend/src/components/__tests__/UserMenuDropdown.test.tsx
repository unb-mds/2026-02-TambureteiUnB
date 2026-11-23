import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import UserMenuDropdown, {
  getRoleBadgeLabel,
  getUserInitials,
  getShortUserName,
} from "../UserMenuDropdown.tsx";

test("UserMenuDropdown utilitários extraem iniciais e nomes corretamente", () => {
  assert.equal(getUserInitials("Thamires Ellen Souza Araujo"), "TA");
  assert.equal(getUserInitials("Marina Oliveira"), "MO");
  assert.equal(getUserInitials("", "estudante@unb.br"), "ES");
  assert.equal(getUserInitials(), "TU");

  assert.equal(getShortUserName("Thamires Ellen Souza Araujo"), "Thamires A.");
  assert.equal(getShortUserName("Marina"), "Marina");
  assert.equal(getShortUserName("", "aluno@unb.br"), "aluno");

  assert.equal(getRoleBadgeLabel("admin"), "ADMINISTRADOR");
  assert.equal(getRoleBadgeLabel("moderator"), "MODERADOR");
  assert.equal(getRoleBadgeLabel("student"), "ESTUDANTE");
  assert.equal(getRoleBadgeLabel(), "ESTUDANTE");
});

test("UserMenuDropdown renderiza botão de disparo com avatar e nome", () => {
  const user = {
    id: "usr-1",
    nome: "Thamires Ellen Souza Araujo",
    email: "thamiresellensa@gmail.com",
    role: "STUDENT",
  };

  const markup = renderToStaticMarkup(
    <UserMenuDropdown user={user} onLogout={() => {}} />
  );

  assert.match(markup, /Menu de conta de Thamires Ellen Souza Araujo/);
  assert.match(markup, />TA<\/span>/);
  assert.match(markup, /Thamires A\./);
  assert.match(markup, /Estudante/);
});
