# Alterações registradas no banco

## Monitor_Consulta.log

### ##ID_19##

- Aplicação: OperacaoProducao
- Recurso: br.com.sankhya.producao.cad.OperacaoProducao (`OperacaoProducaoSP.iniciarInstanciaAtividades`)
- URL: https://satis2.nuvemdatacom.com.br:8110/mgeprod/OperacaoProducao.xhtml5 (`/mgeprod/service.sbr`)
- Tempo de execução: 10 ms
- SQL executado: `UPDATE TPRIATV SET CODEXEC = ?, CODUSU = ?, DHACEITE = ? WHERE TPRIATV.IDIATV = ?`
- Parâmetros: `CODEXEC=0`, `CODUSU=0`, `DHACEITE=2025-10-11 10:05:15.0`, `IDIATV=296`

### ##ID_45##

- Aplicação: OperacaoProducao
- Recurso: br.com.sankhya.producao.cad.OperacaoProducao (`OperacaoProducaoSP.iniciarInstanciaAtividades`)
- URL: https://satis2.nuvemdatacom.com.br:8110/mgeprod/OperacaoProducao.xhtml5 (`/mgeprod/service.sbr`)
- Tempo de execução: 4 ms
- SQL executado: `UPDATE TPRIATV SET DHINICIO = ? WHERE TPRIATV.IDIATV = ?`
- Parâmetros: `DHINICIO=2025-10-11 10:05:15.0`, `IDIATV=296`

### ##ID_61##

- Aplicação: OperacaoProducao
- Recurso: br.com.sankhya.producao.cad.OperacaoProducao (`OperacaoProducaoSP.iniciarInstanciaAtividades`)
- URL: https://satis2.nuvemdatacom.com.br:8110/mgeprod/OperacaoProducao.xhtml5 (`/mgeprod/service.sbr`)
- Tempo de execução: 18 ms
- SQL executado: `INSERT INTO TPREIATV ( CODEXEC, CODMTP, CODUSU, DHFINAL, DHINICIO, IDEIATV, IDIATV, OBSERVACAO, TIPO ) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ? )`
- Parâmetros: `CODEXEC=0`, `CODMTP=0`, `CODUSU=0`, `DHFINAL=null`, `DHINICIO=2025-10-11 10:05:15.0`, `IDEIATV=12334`, `IDIATV=296`, `OBSERVACAO=null`, `TIPO=N`

### ##ID_64##

- Aplicação: OperacaoProducao
- Recurso: br.com.sankhya.producao.cad.OperacaoProducao (`OperacaoProducaoSP.iniciarInstanciaAtividades`)
- URL: https://satis2.nuvemdatacom.com.br:8110/mgeprod/OperacaoProducao.xhtml5 (`/mgeprod/service.sbr`)
- Tempo de execução: 15 ms
- SQL executado: `UPDATE TPRIATV SET CODULTEXEC = ? WHERE TPRIATV.IDIATV = ?`
- Parâmetros: `CODULTEXEC=0`, `IDIATV=296`
