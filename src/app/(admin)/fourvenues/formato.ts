// Formato de euros compartido por la pantalla (servidor) y los componentes de cliente.
export const euros = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
