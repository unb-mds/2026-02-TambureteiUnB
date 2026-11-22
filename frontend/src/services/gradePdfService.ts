export async function downloadGradePdf(element: HTMLElement, semester: string) {
  await document.fonts.ready;
  const [{ toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  const wrapper = document.createElement("div");
  wrapper.setAttribute("aria-hidden", "true");
  Object.assign(wrapper.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "1120px",
    padding: "20px",
    boxSizing: "border-box",
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    fontFamily: "Arial, Helvetica, sans-serif",
    pointerEvents: "none",
  });
  wrapper.append(element.cloneNode(true));
  document.body.append(wrapper);
  try {
    const width = wrapper.scrollWidth,
      height = wrapper.scrollHeight;
    const png = await toPng(wrapper, {
      // Fontes do sistema evitam consultar folhas externas bloqueadas por CORS.
      skipFonts: true,
      pixelRatio: 2,
      width,
      height,
      style: { position: "static", left: "0", top: "0" },
    });
    const pdf = new jsPDF({
      orientation: width >= height ? "landscape" : "portrait",
      unit: "px",
      format: [width, height],
      hotfixes: ["px_scaling"],
      compress: true,
    });
    pdf.addImage(png, "PNG", 0, 0, width, height);
    pdf.save(`minha-grade-${semester}.pdf`);
  } finally {
    wrapper.remove();
  }
}
