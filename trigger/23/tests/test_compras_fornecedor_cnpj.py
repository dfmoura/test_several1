"""Testes de stub/vínculo/proveniência de fornecedor e classificação Uberlândia."""

from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

from app.compras.cnpj_publico import (
    cnaes_secundarios_de_registro,
    classificar_uberlandia,
    fornecedor_para_api,
    mapear_payload_cnpj,
)
from app.compras.coletor_fornecedor import fornecedor_da_api, listar_pendentes_compras_gov
from app.compras.repository import (
    ensure_fornecedor_stub,
    precisa_enrich_compras_gov,
    upsert_fornecedor,
    upsert_resultado,
    vincular_fornecedores_resultados,
)
from app.database import (
    Base,
    CompraContratacaoItem,
    ComprasContratacaoResultado,
    ComprasFornecedor,
)


def _db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)()


def test_ensure_fornecedor_stub_e_vinculo():
    db = _db()
    stub, criado = ensure_fornecedor_stub(
        db, "12.345.678/0001-99", nome="Empresa Stub LTDA"
    )
    assert criado is True
    assert stub.ni_fornecedor == "12345678000199"
    assert stub.cnpj == "12345678000199"
    assert stub.fonte_razao_social == "07.3"
    assert precisa_enrich_compras_gov(stub) is True

    upsert_resultado(
        db,
        {
            "id_compra": "c1",
            "id_compra_item": "item-1",
            "sequencial_resultado": 1,
            "ni_fornecedor": "12345678000199",
            "nome_razao_social_fornecedor": "Empresa Stub LTDA",
            "dados_resultado_json": "{}",
        },
    )
    n = vincular_fornecedores_resultados(db)
    db.commit()
    row = db.scalar(select(ComprasContratacaoResultado))
    assert n == 1
    assert row.fornecedor_id == stub.id
    assert db.scalar(select(ComprasFornecedor)).nome_razao_social_fornecedor == "Empresa Stub LTDA"
    db.close()


def test_stub_nao_bloqueia_pendente_modulo_10():
    """Regressão: stub em compras_fornecedores não pode tirar o NI da fila do módulo 10."""
    db = _db()
    ensure_fornecedor_stub(db, "12345678000199", nome="Stub")
    db.add(
        ComprasContratacaoResultado(
            id_compra="c1",
            id_compra_item="i1",
            sequencial_resultado=1,
            ni_fornecedor="12345678000199",
            nome_razao_social_fornecedor="Stub",
        )
    )
    db.commit()
    pendentes = listar_pendentes_compras_gov(db)
    assert pendentes == ["12345678000199"]
    db.close()


def test_upsert_modulo_10_nao_apaga_qsa():
    db = _db()
    upsert_fornecedor(
        db,
        {
            "ni_fornecedor": "12345678000199",
            "cnpj": "12345678000199",
            "nome_razao_social_fornecedor": "ACME",
            "fonte_razao_social": "07.3",
            "_fonte": "07.3",
            "qsa_json": '[{"nome_socio":"Fulano"}]',
            "cnpj_dados_json": '{"fonte":"brasilapi"}',
            "cnpj_enriquecido_em": datetime.utcnow(),
            "codigo_municipio_ibge": 3170206,
            "de_uberlandia": True,
        },
    )
    db.commit()

    mapped = fornecedor_da_api(
        {
            "cnpj": "12345678000199",
            "nomeRazaoSocialFornecedor": "ACME LTDA MOD10",
            "porteEmpresaNome": "ME",
            "habilitadoLicitar": True,
            "ativo": True,
            "ufSigla": "SP",
            "nomeMunicipio": "SAO PAULO",
        }
    )
    assert mapped is not None
    row, _ = upsert_fornecedor(db, mapped)
    db.commit()

    assert row.qsa_json and "Fulano" in row.qsa_json
    assert row.cnpj_dados_json is not None
    assert row.cnpj_enriquecido_em is not None
    assert row.habilitado_licitar is True
    assert row.compras_gov_enriquecido_em is not None
    assert row.fonte_razao_social == "10"
    # IBGE já existia — não sobrescrever classificação geográfica
    assert row.de_uberlandia is True
    assert row.codigo_municipio_ibge == 3170206
    assert precisa_enrich_compras_gov(row) is False
    db.close()


