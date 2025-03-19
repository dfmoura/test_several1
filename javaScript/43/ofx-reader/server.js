const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = 3000;
const OFX_DIR = './ofx_files'; // Directory to store OFX files

// Serve static files from the public directory
app.use(express.static('public'));

app.get('/ofx-files', (req, res) => {
    fs.readdir(OFX_DIR, (err, files) => {
        if (err) {
            return res.status(500).send('Error reading directory');
        }

        const ofxFiles = files.filter(file => path.extname(file) === '.ofx');
        const transactions = [];

        ofxFiles.forEach(file => {
            const filePath = path.join(OFX_DIR, file);
            const ofxText = fs.readFileSync(filePath, 'utf-8');
            transactions.push(...parseOFX(ofxText)); // Call the parseOFX function
        });

        // Generate HTML table
        let tableHTML = '<table><thead><tr><th>ORG</th><th>FID</th><th>BANKID</th><th>BRANCHID</th><th>ACCTID</th><th>ACCTTYPE</th><th>Data</th><th>Tipo</th><th>ID</th><th>Descrição</th><th>Valor</th></tr></thead><tbody>';
        transactions.forEach(tr => {
            tableHTML += `<tr><td>${tr.org}</td><td>${tr.fid}</td><td>${tr.bankid}</td><td>${tr.branchid}</td><td>${tr.acctid}</td><td>${tr.accttype}</td><td>${tr.date}</td><td>${tr.type}</td><td>${tr.id}</td><td>${tr.description}</td><td>R$ ${tr.amount.toFixed(2)}</td></tr>`;
        });
        tableHTML += '</tbody></table>';

        res.send(tableHTML);
    });
});

// Function to parse OFX files (implement this based on your needs)
function parseOFX(ofxText) {
    const transactions = [];
    let saldo = 0;

    const org = ofxText.match(/<ORG>(.*?)<\/ORG>/)?.[1] || 'N/A';
    const fid = ofxText.match(/<FID>(.*?)<\/FID>/)?.[1] || 'N/A';
    const bankid = ofxText.match(/<BANKID>(.*?)<\/BANKID>/)?.[1] || 'N/A';
    const branchid = ofxText.match(/<BRANCHID>(.*?)<\/BRANCHID>/)?.[1] || 'N/A';
    const acctid = ofxText.match(/<ACCTID>(.*?)<\/ACCTID>/)?.[1] || 'N/A';
    const accttype = ofxText.match(/<ACCTTYPE>(.*?)<\/ACCTTYPE>/)?.[1] || 'N/A';

    const regex = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
    let match;
    while ((match = regex.exec(ofxText)) !== null) {
        const transacao = match[1];
        const rawDate = transacao.match(/<DTPOSTED>(\d{8})/)?.[1] || '';
        const date = formatDate(rawDate);
        const type = transacao.match(/<TRNTYPE>(.*?)<\/TRNTYPE>/)?.[1] || 'Desconhecido';
        const id = transacao.match(/<FITID>(.*?)<\/FITID>/)?.[1] || 'Sem ID';
        const description = transacao.match(/<MEMO>(.*?)<\/MEMO>/)?.[1] || 'Sem descrição';
        const amount = parseFloat(transacao.match(/<TRNAMT>(.*?)<\/TRNAMT>/)?.[1] || '0.00');

        saldo += amount;
        transactions.push({ org, fid, bankid, branchid, acctid, accttype, date, type, id, description, amount });
    }

    return transactions;
}

function formatDate(ofxDate) {
    const match = ofxDate.match(/(\d{4})(\d{2})(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : 'Data inválida';
}

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});