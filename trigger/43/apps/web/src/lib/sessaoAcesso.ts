/**
 * Política de sessão (espelha erp.auth.* no backend).
 * Norma: docs/ADR_SESSAO_ACESSO.md
 */
export const SESSAO_ACESSO = {
  maxUsuariosSimultaneos: 6,
  idleMinutes: 30,
} as const;

export function sessaoAcessoLoginHint(): string {
  return `Uma sessão por usuário · até ${SESSAO_ACESSO.maxUsuariosSimultaneos} pessoas conectadas · inatividade de ${SESSAO_ACESSO.idleMinutes} minutos encerra o acesso (uso contínuo na tela mantém a sessão).`;
}

export function sessaoAcessoUsuariosHint(): string {
  return `Acesso individual · uma sessão por usuário · até ${SESSAO_ACESSO.maxUsuariosSimultaneos} conectados · o administrador pode liberar sessão órfã`;
}
