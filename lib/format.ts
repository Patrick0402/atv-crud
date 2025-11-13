export function formatCurrency(value: number) {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  } catch (e) {
    // fallback
    return `R$ ${value.toFixed(2)}`;
  }
}
