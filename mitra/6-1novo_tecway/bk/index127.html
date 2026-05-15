<!DOCTYPE html>
<html lang="pt-BR">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Balanço Patrimonial</title>
    <script src="https://cdn.tailwindcss.com/3.4.1"></script>
    <style>
        :root {
            --background: 0 0% 100%;
            --foreground: 222.2 84% 4.9%;
            --primary: 222.2 47.4% 11.2%;
            --primary-foreground: 210 40% 98%;
            --secondary: 210 40% 96.1%;
            --secondary-foreground: 222.2 84% 4.9%;
            --muted: 210 40% 96.1%;
            --muted-foreground: 215.4 16.3% 46.9%;
            --accent: 210 40% 96.1%;
            --accent-foreground: 222.2 84% 4.9%;
            --destructive: 0 84.2% 60.2%;
            --destructive-foreground: 210 40% 98%;
            --border: 214.3 31.8% 91.4%;
            --input: 214.3 31.8% 91.4%;
            --ring: 222.2 84% 4.9%;
            --radius: 0.5rem;
        }

        .dark {
            --background: 222.2 84% 4.9%;
            --foreground: 210 40% 98%;
            --primary: 210 40% 98%;
            --primary-foreground: 222.2 47.4% 11.2%;
            --secondary: 217.2 32.6% 17.5%;
            --secondary-foreground: 210 40% 98%;
            --muted: 217.2 32.6% 17.5%;
            --muted-foreground: 215 20.2% 65.1%;
            --accent: 217.2 32.6% 17.5%;
            --accent-foreground: 210 40% 98%;
            --destructive: 0 62.8% 30.6%;
            --destructive-foreground: 210 40% 98%;
            --border: 217.2 32.6% 17.5%;
            --input: 217.2 32.6% 17.5%;
            --ring: 212.7 26.8% 83.9%;
        }

        html, body {
            height: 100%;
            width: 100%;
            margin: 0;
            padding: 0;
        }
        
        body {
            background-color: hsl(var(--background));
            color: hsl(var(--foreground));
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }
    </style>
</head>

