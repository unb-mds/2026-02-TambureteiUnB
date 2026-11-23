import assert from "node:assert/strict";
import test from "node:test";
import {
  clearImportedHistorico,
  getHistoricoUserStorageKey,
  HISTORICO_STORAGE_KEY,
  HISTORICO_USER_STORAGE_PREFIX,
  loadImportedHistorico,
  saveImportedHistorico,
  type HistoricoImportacaoResponse,
} from "../historicoService.ts";

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

const mockHistoricoData: HistoricoImportacaoResponse = {
  autenticidade_estrutural_valida: true,
  dados_academicos: {
    curso: "Engenharia de Software",
    curriculo: "2023",
    status: "ATIVO",
    periodo_inicial: "2023.1",
    periodo_atual: 4,
    prazo_conclusao: "2028.2",
    ira: 4.25,
    mp: 4.1,
    data_emissao: "2026-11-20",
    codigo_verificacao: "ABC123XYZ",
  },
  carga_horaria: {
    exigido: { obrigatorias: 2000, optativas: 400, complementares: 120, total: 2520 },
    integralizado: { obrigatorias: 1000, optativas: 200, complementares: 60, total: 1260 },
    pendente: { obrigatorias: 1000, optativas: 200, complementares: 60, total: 1260 },
  },
  cursadas: [],
  cursando: [],
  pendentes: [],
  contribuicao: {
    total_elegiveis: 10,
    novas_contribuicoes: 5,
    duplicadas_ignoradas: 5,
    disciplinas_nao_encontradas: [],
    turmas_atualizadas: 2,
    turmas_liberadas_lgpd: 1,
    minimo_amostras_lgpd: 5,
  },
};

test("getHistoricoUserStorageKey gera chave padrao ou com prefixo do usuario", () => {
  assert.equal(getHistoricoUserStorageKey(), HISTORICO_STORAGE_KEY);
  assert.equal(getHistoricoUserStorageKey(null), HISTORICO_STORAGE_KEY);
  assert.equal(getHistoricoUserStorageKey(""), HISTORICO_STORAGE_KEY);
  assert.equal(getHistoricoUserStorageKey(42), `${HISTORICO_USER_STORAGE_PREFIX}42`);
  assert.equal(getHistoricoUserStorageKey("user-uuid-123"), `${HISTORICO_USER_STORAGE_PREFIX}user-uuid-123`);
});

test("saveImportedHistorico salva na chave global e na chave dedicada do usuario quando userId e fornecido", () => {
  const originalLocalStorage = globalThis.localStorage;
  const mockStorage = createMockStorage();
  Object.defineProperty(globalThis, "localStorage", { value: mockStorage, configurable: true });

  try {
    saveImportedHistorico(mockHistoricoData, { userId: 99 });
    assert.notEqual(mockStorage.getItem(HISTORICO_STORAGE_KEY), null);
    assert.notEqual(mockStorage.getItem(`${HISTORICO_USER_STORAGE_PREFIX}99`), null);

    const loadedGlobal = loadImportedHistorico();
    assert.equal(loadedGlobal?.dados_academicos.curso, "Engenharia de Software");

    const loadedUser = loadImportedHistorico({ userId: 99 });
    assert.equal(loadedUser?.dados_academicos.ira, 4.25);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: originalLocalStorage, configurable: true });
  }
});

test("clearImportedHistorico remove dados globais e pode remover do usuario especifico", () => {
  const originalLocalStorage = globalThis.localStorage;
  const mockStorage = createMockStorage();
  Object.defineProperty(globalThis, "localStorage", { value: mockStorage, configurable: true });

  try {
    saveImportedHistorico(mockHistoricoData, { userId: "user-abc" });
    clearImportedHistorico(); // sem userId, limpa apenas a chave ativa

    assert.equal(mockStorage.getItem(HISTORICO_STORAGE_KEY), null);
    assert.notEqual(mockStorage.getItem(`${HISTORICO_USER_STORAGE_PREFIX}user-abc`), null);

    clearImportedHistorico({ userId: "user-abc" });
    assert.equal(mockStorage.getItem(`${HISTORICO_USER_STORAGE_PREFIX}user-abc`), null);
  } finally {
    Object.defineProperty(globalThis, "localStorage", { value: originalLocalStorage, configurable: true });
  }
});
