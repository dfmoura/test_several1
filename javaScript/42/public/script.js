document.getElementById('processButton').addEventListener('click', async () => {
    try {
      const response = await fetch('/process-ofx');
      const data = await response.json();
  
      const tableBody = document.getElementById('dataTable').getElementsByTagName('tbody')[0];
      tableBody.innerHTML = ''; // Clear existing rows
  
      data.transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${transaction.org}</td>
          <td>${transaction.fid}</td>
          <td>${transaction.bankId}</td>
          <td>${transaction.branchId}</td>
          <td>${transaction.acctId}</td>
          <td>${transaction.acctType}</td>
          <td>${transaction.dtPosted}</td>
          <td>${transaction.trnType}</td>
          <td>${transaction.fitId}</td>
        `;
        tableBody.appendChild(row);
      });
  
      document.getElementById('balanceDisplay').textContent = `Balance: $${data.totalBalance.toFixed(2)}`;
    } catch (error) {
      console.error('Error processing OFX files:', error);
    }
  });