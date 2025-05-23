SELECT 
  LAN.CODEMP,
  LAN.REFERENCIA,
  LAN.NUMLOTE,
  LAN.NUMLANC,
  LAN.SEQUENCIA,
  LAN.TIPLANC,
  LAN.CODCTACTB,
  LAN.DTMOV,
  LAN.VLRLANC,
  LAN.NUMDOC

FROM TCBLAN LAN
WHERE LAN.CODCTACTB = 128

MINUS

(
  SELECT
    LAN.CODEMP,
    LAN.REFERENCIA,
    LAN.NUMLOTE,
    LAN.NUMLANC,
    LAN.SEQUENCIA,
    LAN.TIPLANC,
    LAN.CODCTACTB,
    LAN.DTMOV,
    LAN.VLRLANC,
    LAN.NUMDOC
  FROM TCBLAN LAN
  INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
  INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
  INNER JOIN TGFCAB CAB ON (CAB.NUNOTA = IT.NUNICO AND IT.ORIGEM = 'E')
  INNER JOIN TGFPAR PAR ON (PAR.CODPARC = CAB.CODPARC)
  WHERE LAN.CODCTACTB = 128

  UNION

  SELECT
    LAN.CODEMP,
    LAN.REFERENCIA,
    LAN.NUMLOTE,
    LAN.NUMLANC,
    LAN.SEQUENCIA,
    LAN.TIPLANC,
    LAN.CODCTACTB,
    LAN.DTMOV,
    LAN.VLRLANC,
    LAN.NUMDOC
  FROM TCBLAN LAN
  INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
  INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
  INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'F')
  INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
  WHERE LAN.CODCTACTB = 128

  UNION

  SELECT
    LAN.CODEMP,
    LAN.REFERENCIA,
    LAN.NUMLOTE,
    LAN.NUMLANC,
    LAN.SEQUENCIA,
    LAN.TIPLANC,
    LAN.CODCTACTB,
    LAN.DTMOV,
    LAN.VLRLANC,
    LAN.NUMDOC
  FROM TCBLAN LAN
  INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
  INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
  INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'B')
  INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
  WHERE LAN.CODCTACTB = 128

  UNION

  SELECT
    LAN.CODEMP,
    LAN.REFERENCIA,
    LAN.NUMLOTE,
    LAN.NUMLANC,
    LAN.SEQUENCIA,
    LAN.TIPLANC,
    LAN.CODCTACTB,
    LAN.DTMOV,
    LAN.VLRLANC,
    LAN.NUMDOC
  FROM TCBLAN LAN
  INNER JOIN TCBPLA PLA ON (PLA.CODCTACTB = LAN.CODCTACTB)
  INNER JOIN TCBINT IT ON (IT.CODEMP=LAN.CODEMP AND IT.REFERENCIA=LAN.REFERENCIA AND IT.NUMLANC=LAN.NUMLANC AND IT.TIPLANC=LAN.TIPLANC AND IT.NUMLOTE=LAN.NUMLOTE AND IT.SEQUENCIA = LAN.SEQUENCIA)
  INNER JOIN TGFFIN FIN ON (FIN.NUFIN = IT.NUNICO AND IT.ORIGEM = 'R')
  INNER JOIN TGFPAR PAR ON (PAR.CODPARC = FIN.CODPARC)
  WHERE LAN.CODCTACTB = 128
)