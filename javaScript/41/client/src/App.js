import React, { useState } from 'react';
import './App.css';

function App() {
    const [transactions, setTransactions] = useState([]);

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        const formData = new FormData();
        formData.append('ofxFile', file);

        fetch('http://localhost:5000/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => setTransactions(data))
        .catch(error => console.error('Error:', error));
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    return (
        <div className="App">
            <div
                className="drop-zone"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                Arraste e solte o arquivo OFX aqui
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Tipo</th>
                        <th>ID</th>
                        <th>Valor</th>
                        <th>Descrição</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map((trn, index) => (
                        <tr key={index}>
                            <td>{trn.DTPOSTED}</td>
                            <td>{trn.TRNTYPE}</td>
                            <td>{trn.FITID}</td>
                            <td>{trn.TRNAMT}</td>
                            <td>{trn.MEMO}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default App;