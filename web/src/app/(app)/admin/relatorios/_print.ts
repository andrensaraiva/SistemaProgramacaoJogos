// CSS de impressão compartilhado pelos relatórios do admin. Esconde navegação e
// elementos .no-print, e força cores na hora de salvar em PDF.
export const PRINT_CSS = `
@media print {
  header, nav, aside, .no-print { display: none !important; }
  body { background: #fff !important; }
  main { max-width: none !important; padding: 0 !important; }
  .relatorio-page { padding: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
