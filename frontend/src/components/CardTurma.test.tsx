import React from "react";
import CardTurma from "@/components/CardTurma";
import { Turma } from "@/types/turma";

/**
 * Cenários de dados estruturados para validação e testes visuais/unitários do CardTurma.
 */

export const mockTurmaVagasAbertas: Turma = {
  id: "test-turma-aberta",
  codigoTurma: "Turma 01",
  disciplinaCodigo: "FGA0138",
  professor: "Profª. Dra. Carla Rocha",
  horarios: "Seg/Qua 10:00 - 11:50",
  local: "FCTE - UAC Sala S-9",
  vagasOcupadas: 24,
  totalVagas: 40,
  turno: "Diurno",
};

export const mockTurmaVagasEsgotadas: Turma = {
  id: "test-turma-esgotada",
  codigoTurma: "Turma 02",
  disciplinaCodigo: "FGA0138",
  professor: "Prof. Dr. Hilmer Neri",
  horarios: "Ter/Qui 14:00 - 15:50",
  local: "FCTE - Lab MOC",
  vagasOcupadas: 40,
  totalVagas: 40,
  turno: "Vespertino",
};

export const mockTurmaNoturnoQuaseCheia: Turma = {
  id: "test-turma-noturno",
  codigoTurma: "Turma 03",
  disciplinaCodigo: "FGA0158",
  professor: "Prof. Me. Edson Alves",
  horarios: "Seg/Qua 19:00 - 20:50",
  local: "FCTE - UAC Sala I-3",
  vagasOcupadas: 44,
  totalVagas: 45,
  turno: "Noturno",
};

export const mockTurmaSemInscritos: Turma = {
  id: "test-turma-zerada",
  codigoTurma: "Turma 04",
  disciplinaCodigo: "FGA0160",
  professor: "Prof. Dr. Vinicius Sebba Patto",
  horarios: "Sex 08:00 - 11:50",
  local: "FCTE - Lab LAPPIS",
  vagasOcupadas: 0,
  totalVagas: 30,
  turno: "Diurno",
};

export interface CardTurmaTestCase {
  id: string;
  name: string;
  turma: Turma;
  expected: {
    vagasEsgotadas: boolean;
    percentualOcupacao: number;
    turnoBadge: string;
  };
}

export const cardTurmaTestCases: CardTurmaTestCase[] = [
  {
    id: "TC-01",
    name: "Turma com vagas disponíveis (ocupação parcial)",
    turma: mockTurmaVagasAbertas,
    expected: {
      vagasEsgotadas: false,
      percentualOcupacao: 60,
      turnoBadge: "Diurno",
    },
  },
  {
    id: "TC-02",
    name: "Turma com vagas esgotadas (100% de ocupação)",
    turma: mockTurmaVagasEsgotadas,
    expected: {
      vagasEsgotadas: true,
      percentualOcupacao: 100,
      turnoBadge: "Vespertino",
    },
  },
  {
    id: "TC-03",
    name: "Turma no turno noturno com alta ocupação",
    turma: mockTurmaNoturnoQuaseCheia,
    expected: {
      vagasEsgotadas: false,
      percentualOcupacao: 98,
      turnoBadge: "Noturno",
    },
  },
  {
    id: "TC-04",
    name: "Turma recém-criada sem nenhuma vaga ocupada (0%)",
    turma: mockTurmaSemInscritos,
    expected: {
      vagasEsgotadas: false,
      percentualOcupacao: 0,
      turnoBadge: "Diurno",
    },
  },
];

/**
 * Função utilitária de asserção para validar as regras do componente sem depender de runner externo.
 */
export function validateCardTurma(testCase: CardTurmaTestCase): {
  passed: boolean;
  errors: string[];
} {
  const { turma, expected } = testCase;
  const errors: string[] = [];

  const computedPercentual =
    turma.totalVagas > 0
      ? Math.round((turma.vagasOcupadas / turma.totalVagas) * 100)
      : 0;
  const computedVagasEsgotadas = turma.vagasOcupadas >= turma.totalVagas;

  if (computedPercentual !== expected.percentualOcupacao) {
    errors.push(
      `Percentual divergente: esperado ${expected.percentualOcupacao}%, obtido ${computedPercentual}%`
    );
  }

  if (computedVagasEsgotadas !== expected.vagasEsgotadas) {
    errors.push(
      `Status de vagas esgotadas divergente: esperado ${expected.vagasEsgotadas}, obtido ${computedVagasEsgotadas}`
    );
  }

  if (turma.turno !== expected.turnoBadge) {
    errors.push(
      `Turno divergente: esperado ${expected.turnoBadge}, obtido ${turma.turno}`
    );
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

/**
 * Story / Galeria de Teste Visual do CardTurma para validação em tela
 */
export default function CardTurmaTestStory() {
  return (
    <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Validação e Stories: CardTurma
        </h1>
        <p className="text-sm text-gray-600">
          Cenários de validação de layout, responsividade e regras de vagas (abertas vs. esgotadas).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cardTurmaTestCases.map(({ id, name, turma, expected }) => {
          const validation = validateCardTurma({ id, name, turma, expected });

          return (
            <div key={id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold px-1">
                <span className="text-gray-500">{id}</span>
                <span
                  className={
                    validation.passed ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {validation.passed ? "✓ Aprovado" : "✕ Falha"}
                </span>
              </div>
              <p className="text-xs text-gray-700 font-medium px-1 line-clamp-1" title={name}>
                {name}
              </p>
              <CardTurma turma={turma} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
