const dados = [
  {
    idiproc: '1001',
    dtfab: '2024-06-01',
    codprodpa: 'PA123',
    descrprod: 'Produto A Premium',
    qtdproduzir: 500,
    codvol: 'KG',
    nrolote: 'L20240601A',
    dhinicio: '2024-06-01 08:00',
    saldoop: 120
  },
  {
    idiproc: '1002',
    dtfab: '2024-06-02',
    codprodpa: 'PA124',
    descrprod: 'Produto B Eco',
    qtdproduzir: 300,
    codvol: 'UN',
    nrolote: 'L20240602B',
    dhinicio: '2024-06-02 09:30',
    saldoop: 80
  },
  {
    idiproc: '1003',
    dtfab: '2024-06-03',
    codprodpa: 'PA125',
    descrprod: 'Produto C Max',
    qtdproduzir: 750,
    codvol: 'KG',
    nrolote: 'L20240603C',
    dhinicio: '2024-06-03 07:45',
    saldoop: 200
  },
  {
    idiproc: '1004',
    dtfab: '2024-06-04',
    codprodpa: 'PA126',
    descrprod: 'Produto D Light',
    qtdproduzir: 150,
    codvol: 'UN',
    nrolote: 'L20240604D',
    dhinicio: '2024-06-04 10:00',
    saldoop: 50
  },
  {
    idiproc: '1005',
    dtfab: '2024-06-05',
    codprodpa: 'PA127',
    descrprod: 'Produto E Flex',
    qtdproduzir: 600,
    codvol: 'KG',
    nrolote: 'L20240605E',
    dhinicio: '2024-06-05 08:30',
    saldoop: 300
  },
  {
    idiproc: '1006',
    dtfab: '2024-06-06',
    codprodpa: 'PA128',
    descrprod: 'Produto F Ultra',
    qtdproduzir: 400,
    codvol: 'UN',
    nrolote: 'L20240606F',
    dhinicio: '2024-06-06 11:00',
    saldoop: 90
  },
  {
    idiproc: '1007',
    dtfab: '2024-06-07',
    codprodpa: 'PA129',
    descrprod: 'Produto G Plus',
    qtdproduzir: 250,
    codvol: 'KG',
    nrolote: 'L20240607G',
    dhinicio: '2024-06-07 09:00',
    saldoop: 60
  }
];

function renderTabela() {
  const tbody = document.getElementById('op-table-body');
  tbody.innerHTML = '';
  dados.forEach(reg => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${reg.idiproc}</td>
      <td>${reg.dtfab}</td>
      <td>${reg.codprodpa}</td>
      <td>${reg.descrprod}</td>
      <td>${reg.qtdproduzir}</td>
      <td>${reg.codvol}</td>
      <td>${reg.nrolote}</td>
      <td>${reg.dhinicio}</td>
      <td>${reg.saldoop}</td>
    `;
    tbody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', renderTabela); 