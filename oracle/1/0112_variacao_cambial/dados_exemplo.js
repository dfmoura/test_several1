// Dados de exemplo dos produtos importados
// Este arquivo pode ser facilmente modificado para adicionar ou alterar produtos

const produtosExemplo = [
    {
        id: 1,
        nome: "Matéria Prima A",
        dataCompra: "2024-12-01",
        valorUSD: 50000,
        dataPagamento: "2024-12-15",
        fornecedor: "Supplier Corp",
        categoria: "Químicos",
        descricao: "Matéria prima essencial para produção de produtos químicos"
    },
    {
        id: 2,
        nome: "Componente B",
        dataCompra: "2024-12-05",
        valorUSD: 75000,
        dataPagamento: "2024-12-20",
        fornecedor: "Tech Imports",
        categoria: "Eletrônicos",
        descricao: "Componente eletrônico de alta precisão"
    },
    {
        id: 3,
        nome: "Insumo C",
        dataCompra: "2024-12-10",
        valorUSD: 30000,
        dataPagamento: "2024-12-25",
        fornecedor: "Global Materials",
        categoria: "Metais",
        descricao: "Insumo metálico para fabricação industrial"
    },
    {
        id: 4,
        nome: "Produto D",
        dataCompra: "2024-11-15",
        valorUSD: 120000,
        dataPagamento: "2024-12-30",
        fornecedor: "Premium Suppliers",
        categoria: "Máquinas",
        descricao: "Equipamento industrial de alta tecnologia"
    },
    {
        id: 5,
        nome: "Material E",
        dataCompra: "2024-11-20",
        valorUSD: 45000,
        dataPagamento: "2025-01-15",
        fornecedor: "Quality Imports",
        categoria: "Plásticos",
        descricao: "Material plástico de engenharia"
    },
    {
        id: 6,
        nome: "Produto F",
        dataCompra: "2024-11-25",
        valorUSD: 85000,
        dataPagamento: "2025-01-20",
        fornecedor: "Advanced Solutions",
        categoria: "Tecnologia",
        descricao: "Sistema tecnológico avançado"
    },
    {
        id: 7,
        nome: "Insumo G",
        dataCompra: "2024-11-30",
        valorUSD: 25000,
        dataPagamento: "2025-01-25",
        fornecedor: "Chemical World",
        categoria: "Químicos",
        descricao: "Insumo químico especializado"
    },
    {
        id: 8,
        nome: "Componente H",
        dataCompra: "2024-12-08",
        valorUSD: 60000,
        dataPagamento: "2025-01-30",
        fornecedor: "Precision Parts",
        categoria: "Mecânica",
        descricao: "Componente mecânico de precisão"
    }
];

// Função para adicionar novo produto
function adicionarProduto(novoProduto) {
    const id = Math.max(...produtosExemplo.map(p => p.id)) + 1;
    const produtoComId = { ...novoProduto, id };
    produtosExemplo.push(produtoComId);
    return produtoComId;
}

// Função para remover produto por ID
function removerProduto(id) {
    const index = produtosExemplo.findIndex(p => p.id === id);
    if (index !== -1) {
        produtosExemplo.splice(index, 1);
        return true;
    }
    return false;
}

// Função para atualizar produto
function atualizarProduto(id, dadosAtualizados) {
    const index = produtosExemplo.findIndex(p => p.id === id);
    if (index !== -1) {
        produtosExemplo[index] = { ...produtosExemplo[index], ...dadosAtualizados };
        return produtosExemplo[index];
    }
    return null;
}

// Função para buscar produto por ID
function buscarProdutoPorId(id) {
    return produtosExemplo.find(p => p.id === id);
}

// Função para filtrar produtos por categoria
function filtrarPorCategoria(categoria) {
    return produtosExemplo.filter(p => p.categoria === categoria);
}

// Função para filtrar produtos por fornecedor
function filtrarPorFornecedor(fornecedor) {
    return produtosExemplo.filter(p => p.fornecedor === fornecedor);
}

// Função para calcular valor total em USD
function calcularValorTotalUSD() {
    return produtosExemplo.reduce((total, produto) => total + produto.valorUSD, 0);
}

// Função para obter produtos com pagamento pendente
function obterProdutosPendentes() {
    const hoje = new Date();
    return produtosExemplo.filter(produto => {
        const dataPagamento = new Date(produto.dataPagamento);
        return dataPagamento > hoje;
    });
}

// Função para obter produtos já pagos
function obterProdutosPagos() {
    const hoje = new Date();
    return produtosExemplo.filter(produto => {
        const dataPagamento = new Date(produto.dataPagamento);
        return dataPagamento <= hoje;
    });
}

// Exportar para uso em outros arquivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        produtosExemplo,
        adicionarProduto,
        removerProduto,
        atualizarProduto,
        buscarProdutoPorId,
        filtrarPorCategoria,
        filtrarPorFornecedor,
        calcularValorTotalUSD,
        obterProdutosPendentes,
        obterProdutosPagos
    };
}
