/** Data local Brasil (America/Sao_Paulo) no formato AAAA-MM-DD — campo dCompet da DPS. */
export function todayBrasilia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}
