### Tarefa: Atualizar Campo de Histórico de Renegociação em Financiamentos

---

#### Descrição da Tarefa
Ao realizar a renegociação de financiamentos, é necessário atualizar o campo adicional denominado **"Histórico Renegociação"** com as informações detalhadas dos títulos de origem.

---

#### Formato das Informações a Serem Registradas:
Para cada título de origem, incluir as seguintes informações no campo "Histórico Renegociação":

```
Nro. Nota: XXX / N.Ú.Finan.: XXX / Dt.Venc.: XX/XX/XXXX / Valor: X.XXX,XX
Nro. Nota: XXX / N.Ú.Finan.: XXX / Dt.Venc.: XX/XX/XXXX / Valor: X.XXX,XX
Nro. Nota: XXX / N.Ú.Finan.: XXX / Dt.Venc.: XX/XX/XXXX / Valor: X.XXX,XX
Nro. Nota: XXX / N.Ú.Finan.: XXX / Dt.Venc.: XX/XX/XXXX / Valor: X.XXX,XX
```

---

#### Observações
- Este procedimento pode ser implementado utilizando um evento específico na **TGFFIN**.
- Certifique-se de que os dados de origem estejam corretos e correspondam aos títulos originais do financiamento.

---

#### Exemplo Prático:
Caso existam quatro títulos renegociados, o campo "Histórico Renegociação" deverá ser preenchido da seguinte forma:

```
Nro. Nota: 123 / N.Ú.Finan.: 456 / Dt.Venc.: 01/01/2023 / Valor: 1.000,00
Nro. Nota: 124 / N.Ú.Finan.: 457 / Dt.Venc.: 02/02/2023 / Valor: 2.000,00
Nro. Nota: 125 / N.Ú.Finan.: 458 / Dt.Venc.: 03/03/2023 / Valor: 3.000,00
Nro. Nota: 126 / N.Ú.Finan.: 459 / Dt.Venc.: 04/04/2023 / Valor: 4.000,00
```

--- 

#### Próximos Passos
1. Validar os dados dos títulos originais antes de atualizar o campo.
2. Implementar o evento necessário na TGFFIN, caso ainda não esteja disponível.
3. Realizar testes para garantir a conformidade das informações.

--- 

#### Execucao
1.10/12/2024 8:45 as 12:44
2.10/12/2024 13:38 as 18:54
3.11/12/2024 8:32 as 12:05