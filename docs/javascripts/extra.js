(function () {
  var NAV_ITEMS = [
    {
      label: "Setup",
      path: "desenvolvimento/",
      match: ["desenvolvimento", "popular_banco_de_dados"]
    },
    {
      label: "Arquitetura",
      path: "arquitetura/",
      match: ["arquitetura", "pipeline_etl", "feature_5_2_materiais", "moderacao_curadoria", "ocupacao_turmas"]
    },
    {
      label: "Requisitos",
      path: "requisitos/",
      match: ["requisitos", "regras_negocio", "historias_usuario_"]
    },
    {
      label: "Dados",
      path: "banco_de_dados/",
      match: ["banco_de_dados"]
    },
    {
      label: "Releases",
      path: "releases/v0.9.0/",
      match: ["releases/", "revisao_", "issue_"]
    },
    {
      label: "AI Usage",
      path: "ai_usage/",
      match: ["ai_usage"]
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountTopNav);
  } else {
    mountTopNav();
  }
})();
