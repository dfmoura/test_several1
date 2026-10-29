"""Seed idempotente — lançamentos das melhorias 21–22/10/2026 (exclui sono 23:10–05:30)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.backlog.service import criar
from app.database import BacklogItem

# Períodos alinhados a transcripts, mtimes e janelas reais de atuação (BRT).
# Sono aproximado 21/10 23:10 → 22/10 05:30 — nenhum lançamento cobre esse intervalo.
_SEED_ITENS: list[dict[str, str]] = [
    {
        "codigo": "BLG-00001",
        "inicio_em": "2026-10-21 08:00",
        "fim_em": "2026-10-21 11:20",
        "tarefa": (
            "Leitura da documentação-raiz e do trigger/23 para delimitar o "
            "Observatório Social Brasil multiunidade (escopo v1)."
        ),
        "observacao_conclusao": (
            "Fronteiras da v1 e referência técnica do 23 alinhadas antes da "
            "redação do documento oficial."
        ),
    },
    {
        "codigo": "BLG-00002",
        "inicio_em": "2026-10-21 11:23",
        "fim_em": "2026-10-21 13:15",
        "tarefa": (
            "Redação do DOCUMENTO-OFICIAL-PROJETO.md: domínio, multiunidade, "
            "Compras.gov/PNCP e regras de negócio."
        ),
        "observacao_conclusao": (
            "Documento oficial publicado como base de negócio e domínio da plataforma."
        ),
    },
    {
        "codigo": "BLG-00003",
        "inicio_em": "2026-10-21 13:40",
        "fim_em": "2026-10-21 15:20",
        "tarefa": (
            "Plano-mestre de execução e infraestrutura Lightsail; fechamento da "
            "decisão SQLite (WAL) para multi-tenant lógico."
        ),
        "observacao_conclusao": (
            "PLANO-MESTRE versionado com stack, topologia, fases e critérios de aceite."
        ),
    },
    {
        "codigo": "BLG-00004",
        "inicio_em": "2026-10-21 15:35",
        "fim_em": "2026-10-21 16:10",
        "tarefa": (
            "Fases 0–1: scaffold Docker/health/backup, auth com sessão e "
            "organização → matriz/filiais/papéis."
        ),
        "observacao_conclusao": (
            "Fundação e multiunidade operacionais; auth e org cobertos por testes."
        ),
    },
    {
        "codigo": "BLG-00005",
        "inicio_em": "2026-10-21 16:10",
        "fim_em": "2026-10-21 16:30",
        "tarefa": (
            "Fases 2–5: território IBGE/UASG, config herdada, sync Compras.gov e "
            "motor de coleta central com dedupe."
        ),
        "observacao_conclusao": (
            "Coleta central e configuração por herança disponíveis via API/testes."
        ),
    },
    {
        "codigo": "BLG-00006",
        "inicio_em": "2026-10-21 16:30",
        "fim_em": "2026-10-21 16:58",
        "tarefa": (
            "Fases 6–9: enriquecimento CNPJ/CEP, consultas por escopo, ops/Lightsail "
            "e alertas nativos (sem Power BI)."
        ),
        "observacao_conclusao": (
            "Plataforma v1 fechada em código: health fase 9, ops, alertas e RUNBOOK."
        ),
    },
    {
        "codigo": "BLG-00007",
        "inicio_em": "2026-10-21 18:13",
        "fim_em": "2026-10-21 19:00",
        "tarefa": (
            "UX shell no padrão trigger/23, correção de cadastro filial/CNPJ e "
            "roteiro TESTAR-AGORA."
        ),
        "observacao_conclusao": (
            "UI alinhada ao 23; filial e CNPJ cadastráveis; guia local de teste pronto."
        ),
    },
    {
        "codigo": "BLG-00008",
        "inicio_em": "2026-10-21 19:05",
        "fim_em": "2026-10-21 21:30",
        "tarefa": (
            "Validação manual (smoke) do fluxo organização → território → coleta "
            "na UI local."
        ),
        "observacao_conclusao": (
            "Fluxo inicial exercitado pelo operador; pendências restantes só de "
            "go-live na VM Lightsail."
        ),
    },
    {
        "codigo": "BLG-00009",
        "inicio_em": "2026-10-22 05:45",
        "fim_em": "2026-10-22 09:00",
        "tarefa": (
            "Módulo Backlog operacional: API BLG, menu, tela com data início/fim e "
            "observação de conclusão; lançamentos das melhorias do período."
        ),
        "observacao_conclusao": (
            "Backlog no menu Cadastros; histórico 21/10 08:00–22/10 09:00 registrado "
            "(sono 23:10–05:30 excluído)."
        ),
    },
    # —— 22/10/2026 09:00–18:20 (diurno; sono N/A) ——
    {
        "codigo": "BLG-00010",
        "inicio_em": "2026-10-22 09:00",
        "fim_em": "2026-10-22 09:25",
        "tarefa": (
            "Fechamento do módulo Backlog: testes de API, seed do histórico e "
            "validação da tela Cadastros → Backlog."
        ),
        "observacao_conclusao": (
            "BLG-00001…00009 persistidos; pytest do backlog verde; menu operacional."
        ),
    },
    {
        "codigo": "BLG-00011",
        "inicio_em": "2026-10-22 10:02",
        "fim_em": "2026-10-22 10:20",
        "tarefa": (
            "Redesenho do escopo: visão pelo login (ACL), sem «Unidade Ativa» como "
            "eixo; ajustes em auth, compras, alertas e documentação."
        ),
        "observacao_conclusao": (
            "Escopo operacional passa a seguir vínculos do usuário; filtro de visão "
            "só estreita o ACL; PLANO/README atualizados."
        ),
    },
    {
        "codigo": "BLG-00012",
        "inicio_em": "2026-10-22 10:27",
        "fim_em": "2026-10-22 10:58",
        "tarefa": (
            "Organização: editar e excluir vínculo usuário–unidade; reforço de "
            "testes org/auth."
        ),
        "observacao_conclusao": (
            "CRUD de vínculos na tela Organização; testes de org e auth passando."
        ),
    },
    {
        "codigo": "BLG-00013",
        "inicio_em": "2026-10-22 11:33",
        "fim_em": "2026-10-22 11:45",
        "tarefa": (
            "Alinhamento de acessos e visualizações: matriz (consolidado) × filial "
            "(consulta local) sem misturar papéis."
        ),
        "observacao_conclusao": (
            "Regras de distinção matriz/filial confirmadas no fluxo de escopo e UI."
        ),
    },
    {
        "codigo": "BLG-00014",
        "inicio_em": "2026-10-22 13:28",
        "fim_em": "2026-10-22 14:00",
        "tarefa": (
            "Indicadores: padronização dos cards (Contratações, Filiais, Municípios) "
            "e remoção do card CNPJ pendentes."
        ),
        "observacao_conclusao": (
            "Cards no mesmo padrão visual/explicativo; CNPJ pendentes retirado da grade."
        ),
    },
    {
        "codigo": "BLG-00015",
        "inicio_em": "2026-10-22 14:00",
        "fim_em": "2026-10-22 15:55",
        "tarefa": (
            "Indicadores matriz/filial: andamento por filial, comparativos da rede, "
            "card homologadas, limpeza de grupos e colunas de valor."
        ),
        "observacao_conclusao": (
            "Layouts rede e unidade estabilizados com totais/valores de contratações "
            "e homologadas nas tabelas e cards."
        ),
    },
    {
        "codigo": "BLG-00016",
        "inicio_em": "2026-10-22 16:58",
        "fim_em": "2026-10-22 17:20",
        "tarefa": (
            "Correção das métricas «Por porte» para bater quantidade/valor com "
            "homologados; testes de consultas."
        ),
        "observacao_conclusao": (
            "Agregação por porte alinhada às homologadas; test_consultas atualizado."
        ),
    },
    {
        "codigo": "BLG-00017",
        "inicio_em": "2026-10-22 17:20",
        "fim_em": "2026-10-22 18:16",
        "tarefa": (
            "Período temporal dos indicadores (presets/intervalo De–Até), ajuste de "
            "gráficos de valor e roteiro TESTAR-AGORA."
        ),
        "observacao_conclusao": (
            "Módulo periodo.py + UI de filtros; gráficos e textos de intervalo "
            "consistentes; guia local atualizado."
        ),
    },
    {
        "codigo": "BLG-00018",
        "inicio_em": "2026-10-22 18:16",
        "fim_em": "2026-10-22 18:20",
        "tarefa": (
            "Registro no Backlog das melhorias do período 22/10 09:00–18:20."
        ),
        "observacao_conclusao": (
            "BLG-00010…00018 lançados e concluídos; gaps de pausa (ex.: almoço) "
            "não registrados como atuação."
        ),
    },
    # —— 22/10 18:20 → 27/10 09:00 (exclui sono 23:10–05:30; 24–25/10 sem evidência) ——
    {
        "codigo": "BLG-00019",
        "inicio_em": "2026-10-22 18:20",
        "fim_em": "2026-10-22 18:55",
        "tarefa": (
            "Runtime oficial via Docker Compose; ajustes pontuais em org/período "
            "após o registro do backlog."
        ),
        "observacao_conclusao": (
            "Decisão: operar só por Compose; org/período e testes alinhados ao caminho Docker."
        ),
    },
    {
        "codigo": "BLG-00020",
        "inicio_em": "2026-10-22 20:11",
        "fim_em": "2026-10-22 21:40",
        "tarefa": (
            "Listagem unidades-osb.txt a partir do mapa OSB: unidades, presidentes e CNPJ."
        ),
        "observacao_conclusao": (
            "Arquivo-base com 72 unidades (mapa), presidentes e CNPJ pesquisados/validados."
        ),
    },
    {
        "codigo": "BLG-00021",
        "inicio_em": "2026-10-23 08:33",
        "fim_em": "2026-10-23 08:50",
        "tarefa": (
            "Import idempotente das filiais OSB + scripts docker-up/verify para o "
            "serviço sobreviver ao fechar o Cursor."
        ),
        "observacao_conclusao": (
            "import_unidades_osb + CLI/shell; docker-up.sh e run.sh no padrão Compose detached."
        ),
    },
    {
        "codigo": "BLG-00022",
        "inicio_em": "2026-10-26 10:31",
        "fim_em": "2026-10-26 10:45",
        "tarefa": (
            "Limpeza do banco local para recomeçar testes com base limpa."
        ),
        "observacao_conclusao": (
            "Base de desenvolvimento resetada; ambiente pronto para nova carga/import."
        ),
    },
    {
        "codigo": "BLG-00023",
        "inicio_em": "2026-10-26 11:42",
        "fim_em": "2026-10-26 12:30",
        "tarefa": (
            "Enriquecimento: fila de pendentes e ação discreta (ícone) no padrão da UI."
        ),
        "observacao_conclusao": (
            "Fila operacional revisada; botão grande substituído por ícone discreto."
        ),
    },
    {
        "codigo": "BLG-00024",
        "inicio_em": "2026-10-26 12:34",
        "fim_em": "2026-10-26 14:45",
        "tarefa": (
            "Rotina Processar pendentes (job/config) e evolução da tela Enriquecimento."
        ),
        "observacao_conclusao": (
            "Job/agendamento e APIs de enriquecimento endurecidos; tela alinhada ao fluxo."
        ),
    },
    {
        "codigo": "BLG-00025",
        "inicio_em": "2026-10-26 14:48",
        "fim_em": "2026-10-26 15:15",
        "tarefa": (
            "Indicadores matriz: Andamento por filial sem corte em 10; scroll vertical "
            "e início da limpeza da tela Início."
        ),
        "observacao_conclusao": (
            "por_filial retorna a rede completa; tabela com scroll; Início em revisão."
        ),
    },
    {
        "codigo": "BLG-00026",
        "inicio_em": "2026-10-26 17:00",
        "fim_em": "2026-10-26 17:25",
        "tarefa": (
            "Início sem blocos desnecessários; Coleta (botão/planejador/motor) e README."
        ),
        "observacao_conclusao": (
            "Início enxuto; coleta manual/planejada ajustada; README atualizado."
        ),
    },
    {
        "codigo": "BLG-00027",
        "inicio_em": "2026-10-26 17:39",
        "fim_em": "2026-10-26 19:10",
        "tarefa": (
            "Tela Compras.gov: UX e escopo (visível conforme unidade/matriz)."
        ),
        "observacao_conclusao": (
            "Compras.gov no padrão dos demais módulos; regras de menu/escopo aplicadas."
        ),
    },
    {
        "codigo": "BLG-00028",
        "inicio_em": "2026-10-26 19:17",
        "fim_em": "2026-10-26 19:45",
        "tarefa": (
            "Filtro de visão: só matriz e filiais reais — sem «visão geral»/plataforma "
            "como opção de UI."
        ),
        "observacao_conclusao": (
            "Filtro abre na matriz; opções genéricas removidas da lista de visão."
        ),
    },
    {
        "codigo": "BLG-00029",
        "inicio_em": "2026-10-26 22:44",
        "fim_em": "2026-10-26 22:55",
        "tarefa": (
            "Alertas no grupo Análise do menu; atualização do roteiro TESTAR-AGORA."
        ),
        "observacao_conclusao": (
            "Alertas ao lado de Início/Compras; guia de teste refletindo menu e visão."
        ),
    },
    {
        "codigo": "BLG-00030",
        "inicio_em": "2026-10-27 08:45",
        "fim_em": "2026-10-27 09:00",
        "tarefa": (
            "Registro no Backlog das melhorias 22/10 18:20–27/10 09:00."
        ),
        "observacao_conclusao": (
            "BLG-00019…00030 concluídos; sono 23:10–05:30 e 24–25/10 sem evidência "
            "excluídos dos períodos."
        ),
    },
    # —— 27/10/2026 09:00–17:20 (diurno; sono N/A) ——
    {
        "codigo": "BLG-00031",
        "inicio_em": "2026-10-27 09:00",
        "fim_em": "2026-10-27 09:20",
        "tarefa": (
            "Registro Backlog da manhã e correção do menu Alertas no grupo Análise."
        ),
        "observacao_conclusao": (
            "Histórico até BLG-00030 persistido; Alertas permanece em Análise (não em Dados)."
        ),
    },
    {
        "codigo": "BLG-00032",
        "inicio_em": "2026-10-27 09:31",
        "fim_em": "2026-10-27 09:50",
        "tarefa": (
            "Verificação e ajuste da Coleta (router/agendamento) com testes e README."
        ),
        "observacao_conclusao": (
            "Fluxo da tela Coleta validado; agendamento e testes fase 5 atualizados."
        ),
    },
    {
        "codigo": "BLG-00033",
        "inicio_em": "2026-10-27 09:56",
        "fim_em": "2026-10-27 10:35",
        "tarefa": (
            "Logo OSB no login/shell (tamanho), limpeza de textos do login e modo "
            "acesso restrito sob coleta (só admin)."
        ),
        "observacao_conclusao": (
            "Branding ajustado; ops/acesso.py bloqueia não-admin com app no ar."
        ),
    },
    {
        "codigo": "BLG-00034",
        "inicio_em": "2026-10-27 10:42",
        "fim_em": "2026-10-27 11:25",
        "tarefa": (
            "Início (visão filial) e menu CNPJs vencedores com tipografia alinhada a "
            "Compras.gov."
        ),
        "observacao_conclusao": (
            "Contratações da filial no Início; tela CNPJs vencedores no padrão da tabela Compras."
        ),
    },
    {
        "codigo": "BLG-00035",
        "inicio_em": "2026-10-27 11:38",
        "fim_em": "2026-10-27 12:00",
        "tarefa": (
            "Início sem bloco inicial desnecessário; base de distribuição geográfica "
            "(mapa/API) e compose."
        ),
        "observacao_conclusao": (
            "Layout Início enxuto; distribuicao/mapa + testes; docker-compose alinhado."
        ),
    },
    {
        "codigo": "BLG-00036",
        "inicio_em": "2026-10-27 14:04",
        "fim_em": "2026-10-27 14:15",
        "tarefa": (
            "Ordenação e paginação nas tabelas Compras.gov e CNPJs vencedores."
        ),
        "observacao_conclusao": (
            "Sort/paginação server-side cobertos por testes de vencedores/compras."
        ),
    },
    {
        "codigo": "BLG-00037",
        "inicio_em": "2026-10-27 14:40",
        "fim_em": "2026-10-27 15:00",
        "tarefa": (
            "Módulo Acompanhamento (usuário↔contratação) e cards Contratações com "
            "números/frases enxutas."
        ),
        "observacao_conclusao": (
            "API/UI de acompanhamento; cards sem quebra de linha nos totais homologados."
        ),
    },
    {
        "codigo": "BLG-00038",
        "inicio_em": "2026-10-27 15:18",
        "fim_em": "2026-10-27 15:45",
        "tarefa": (
            "Análise da filial Por UASG (código + descrição) e cards Com/Sem acomp. "
            "na visão matriz."
        ),
        "observacao_conclusao": (
            "UASG exibida como código à frente da descrição; KPIs de acompanhamento na matriz."
        ),
    },
    {
        "codigo": "BLG-00039",
        "inicio_em": "2026-10-27 15:53",
        "fim_em": "2026-10-27 16:30",
        "tarefa": (
            "Menu Propostas abertas (filial, filtro UASG da visão) e menu completo "
            "somente para admin."
        ),
        "observacao_conclusao": (
            "Módulo propostas_abertas + RBAC de menu: não-admin vê só o autorizado."
        ),
    },
    {
        "codigo": "BLG-00040",
        "inicio_em": "2026-10-27 16:38",
        "fim_em": "2026-10-27 17:00",
        "tarefa": (
            "Propostas abertas (filial), tela Distribuição geográfica na matriz e "
            "roteiro TESTAR-AGORA."
        ),
        "observacao_conclusao": (
            "UI/consultas de distribuição e propostas alinhadas; guia de teste atualizado."
        ),
    },
    {
        "codigo": "BLG-00041",
        "inicio_em": "2026-10-27 17:00",
        "fim_em": "2026-10-27 17:20",
        "tarefa": (
            "Análise do melhor caminho para liberar acesso a usuário determinado; "
            "registro Backlog 09:00–17:20."
        ),
        "observacao_conclusao": (
            "Caminho de permissões por vínculo/papel confirmado; BLG-00031…00041 lançados."
        ),
    },
]


def garantir_seed_backlog(db: Session) -> int:
    """Insere itens seed ausentes (idempotente por código). Retorna quantos criou."""
    criados = 0
    for item in _SEED_ITENS:
        existe = (
            db.query(BacklogItem.id)
            .filter(BacklogItem.codigo == item["codigo"])
            .first()
        )
        if existe:
            continue
        criar(
            db,
            codigo=item["codigo"],
            tarefa=item["tarefa"],
            inicio_em=item["inicio_em"],
            fim_em=item["fim_em"],
            observacao_conclusao=item["observacao_conclusao"],
        )
        criados += 1
    return criados
