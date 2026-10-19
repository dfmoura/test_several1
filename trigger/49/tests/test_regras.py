from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.cnpj import cnpj_valido
from app.faixa_cd import tentar_faixa_c, tentar_faixa_d
from app.regras import (
    a1_deve_rodar,
    decidir_backup,
    decidir_faixa_cd,
    dentro_da_madrugada,
    faixa_b_autorizada,
    parametro_codigo_modalidade,
    periodo_diario,
    periodo_e_ano_inteiro,
    rodizio,
    rotulo_modalidade,
    vinculo_compra,
)
from app.tempo import FUSO


def test_cnpj_de_uberlandia():
    assert cnpj_valido("23.497.346/0001-42")
    assert not cnpj_valido("23.497.346/0001-00")


def test_periodo_diario_nao_e_o_ano_inteiro():
    inicio, fim = periodo_diario(date(2026, 10, 19), 7)
    assert inicio == date(2026, 10, 12)
    assert fim == date(2026, 10, 19)
    assert not periodo_e_ano_inteiro(inicio, fim)


def test_modalidade_dispensa_nao_troca_os_codigos():
    assert rotulo_modalidade("Dispensa", 6) == "Dispensa"
    params = parametro_codigo_modalidade(6)
    assert params == {"codigoModalidade": 6}
    assert params["codigoModalidade"] != 8


def test_barreira_da_faixa_a():
    assert faixa_b_autorizada({"A1": "erro", "A2": "ok", "A3": "ok", "A4": "ok"})
    assert not faixa_b_autorizada({"A2": "ok", "A3": "incompleta", "A4": "ok"})
    assert not faixa_b_autorizada({"A2": "erro", "A3": "ok", "A4": "ok"})


def test_vinculo_ausente():
    assert vinculo_compra(None) == "nao_vinculado"
    assert vinculo_compra("  ") == "nao_vinculado"
    assert vinculo_compra("PNCP-1") == "vinculado"


def test_madrugada_e_rodizio():
    cedo = datetime(2026, 10, 19, 2, 9, tzinfo=FUSO)
    hora = datetime(2026, 10, 19, 2, 10, tzinfo=FUSO)
    dia = datetime(2026, 10, 19, 10, 0, tzinfo=FUSO)
    assert not dentro_da_madrugada(cedo, 2, 10, 5, 10)
    assert dentro_da_madrugada(hora, 2, 10, 5, 10)
    assert not dentro_da_madrugada(dia, 2, 10, 5, 10)
    assert rodizio(["b", "a", "c"], "a") == ["b", "c", "a"]


def test_a1_semanal():
    agora = datetime(2026, 10, 19, 3, 0, tzinfo=ZoneInfo("America/Sao_Paulo"))
    assert a1_deve_rodar(None, None, agora)
    assert not a1_deve_rodar(agora, None, agora)
    assert a1_deve_rodar(agora, agora.replace(minute=5), agora.replace(minute=6))


def test_backup_adia_uma_vez():
    assert decidir_backup(coleta_ativa=False, ja_adiou=False) == "executar"
    assert decidir_backup(coleta_ativa=True, ja_adiou=False) == "adiar_30"
    assert decidir_backup(coleta_ativa=True, ja_adiou=True) == "executar_registrando"


class _Bomba:
    def consultar_cnpj(self, _cnpj: str) -> None:
        raise AssertionError("CNPJ não pode ser chamado")

    def consultar_cep(self, _cep: str) -> None:
        raise AssertionError("CEP não pode ser chamado")


def test_faixas_cd_desligadas_nao_chamam_host():
    bomba = _Bomba()
    assert not decidir_faixa_cd(habilitada=False, anterior_ok=True)
    assert tentar_faixa_c(habilitada=False, anterior_ok=True, cliente=bomba) == "nao_disparada"
    assert tentar_faixa_d(habilitada=False, anterior_ok=True, cliente=bomba) == "nao_disparada"
    assert tentar_faixa_c(habilitada=True, anterior_ok=False, cliente=bomba) == "nao_disparada"
    assert tentar_faixa_d(habilitada=True, anterior_ok=False, cliente=bomba) == "nao_disparada"
