<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<fmt:setLocale value="pt_BR"/>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resumo Material</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Custom styles for Inter font and general body styling */
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f0f4f8;
            display: flex;
            justify-content: center;
            align-items: flex-start; /* Align to top to prevent content overflow on smaller screens */
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(141, 128, 128, 0.1);
            width: 100%;
            max-width: 700px;
            display: flex;
            flex-direction: column;
            gap: 25px;
        }
        .section-title {
            font-size: 1.75rem; /* 28px */
            font-weight: 700; /* bold */
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
        }
        .input-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #4a5568;
        }
        .input-group input[type="text"],
        .input-group input[type="password"] {
            width: 100%;
            padding: 12px 15px;
            border: 1px solid #cbd5e0;
            border-radius: 8px;
            font-size: 1rem;
            transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
            box-sizing: border-box; /* Ensure padding doesn't add to width */
        }
        .input-group input[type="text"]:focus,
        .input-group input[type="password"]:focus {
            outline: none;
            border-color: #4299e1;
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
        }
        .btn {
            padding: 12px 25px;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .btn-primary {
            background-color: #3b82f6; /* blue-500 */
            color: #ffffff;
        }
        .btn-primary:hover {
            background-color: #2563eb; /* blue-600 */
            transform: translateY(-1px);
        }
        .btn-primary:active {
            transform: translateY(0);
            box-shadow: none;
        }
        .message {
            padding: 12px 20px;
            border-radius: 8px;
            margin-top: 15px;
            font-weight: 500;
            display: none; /* Hidden by default */
            align-items: center;
            gap: 10px;
        }
        .message.success {
            background-color: #d1fae5; /* green-100 */
            color: #065f46; /* green-800 */
            border: 1px solid #34d399; /* green-400 */
        }
        .message.error {
            background-color: #fee2e2; /* red-100 */
            color: #991b1b; /* red-800 */
            border: 1px solid #ef4444; /* red-400 */
        }
        .message.info {
            background-color: #e0f2fe; /* blue-100 */
            color: #1e40af; /* blue-800 */
            border: 1px solid #60a5fa; /* blue-400 */
        }
        .message.show {
            display: flex;
        }
        /* Flexbox for input rows */
        .input-row {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
        }
        .input-row .input-group {
            flex: 1;
        }
        /* Responsive adjustments */
        @media (max-width: 640px) {
            .input-row {
                flex-direction: column;
                gap: 15px;
            }
            .container {
                padding: 20px;
            }
            .section-title {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Login Section -->
        <div class="login-section">
            <h2 class="section-title">Sankhya API Login</h2>
            <div class="input-row">
                <div class="input-group">
                    <label for="token">Token:</label>
                    <input type="text" id="token" value="1e02dfe7-a1e2-4137-ba68-54692b702f47" placeholder="Enter your token">
                </div>
                <div class="input-group">
                    <label for="appkey">App Key:</label>
                    <input type="text" id="appkey" value="73199831-c2af-414e-9369-852ea1b47831" placeholder="Enter your app key">
                </div>
            </div>
            <div class="input-row">
                <div class="input-group">
                    <label for="username">Username:</label>
                    <input type="text" id="username" value="arthur.calixto@neuonsolucoes.com" placeholder="Enter your username">
                </div>
                <div class="input-group">
                    <label for="password">Password:</label>
                    <input type="password" id="password" value="Root@123" placeholder="Enter your password">
                </div>
            </div>
            <button id="loginButton" class="btn btn-primary">Login</button>
            <div id="loginMessage" class="message"></div>
        </div>

        <!-- Data Submission Section -->
        <div class="data-submission-section mt-8">
            <h2 class="section-title">Submit TESTE_PRECO Data</h2>
            <div class="input-row">
                <div class="input-group">
                    <label for="codtab">CODTAB:</label>
                    <input type="text" id="codtab" placeholder="Enter CODTAB">
                </div>
                <div class="input-group">
                    <label for="codprod">CODPROD:</label>
                    <input type="text" id="codprod" placeholder="Enter CODPROD">
                </div>
            </div>
            <div class="input-row">
                <div class="input-group">
                    <label for="novo_preco">NOVO_PRECO:</label>
                    <input type="text" id="novo_preco" placeholder="Enter NOVO_PRECO">
                </div>
                <div class="input-group">
                    <label for="dtvigor">DTVIGOR (YYYY-MM-DD):</label>
                    <input type="text" id="dtvigor" placeholder="Enter DTVIGOR (e.g., 2025-07-02)">
                </div>
            </div>
            <button id="savePriceButton" class="btn btn-primary">Save Price Data</button>
            <div id="savePriceMessage" class="message"></div>
        </div>
    </div>

    <script>
        // Base URL for Sankhya API
        const API_BASE_URL = 'https://api.sandbox.sankhya.com.br';

        // Global variable to store the authorization token
        let authToken = null;

        // Get references to HTML elements
        const loginButton = document.getElementById('loginButton');
        const savePriceButton = document.getElementById('savePriceButton');
        const loginMessage = document.getElementById('loginMessage');
        const savePriceMessage = document.getElementById('savePriceMessage');

        // Function to display messages to the user
        function displayMessage(element, message, type) {
            element.textContent = message;
            element.className = `message show ${type}`; // Add 'show' class to make it visible
            // Hide message after 5 seconds
            setTimeout(() => {
                element.classList.remove('show');
            }, 5000);
        }

        // Function to handle login
        async function login() {
            const token = document.getElementById('token').value;
            const appkey = document.getElementById('appkey').value;
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Clear previous messages
            displayMessage(loginMessage, 'Logging in...', 'info');

            try {
                const response = await fetch(`${API_BASE_URL}/login`, {
                    method: 'POST',
                    headers: {
                        'token': token,
                        'appkey': appkey,
                        'username': username,
                        'password': password,
                        'Content-Type': 'application/json' // Although not explicitly in curl, good practice for POST
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Login failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                if (data && data.token) {
                    authToken = data.token; // Store the bearer token
                    displayMessage(loginMessage, 'Login successful! Token obtained.', 'success');
                    console.log('Login successful. Token:', authToken);
                    // Enable save button after successful login
                    savePriceButton.disabled = false;
                } else {
                    throw new Error('Login response did not contain a token.');
                }
            } catch (error) {
                console.error('Login error:', error);
                displayMessage(loginMessage, `Login failed: ${error.message}`, 'error');
                authToken = null; // Clear token on failure
                savePriceButton.disabled = true; // Disable save button
            }
        }

        // Function to save TESTE_PRECO data
        async function savePriceData() {
            if (!authToken) {
                displayMessage(savePriceMessage, 'Please log in first.', 'error');
                return;
            }

            const codtab = document.getElementById('codtab').value;
            const codprod = document.getElementById('codprod').value;
            const novo_preco = document.getElementById('novo_preco').value;
            const dtvigor = document.getElementById('dtvigor').value;

            // Basic validation
            if (!codtab || !codprod || !novo_preco || !dtvigor) {
                displayMessage(savePriceMessage, 'All TESTE_PRECO fields are required.', 'error');
                return;
            }

            // Clear previous messages
            displayMessage(savePriceMessage, 'Saving price data...', 'info');

            // Construct the payload for DatasetSP.save for TESTE_PRECO
            const payload = {
                "serviceName": "DatasetSP.save",
                "requestBody": {
                    "entityName": "TESTE_PRECO",
                    "standAlone": false,
                    "fields": [
                        "CODTAB",
                        "CODPROD",
                        "NOVO_PRECO",
                        "DTVIGOR"
                    ],
                    "records": [
                        {
                            "values": {
                                "1": codtab,
                                "2": codprod,
                                "3": novo_preco,
                                "4": dtvigor
                            }
                        }
                    ]
                }
            };

            try {
                const response = await fetch(`${API_BASE_URL}/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}` // Use the obtained bearer token
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Save data failed: ${response.status} ${response.statusText} - ${errorText}`);
                }

                const data = await response.json();
                // Check Sankhya specific success/error structure
                if (data && data.status === 1) { // Assuming status 1 indicates success
                    displayMessage(savePriceMessage, 'TESTE_PRECO data saved successfully!', 'success');
                    console.log('Save successful:', data);
                } else {
                    // Sankhya API might return 200 OK but with an error in the body
                    throw new Error(`Sankhya API reported an error: ${data.statusMessage || JSON.stringify(data)}`);
                }

            } catch (error) {
                console.error('Save data error:', error);
                displayMessage(savePriceMessage, `Failed to save data: ${error.message}`, 'error');
            }
        }

        // Add event listeners to buttons
        loginButton.addEventListener('click', login);
        savePriceButton.addEventListener('click', savePriceData);

        // Initially disable the save button until login is successful
        savePriceButton.disabled = true;

        // Set current date for DTVIGOR as a default
        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(today.getDate()).padStart(2, '0');
            document.getElementById('dtvigor').value = `${year}-${month}-${day}`;
        });
    </script>
</body>
</html>