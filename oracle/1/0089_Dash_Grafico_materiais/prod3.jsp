<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script> 
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f5f7fa;
      margin: 0;
      padding: 20px;
    }

    h1 {
      text-align: center;
      color: #333;
    }

    .table-container {
      overflow-x: auto;
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      max-width: 100%;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 1000px;
    }

    th, td {
      border: 1px solid #ccc;
      padding: 8px 12px;
      text-align: center;
    }

    th {
      background-color: #007BFF;
      color: white;
    }

    thead tr:nth-child(2) th {
      background-color: #3399ff;
      font-size: 0.85em;
      font-weight: normal;
    }

    tr:nth-child(even) {
      background-color: #f9f9f9;
    }

    tfoot tr {
      font-weight: bold;
      background-color: #e0e0e0;
    }

    .saldo-verde {
      color: green;
    }

    .saldo-laranja {
      color: orange;
    }

    .saldo-vermelho {
      color: red;
    }

    .export-btn {
      position: fixed;
      top: 20px;
      left: 20px;
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: background-color 0.3s;
    }

    .export-btn:hover {
      background-color: #0056b3;
    }

    @media screen and (max-width: 768px) {
      th, td {
        padding: 6px 8px;
      }
    }
  </style>
  <snk:load/>
</head>
<body>
  <h1>Resumo Material</h1>
  <button class="export-btn" onclick="exportTableToExcel('tabelaFinal', 'Tabela_Notas_Fiscais')">Exportar para Excel</button>
  <div class="table-container">
    <table id="tabelaFinal">
      <thead id="tableHeader"></thead>
      <tbody id="tableBody"></tbody>
      <tfoot id="tableFooter"></tfoot>
    </table>
  </div>

  <!-- Importando a biblioteca xlsx.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.17.0/xlsx.full.min.js"></script>

  <script>
    jx.consultar({
      comando: `
        select
          cab.nunota,
          cab.numnota,
          LPAD(SUBSTR(par.razaosocial, 1, 6), 6) fornecedor,
          ite.codprod,
          pro.descrprod,
          pro.ad_perfil,
          pro.ad_material,
          pro.AD_PESO_UNITARIO,
          (case when cab.tipmov = 'J' then ite.qtdneg end)/pro.AD_PESO_UNITARIO QTDE_m,
          case when cab.tipmov = 'J' then ite.qtdneg end qtdrequisicao,
          case when cab.tipmov = 'O' then ite.qtdneg end qtdpedido,
          case when cab.tipmov = 'C' then ite.qtdneg end qtdcompra
        from tgfcab cab
        inner join tgfite ite on cab.nunota = ite.nunota
        inner join tgfpro pro on ite.codprod = pro.codprod
        inner join tsicus cus on cab.codcencus = cus.codcencus
        inner join tgfpar par on cab.codparc = par.codparc
        where cab.codcencus = 524036001
      `,
      onSuccess: function(res) {
        const data = res.records;
        if (!data.length) return alert('Nenhum dado encontrado');

        // Agrupando dados por produto
        const produtosMap = {};
        const notasFiscais = [];
        const fornecedores = {};

        data.forEach(row => {
          const chave = `${row.AD_PERFIL}||${row.AD_MATERIAL}`;
          const pesoUnit = parseFloat(row.AD_PESO_UNITARIO) || 1;
          const pesoTotal = pesoUnit * (parseFloat(row.QTDE_m) || 0);

          if (!produtosMap[chave]) {
            produtosMap[chave] = {
              perfil: row.AD_PERFIL,
              material: row.AD_MATERIAL,
              qtde_m: parseFloat(row.QTDE_m) || 0,
              qtde_pcs: parseFloat(row.QTDE_m || 0) / 6,
              peso_unit: pesoUnit,
              peso_total: pesoTotal,
              nfs: {}
            };
          } else {
            produtosMap[chave].qtde_m += parseFloat(row.QTDE_m) || 0;
            produtosMap[chave].qtde_pcs += (parseFloat(row.QTDE_m) || 0) / 6;
            produtosMap[chave].peso_total += pesoTotal;
          }

          const nf = row.NUMNOTA;
          produtosMap[chave].nfs[nf] = produtosMap[chave].nfs[nf] || 0;
          produtosMap[chave].nfs[nf] += pesoTotal;

          if (!notasFiscais.includes(nf)) notasFiscais.push(nf);
          fornecedores[nf] = row.FORNECEDOR;
        });

        // Construindo a tabela
        const produtos = Object.values(produtosMap);
        const thead = document.getElementById("tableHeader");
        const headerTop = document.createElement("tr");

        const colunasFixas = ["Perfil", "Material", "QTDE (m)", "QTDE (pç 6.00m)", "Peso Unitário (kg/m)", "Peso Total (kg)"];
        colunasFixas.forEach(h => {
          const th = document.createElement("th");
          th.rowSpan = 2;
          th.innerText = h;
          headerTop.appendChild(th);
        });

        notasFiscais.forEach(nf => {
          const th = document.createElement("th");
          th.innerText = nf;
          headerTop.appendChild(th);
        });

        const thSaldo = document.createElement("th");
        thSaldo.rowSpan = 2;
        thSaldo.innerText = "Saldo";
        headerTop.appendChild(thSaldo);

        thead.appendChild(headerTop);

        const headerBottom = document.createElement("tr");
        notasFiscais.forEach(nf => {
          const th = document.createElement("th");
          th.innerText = fornecedores[nf] || "-";
          headerBottom.appendChild(th);
        });
        thead.appendChild(headerBottom);

        const tbody = document.getElementById("tableBody");
        const totaisNFs = Array(notasFiscais.length).fill(0);
        let totalPeso = 0;
        let totalSaldo = 0;

        produtos.forEach(prod => {
          const row = document.createElement("tr");
          const baseData = [
            prod.perfil,
            prod.material,
            prod.qtde_m.toFixed(2),
            prod.qtde_pcs.toFixed(2),
            prod.peso_unit.toFixed(2),
            prod.peso_total.toFixed(2)
          ];
          baseData.forEach(d => {
            const td = document.createElement("td");
            td.innerText = d;
            row.appendChild(td);
          });

          let somaPesos = 0;
          notasFiscais.forEach((nf, idx) => {
            const peso = prod.nfs[nf] || 0;
            totaisNFs[idx] += peso;
            somaPesos += peso;

            const td = document.createElement("td");
            td.innerText = peso.toFixed(2);
            row.appendChild(td);
          });

          const saldo = somaPesos - prod.peso_total;
          totalPeso += prod.peso_total;
          totalSaldo += saldo;

          const tdSaldo = document.createElement("td");
          tdSaldo.innerText = saldo.toFixed(2);
          tdSaldo.className = saldo === 0 ? "saldo-verde" : saldo > 0 ? "saldo-laranja" : "saldo-vermelho";
          row.appendChild(tdSaldo);

          tbody.appendChild(row);
        });

        const tfoot = document.getElementById("tableFooter");
        const totalRow = document.createElement("tr");

        const tdTotalLabel = document.createElement("td");
        tdTotalLabel.colSpan = 5;
        tdTotalLabel.innerText = "TOTAL";
        totalRow.appendChild(tdTotalLabel);

        const tdTotalPeso = document.createElement("td");
        tdTotalPeso.innerText = totalPeso.toFixed(2);
        totalRow.appendChild(tdTotalPeso);

        totaisNFs.forEach(totalNF => {
          const td = document.createElement("td");
          td.innerText = totalNF.toFixed(2);
          totalRow.appendChild(td);
        });

        const tdTotalSaldo = document.createElement("td");
        tdTotalSaldo.innerText = totalSaldo.toFixed(2);

        tdTotalSaldo.className = totalSaldo === 0 ? "saldo-verde" : totalSaldo > 0 ? "saldo-laranja" : "saldo-vermelho";
            totalRow.appendChild(tdTotalSaldo);

            tfoot.appendChild(totalRow);
        },
        onError: function(erro) {
            console.error('Erro na consulta:', erro);
            alert('Erro ao buscar dados!');
        }
        });

        function exportTableToExcel(tableID, filename = '') {
        const wb = XLSX.utils.table_to_book(document.getElementById(tableID), {sheet: "Notas Fiscais"});
        XLSX.writeFile(wb, filename + ".xlsx");
        }
</script> 
</body> 
</html>