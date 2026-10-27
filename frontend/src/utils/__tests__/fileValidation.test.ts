import test from "node:test";
import assert from "node:assert/strict";

import {
  validateFileFormat,
  validateFileSize,
  validateMaterialTitle,
  validateExternalUrl,
  formatFileSize,
  getFileExtension,
  MATERIAL_MAX_BYTES,
  MAX_FILES_PER_BATCH,
} from "../fileValidation.ts";

test("Constantes de limite de materiais", () => {
  assert.equal(MATERIAL_MAX_BYTES, 5 * 1024 * 1024);
  assert.equal(MATERIAL_MAX_BYTES, 5242880);
  assert.equal(MAX_FILES_PER_BATCH, 5);
});

test("getFileExtension extrai extensao em caixa baixa", () => {
  assert.equal(getFileExtension("relatorio.pdf"), "pdf");
  assert.equal(getFileExtension("FOTO.PNG"), "png");
  assert.equal(getFileExtension("documento.com.pontos.JPEG"), "jpeg");
  assert.equal(getFileExtension("sem_extensao"), "");
  assert.equal(getFileExtension(""), "");
});

test("validateFileFormat aceita PDF, PNG e JPG/JPEG validos", () => {
  assert.deepEqual(
    validateFileFormat({ name: "resumo.pdf", type: "application/pdf" }),
    { isValid: true }
  );

  assert.deepEqual(
    validateFileFormat({ name: "grafico.png", type: "image/png" }),
    { isValid: true }
  );

  assert.deepEqual(
    validateFileFormat({ name: "anotacao.jpg", type: "image/jpeg" }),
    { isValid: true }
  );

  assert.deepEqual(
    validateFileFormat({ name: "anotacao.jpeg", type: "image/jpeg" }),
    { isValid: true }
  );

  assert.deepEqual(
    validateFileFormat({ name: "RESUMO_FINAL.PDF", type: "application/pdf" }),
    { isValid: true }
  );
});

test("validateFileFormat rejeita formatos e tipos MIME nao autorizados", () => {
  const exeResult = validateFileFormat({ name: "programa.exe", type: "application/x-msdownload" });
  assert.equal(exeResult.isValid, false);
  assert.match(exeResult.error || "", /nao permitido/i);

  const docxResult = validateFileFormat({
    name: "trabalho.docx",
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  assert.equal(docxResult.isValid, false);

  const zipResult = validateFileFormat({ name: "arquivos.zip", type: "application/zip" });
  assert.equal(zipResult.isValid, false);

  const semExtResult = validateFileFormat({ name: "arquivo_sem_extensao", type: "application/pdf" });
  assert.equal(semExtResult.isValid, false);
});

test("validateFileFormat rejeita inconsistencia entre extensao e MIME", () => {
  const result = validateFileFormat({ name: "falso_pdf.pdf", type: "image/png" });
  assert.equal(result.isValid, false);
  assert.match(result.error || "", /inconsistencia/i);
});

test("validateFileSize valida tamanho de arquivo rigorosamente", () => {
  // Arquivo vazio (0 bytes) deve ser rejeitado
  const emptyResult = validateFileSize({ size: 0 });
  assert.equal(emptyResult.isValid, false);
  assert.match(emptyResult.error || "", /vazio/i);

  // Arquivo valido com 1 KB
  const valid1Kb = validateFileSize({ size: 1024 });
  assert.equal(valid1Kb.isValid, true);

  // Arquivo no limite exato de 5 MiB (5.242.880 bytes) deve ser aceito
  const exactMax = validateFileSize({ size: 5242880 });
  assert.equal(exactMax.isValid, true);

  // 1 byte acima do limite de 5 MiB deve ser rejeitado
  const overLimit = validateFileSize({ size: 5242881 });
  assert.equal(overLimit.isValid, false);
  assert.match(overLimit.error || "", /excedendo o limite/i);

  // Arquivo de 10 MB deve ser rejeitado
  const tenMb = validateFileSize({ size: 10 * 1024 * 1024 });
  assert.equal(tenMb.isValid, false);
});

test("validateMaterialTitle valida limites de tamanho de titulo", () => {
  // Titulo valido padrao
  assert.equal(validateMaterialTitle("Resumo de Calculo 1 - Limites").isValid, true);

  // Titulo com 1 caractere valido
  assert.equal(validateMaterialTitle("A").isValid, true);

  // Titulo no limite maximo de 200 caracteres
  const title200 = "A".repeat(200);
  assert.equal(validateMaterialTitle(title200).isValid, true);

  // Titulo vazio ou somente espacos
  const empty = validateMaterialTitle("");
  assert.equal(empty.isValid, false);
  assert.match(empty.error || "", /obrigatorio/i);

  const whitespaceOnly = validateMaterialTitle("     ");
  assert.equal(whitespaceOnly.isValid, false);

  // Titulo com mais de 200 caracteres
  const title201 = "A".repeat(201);
  const tooLong = validateMaterialTitle(title201);
  assert.equal(tooLong.isValid, false);
  assert.match(tooLong.error || "", /excedendo o limite de 200 caracteres/i);
});

test("validateExternalUrl valida links externos", () => {
  assert.equal(validateExternalUrl("https://unb.br/documento.pdf").isValid, true);
  assert.equal(validateExternalUrl("http://aprender3.unb.br/disciplina").isValid, true);
  assert.equal(validateExternalUrl("https://github.com/unb-mds/projeto").isValid, true);

  // Sem protocolo
  const noProto = validateExternalUrl("unb.br/documento");
  assert.equal(noProto.isValid, false);

  // Protocolo nao permitido (ftp, javascript)
  const ftp = validateExternalUrl("ftp://unb.br/arquivo");
  assert.equal(ftp.isValid, false);

  // Vazio
  const empty = validateExternalUrl("");
  assert.equal(empty.isValid, false);
});

test("formatFileSize formata bytes de forma legivel", () => {
  assert.equal(formatFileSize(0), "0 B");
  assert.equal(formatFileSize(512), "512 B");
  assert.equal(formatFileSize(1024), "1.0 KB");
  assert.equal(formatFileSize(1024 * 512), "512.0 KB");
  assert.equal(formatFileSize(1024 * 1024), "1.00 MB");
  assert.equal(formatFileSize(5242880), "5.00 MB");
});