def test_upsert_cnpj_nao_apaga_habilitado_nem_razao_compras():
    db = _db()
    upsert_fornecedor(
        db,
        {
            "ni_fornecedor": "12345678000199",
            "cnpj": "12345678000199",
            "nome_razao_social_fornecedor": "Nome Compras",
            "fonte_razao_social": "10",
            "_fonte": "10",
            "habilitado_licitar": True,
            "ativo": True,
            "compras_gov_dados_json": '{"cnpj":"12345678000199"}',
            "compras_gov_enriquecido_em": datetime.utcnow(),
        },
    )
    db.commit()

    mapped = mapear_payload_cnpj(
        {
            "cnpj": "12345678000199",
            "razao_social": "Nome RFB Diferente",
            "municipio": "UBERLANDIA",
            "uf": "MG",
            "codigo_municipio_ibge": 3170206,
            "descricao_situacao_cadastral": "ATIVA",
            "qsa": [{"nome_socio": "Socio", "qualificacao_socio": "Administrador"}],
        },
        fonte="brasilapi",
    )
    row, _ = upsert_fornecedor(db, mapped)
    db.commit()

    assert row.nome_razao_social_fornecedor == "Nome Compras"
    assert row.fonte_razao_social == "10"
    assert row.habilitado_licitar is True
    assert row.ativo is True
    assert row.compras_gov_dados_json is not None
    assert row.situacao_cadastral == "ATIVA"
    assert "Socio" in (row.qsa_json or "")
    assert row.de_uberlandia is True
    db.close()


def test_pendentes_inclui_item_sem_resultado():
    db = _db()
    db.add(
        CompraContratacaoItem(
            id_compra_item="i1",
            id_compra="c1",
            cod_fornecedor="11222333000181",
            nome_fornecedor="Nova",
        )
    )
    db.commit()
    assert listar_pendentes_compras_gov(db) == ["11222333000181"]
    db.close()


def test_classificar_uberlandia():
    assert classificar_uberlandia(codigo_municipio_ibge=3170206) is True
    assert classificar_uberlandia(codigo_municipio_ibge=3106200) is False
    assert classificar_uberlandia(nome_municipio="Uberlândia", uf_sigla="MG") is True
    assert classificar_uberlandia(nome_municipio="Uberaba", uf_sigla="MG") is False
    assert classificar_uberlandia() is None


def test_mapear_payload_brasilapi():
    mapped = mapear_payload_cnpj(
        {
            "cnpj": "12345678000199",
            "razao_social": "ACME LTDA",
            "nome_fantasia": "ACME",
            "cnae_fiscal": 6201501,
            "cnae_fiscal_descricao": "Desenvolvimento de software",
            "cnaes_secundarios": [
                {"codigo": 6202300, "descricao": "Desenvolvimento e licenciamento de software customizável"},
                {"codigo": 6311900, "descricao": "Tratamento de dados"},
            ],
            "descricao_situacao_cadastral": "ATIVA",
            "municipio": "UBERLANDIA",
            "uf": "MG",
            "codigo_municipio_ibge": 3170206,
            "cep": "38400000",
            "logradouro": "RUA A",
            "numero": "100",
            "bairro": "CENTRO",
            "qsa": [
                {
                    "nome_socio": "Fulano",
                    "cnpj_cpf_do_socio": "12345678901",
                    "qualificacao_socio": "Sócio-Administrador",
                    "data_entrada_sociedade": "2010-01-01",
                }
            ],
        },
        fonte="brasilapi",
    )
    assert mapped["de_uberlandia"] is True
    assert mapped["nome_municipio"] == "UBERLANDIA"
    assert "Fulano" in mapped["qsa_json"]
    assert mapped["_fonte"] == "cnpj_publico"
    secundarios = cnaes_secundarios_de_registro(mapped["cnpj_dados_json"])
    assert len(secundarios) == 2
    assert secundarios[0]["codigo"] == 6202300
    assert "software" in (secundarios[0]["descricao"] or "").lower()