<body class="p-4 sm:p-6 lg:p-8">
    <div id="report-container" class="w-full h-full">
        <div id="loading-state" class="flex items-center justify-center h-full">
            <p class="text-lg text-muted-foreground">Carregando dados do balanço...</p>
        </div>
        <div id="report-content" class="hidden">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                <!-- Coluna da Esquerda: Ativo -->
                <div id="ativo-container" class="space-y-8"></div>

                <!-- Coluna da Direita: Passivo e PL -->
                <div id="passivo-pl-container" class="space-y-8"></div>
            </div>

            <!-- Seção de Totais -->
            <div id="totais-container" class="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
            </div>
        </div>
    </div>

    <script>
        const MITRA_UPDATE_EVENT_NAME = 'mitra-update-balanco-patrimonial';
        
        function updateMitra() {
            console.log("Sinal de update para [Balanço Patrimonial] recebido. Disparando evento.");
            document.body.dispatchEvent(new CustomEvent(MITRA_UPDATE_EVENT_NAME));
        }

        function formatCurrency(value) {
            const num = parseFloat(value);
            if (isNaN(num)) {
                return '0,00';
            }
            const formatted = new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Math.abs(num));

            return num < 0 ? `(${formatted})` : formatted;
        }
        
        function applyIndent(descricao, recuo) {
            // Converte recuo para número, tratando strings, null, undefined, etc.
            const recuoValue = recuo !== null && recuo !== undefined && recuo !== '' 
                ? parseInt(recuo, 10) 
                : 0;
            
            if (isNaN(recuoValue) || recuoValue <= 0) {
                return descricao;
            }
            
            // Aplica o recuo usando espaços não colapsáveis (&nbsp;) - cada unidade = 1 caractere
            const espacos = '&nbsp;'.repeat(recuoValue);
            return espacos + descricao;
        }
        
        function generateTableHtml(title, items, subtotal, currentYear, previousYear, additionalTotal = null) {
            let itemsHtml = items.map(item => {
                const descricaoComRecuo = applyIndent(item.descricao, item.recuo);
                return `
                <tr class="border-b border-border">
                    <td class="py-2 px-4 text-sm text-muted-foreground">${descricaoComRecuo}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(item.valorAtual)}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(item.valorAnterior)}</td>
                </tr>
            `;
            }).join('');

            let subtotalHtml = `
                <tr class="font-bold bg-secondary">
                    <td class="py-2 px-4 text-sm">${subtotal.descricao}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(subtotal.valorAtual)}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(subtotal.valorAnterior)}</td>
                </tr>
            `;

            let additionalTotalHtml = '';
            if (additionalTotal) {
                additionalTotalHtml = `
                <tr class="font-bold bg-secondary">
                    <td class="py-2 px-4 text-sm">${additionalTotal.descricao}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(additionalTotal.valorAtual)}</td>
                    <td class="py-2 px-4 text-sm text-right tabular-nums">${formatCurrency(additionalTotal.valorAnterior)}</td>
                </tr>
            `;
            }

            return `
                <div class="w-full">
                    <table class="w-full border-collapse">
                        <thead>
                            <tr class="border-b-2 border-foreground">
                                <th class="py-2 px-4 text-left text-base font-bold">${title}</th>
                                <th class="py-2 px-4 text-right text-sm font-semibold w-32">${currentYear}</th>
                                <th class="py-2 px-4 text-right text-sm font-semibold w-32">${previousYear}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                            ${subtotalHtml}
                            ${additionalTotalHtml}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        function generateTotalTableHtml(title, total, currentYear, previousYear) {
             return `
                <div class="w-full">
                    <table class="w-full border-collapse">
                        <tbody>
                             <tr class="font-bold border-y-2 border-double border-foreground bg-secondary">
                                <td class="py-3 px-4 text-base">${title}</td>
                                <td class="py-3 px-4 text-base text-right tabular-nums w-32">${formatCurrency(total.valorAtual)}</td>
                                <td class="py-3 px-4 text-base text-right tabular-nums w-32">${formatCurrency(total.valorAnterior)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        }

        function renderReport(data, currentYear, previousYear) {
            // Calcula o 3.1.2 como soma de 3.1.3 + 3.1.4 + 3.1.5
            const item312 = data.find(d => d.hierarquia === '3.1.2');
            const item313 = data.find(d => d.hierarquia === '3.1.3');
            const item314 = data.find(d => d.hierarquia === '3.1.4');
            const item315 = data.find(d => d.hierarquia === '3.1.5');
            
            if (item312 && (item313 || item314 || item315)) {
                // Calcula a soma dos valores atuais
                const somaValorAtual = (item313 ? (item313.valorAtual || 0) : 0) +
                                      (item314 ? (item314.valorAtual || 0) : 0) +
                                      (item315 ? (item315.valorAtual || 0) : 0);
                
                // Calcula a soma dos valores anteriores
                const somaValorAnterior = (item313 ? (item313.valorAnterior || 0) : 0) +
                                         (item314 ? (item314.valorAnterior || 0) : 0) +
                                         (item315 ? (item315.valorAnterior || 0) : 0);
                
                // Atualiza o item 3.1.2 com os valores calculados
                item312.valorAtual = somaValorAtual;
                item312.valorAnterior = somaValorAnterior;
            }

            // 1. ATIVO
            // Exibe todos os itens que começam com '1.1.' (mantém todas as hierarquias)
            const ativoCirculanteItems = data.filter(d => d.hierarquia.startsWith('1.1.'));
            
            // Define as hierarquias específicas que devem ser somadas no cálculo do Ativo Circulante
            const hierarquiasAtivoCirculante = ['1.1.1', '1.1.2', '1.1.11', '1.1.12'];
            
            // Calcula o subtotal considerando apenas as hierarquias especificadas
            const subtotalAtivoCirculante = ativoCirculanteItems
                .filter(item => hierarquiasAtivoCirculante.includes(item.hierarquia))
                .reduce((acc, item) => {
                    acc.valorAtual += item.valorAtual;
                    acc.valorAnterior += item.valorAnterior;
                    return acc;
                }, { descricao: 'Total do ativo circulante', valorAtual: 0, valorAnterior: 0 });

            // Exibe todos os itens que começam com '1.2.' (mantém todas as hierarquias)
            const ativoNaoCirculanteItems = data.filter(d => d.hierarquia.startsWith('1.2.'));
            
            // Define as hierarquias específicas que devem ser somadas no cálculo do Ativo Não Circulante
            const hierarquiasAtivoNaoCirculante = ['1.2.1', '1.2.2', '1.2.5', '1.2.8'];
            
            // Calcula o subtotal considerando apenas as hierarquias especificadas
            const subtotalAtivoNaoCirculante = ativoNaoCirculanteItems
                .filter(item => hierarquiasAtivoNaoCirculante.includes(item.hierarquia))
                .reduce((acc, item) => {
                    acc.valorAtual += item.valorAtual;
                    acc.valorAnterior += item.valorAnterior;
                    return acc;
                }, { descricao: 'Total do ativo não circulante', valorAtual: 0, valorAnterior: 0 });
            
            // Total do ativo usa os subtotais corrigidos do Ativo Circulante e Ativo Não Circulante
            const totalAtivo = {
                valorAtual: subtotalAtivoCirculante.valorAtual + subtotalAtivoNaoCirculante.valorAtual,
                valorAnterior: subtotalAtivoCirculante.valorAnterior + subtotalAtivoNaoCirculante.valorAnterior
            };

            const htmlAtivoCirculante = generateTableHtml('Ativo Circulante', ativoCirculanteItems, subtotalAtivoCirculante, currentYear, previousYear);
            const htmlAtivoNaoCirculante = generateTableHtml('Ativo Não Circulante', ativoNaoCirculanteItems, subtotalAtivoNaoCirculante, currentYear, previousYear);

            document.getElementById('ativo-container').innerHTML = htmlAtivoCirculante + htmlAtivoNaoCirculante;

            // 2. PASSIVO E PL
            // Exibe todos os itens que começam com '2.1.' (mantém todas as hierarquias)
            const passivoCirculanteItems = data.filter(d => d.hierarquia.startsWith('2.1.'));
            
            // Define as hierarquias específicas que devem ser somadas no cálculo do Passivo Circulante
            const hierarquiasPassivoCirculante = ['2.1.1', '2.1.2', '2.1.3', '2.1.4', '2.1.11', '2.1.12', '2.1.13'];
            
            // Calcula o subtotal considerando apenas as hierarquias especificadas
            const subtotalPassivoCirculante = passivoCirculanteItems
                .filter(item => hierarquiasPassivoCirculante.includes(item.hierarquia))
                .reduce((acc, item) => {
                    acc.valorAtual += item.valorAtual;
                    acc.valorAnterior += item.valorAnterior;
                    return acc;
                }, { descricao: 'Total do passivo circulante', valorAtual: 0, valorAnterior: 0 });

            // Exibe todos os itens que começam com '2.2.' (mantém todas as hierarquias)
            const passivoNaoCirculanteItems = data.filter(d => d.hierarquia.startsWith('2.2.'));
            
            // Define as hierarquias específicas que devem ser somadas no cálculo do Passivo Não Circulante
            const hierarquiasPassivoNaoCirculante = ['2.2.1', '2.2.8', '2.2.9', '2.2.10'];
            
            // Calcula o subtotal considerando apenas as hierarquias especificadas
            const subtotalPassivoNaoCirculante = passivoNaoCirculanteItems
                .filter(item => hierarquiasPassivoNaoCirculante.includes(item.hierarquia))
                .reduce((acc, item) => {
                    acc.valorAtual += item.valorAtual;
                    acc.valorAnterior += item.valorAnterior;
                    return acc;
                }, { descricao: 'Total do passivo não circulante', valorAtual: 0, valorAnterior: 0 });

            // Calcula o Total do Passivo = Total do passivo circulante + Total do passivo não circulante
            const totalPassivo = {
                descricao: 'Total do Passivo',
                valorAtual: subtotalPassivoCirculante.valorAtual + subtotalPassivoNaoCirculante.valorAtual,
                valorAnterior: subtotalPassivoCirculante.valorAnterior + subtotalPassivoNaoCirculante.valorAnterior
            };

            // Exibe todos os itens que começam com '3.1.' (mantém todas as hierarquias)
            const plItems = data.filter(d => d.hierarquia.startsWith('3.1.'));
            
            // Define as hierarquias específicas que devem ser somadas no cálculo do Patrimônio Líquido
            const hierarquiasPL = ['3.1.1', '3.1.2'];
            
            // Calcula o subtotal considerando apenas as hierarquias especificadas
            // Nota: O 3.1.2 já foi calculado como soma de 3.1.3 + 3.1.4 + 3.1.5 acima
            const subtotalPL = plItems
                .filter(item => hierarquiasPL.includes(item.hierarquia))
                .reduce((acc, item) => {
                    acc.valorAtual += item.valorAtual;
                    acc.valorAnterior += item.valorAnterior;
                    return acc;
                }, { descricao: 'Total do patrimônio líquido', valorAtual: 0, valorAnterior: 0 });

            // Total do passivo e patrimônio líquido usa os subtotais corrigidos do Passivo Circulante, Passivo Não Circulante e Patrimônio Líquido
            const totalPassivoPL = {
                valorAtual: subtotalPassivoCirculante.valorAtual + subtotalPassivoNaoCirculante.valorAtual + subtotalPL.valorAtual,
                valorAnterior: subtotalPassivoCirculante.valorAnterior + subtotalPassivoNaoCirculante.valorAnterior + subtotalPL.valorAnterior
            };
            
            const htmlPassivoCirculante = generateTableHtml('Passivo Circulante', passivoCirculanteItems, subtotalPassivoCirculante, currentYear, previousYear);
            const htmlPassivoNaoCirculante = generateTableHtml('Passivo Não Circulante', passivoNaoCirculanteItems, subtotalPassivoNaoCirculante, currentYear, previousYear, totalPassivo);
            const htmlPL = generateTableHtml('Patrimônio Líquido', plItems, subtotalPL, currentYear, previousYear);

            document.getElementById('passivo-pl-container').innerHTML = htmlPassivoCirculante + htmlPassivoNaoCirculante + htmlPL;

            // 3. TOTAIS
            const htmlTotalAtivo = generateTotalTableHtml('Total do ativo', totalAtivo, currentYear, previousYear);
            const htmlTotalPassivoPL = generateTotalTableHtml('Total do passivo e patrimônio líquido', totalPassivoPL, currentYear, previousYear);

            document.getElementById('totais-container').innerHTML = htmlTotalAtivo + htmlTotalPassivoPL;
            
            document.getElementById('loading-state').classList.add('hidden');
            document.getElementById('report-content').classList.remove('hidden');
        }
        
        async function fetchAndRenderData() {
            const container = document.getElementById('report-container');
            const contentEl = document.getElementById('report-content');
            const loadingEl = document.getElementById('loading-state');

            contentEl.classList.add('hidden');
            loadingEl.classList.remove('hidden');
            loadingEl.innerHTML = `<p class="text-lg text-muted-foreground">Carregando dados do balanço...</p>`;
            
            try {
                // As variáveis :VAR_MES e :VAR_EMPRESA são resolvidas no backend pelo Mitra
                const [reportResult, mesResult] = await Promise.all([
                    queryMitra({ query: componentData.queryDados }),
                    queryMitra({ query: `SELECT ${componentData.varMes}` })
                ]);
                
                if (!reportResult || !reportResult.data) {
                    throw new Error("A consulta principal não retornou dados válidos.");
                }
                if (!mesResult || !mesResult.data || !mesResult.data[0]) {
                    throw new Error("Não foi possível obter o mês de referência da plataforma.");
                }

                const mesReferencia = mesResult.data[0][0];
                const currentYear = mesReferencia && mesReferencia.includes('/') ? mesReferencia.split('/')[1] : new Date().getFullYear();
                const previousYear = parseInt(currentYear, 10) - 1;

                const headers = reportResult.headers.map(h => (h && h.name ? h.name.toUpperCase() : ''));
                const colMap = {
                    hierarquia: headers.indexOf('HIERARQUIA'),
                    descricao: headers.indexOf('DESCRICAO'),
                    nota: headers.indexOf('NOTA'),
                    recuo: headers.indexOf('RECUO'),
                    valorAtual: headers.indexOf('VALOR_ATUAL'),
                    valorAnterior: headers.indexOf('VALOR_ANTERIOR')
                };

                if (colMap.hierarquia === -1 || colMap.descricao === -1 || colMap.valorAtual === -1 || colMap.valorAnterior === -1) {
                    console.error('Erro de mapeamento de colunas. A query deve retornar: HIERARQUIA, DESCRICAO, VALOR_ATUAL, VALOR_ANTERIOR. NOTA e RECUO são opcionais.', headers);
                    throw new Error("A query configurada não retorna as colunas esperadas.");
                }
                
                const processedData = reportResult.data.map(row => {
                    const recuoValue = colMap.recuo !== -1 && row[colMap.recuo] !== null && row[colMap.recuo] !== undefined && row[colMap.recuo] !== ''
                        ? parseInt(row[colMap.recuo], 10)
                        : 0;
                    return {
                        hierarquia: row[colMap.hierarquia] || '',
                        descricao: row[colMap.descricao] || 'N/A',
                        nota: colMap.nota !== -1 ? (row[colMap.nota] || '') : '',
                        recuo: isNaN(recuoValue) ? 0 : recuoValue,
                        valorAtual: parseFloat(row[colMap.valorAtual]) || 0,
                        valorAnterior: parseFloat(row[colMap.valorAnterior]) || 0
                    };
                });

                renderReport(processedData, currentYear, previousYear);

            } catch (error) {
                console.error("Falha ao carregar dados do balanço:", error);
                loadingEl.innerHTML = `<div class="p-8 text-center text-destructive-foreground bg-destructive h-full flex items-center justify-center rounded-lg">Erro Crítico: ${error.message}</div>`;
            }
        }

        function initializeComponent() {
            fetchAndRenderData();
        }

        document.addEventListener('DOMContentLoaded', () => {
            document.body.addEventListener(MITRA_UPDATE_EVENT_NAME, fetchAndRenderData);
            
            const waitForMitraAndInit = () => {
                const maxWaitTime = 5000;
                const intervalTime = 100;
                const startTime = Date.now();

                const checkInterval = setInterval(() => {
                    if (window.componentData && window.componentData.queryDados && window.componentData.varMes && window.componentData.varEmpresa) {
                        clearInterval(checkInterval);
                        initializeComponent();
                    } else if (Date.now() - startTime > maxWaitTime) {
                        clearInterval(checkInterval);
                        console.error("Erro: As configurações do componente (componentData) não foram carregadas a tempo.");
                        document.getElementById('report-container').innerHTML = `<div class="p-8 text-center text-red-700 bg-red-50 h-full flex items-center justify-center">Erro Crítico: As configurações do componente (queryDados, varMes, varEmpresa) não foram carregadas da plataforma.</div>`;
                    }
                }, intervalTime);
            };

            waitForMitraAndInit();
        });
    </script>
</body>

</html>
