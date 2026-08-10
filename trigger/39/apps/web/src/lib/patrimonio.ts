export function bemCategoriaLabel(c: string | null | undefined): string {
  const map: Record<string, string> = {
    MAQUINA_GRAFICA: 'Máquina gráfica',
    EQUIPAMENTO: 'Equipamento',
    INFORMATICA: 'Informática',
    VEICULO: 'Veículo',
    MOVEL: 'Móvel',
    SOFTWARE: 'Software',
    OUTRO: 'Outro',
  };
  return c ? (map[c] ?? c) : '—';
}

export function bemStatusLabel(s: string | null | undefined): string {
  const map: Record<string, string> = {
    ATIVO: 'Ativo',
    EM_MANUTENCAO: 'Em manutenção',
    CEDIDO: 'Cedido',
    BAIXADO: 'Baixado',
    VENDIDO: 'Vendido',
  };
  return s ? (map[s] ?? s) : '—';
}
