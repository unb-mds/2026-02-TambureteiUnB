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

/**
 * Inspeciona um trecho de marcacao JSX/HTML verificando se elementos de formulario
 * nativos (<input>, <select>, <textarea>) possuem rotulacao semantica ou ARIA
 * e se ha regioes de feedback acessiveis para leitores de tela.
 */
export function auditFormAndScreenReaderMarkup(
  markup: string
): AccessibilityAuditResult {
  const violations: string[] = [];

  const hasFormOrInput =
    /<form\b/.test(markup) ||
    /<input\b/.test(markup) ||
    /<select\b/.test(markup) ||
    /<textarea\b/.test(markup);

  if (!hasFormOrInput) {
    violations.push(
      "Nenhum formulario ou controle interativo encontrado na marcacao."
    );
    return { valid: false, violations };
  }

  const hasLabelAssociation =
    /<label\b/.test(markup) ||
    /aria-label=/.test(markup) ||
    /aria-labelledby=/.test(markup);

  if (!hasLabelAssociation) {
    violations.push(
      "Marcacao de formulario nao contem associacao de rotulos (<label>, aria-label ou aria-labelledby)."
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
