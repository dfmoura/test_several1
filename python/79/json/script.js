// Fetch the JSON data and populate the table
fetch('consolidado.json')
    .then(response => response.json())
    .then(data => {
        const tableBody = document.getElementById('transactions-table').getElementsByTagName('tbody')[0];

        data.forEach(entry => {
            const transactions = entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;

            transactions.forEach(transaction => {
                const row = tableBody.insertRow();
                const bankCell = row.insertCell(0);
                const branCell = row.insertCell(1);
                const acctCell = row.insertCell(2);
                const dateCell = row.insertCell(3);
                const typeCell = row.insertCell(4);
                const amountCell = row.insertCell(5);
                const memoCell = row.insertCell(6);
                const fitCell = row.insertCell(7);

                bankCell.textContent = entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.BANKID;
                branCell.textContent = entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.BRANCHID;
                acctCell.textContent = entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.ACCTID;

                const rawDate = transaction.DTPOSTED;
                const formattedDate = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;
                dateCell.textContent = formattedDate;

                typeCell.textContent = transaction.TRNTYPE;
                amountCell.textContent = transaction.TRNAMT;
                memoCell.textContent = transaction.MEMO;
                fitCell.textContent = transaction.FITID;
            });
        });
    })
    .catch(error => console.error('Error fetching the JSON data:', error));

// Function to calculate the initial balance up to a specific date
function calculateInitialBalanceUntilDate(targetDate) {
    return fetch('saldo_inicial.json')
        .then(response => response.json())
        .then(initialBalances => {
            const initialBalanceMap = new Map();

            initialBalances.forEach(initialBalance => {
                const key = `${initialBalance.banco}|${initialBalance.conta}|${initialBalance.agencia}`;
                initialBalanceMap.set(key, parseFloat(initialBalance.valor));
            });

            return fetch('consolidado.json')
                .then(response => response.json())
                .then(data => {
                    data.forEach(entry => {
                        const transactions = entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;

                        transactions.forEach(transaction => {
                            const rawDate = transaction.DTPOSTED;
                            const formattedDate = `${rawDate.substring(6, 8)}/${rawDate.substring(4, 6)}/${rawDate.substring(0, 4)}`;
                            const transactionDate = new Date(formattedDate.split('/').reverse().join('-'));

                            if (transactionDate < targetDate) {
                                const key = `${entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.BANKID}|${entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.ACCTID}|${entry.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKACCTFROM.BRANCHID}`;
                                const amount = parseFloat(transaction.TRNAMT);

                                if (initialBalanceMap.has(key)) {
                                    initialBalanceMap.set(key, initialBalanceMap.get(key) + amount);
                                }
                            }
                        });
                    });

                    return initialBalanceMap;
                });
        })
        .catch(error => console.error('Error calculating initial balance:', error));
}

// Function to update the balance based on the filtered transactions
function updateBalance(startDate, endDate) {
    const table = document.getElementById('transactions-table');
    const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    const balances = {}; // Object to hold balances for each unique combination
    const uniqueTransactions = new Set(); // Set to track unique transactions

    const start = new Date(startDate.split('/').reverse().join('-'));
    const end = new Date(endDate.split('/').reverse().join('-'));

    calculateInitialBalanceUntilDate(start).then(initialBalanceMap => {
        for (let row of rows) {
            if (row.style.display !== 'none') { // Only consider visible rows
                const amountCell = row.cells[5].innerText; // Assuming the amount is in the 6th column
                const bankCell = row.cells[0].innerText; // Bank
                const acctCell = row.cells[2].innerText; // Account
                const branCell = row.cells[1].innerText; // Agency
                const fitCell = row.cells[7].innerText; // FITID

                const key = `${bankCell}|${acctCell}|${branCell}`; // Unique key for each combination
                const transactionKey = `${fitCell}|${amountCell}`; // Unique key for each transaction

                if (!uniqueTransactions.has(transactionKey)) {
                    uniqueTransactions.add(transactionKey); // Add to set to avoid duplicates
                    if (!balances[key]) {
                        balances[key] = initialBalanceMap.get(key) || 0; // Initialize balance with initial balance if it exists
                    }
                    balances[key] += parseFloat(amountCell); // Update balance
                }
            }
        }

        // Update the balance display
        const balanceDisplay = document.getElementById('balance');
        balanceDisplay.innerHTML = ''; // Clear previous balances
        for (const [key, balance] of Object.entries(balances)) {
            const [bank, account, agency] = key.split('|');
            balanceDisplay.innerHTML += `${bank} - ${account} - ${agency}: ${balance.toFixed(2)}<br>`; // Display each balance
        }
    });
}

// Event listener for the filter button
document.getElementById('filter-button').addEventListener('click', function() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const table = document.getElementById('transactions-table').getElementsByTagName('tbody')[0];
    const rows = table.getElementsByTagName('tr');

    // Convert date format from 'DD/MM/YYYY' to 'YYYY-MM-DD' for comparison
    const formatDate = (dateStr) => {
        const [day, month, year] = dateStr.split('/');
        return new Date(`${year}-${month}-${day}`);
    };

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    for (let i = 0; i < rows.length; i++) {
        const dateCell = rows[i].cells[3].innerText; // Assuming the date is in the 4th column
        const rowDate = formatDate(dateCell);

        if (rowDate >= start && rowDate <= end) {
            rows[i].style.display = ''; // Show row
        } else {
            rows[i].style.display = 'none'; // Hide row
        }
    }

    updateBalance(startDate, endDate); // Call to update balance after filtering
});

// Call updateBalance initially to set the balance on page load
updateBalance('01/07/2024', '31/12/2024'); // Example initial date range