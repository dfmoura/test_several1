const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ofx = require('ofx');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

app.post('/upload', upload.single('ofxFile'), (req, res) => {
    const filePath = req.file.path;
    const ofxData = fs.readFileSync(filePath, 'utf-8');
    const parsedData = ofx.parse(ofxData);

    const transactions = parsedData.OFX.BANKMSGSRSV1.STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN.map(trn => ({
        DTPOSTED: new Date(trn.DTPOSTED).toLocaleDateString('pt-BR'),
        TRNTYPE: trn.TRNTYPE,
        FITID: trn.FITID,
        TRNAMT: trn.TRNAMT,
        MEMO: trn.MEMO
    }));

    res.json(transactions);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});