def test_mapear_payload_cnpja():
    mapped = mapear_payload_cnpj(
        {
            "taxId": "29761115000180",
            "alias": "100 Sports",
            "company": {
                "name": "100 SPORTS LTDA",
                "members": [
                    {
                        "since": "2018-02-23",
                        "person": {
                            "name": "Bruna Alves de Souza",
                            "taxId": "***389051**",
                            "age": "21-30",
                            "country": {"name": "Brasil"},
                        },
                        "role": {"text": "Sócio-Administrador"},
                    }
                ],
                "nature": {"text": "Sociedade Empresária Limitada"},
                "size": {"text": "Empresa de Pequeno Porte", "acronym": "EPP"},
            },
            "status": {"text": "Ativa"},
            "address": {
                "municipality": 5204508,
                "street": "Rua Major Vitor",
                "number": "30",
                "district": "Centro",
                "city": "Caldas Novas",
                "state": "GO",
                "zip": "75680001",
            },
            "mainActivity": {"id": 4782201, "text": "Comércio varejista de calçados"},
            "sideActivities": [
                {"id": 4781400, "text": "Comércio varejista de artigos do vestuário"},
            ],
        },
        fonte="cnpja",
    )
    assert mapped["ni_fornecedor"] == "29761115000180"
    assert mapped["nome_razao_social_fornecedor"] == "100 SPORTS LTDA"
    assert mapped["nome_municipio"] == "Caldas Novas"
    assert mapped["uf_sigla"] == "GO"
    assert mapped["de_uberlandia"] is False
    assert mapped["situacao_cadastral"] == "Ativa"
    assert "Bruna Alves de Souza" in mapped["qsa_json"]
    assert mapped["_fonte"] == "cnpj_publico"
    secundarios = cnaes_secundarios_de_registro(mapped["cnpj_dados_json"])
    assert len(secundarios) == 1
    assert secundarios[0]["codigo"] == 4781400


def test_mapear_payload_publicacnpj():
    mapped = mapear_payload_cnpj(
        {
            "razao_social": "100 SPORTS LTDA",
            "porte": {"descricao": "Empresa de Pequeno Porte"},
            "natureza_juridica": {"descricao": "Sociedade Empresária Limitada"},
            "estabelecimento": {
                "cnpj": "29761115000180",
                "nome_fantasia": "100 Sports",
                "situacao_cadastral": "Ativa",
                "cep": "75680001",
                "logradouro": "Rua Major Vitor",
                "numero": "30",
                "bairro": "Centro",
                "cidade": {"nome": "Caldas Novas", "ibge_id": 5204508},
                "estado": {"sigla": "GO"},
                "atividade_principal": {
                    "id": "4782201",
                    "descricao": "Comércio varejista de calçados",
                },
                "atividades_secundarias": [
                    {"id": "4781400", "descricao": "Comércio varejista de artigos do vestuário"},
                    {"id": "4763601", "descricao": "Comércio varejista de brinquedos"},
                ],
            },
            "socios": [
                {
                    "nome": "BRUNA ALVES DE SOUZA",
                    "cpf_cnpj_socio": "***389051**",
                    "data_entrada": "2018-02-23",
                    "faixa_etaria": "21 a 30 anos",
                    "qualificacao_socio": {"descricao": "Sócio-Administrador"},
                    "pais": {"nome": "Brasil"},
                }
            ],
        },
        fonte="publicacnpj",
    )
    assert mapped["ni_fornecedor"] == "29761115000180"
    assert mapped["nome_municipio"] == "Caldas Novas"
    assert mapped["codigo_cnae"] == 4782201
    assert "BRUNA ALVES DE SOUZA" in mapped["qsa_json"]
    secundarios = cnaes_secundarios_de_registro(mapped["cnpj_dados_json"])
    assert [s["codigo"] for s in secundarios] == [4781400, 4763601]


def test_fornecedor_para_api_expoe_cnaes_secundarios():
    db = _db()
    mapped = mapear_payload_cnpj(
        {
            "cnpj": "12345678000199",
            "razao_social": "ACME LTDA",
            "cnae_fiscal": 6201501,
            "cnae_fiscal_descricao": "Desenvolvimento de software",
            "cnaes_secundarios": [
                {"codigo": 6202300, "descricao": "Software customizável"},
            ],
            "municipio": "UBERLANDIA",
            "uf": "MG",
            "codigo_municipio_ibge": 3170206,
        },
        fonte="brasilapi",
    )
    row, _ = upsert_fornecedor(db, mapped)
    db.commit()
    data = fornecedor_para_api(row)
    assert data["cnae_codigo"] == 6201501
    assert data["cnae"] == "Desenvolvimento de software"
    assert len(data["cnaes_secundarios"]) == 1
    assert data["cnaes_secundarios"][0]["codigo"] == 6202300
    db.close()


def test_cnaes_secundarios_sem_blob_retorna_vazio():
    assert cnaes_secundarios_de_registro(None) == []
    assert cnaes_secundarios_de_registro("{}") == []
    assert cnaes_secundarios_de_registro('{"fonte":"10"}') == []
