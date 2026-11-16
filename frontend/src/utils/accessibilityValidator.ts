export interface AccessibilityAuditResult {
  valid: boolean;
  violations: string[];
}

export interface FormControlDescriptor {
  id?: string;
  tagName: "input" | "select" | "textarea";
  hasExplicitLabel?: boolean;
  isWrappedInLabel?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  hasError?: boolean;
  ariaInvalid?: string | boolean;
  ariaDescribedBy?: string;
}

export interface TableStructureDescriptor {
  hasCaption?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  hasThead: boolean;
  hasTbody: boolean;
  columnHeaderScopes: string[];
  rowHeaderScopes?: string[];
}

export interface LiveRegionDescriptor {
  role?: string;
  ariaLive?: "polite" | "assertive" | "off";
  ariaAtomic?: string | boolean;
  hasTextContent: boolean;
}

/**
 * Valida se um controle de formulario possui associacao semantica acessivel
 * para leitores de tela (WCAG 1.3.1, 3.3.1 e 4.1.2).
 */
export function validateFormControlSemantics(
  control: FormControlDescriptor
): AccessibilityAuditResult {
  const violations: string[] = [];

  const hasAccessibleName =
    Boolean(control.hasExplicitLabel && control.id) ||
    Boolean(control.isWrappedInLabel) ||
    Boolean(control.ariaLabel && control.ariaLabel.trim().length > 0) ||
    Boolean(control.ariaLabelledBy && control.ariaLabelledBy.trim().length > 0);

  if (!hasAccessibleName) {
    violations.push(
      `Controle <${control.tagName}> sem nome acessivel (label htmlFor, label envolvente, aria-label ou aria-labelledby).`
    );
  }

  if (control.hasError) {
    const invalidFlag =
      control.ariaInvalid === true || control.ariaInvalid === "true";
    if (!invalidFlag) {
      violations.push(
        `Controle <${control.tagName}> em estado de erro deve expor aria-invalid="true".`
      );
    }
    if (
      !control.ariaDescribedBy ||
      control.ariaDescribedBy.trim().length === 0
    ) {
      violations.push(
        `Controle <${control.tagName}> em estado de erro deve referenciar a mensagem via aria-describedby.`
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Valida a conformidade semantica de uma tabela de dados para leitores de tela
 * (WCAG 1.3.1 - Info and Relationships).
 */
export function validateTableSemantics(
  table: TableStructureDescriptor
): AccessibilityAuditResult {
  const violations: string[] = [];

  const hasAccessibleDescription =
    Boolean(table.hasCaption) ||
    Boolean(table.ariaLabel && table.ariaLabel.trim().length > 0) ||
    Boolean(table.ariaLabelledBy && table.ariaLabelledBy.trim().length > 0);

  if (!hasAccessibleDescription) {
    violations.push(
      "Tabela sem identificacao semantica (caption, aria-label ou aria-labelledby)."
    );
  }

  if (!table.hasThead) {
    violations.push("Tabela deve conter secao de cabecalho <thead>.");
  }

  if (!table.hasTbody) {
    violations.push("Tabela deve conter corpo de dados <tbody>.");
  }

  if (!table.columnHeaderScopes || table.columnHeaderScopes.length === 0) {
    violations.push("Tabela deve possuir celulas de cabecalho <th>.");
  } else {
    const missingColScope = table.columnHeaderScopes.some(
      (scope) => scope !== "col" && scope !== "colgroup"
    );
    if (missingColScope) {
      violations.push(
        'Todas as celulas de cabecalho de coluna em <thead> devem definir scope="col".'
      );
    }
  }

  if (table.rowHeaderScopes && table.rowHeaderScopes.length > 0) {
    const missingRowScope = table.rowHeaderScopes.some(
      (scope) => scope !== "row" && scope !== "rowgroup"
    );
    if (missingRowScope) {
      violations.push(
        'Celulas de cabecalho de linha em <tbody> devem definir scope="row".'
      );
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Valida regioes de anuncio dinamico para leitores de tela (WCAG 4.1.3 - Status Messages).
 */
export function validateScreenReaderLiveRegion(
  region: LiveRegionDescriptor
): AccessibilityAuditResult {
  const violations: string[] = [];

  const isStatusRole = region.role === "status" || region.role === "alert";
  const hasLivePoliteness =
    region.ariaLive === "polite" || region.ariaLive === "assertive";

  if (!isStatusRole && !hasLivePoliteness) {
    violations.push(
      'Regiao de anuncio para leitor de tela deve possuir role="status"/"alert" ou aria-live="polite"/"assertive".'
    );
  }

  if (!region.hasTextContent) {
    violations.push(
      "Regiao de anuncio para leitor de tela nao pode estar vazia quando ativa."
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Inspeciona um trecho de marcacao JSX/HTML de tabela verificando caption/aria-label,
 * thead, tbody e escopo semantico das celulas de cabecalho.
 */
export function auditTableMarkup(markup: string): AccessibilityAuditResult {
  const tableBlocks = markup.match(/<table[\s\S]*?<\/table>/g) || [];
  if (tableBlocks.length === 0) {
    return {
      valid: false,
      violations: ["Nenhum elemento <table> encontrado na marcacao analisada."],
    };
  }

  const allViolations: string[] = [];

  for (const block of tableBlocks) {
    const openTagMatch = block.match(/<table[^>]*>/);
    const openTag = openTagMatch ? openTagMatch[0] : "";

    const hasCaption = /<caption[\s>][\s\S]*?<\/caption>/.test(block);
    const hasAriaLabel = /aria-label=/.test(openTag);
    const hasAriaLabelledBy = /aria-labelledby=/.test(openTag);
    const hasThead = /<thead[\s>]/.test(block);
    const hasTbody = /<tbody[\s>]/.test(block);

    const theadMatch = block.match(/<thead[\s\S]*?<\/thead>/);
    const theadContent = theadMatch ? theadMatch[0] : "";
    const theadThTags = theadContent.match(/<th\b[^>]*>/g) || [];
    const columnHeaderScopes = theadThTags.map((th) => {
      const scopeMatch = th.match(/scope=["']([^"']+)["']/);
      return scopeMatch ? scopeMatch[1] : "";
    });

    const tbodyMatch = block.match(/<tbody[\s\S]*?<\/tbody>/);
    const tbodyContent = tbodyMatch ? tbodyMatch[0] : "";
    const tbodyThTags = tbodyContent.match(/<th\b[^>]*>/g) || [];
    const rowHeaderScopes = tbodyThTags.map((th) => {
      const scopeMatch = th.match(/scope=["']([^"']+)["']/);
      return scopeMatch ? scopeMatch[1] : "";
    });

    const result = validateTableSemantics({
      hasCaption,
      ariaLabel: hasAriaLabel ? "present" : undefined,
      ariaLabelledBy: hasAriaLabelledBy ? "present" : undefined,
      hasThead,
      hasTbody,
      columnHeaderScopes,
      rowHeaderScopes,
    });

    allViolations.push(...result.violations);
  }

  return {
    valid: allViolations.length === 0,
    violations: allViolations,
  };
}

function extractTagBlocks(markup: string, tagPattern: string): Array<{
  tagText: string;
  tagName: string;
  startIndex: number;
  endIndex: number;
}> {
  const results: Array<{
    tagText: string;
    tagName: string;
    startIndex: number;
    endIndex: number;
  }> = [];
  const regex = new RegExp(`<(${tagPattern})\\b`, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(markup)) !== null) {
    const startIndex = match.index;
    const tagName = match[1];
    let i = startIndex + match[0].length;
    let braceDepth = 0;
    let inQuote: string | null = null;

    while (i < markup.length) {
      const ch = markup[i];
      if (inQuote) {
        if (ch === "\\" && i + 1 < markup.length) {
          i += 2;
          continue;
        }
        if (ch === inQuote) {
          inQuote = null;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") {
          inQuote = ch;
        } else if (ch === "{") {
          braceDepth++;
        } else if (ch === "}") {
          if (braceDepth > 0) braceDepth--;
        } else if (ch === ">" && braceDepth === 0) {
          i++;
          break;
        }
      }
      i++;
    }

    results.push({
      tagText: markup.slice(startIndex, i),
      tagName,
      startIndex,
      endIndex: i,
    });
  }

  return results;
}

function extractAttributeToken(tagText: string, attrName: string): {
  present: boolean;
  value: string;
  isDynamic: boolean;
} {
  const staticRegex = new RegExp(`\\b${attrName}\\s*=\\s*["']([^"']*)["']`);
  const staticMatch = tagText.match(staticRegex);
  if (staticMatch) {
    return {
      present: true,
      value: staticMatch[1].trim(),
      isDynamic: false,
    };
  }

  const dynamicRegex = new RegExp(`\\b${attrName}\\s*=\\s*\\{([^}]+)\\}`);
  const dynamicMatch = tagText.match(dynamicRegex);
  if (dynamicMatch) {
    return {
      present: true,
      value: `{${dynamicMatch[1].trim()}}`,
      isDynamic: true,
    };
  }

  return { present: false, value: "", isDynamic: false };
}

/**
 * Inspeciona um trecho de marcacao JSX/HTML verificando individualmente cada controle
 * de formulario (<input>, <select>, <textarea> e <Input>) quanto a associacao efetiva
 * de rotulo (<label htmlFor/for>, <label> envolvente, aria-label ou aria-labelledby
 * com IDs validos) e presenca de regiao de feedback para leitores de tela.
 */
export function auditFormAndScreenReaderMarkup(
  markup: string
): AccessibilityAuditResult {
  const violations: string[] = [];

  const nativeControls = extractTagBlocks(markup, "input|select|textarea");
  const customInputs = extractTagBlocks(markup, "Input");

  const hasFormOrInput =
    /<form\b/.test(markup) ||
    nativeControls.length > 0 ||
    customInputs.length > 0;

  if (!hasFormOrInput) {
    violations.push(
      "Nenhum formulario ou controle interativo encontrado na marcacao."
    );
    return { valid: false, violations };
  }

  const labelBlocks: Array<{ start: number; end: number; forToken: string }> = [];
  const labelRegex = /<label\b[\s\S]*?<\/label>/g;
  let labelMatch: RegExpExecArray | null;
  while ((labelMatch = labelRegex.exec(markup)) !== null) {
    const fullLabel = labelMatch[0];
    const openLabelMatch = extractTagBlocks(fullLabel, "label")[0];
    const openLabelTag = openLabelMatch ? openLabelMatch.tagText : fullLabel;
    const htmlForAttr = extractAttributeToken(openLabelTag, "htmlFor");
    const forAttr = extractAttributeToken(openLabelTag, "for");
    const forToken = htmlForAttr.present
      ? htmlForAttr.value
      : forAttr.present
      ? forAttr.value
      : "";

    labelBlocks.push({
      start: labelMatch.index,
      end: labelMatch.index + fullLabel.length,
      forToken,
    });
  }

  const explicitLabelTargets = new Set(
    labelBlocks.map((b) => b.forToken).filter((token) => token.length > 0)
  );

  const allElementIds = new Set<string>();
  const staticIdRegex = /\bid\s*=\s*["']([^"']+)["']/g;
  let idMatch: RegExpExecArray | null;
  while ((idMatch = staticIdRegex.exec(markup)) !== null) {
    if (idMatch[1].trim()) {
      allElementIds.add(idMatch[1].trim());
    }
  }
  const dynamicIdRegex = /\bid\s*=\s*\{([^}]+)\}/g;
  while ((idMatch = dynamicIdRegex.exec(markup)) !== null) {
    if (idMatch[1].trim()) {
      allElementIds.add(`{${idMatch[1].trim()}}`);
    }
  }

  let auditedControlsCount = 0;

  for (const ctrl of nativeControls) {
    const typeAttr = extractAttributeToken(ctrl.tagText, "type");
    if (
      ctrl.tagName === "input" &&
      !typeAttr.isDynamic &&
      ["hidden", "submit", "button", "reset"].includes(typeAttr.value.toLowerCase())
    ) {
      continue;
    }

    auditedControlsCount++;

    const idAttr = extractAttributeToken(ctrl.tagText, "id");
    const ariaLabelAttr = extractAttributeToken(ctrl.tagText, "aria-label");
    const ariaLabelledByAttr = extractAttributeToken(ctrl.tagText, "aria-labelledby");

    const isWrappedInLabel = labelBlocks.some(
      (lb) => ctrl.startIndex > lb.start && ctrl.endIndex <= lb.end
    );

    const hasMatchingExplicitLabel =
      idAttr.present &&
      idAttr.value.length > 0 &&
      explicitLabelTargets.has(idAttr.value);

    let validAriaLabelledBy: string | undefined = undefined;
    if (ariaLabelledByAttr.present && ariaLabelledByAttr.value.length > 0) {
      if (ariaLabelledByAttr.isDynamic) {
        validAriaLabelledBy = ariaLabelledByAttr.value;
      } else {
        const refIds = ariaLabelledByAttr.value.split(/\s+/).filter(Boolean);
        const allExist =
          refIds.length > 0 && refIds.every((refId) => allElementIds.has(refId));
        if (allExist) {
          validAriaLabelledBy = ariaLabelledByAttr.value;
        } else {
          violations.push(
            `Controle <${ctrl.tagName}> possui aria-labelledby="${ariaLabelledByAttr.value}" referenciando ID inexistente na marcacao.`
          );
        }
      }
    }

    const controlCheck = validateFormControlSemantics({
      id: idAttr.value || undefined,
      tagName: ctrl.tagName as "input" | "select" | "textarea",
      hasExplicitLabel: hasMatchingExplicitLabel,
      isWrappedInLabel,
      ariaLabel: ariaLabelAttr.value || undefined,
      ariaLabelledBy: validAriaLabelledBy,
    });

    if (!controlCheck.valid) {
      const idDescription = idAttr.value ? ` (id=${idAttr.value})` : "";
      violations.push(
        `Controle <${ctrl.tagName}>${idDescription} sem rotulo associado valido (<label htmlFor/for> correspondente, <label> envolvente, aria-label ou aria-labelledby).`
      );
    }
  }

  for (const customCtrl of customInputs) {
    auditedControlsCount++;
    const labelProp = extractAttributeToken(customCtrl.tagText, "label");
    const ariaLabelProp = extractAttributeToken(customCtrl.tagText, "aria-label");
    const ariaLabelledByProp = extractAttributeToken(
      customCtrl.tagText,
      "aria-labelledby"
    );

    const hasCustomLabel =
      (labelProp.present && labelProp.value.length > 0) ||
      (ariaLabelProp.present && ariaLabelProp.value.length > 0) ||
      (ariaLabelledByProp.present && ariaLabelledByProp.value.length > 0);

    if (!hasCustomLabel) {
      const idAttr = extractAttributeToken(customCtrl.tagText, "id");
      const idDescription = idAttr.value ? ` (id=${idAttr.value})` : "";
      violations.push(
        `Componente <Input>${idDescription} sem propriedade label, aria-label ou aria-labelledby.`
      );
    }
  }

  if (auditedControlsCount === 0) {
    violations.push(
      "Marcacao de formulario nao contem controles de entrada auditaveis (<input>, <select>, <textarea> ou <Input>)."
    );
  }

  const hasLiveFeedback =
    /role=["'](alert|status)["']/.test(markup) ||
    /aria-live=["'](polite|assertive)["']/.test(markup);

  if (!hasLiveFeedback) {
    violations.push(
      'Marcacao nao contem regiao de feedback para leitores de tela (role="alert", role="status" ou aria-live).'
    );
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
