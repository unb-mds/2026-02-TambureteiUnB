(function () {
  if (window.mermaid) {
    window.mermaid.initialize({ startOnLoad: false });
  }

  var NAV_ITEMS = [
    {
      label: "Setup",
      path: "comecando/desenvolvimento/",
      match: ["comecando/", "desenvolvimento", "popular_banco_de_dados", "como_contribuir"]
    },
    {
      label: "Arquitetura",
      path: "engenharia/arquitetura/",
      match: ["arquitetura", "arquitetura_ui", "cores_indicadores", "pipeline_etl", "notas_corte_pas", "dashboard_institucional", "autenticacao_comunidade", "feature_5_2_materiais", "moderacao_curadoria", "ocupacao_turmas"]
    },
    {
      label: "Requisitos",
      path: "produto/requisitos/",
      match: ["produto/", "requisitos", "regras_negocio", "historias_usuario_"]
    },
    {
      label: "Dados",
      path: "engenharia/banco_de_dados/",
      match: ["banco_de_dados"]
    },
    {
      label: "Releases",
      path: "releases/v0.9.0/",
      match: ["releases/", "qualidade/", "revisao_", "issue_", "correcao_", "diagnostico_"]
    },
    {
      label: "AI Usage",
      path: "ai/ai_usage/",
      match: ["ai/", "ai_usage"]
    }
  ];

  function getRootUrl() {
    var logo = document.querySelector(".md-header__button.md-logo");
    if (!logo || !logo.href) return window.location.origin + "/";
    return logo.href.replace(/index\.html$/, "");
  }

  function isItemActive(item, pathname) {
    return item.match.some(function (pattern) {
      return pathname.indexOf(pattern) !== -1;
    });
  }

  function buildNav(className, linkClassName, activeClassName, rootUrl, pathname) {
    var nav = document.createElement("nav");
    nav.className = className;
    nav.setAttribute("aria-label", "Acesso rápido à documentação");

    var activeLink = null;
    NAV_ITEMS.forEach(function (item) {
      var link = document.createElement("a");
      link.className = linkClassName;
      link.textContent = item.label;
      link.href = new URL(item.path, rootUrl).href;
      if (isItemActive(item, pathname)) {
        link.classList.add(activeClassName);
        link.setAttribute("aria-current", "page");
        activeLink = link;
      }
      nav.appendChild(link);
    });

    return { nav: nav, activeLink: activeLink };
  }

  function mountTopNav() {
    if (document.title && document.title.indexOf("Tamburetei UnB Docs") === -1) {
      document.title = document.title.replace(/Tamburetei UnB$/, "Tamburetei UnB Docs");
    }

    var header = document.querySelector(".md-header");
    var headerInner = document.querySelector(".md-header__inner");
    var titleEl = document.querySelector(".md-header__title");
    if (!header || !headerInner || !titleEl) return;

    var existingDesktop = headerInner.querySelector(".tmb-topnav");
    if (existingDesktop) existingDesktop.remove();
    var existingMobile = header.querySelector(".tmb-mobile-topnav");
    if (existingMobile) existingMobile.remove();

    var rootUrl = getRootUrl();
    var pathname = window.location.pathname;

    var desktopNav = buildNav(
      "tmb-topnav",
      "tmb-topnav__link",
      "tmb-topnav__link--active",
      rootUrl,
      pathname
    );
    titleEl.insertAdjacentElement("afterend", desktopNav.nav);

    var mobileNav = buildNav(
      "tmb-mobile-topnav",
      "tmb-mobile-topnav__link",
      "tmb-mobile-topnav__link--active",
      rootUrl,
      pathname
    );
    header.appendChild(mobileNav.nav);

    if (mobileNav.activeLink && typeof mobileNav.activeLink.scrollIntoView === "function") {
      mobileNav.activeLink.scrollIntoView({ inline: "center", block: "nearest" });
    }

    var footerLinks = document.querySelector(".tmb-footer__links");
    if (footerLinks && !footerLinks.querySelector("[data-tmb-contribute-link]")) {
      var contributeLink = document.createElement("a");
      contributeLink.href = new URL("comecando/como_contribuir/", rootUrl).href;
      contributeLink.textContent = "Como Contribuir";
      contributeLink.setAttribute("data-tmb-contribute-link", "true");
      footerLinks.appendChild(contributeLink);
    }
  }

  function getMermaidConfig(isDark) {
    return {
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: isDark
        ? {
            darkMode: true,
            background: "transparent",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
            primaryColor: "#231f42",
            primaryTextColor: "#f1f5f9",
            primaryBorderColor: "#9385f7",
            secondaryColor: "#1b1830",
            secondaryTextColor: "#cbd5e1",
            secondaryBorderColor: "#4f4396",
            tertiaryColor: "#141222",
            tertiaryTextColor: "#e2e8f0",
            tertiaryBorderColor: "#383161",
            lineColor: "#a79bf9",
            textColor: "#e2e8f0",
            edgeLabelBackground: "#181625",
            clusterBkg: "#141222",
            clusterBorder: "#383161",
            actorBkg: "#231f42",
            actorBorder: "#9385f7",
            actorTextColor: "#f1f5f9",
            actorLineColor: "#64748b",
            signalColor: "#a79bf9",
            signalTextColor: "#e2e8f0",
            labelBoxBkgColor: "#181625",
            labelBoxBorderColor: "#4f4396",
            labelTextColor: "#f1f5f9",
            noteBkgColor: "#1b1830",
            noteBorderColor: "#9385f7",
            noteTextColor: "#f1f5f9"
          }
        : {
            darkMode: false,
            background: "transparent",
            fontFamily: "Inter, sans-serif",
            fontSize: "13px",
            primaryColor: "#f3f0ff",
            primaryTextColor: "#111827",
            primaryBorderColor: "#5b4bdb",
            secondaryColor: "#ffffff",
            secondaryTextColor: "#1e293b",
            secondaryBorderColor: "#c4b5fd",
            tertiaryColor: "#faf9ff",
            tertiaryTextColor: "#111827",
            tertiaryBorderColor: "#ddd6fe",
            lineColor: "#5b4bdb",
            textColor: "#111827",
            edgeLabelBackground: "#ffffff",
            clusterBkg: "#faf9ff",
            clusterBorder: "#d8cffc",
            actorBkg: "#f3f0ff",
            actorBorder: "#5b4bdb",
            actorTextColor: "#111827",
            actorLineColor: "#94a3b8",
            signalColor: "#4736c4",
            signalTextColor: "#111827",
            labelBoxBkgColor: "#ffffff",
            labelBoxBorderColor: "#c4b5fd",
            labelTextColor: "#111827",
            noteBkgColor: "#f6f4fe",
            noteBorderColor: "#5b4bdb",
            noteTextColor: "#111827"
          }
    };
  }

  var schemeObserver = null;
  var lastMermaidScheme = null;

  function renderMermaidDiagrams() {
    if (!window.mermaid) return;
    var nodes = Array.prototype.slice.call(document.querySelectorAll(".mermaid"));
    if (!nodes.length) return;

    var currentScheme =
      document.body && document.body.getAttribute("data-md-color-scheme") === "slate"
        ? "slate"
        : "default";

    if (lastMermaidScheme === currentScheme) return;
    lastMermaidScheme = currentScheme;

    window.mermaid.initialize(getMermaidConfig(currentScheme === "slate"));

    var nodesToRender = [];
    nodes.forEach(function (node) {
      if (!node.dataset.tmbMermaidSrc && !node.querySelector("svg")) {
        node.dataset.tmbMermaidSrc = node.textContent;
      }
      if (node.dataset.tmbMermaidSrc) {
        node.removeAttribute("data-processed");
        node.textContent = node.dataset.tmbMermaidSrc;
        nodesToRender.push(node);
      }
    });

    if (nodesToRender.length) {
      try {
        if (typeof window.mermaid.run === "function") {
          window.mermaid.run({ nodes: nodesToRender });
        } else if (typeof window.mermaid.init === "function") {
          window.mermaid.init(undefined, nodesToRender);
        }
      } catch (_err) {
        lastMermaidScheme = null;
      }
    }

    if (!schemeObserver && document.body && typeof MutationObserver === "function") {
      schemeObserver = new MutationObserver(function () {
        renderMermaidDiagrams();
      });
      schemeObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-md-color-scheme"]
      });
    }
  }

  function initPortal() {
    mountTopNav();
    renderMermaidDiagrams();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPortal);
  } else {
    initPortal();
  }
})();
