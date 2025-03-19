const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Serve static files (HTML, CSS, JS)
app.use(express.static('public'));

// Endpoint to process OFX files from the 'folder1' directory
app.get('/process-ofx', (req, res) => {
  const folderPath = path.join(__dirname, 'folder1');
  const files = fs.readdirSync(folderPath).filter(file => file.endsWith('.ofx'));

  const results = [];
  let totalBalance = 0;

  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(fileContent, 'application/xml');

    const transactions = xmlDoc.getElementsByTagName('STMTTRN');
    Array.from(transactions).forEach(transaction => {
      const org = transaction.getElementsByTagName('ORG')[0]?.textContent || 'N/A';
      const fid = transaction.getElementsByTagName('FID')[0]?.textContent || 'N/A';
      const bankId = transaction.getElementsByTagName('BANKID')[0]?.textContent || 'N/A';
      const branchId = transaction.getElementsByTagName('BRANCHID')[0]?.textContent || 'N/A';
      const acctId = transaction.getElementsByTagName('ACCTID')[0]?.textContent || 'N/A';
      const acctType = transaction.getElementsByTagName('ACCTTYPE')[0]?.textContent || 'N/A';
      const dtPosted = formatDate(transaction.getElementsByTagName('DTPOSTED')[0]?.textContent);
      const trnType = transaction.getElementsByTagName('TRNTYPE')[0]?.textContent || 'N/A';
      const fitId = transaction.getElementsByTagName('FITID')[0]?.textContent || 'N/A';
      const amount = parseFloat(transaction.getElementsByTagName('TRNAMT')[0]?.textContent || 0);

      totalBalance += amount;

      results.push({
        org,
        fid,
        bankId,
        branchId,
        acctId,
        acctType,
        dtPosted,
        trnType,
        fitId,
        amount,
      });
    });
  });

  res.json({ transactions: results, totalBalance });
});

// Helper function to format date
function formatDate(dtPosted) {
  if (!dtPosted) return 'N/A';
  const year = dtPosted.substring(0, 4);
  const month = dtPosted.substring(4, 6);
  const day = dtPosted.substring(6, 8);
  return `${day}/${month}/${year}`;
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});