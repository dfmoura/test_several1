<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<fmt:setLocale value="pt_BR"/>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Resumo Material</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <style>
    .chat-container {
      height: 400px;
      overflow-y: auto;
    }
    .message {
      margin: 10px 0;
      padding: 10px;
      border-radius: 8px;
    }
    .user-message {
      background-color: #e3f2fd;
      margin-left: 20%;
    }
    .bot-message {
      background-color: #f5f5f5;
      margin-right: 20%;
    }
    .loading {
      display: none;
    }
  </style>
  <snk:load/>
</head>
<body class="bg-gray-100">

  <snk:query var="base">
    select
    AD_APELIDO, AD_OBSINTERNA, AD_QTDVOLLT, APELIDO, ATUALEST, ATUALFIN, BONIFICACAO,  
    CODCENCUS, CODEMP, CODGER, CODGRUPOPROD, CODIGO, CODNAT, CODPARC,  
    CODPROD, CODTIPOPER, CODVEND, CPFCNPJ, DESCRCENCUS, DESCRGRUPOPROD, DESCRNAT,  
    DESCROPER, DESCRPROD, DTMOV, DTNEG, EMP, EMPRESA, FAX,  
    IE, MARCA, MARCA1, NOMEFANTASIAEMP, NOMEPARC, NRO, NUMNOTA,  
    NUNOTA, PARC, PARCEIRO, PRECOTAB, PROD, QTD, QTDNEG,  
    STATUSNFE, TEL, TIPATUALFIN, TIPMOV, TOP, UF, VEND,  VLR, VLRCUSGER1, 
    VLRCUSGER2, VLRCUSICM1, VLRCUSICM2, VLRICMS, VLRUNITLIQ,  VOL
    from VGF_VENDAS_SATIS    
</snk:query>


  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-center mb-8">Sistema de Chat com Dados de Vendas</h1>
    
    <!-- Data Summary -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-xl font-semibold mb-4">Resumo dos Dados</h2>
      <div id="dataSummary" class="text-gray-700"></div>
    </div>

    <!-- Chat Interface -->
    <div class="bg-white rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Chat com GPT</h2>
      <div id="chatContainer" class="chat-container border rounded-lg p-4 mb-4"></div>
      
      <div class="flex gap-2">
        <input type="text" id="userInput" placeholder="Digite sua pergunta sobre os dados..." 
               class="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <button onclick="sendMessage()" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Enviar
        </button>
      </div>
      
      <div id="loading" class="loading mt-4 text-center">
        <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        <span class="ml-2">Processando...</span>
      </div>
    </div>
  </div>



<script>
const OPENAI_API_KEY = "";

// Convert query results to JSON
let baseData = [];

// Convert the JSP query results to JSON using a safer approach
<c:forEach var="row" items="${base}" varStatus="status">
    baseData[${status.index}] = {
        AD_APELIDO: "${row.AD_APELIDO}",
        AD_OBSINTERNA: "${row.AD_OBSINTERNA}",
        AD_QTDVOLLT: "${row.AD_QTDVOLLT}",
        APELIDO: "${row.APELIDO}",
        ATUALEST: "${row.ATUALEST}",
        ATUALFIN: "${row.ATUALFIN}",
        BONIFICACAO: "${row.BONIFICACAO}",
        CODCENCUS: "${row.CODCENCUS}",
        CODEMP: "${row.CODEMP}",
        CODGER: "${row.CODGER}",
        CODGRUPOPROD: "${row.CODGRUPOPROD}",
        CODIGO: "${row.CODIGO}",
        CODNAT: "${row.CODNAT}",
        CODPARC: "${row.CODPARC}",
        CODPROD: "${row.CODPROD}",
        CODTIPOPER: "${row.CODTIPOPER}",
        CODVEND: "${row.CODVEND}",
        CPFCNPJ: "${row.CPFCNPJ}",
        DESCRCENCUS: "${row.DESCRCENCUS}",
        DESCRGRUPOPROD: "${row.DESCRGRUPOPROD}",
        DESCRNAT: "${row.DESCRNAT}",
        DESCROPER: "${row.DESCROPER}",
        DESCRPROD: "${row.DESCRPROD}",
        DTMOV: "${row.DTMOV}",
        DTNEG: "${row.DTNEG}",
        EMP: "${row.EMP}",
        EMPRESA: "${row.EMPRESA}",
        FAX: "${row.FAX}",
        IE: "${row.IE}",
        MARCA: "${row.MARCA}",
        MARCA1: "${row.MARCA1}",
        NOMEFANTASIAEMP: "${row.NOMEFANTASIAEMP}",
        NOMEPARC: "${row.NOMEPARC}",
        NRO: "${row.NRO}",
        NUMNOTA: "${row.NUMNOTA}",
        NUNOTA: "${row.NUNOTA}",
        PARC: "${row.PARC}",
        PARCEIRO: "${row.PARCEIRO}",
        PRECOTAB: "${row.PRECOTAB}",
        PROD: "${row.PROD}",
        QTD: "${row.QTD}",
        QTDNEG: "${row.QTDNEG}",
        STATUSNFE: "${row.STATUSNFE}",
        TEL: "${row.TEL}",
        TIPATUALFIN: "${row.TIPATUALFIN}",
        TIPMOV: "${row.TIPMOV}",
        TOP: "${row.TOP}",
        UF: "${row.UF}",
        VEND: "${row.VEND}",
        VLR: "${row.VLR}",
        VLRCUSGER1: "${row.VLRCUSGER1}",
        VLRCUSGER2: "${row.VLRCUSGER2}",
        VLRCUSICM1: "${row.VLRCUSICM1}",
        VLRCUSICM2: "${row.VLRCUSICM2}",
        VLRICMS: "${row.VLRICMS}",
        VLRUNITLIQ: "${row.VLRUNITLIQ}",
        VOL: "${row.VOL}"
    };
