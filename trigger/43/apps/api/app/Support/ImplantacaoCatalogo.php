<?php

namespace App\Support;

/**
 * Catálogo canônico da matriz de implantação (ADR_IMPLANTACAO_ACEITE).
 * Códigos estáveis — não renomear sem migração de aceites.
 */
final class ImplantacaoCatalogo
{
    public const STATUS_PENDENTE = 'PENDENTE';

    public const STATUS_OK = 'OK';

    public const STATUS_RECUSADO = 'RECUSADO';

    public const STATUS_NA = 'NA';

    public const SUPERFICIE_FLEXORC = 'flexorc';

    public const SUPERFICIE_ERP = 'erp';

    public const ONDA_NOMES = [
        0 => 'Fundação',
        1 => 'Comercial',
        2 => 'Pedido',
        3 => 'Execução',
        4 => 'Saída',
        5 => 'Caixa e sustentação',
        6 => 'Exceções',
    ];

    /**
     * @return list<array{
     *   codigo: string,
     *   nome: string,
     *   porque: string,
     *   onda: int,
     *   superficie: string,
     *   elo: bool,
     *   rota: string|null,
     *   evidencia: string|null,
     *   paralelo: bool
     * }>
     */
    public static function itens(): array
    {
        return [
            // Onda 0 — Fundação
            [
                'codigo' => 'F0_ACESSO',
                'nome' => 'Acesso e usuários',
                'porque' => 'Sem login e perfis ninguém opera.',
                'onda' => 0,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/usuarios',
                'evidencia' => 'usuarios',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F0_MENSALIDADE',
                'nome' => 'Mensalidade da conta',
                'porque' => 'Libera o envio de propostas (conta → TRIGGER).',
                'onda' => 0,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/conta/mensalidade',
                'evidencia' => 'mensalidade',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F0_EMPRESA',
                'nome' => 'Cadastro da empresa',
                'porque' => 'Identidade da EMP ativa (CNPJ e dados).',
                'onda' => 0,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => true,
                'rota' => '/empresas',
                'evidencia' => 'empresa',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F0_A1',
                'nome' => 'Certificado digital (A1)',
                'porque' => 'Exigido para enviar proposta nesta fatia.',
                'onda' => 0,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/empresas?tab=a1',
                'evidencia' => 'certificado_a1',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F0_PIX',
                'nome' => 'PIX para receber o sinal',
                'porque' => 'Conta financeira da EMP para o cliente pagar o sinal.',
                'onda' => 0,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/empresas',
                'evidencia' => 'cfin_pix',
                'paralelo' => true,
            ],

            // Onda 1 — Comercial (FLEXORC)
            [
                'codigo' => 'F1_PARCEIROS',
                'nome' => 'Clientes e prospects',
                'porque' => 'Sem parceiro não há orçamento com destino.',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => true,
                'rota' => '/parceiros',
                'evidencia' => 'parceiros',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F1_CATALOGO',
                'nome' => 'Catálogo e preços ORC',
                'porque' => 'Preços e insumos da EMP conferidos.',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/orcamento-catalogo',
                'evidencia' => 'catalogo',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F1_FACAS',
                'nome' => 'Mapa de facas',
                'porque' => 'Ferramental usado no cálculo do orçamento.',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => false,
                'rota' => '/mapa-facas',
                'evidencia' => 'facas',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F1_ORCAR',
                'nome' => 'Orçar',
                'porque' => 'Primeiro elo comercial: gerar orçamento.',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => true,
                'rota' => '/orcamentos',
                'evidencia' => 'orcamento',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F1_APROVAR',
                'nome' => 'Cliente aprova ou recusa',
                'porque' => 'Aceite via link; sem isso não há sinal nem pedido.',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => true,
                'rota' => '/orcamentos',
                'evidencia' => 'orc_aprovado',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F1_SINAL',
                'nome' => 'Sinal do orçamento',
                'porque' => 'Entrada cobrada no aceite (quando a política exige).',
                'onda' => 1,
                'superficie' => self::SUPERFICIE_FLEXORC,
                'elo' => true,
                'rota' => '/financeiro/contas-a-receber',
                'evidencia' => 'sinal',
                'paralelo' => false,
            ],

            // Onda 2 — Pedido (ERP)
            [
                'codigo' => 'F2_PEDIDO',
                'nome' => 'Abrir pedido',
                'porque' => 'Orçamento aceito vira pedido operacional.',
                'onda' => 2,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/pedidos',
                'evidencia' => 'pedido',
                'paralelo' => false,
            ],

            // Onda 3 — Execução (ERP)
            [
                'codigo' => 'F3_OP_OS',
                'nome' => 'Ordem de produção ou serviço',
                'porque' => 'Do pedido nasce OP e/ou OS.',
                'onda' => 3,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/ordens-producao',
                'evidencia' => 'op_os',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F3_SEPARAR',
                'nome' => 'Separar material no estoque',
                'porque' => 'Produção precisa reservar insumos.',
                'onda' => 3,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => false,
            ],
            [
                'codigo' => 'F3_EXECUTAR',
                'nome' => 'Executar produção ou serviço',
                'porque' => 'Trabalho feito no chão de fábrica / OS.',
                'onda' => 3,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => false,
            ],
            [
                'codigo' => 'F3_ATUALIZAR',
                'nome' => 'Atualizar pedido e estoque',
                'porque' => 'Uso, sobra e perda ficam registrados.',
                'onda' => 3,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => false,
            ],

            // Onda 4 — Saída (ERP)
            [
                'codigo' => 'F4_PA',
                'nome' => 'Entrada de produto acabado',
                'porque' => 'Acabado disponível para expedir.',
                'onda' => 4,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => false,
            ],
            [
                'codigo' => 'F4_FATURAR',
                'nome' => 'Faturar e gerar cobrança',
                'porque' => 'Baixa estoque do acabado e abre cobrança do pedido.',
                'onda' => 4,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/financeiro/faturamentos',
                'evidencia' => 'faturamento',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F4_EXPEDIR',
                'nome' => 'Expedir (balcão ou transporte)',
                'porque' => 'Mercadoria ou serviço sai para o cliente.',
                'onda' => 4,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/expedicao',
                'evidencia' => 'expedicao',
                'paralelo' => false,
            ],
            [
                'codigo' => 'F4_CONFIRMAR',
                'nome' => 'Confirmar entrega',
                'porque' => 'Fecha o ciclo físico; encaminha nota e cobrança se couber.',
                'onda' => 4,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => false,
            ],

            // Onda 5 — Caixa e sustentação (ERP + acessórios)
            [
                'codigo' => 'F5_RECEBER',
                'nome' => 'Receber conforme a negociação',
                'porque' => 'Dinheiro do pedido entra de acordo com o combinado.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/financeiro/contas-a-receber',
                'evidencia' => null,
                'paralelo' => false,
            ],
            [
                'codigo' => 'F5_BAIXAR',
                'nome' => 'Baixar cobrança',
                'porque' => 'Título quitado quando o pagamento confirma.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => true,
                'rota' => '/financeiro/contas-a-receber',
                'evidencia' => null,
                'paralelo' => false,
            ],
            [
                'codigo' => 'F5_BANCO',
                'nome' => 'Banco conectado (cobrar e pagar)',
                'porque' => 'API bancária para cobranças, pagamentos e extrato.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_CONCILIAR',
                'nome' => 'Conciliação e naturezas',
                'porque' => 'Extrato bate com receita/despesa na hierarquia certa.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/naturezas-gerenciais',
                'evidencia' => 'naturezas',
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_TIT_MANUAL',
                'nome' => 'Contas a pagar e a receber manuais',
                'porque' => 'Lançamentos avulsos no mesmo fluxo financeiro.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/financeiro/contas-a-pagar',
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_FLUXO',
                'nome' => 'Fluxo de caixa',
                'porque' => 'Visão de entradas e saídas no tempo.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_COMPRAS',
                'nome' => 'Compras e entrada de insumos',
                'porque' => 'Reposição no momento certo e entrada no estoque.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/compras/ordens',
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_NFE_ENT',
                'nome' => 'NF-e de entrada no estoque',
                'porque' => 'Baixar notas contra o CNPJ e validar entrada.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/estoque',
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_LAYOUT',
                'nome' => 'Posições de estoque',
                'porque' => 'Onde cada material fica (layout).',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/estoque',
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F5_AJUSTE',
                'nome' => 'Ajustes e perdas de estoque',
                'porque' => 'Correções e baixa para produção ou perda.',
                'onda' => 5,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => '/estoque/ajustes',
                'evidencia' => null,
                'paralelo' => true,
            ],

            // Onda 6 — Exceções
            [
                'codigo' => 'F6_DEVOLUCAO',
                'nome' => 'Devolução',
                'porque' => 'Cliente devolve ou há estorno parcial.',
                'onda' => 6,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => true,
            ],
            [
                'codigo' => 'F6_AVARIA',
                'nome' => 'Avaria no transporte',
                'porque' => 'Dano ou perda na entrega.',
                'onda' => 6,
                'superficie' => self::SUPERFICIE_ERP,
                'elo' => false,
                'rota' => null,
                'evidencia' => null,
                'paralelo' => true,
            ],
        ];
    }

    /**
     * @return array<string, array{
     *   codigo: string,
     *   nome: string,
     *   porque: string,
     *   onda: int,
     *   superficie: string,
     *   elo: bool,
     *   rota: string|null,
     *   evidencia: string|null,
     *   paralelo: bool
     * }>
     */
    public static function porCodigo(): array
    {
        $map = [];
        foreach (self::itens() as $item) {
            $map[$item['codigo']] = $item;
        }

        return $map;
    }

    public static function existe(string $codigo): bool
    {
        return isset(self::porCodigo()[$codigo]);
    }

    /**
     * @return list<string>
     */
    public static function statuses(): array
    {
        return [
            self::STATUS_PENDENTE,
            self::STATUS_OK,
            self::STATUS_RECUSADO,
            self::STATUS_NA,
        ];
    }
}
