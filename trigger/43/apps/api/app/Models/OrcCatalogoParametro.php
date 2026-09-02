<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrcCatalogoParametro extends Model
{
    protected $table = 'orc_catalogo_parametros';

    public const CHAVE_MATRIZ_CM2 = 'matriz_cm2';

    public const CHAVE_SETUP_HORAS = 'setup_horas';

    public const CHAVE_LIMITE_METRAGEM_BOBINA = 'limite_metragem_bobina';

    public const CHAVE_MINUTOS_TROCA_BOBINA = 'minutos_troca_bobina';

    public const CHAVE_CEILING_ETIQUETA = 'ceiling_etiqueta';

    public const CHAVE_PRECO_CAIXA = 'preco_caixa';

    public const CHAVE_TINTA_FAIXA_M2 = 'tinta_faixa_m2';

    public const CHAVE_TINTA_ATE_30_POR_COR = 'tinta_valor_ate_30_por_cor';

    public const CHAVE_TINTA_ACIMA_M2 = 'tinta_valor_acima_m2';

    public const CHAVE_PERDA_PAPEL_F6 = 'perda_papel_f6';

    public const CHAVE_PERDA_ACERTO_M_4V = 'perda_acerto_m_4v';

    public const CHAVE_PERDA_ACERTO_M_5 = 'perda_acerto_m_5';

    public const CHAVE_PERDA_ACERTO_M_6 = 'perda_acerto_m_6';

    public const CHAVE_PERDA_ACERTO_M_7 = 'perda_acerto_m_7';

    public const CHAVE_PERDA_ACERTO_M_8 = 'perda_acerto_m_8';

    public const CHAVE_PERDA_PAPEL_0 = 'perda_papel_0';

    public const CHAVE_PERDA_PAPEL_1 = 'perda_papel_1';

    public const CHAVE_PERDA_PAPEL_2 = 'perda_papel_2';

    public const CHAVE_PERDA_PAPEL_3 = 'perda_papel_3';

    public const CHAVE_TUBETE_1 = 'tubete_1';

    public const CHAVE_TUBETE_1_5 = 'tubete_1_5';

    public const CHAVE_TUBETE_3 = 'tubete_3';

    /** Grupos de UI no catálogo ORC. */
    public const GRUPO_MATRIZ = 'matriz';


    public const GRUPO_MOTOR = 'motor';

    public const GRUPO_PERDAS = 'perdas';

    public const GRUPO_EMBALAGEM = 'embalagem';

    public const GRUPO_TINTA = 'tinta';

    /**
     * Chaves conhecidas nesta entrega (extensível sem migration).
     *
     * @var list<string>
     */
    public const CHAVES_CONHECIDAS = [
        self::CHAVE_MATRIZ_CM2,
        self::CHAVE_SETUP_HORAS,
        self::CHAVE_LIMITE_METRAGEM_BOBINA,
        self::CHAVE_MINUTOS_TROCA_BOBINA,
        self::CHAVE_CEILING_ETIQUETA,
        self::CHAVE_PRECO_CAIXA,
        self::CHAVE_TINTA_FAIXA_M2,
        self::CHAVE_TINTA_ATE_30_POR_COR,
        self::CHAVE_TINTA_ACIMA_M2,
        self::CHAVE_PERDA_PAPEL_F6,
        self::CHAVE_PERDA_ACERTO_M_4V,
        self::CHAVE_PERDA_ACERTO_M_5,
        self::CHAVE_PERDA_ACERTO_M_6,
        self::CHAVE_PERDA_ACERTO_M_7,
        self::CHAVE_PERDA_ACERTO_M_8,
        self::CHAVE_PERDA_PAPEL_0,
        self::CHAVE_PERDA_PAPEL_1,
        self::CHAVE_PERDA_PAPEL_2,
        self::CHAVE_PERDA_PAPEL_3,
        self::CHAVE_TUBETE_1,
        self::CHAVE_TUBETE_1_5,
        self::CHAVE_TUBETE_3,
    ];

    /**
     * Metadados estáticos (grupo UI + defaults oficiais).
     *
     * @return array<string, array{grupo: string, rotulo: string, unidade: string, ordem: int, ativo: bool, default: float}>
     */
    public static function metaConhecidas(): array
    {
        return [
            self::CHAVE_MATRIZ_CM2 => [
                'grupo' => self::GRUPO_MATRIZ,
                'rotulo' => 'Matriz / clichê',
                'unidade' => 'R$/cm²',
                'ordem' => 10,
                'ativo' => true,
                'default' => 0.28,
            ],
            self::CHAVE_SETUP_HORAS => [
                'grupo' => self::GRUPO_MOTOR,
                'rotulo' => 'Setup básico (hora-máquina)',
                'unidade' => 'h',
                'ordem' => 100,
                'ativo' => true,
                'default' => 1.0,
            ],
            self::CHAVE_LIMITE_METRAGEM_BOBINA => [
                'grupo' => self::GRUPO_MOTOR,
                'rotulo' => 'Limite metragem troca bobina',
                'unidade' => 'm',
                'ordem' => 110,
                'ativo' => true,
                'default' => 1000.0,
            ],
            self::CHAVE_MINUTOS_TROCA_BOBINA => [
                'grupo' => self::GRUPO_MOTOR,
                'rotulo' => 'Minutos por troca de bobina (por mil m)',
                'unidade' => 'min',
                'ordem' => 120,
                'ativo' => true,
                'default' => 5.0,
            ],
            self::CHAVE_CEILING_ETIQUETA => [
                'grupo' => self::GRUPO_MOTOR,
                'rotulo' => 'Teto comercial (etiquetas)',
                'unidade' => 'R$',
                'ordem' => 130,
                'ativo' => true,
                'default' => 10.0,
            ],
            self::CHAVE_PRECO_CAIXA => [
                'grupo' => self::GRUPO_EMBALAGEM,
                'rotulo' => 'Preço por caixa',
                'unidade' => 'R$',
                'ordem' => 200,
                'ativo' => true,
                'default' => 7.0,
            ],
            self::CHAVE_TUBETE_1 => [
                'grupo' => self::GRUPO_EMBALAGEM,
                'rotulo' => 'Tubete 1"',
                'unidade' => 'R$/un',
                'ordem' => 210,
                'ativo' => true,
                'default' => 0.5,
            ],
            self::CHAVE_TUBETE_1_5 => [
                'grupo' => self::GRUPO_EMBALAGEM,
                'rotulo' => 'Tubete 1" 1/2',
                'unidade' => 'R$/un',
                'ordem' => 220,
                'ativo' => true,
                'default' => 0.6,
            ],
            self::CHAVE_TUBETE_3 => [
                'grupo' => self::GRUPO_EMBALAGEM,
                'rotulo' => 'Tubete 3"',
                'unidade' => 'R$/un',
                'ordem' => 230,
                'ativo' => true,
                'default' => 0.7,
            ],
            self::CHAVE_TINTA_FAIXA_M2 => [
                'grupo' => self::GRUPO_TINTA,
                'rotulo' => 'Faixa tinta (m²)',
                'unidade' => 'm²',
                'ordem' => 300,
                'ativo' => true,
                'default' => 30.0,
            ],
            self::CHAVE_TINTA_ATE_30_POR_COR => [
                'grupo' => self::GRUPO_TINTA,
                'rotulo' => 'Tinta até a faixa (por cor)',
                'unidade' => 'R$/cor',
                'ordem' => 310,
                'ativo' => true,
                'default' => 10.0,
            ],
            self::CHAVE_TINTA_ACIMA_M2 => [
                'grupo' => self::GRUPO_TINTA,
                'rotulo' => 'Tinta acima da faixa',
                'unidade' => 'R$/m²',
                'ordem' => 320,
                'ativo' => true,
                'default' => 0.4,
            ],
            self::CHAVE_PERDA_PAPEL_0 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Perda acerto 0 cores',
                'unidade' => 'm²',
                'ordem' => 400,
                'ativo' => true,
                'default' => 4.0,
            ],
            self::CHAVE_PERDA_PAPEL_1 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Perda acerto 1 cor',
                'unidade' => 'm²',
                'ordem' => 410,
                'ativo' => true,
                'default' => 4.0,
            ],
            self::CHAVE_PERDA_PAPEL_2 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Perda acerto 2 cores',
                'unidade' => 'm²',
                'ordem' => 420,
                'ativo' => true,
                'default' => 6.0,
            ],
            self::CHAVE_PERDA_PAPEL_3 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Perda acerto 3 cores',
                'unidade' => 'm²',
                'ordem' => 430,
                'ativo' => true,
                'default' => 8.0,
            ],
            self::CHAVE_PERDA_PAPEL_F6 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Fator F6 (4 cores)',
                'unidade' => 'm',
                'ordem' => 440,
                'ativo' => true,
                'default' => 180.0,
            ],
            self::CHAVE_PERDA_ACERTO_M_4V => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Metros acerto 4V / 5 cores',
                'unidade' => 'm',
                'ordem' => 450,
                'ativo' => true,
                'default' => 250.0,
            ],
            self::CHAVE_PERDA_ACERTO_M_5 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Metros acerto 5 cores',
                'unidade' => 'm',
                'ordem' => 460,
                'ativo' => true,
                'default' => 250.0,
            ],
            self::CHAVE_PERDA_ACERTO_M_6 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Metros acerto 6 cores',
                'unidade' => 'm',
                'ordem' => 470,
                'ativo' => true,
                'default' => 260.0,
            ],
            self::CHAVE_PERDA_ACERTO_M_7 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Metros acerto 7 cores',
                'unidade' => 'm',
                'ordem' => 480,
                'ativo' => true,
                'default' => 270.0,
            ],
            self::CHAVE_PERDA_ACERTO_M_8 => [
                'grupo' => self::GRUPO_PERDAS,
                'rotulo' => 'Metros acerto 8 cores',
                'unidade' => 'm',
                'ordem' => 490,
                'ativo' => true,
                'default' => 280.0,
            ],
        ];
    }

    public static function grupoDaChave(string $chave): string
    {
        return self::metaConhecidas()[$chave]['grupo'] ?? self::GRUPO_MOTOR;
    }

    protected $fillable = [
        'empresa_id',
        'chave',
        'valor',
        'rotulo',
        'unidade',
        'ativo',
        'ordem',
    ];

    protected function casts(): array
    {
        return [
            'valor' => 'decimal:6',
            'ativo' => 'boolean',
            'ordem' => 'integer',
        ];
    }
}