</c:forEach>

// Display data summary
function displayDataSummary() {
    const summaryDiv = document.getElementById('dataSummary');
    const totalRecords = baseData.length;
    
    // Calculate some basic statistics
    const totalValue = baseData.reduce((sum, item) => sum + parseFloat(item.VLR || 0), 0);
    const totalQuantity = baseData.reduce((sum, item) => sum + parseFloat(item.QTD || 0), 0);
    
    // Get unique values for some fields
    const uniqueProducts = [...new Set(baseData.map(item => item.PROD))];
    const uniquePartners = [...new Set(baseData.map(item => item.PARC))];
    const uniqueVendors = [...new Set(baseData.map(item => item.VEND))];
    
    summaryDiv.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-blue-600">${totalRecords}</div>
                <div class="text-sm text-gray-600">Total de Registros</div>
            </div>
            <div class="bg-green-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-green-600">R$ ${totalValue.toFixed(2)}</div>
                <div class="text-sm text-gray-600">Valor Total</div>
            </div>
            <div class="bg-yellow-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-yellow-600">${totalQuantity.toFixed(0)}</div>
                <div class="text-sm text-gray-600">Quantidade Total</div>
            </div>
            <div class="bg-purple-50 p-4 rounded-lg">
                <div class="text-2xl font-bold text-purple-600">${uniqueProducts.length}</div>
                <div class="text-sm text-gray-600">Produtos Únicos</div>
            </div>
        </div>
        <div class="mt-4 text-sm text-gray-600">
            <p><strong>Parceiros únicos:</strong> ${uniquePartners.length}</p>
            <p><strong>Vendedores únicos:</strong> ${uniqueVendors.length}</p>
        </div>
    `;
}

// Chat functionality
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    userInput.value = '';
    
    // Show loading
    document.getElementById('loading').style.display = 'block';
    
    try {
        const response = await askGPT(message);
        addMessageToChat('bot', response);
    } catch (error) {
        addMessageToChat('bot', 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.');
        console.error('Error:', error);
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

async function askGPT(userQuestion) {
    const prompt = `Você é um assistente especializado em análise de dados de vendas. 
    
    Baseado nos seguintes dados de vendas (em formato JSON), responda à pergunta do usuário de forma clara e detalhada:
    
    ${JSON.stringify(baseData, null, 2)}
    
    Pergunta do usuário: ${userQuestion}
    
    Por favor, analise os dados e forneça uma resposta útil e informativa. Se possível, inclua estatísticas relevantes, tendências ou insights baseados nos dados fornecidos.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'Você é um assistente especializado em análise de dados de vendas. Forneça respostas claras e úteis baseadas nos dados fornecidos.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

function addMessageToChat(sender, message) {
    const chatContainer = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `<strong>${sender === 'user' ? 'Você' : 'GPT'}:</strong> ${message}`;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Handle Enter key
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    displayDataSummary();
    
    // Add welcome message
    addMessageToChat('bot', 'Olá! Sou seu assistente de análise de dados de vendas. Posso ajudar você a analisar os dados de vendas disponíveis. Faça uma pergunta sobre os dados!');
});

// Log the data to console for debugging
console.log('Base data loaded:', baseData);
</script>
</body>
</html>
