export function exportPdfPrintMode() {
  // Mode “comme avant” = impression navigateur → enregistrer en PDF
  // Tu peux styliser via @media print dans globals.css si besoin.
  if (typeof window === "undefined") return;

  document.documentElement.classList.add("tpl-print-mode");
  // petit délai pour laisser le layout se stabiliser avant print
  window.setTimeout(() => {
    window.print();
    window.setTimeout(() => {
      document.documentElement.classList.remove("tpl-print-mode");
    }, 250);
  }, 50);
}
