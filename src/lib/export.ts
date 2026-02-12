export function exportPdfPrintMode() {
  if (typeof window === "undefined") return;

  document.documentElement.classList.add("tpl-print-mode");
  window.setTimeout(() => {
    window.print();
    window.setTimeout(() => {
      document.documentElement.classList.remove("tpl-print-mode");
    }, 250);
  }, 50);
}
