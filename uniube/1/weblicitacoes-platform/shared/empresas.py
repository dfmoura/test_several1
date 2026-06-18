"""Órgãos/unidades do portal Web Licitações — Uberlândia."""

EMPRESAS: dict[str, str] = {
    "0": "Prefeitura Municipal de Uberlandia",
    "1": "Departamento Municipal de Agua e Esgoto - DMAE",
    "2": "Instituto Previdência dos Servidores Públicos do Município de Uberlândia - IPREMU",
    "3": "Processamento de dados de Uberlandia - PRODAUB",
    "4": "Fundação Uberlandense de Esporte e Lazer - FUTEL",
    "5": "Fundação de Excelência Rural de Uberlândia - FERUB",
    "6": "Empresa Municipal de Apoio e Manutenção - EMAM",
    "7": "Fundação Saúde do Município de Uberlândia - FUNDASUS",
    "8": "CÂMARA MUNICIPAL DE UBERLANDIA",
    "9": "Agência de Regulação dos Serviços de Saneamento Básico de Uberlândia - ARESAN",
}

BASE_URL = "https://weblicitacoes.uberlandia.mg.gov.br"
CONSULTA_URL = (
    f"{BASE_URL}/weblicitacoes/f/n/licitacoescon"
    "?evento=y&descricaoEmpresaLicitacao=1&modoJanelaPlc=popup"
)
DETALHE_URL_TEMPLATE = (
    f"{BASE_URL}/weblicitacoes/f/n/licitacoesdetalhescon"
    "?modoJanelaPlc=popup&evento=y&codigoEmpresa={{codigo}}&licitacao={{licitacao}}"
)
