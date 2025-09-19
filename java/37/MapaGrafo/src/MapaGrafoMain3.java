import java.util.*;

/**
 * Classe principal que demonstra o grafo do mapa brasileiro através de uma tabela de adjacência
 * Mostra uma matriz onde 1 indica conexão direta entre capitais e 0 indica ausência de conexão
 */
public class MapaGrafoMain3 {
    
    public static void main(String[] args) {
        System.out.println("=== TABELA DE ADJACÊNCIA DO MAPA BRASILEIRO ===\n");
        
        // Inicializar o grafo
        GrafoMapa mapa = inicializarGrafo();
        
        // Gerar e exibir a tabela de adjacência
        exibirTabelaAdjacencia(mapa);
        
        // Mostrar estatísticas da matriz
        mostrarEstatisticasMatriz(mapa);
        
        // Demonstrar funcionalidades específicas da matriz
        demonstrarFuncionalidadesMatriz(mapa);
    }
    
    /**
     * Inicializa o grafo com todas as capitais e rodovias
     * @return GrafoMapa inicializado
     */
    private static GrafoMapa inicializarGrafo() {
        System.out.println("Inicializando grafo do mapa brasileiro...");
        
        GrafoMapa mapa = new GrafoMapa();
        
        // Adicionar todas as capitais brasileiras
        adicionarCapitais(mapa);
        
        // Adicionar todas as rodovias
        adicionarRodovias(mapa);
        
        System.out.println("✓ Grafo inicializado com " + mapa.getCidades().size() + " cidades e " + 
                          mapa.getRodovias().size() + " rodovias\n");
        
        return mapa;
    }
    
    /**
     * Adiciona todas as capitais brasileiras ao grafo
     * @param mapa Grafo onde as cidades serão adicionadas
     */
    private static void adicionarCapitais(GrafoMapa mapa) {
        // Centro-Oeste
        mapa.adicionarCidade(new Cidade("Brasília", "DF", "Centro-Oeste"));
        mapa.adicionarCidade(new Cidade("Goiânia", "GO", "Centro-Oeste"));
        mapa.adicionarCidade(new Cidade("Cuiabá", "MT", "Centro-Oeste"));
        mapa.adicionarCidade(new Cidade("Campo Grande", "MS", "Centro-Oeste"));
        
        // Sudeste
        mapa.adicionarCidade(new Cidade("Belo Horizonte", "MG", "Sudeste"));
        mapa.adicionarCidade(new Cidade("São Paulo", "SP", "Sudeste"));
        mapa.adicionarCidade(new Cidade("Rio de Janeiro", "RJ", "Sudeste"));
        mapa.adicionarCidade(new Cidade("Vitória", "ES", "Sudeste"));
        
        // Sul
        mapa.adicionarCidade(new Cidade("Curitiba", "PR", "Sul"));
        mapa.adicionarCidade(new Cidade("Florianópolis", "SC", "Sul"));
        mapa.adicionarCidade(new Cidade("Porto Alegre", "RS", "Sul"));
        
        // Nordeste
        mapa.adicionarCidade(new Cidade("Salvador", "BA", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Aracaju", "SE", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Maceió", "AL", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Recife", "PE", "Nordeste"));
        mapa.adicionarCidade(new Cidade("João Pessoa", "PB", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Natal", "RN", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Fortaleza", "CE", "Nordeste"));
        mapa.adicionarCidade(new Cidade("Teresina", "PI", "Nordeste"));
        mapa.adicionarCidade(new Cidade("São Luís", "MA", "Nordeste"));
        
        // Norte
        mapa.adicionarCidade(new Cidade("Belém", "PA", "Norte"));
        mapa.adicionarCidade(new Cidade("Palmas", "TO", "Norte"));
        mapa.adicionarCidade(new Cidade("Rio Branco", "AC", "Norte"));
        mapa.adicionarCidade(new Cidade("Porto Velho", "RO", "Norte"));
        mapa.adicionarCidade(new Cidade("Manaus", "AM", "Norte"));
        mapa.adicionarCidade(new Cidade("Boa Vista", "RR", "Norte"));
        mapa.adicionarCidade(new Cidade("Macapá", "AP", "Norte"));
    }
    
    /**
     * Adiciona todas as rodovias principais ao grafo
     * @param mapa Grafo onde as rodovias serão adicionadas
     */
    private static void adicionarRodovias(GrafoMapa mapa) {
        // Rodovias radiais de Brasília
        mapa.adicionarRodovia(new Rodovia("BR-010", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Belém"), "Radial Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-020", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Fortaleza"), "Radial Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-040", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Rio de Janeiro"), "Radial Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-050", mapa.buscarCidade("Brasília"), mapa.buscarCidade("São Paulo"), "Radial Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-060", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Campo Grande"), "Radial Centro-Oeste"));
        mapa.adicionarRodovia(new Rodovia("BR-070", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Cuiabá"), "Radial Centro-Oeste"));
        
        // Conexões regionais
        mapa.adicionarRodovia(new Rodovia("BR-060", mapa.buscarCidade("Goiânia"), mapa.buscarCidade("Brasília"), "Conexão Centro-Oeste"));
        mapa.adicionarRodovia(new Rodovia("BR-364", mapa.buscarCidade("Cuiabá"), mapa.buscarCidade("Porto Velho"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-364", mapa.buscarCidade("Porto Velho"), mapa.buscarCidade("Rio Branco"), "Conexão Norte"));
        
        // Sudeste
        mapa.adicionarRodovia(new Rodovia("BR-040", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("Brasília"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-381", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("São Paulo"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-262", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("Vitória"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("São Paulo"), mapa.buscarCidade("Rio de Janeiro"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Vitória"), mapa.buscarCidade("Rio de Janeiro"), "Conexão Sudeste"));
        
        // Sul
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("São Paulo"), mapa.buscarCidade("Curitiba"), "Conexão Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-376", mapa.buscarCidade("Curitiba"), mapa.buscarCidade("Florianópolis"), "Conexão Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Florianópolis"), mapa.buscarCidade("Porto Alegre"), "Conexão Sul"));
        
        // Nordeste - Rodovia BR-101 (litoral)
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Natal"), mapa.buscarCidade("João Pessoa"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("João Pessoa"), mapa.buscarCidade("Recife"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Recife"), mapa.buscarCidade("Maceió"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Maceió"), mapa.buscarCidade("Aracaju"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Aracaju"), mapa.buscarCidade("Salvador"), "Litoral Nordeste"));
        
        // Nordeste - Conexões internas
        mapa.adicionarRodovia(new Rodovia("BR-242", mapa.buscarCidade("Salvador"), mapa.buscarCidade("Brasília"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("Salvador"), mapa.buscarCidade("Fortaleza"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-222", mapa.buscarCidade("Fortaleza"), mapa.buscarCidade("Teresina"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-316", mapa.buscarCidade("Teresina"), mapa.buscarCidade("São Luís"), "Conexão Nordeste"));
        
        // Norte
        mapa.adicionarRodovia(new Rodovia("BR-153", mapa.buscarCidade("Palmas"), mapa.buscarCidade("Brasília"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-153", mapa.buscarCidade("Belém"), mapa.buscarCidade("Palmas"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-319", mapa.buscarCidade("Manaus"), mapa.buscarCidade("Porto Velho"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-174", mapa.buscarCidade("Boa Vista"), mapa.buscarCidade("Manaus"), "Conexão Norte"));
    }
    
    /**
     * Exibe a tabela de adjacência do grafo
     * @param mapa Grafo para gerar a tabela
     */
    private static void exibirTabelaAdjacencia(GrafoMapa mapa) {
        List<Cidade> cidades = mapa.getCidades();
        int n = cidades.size();
        
        // Ordenar cidades para exibição consistente
        cidades.sort(Comparator.comparing(Cidade::getNome));
        
        System.out.println("=== TABELA DE ADJACÊNCIA ===");
        System.out.println("Legenda: 1 = Conexão direta | 0 = Sem conexão direta\n");
        
        // Cabeçalho da tabela
        System.out.printf("%-15s", "");
        for (Cidade cidade : cidades) {
            System.out.printf("%-4s", cidade.getEstado());
        }
        System.out.println();
        
        // Linha separadora
        System.out.printf("%-15s", "");
        for (int i = 0; i < n; i++) {
            System.out.print("----");
        }
        System.out.println();
        
        // Matriz de adjacência
        for (int i = 0; i < n; i++) {
            Cidade cidadeOrigem = cidades.get(i);
            System.out.printf("%-15s", cidadeOrigem.getEstado());
            
            for (int j = 0; j < n; j++) {
                Cidade cidadeDestino = cidades.get(j);
                
                if (i == j) {
                    System.out.printf("%-4s", "-"); // Diagonal principal
                } else {
                    int adjacencia = mapa.temConexaoDireta(cidadeOrigem, cidadeDestino) ? 1 : 0;
                    System.out.printf("%-4d", adjacencia);
                }
            }
            System.out.println();
        }
        System.out.println();
    }
    
    /**
     * Mostra estatísticas da matriz de adjacência
     * @param mapa Grafo para análise
     */
    private static void mostrarEstatisticasMatriz(GrafoMapa mapa) {
        List<Cidade> cidades = mapa.getCidades();
        int n = cidades.size();
        int totalConexoes = 0;
        int conexoesSimetricas = 0;
        
        // Contar conexões
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                Cidade cidade1 = cidades.get(i);
                Cidade cidade2 = cidades.get(j);
                
                if (mapa.temConexaoDireta(cidade1, cidade2)) {
                    totalConexoes++;
                    conexoesSimetricas++;
                }
            }
        }
        
        System.out.println("=== ESTATÍSTICAS DA MATRIZ DE ADJACÊNCIA ===");
        System.out.println("Total de cidades: " + n);
        System.out.println("Total de conexões diretas: " + totalConexoes);
        System.out.println("Densidade do grafo: " + String.format("%.2f%%", 
                          (double) totalConexoes / (n * (n - 1) / 2) * 100));
        System.out.println("Média de conexões por cidade: " + String.format("%.2f", 
                          (double) totalConexoes * 2 / n));
        System.out.println();
    }
    
    /**
     * Demonstra funcionalidades específicas da matriz de adjacência
     * @param mapa Grafo para demonstração
     */
    private static void demonstrarFuncionalidadesMatriz(GrafoMapa mapa) {
        System.out.println("=== ANÁLISE DA MATRIZ DE ADJACÊNCIA ===");
        
        List<Cidade> cidades = mapa.getCidades();
        cidades.sort(Comparator.comparing(Cidade::getNome));
        
        // Encontrar cidade com mais conexões
        Cidade cidadeMaisConectada = null;
        int maxConexoes = 0;
        
        for (Cidade cidade : cidades) {
            int conexoes = mapa.getCidadesConectadas(cidade).size();
            if (conexoes > maxConexoes) {
                maxConexoes = conexoes;
                cidadeMaisConectada = cidade;
            }
        }
        
        System.out.println("Cidade com mais conexões diretas: " + cidadeMaisConectada + 
                          " (" + maxConexoes + " conexões)");
        
        // Encontrar cidades isoladas (sem conexões)
        System.out.println("\nCidades com conexões diretas:");
        for (Cidade cidade : cidades) {
            int conexoes = mapa.getCidadesConectadas(cidade).size();
            System.out.println("  " + cidade + ": " + conexoes + " conexões");
        }
        
        // Mostrar exemplos de conexões específicas
        System.out.println("\n=== EXEMPLOS DE CONEXÕES ===");
        Cidade brasilia = mapa.buscarCidade("Brasília");
        Cidade saoPaulo = mapa.buscarCidade("São Paulo");
        Cidade fortaleza = mapa.buscarCidade("Fortaleza");
        
        System.out.println("Brasília ↔ São Paulo: " + 
                          (mapa.temConexaoDireta(brasilia, saoPaulo) ? "SIM (1)" : "NÃO (0)"));
        System.out.println("São Paulo ↔ Fortaleza: " + 
                          (mapa.temConexaoDireta(saoPaulo, fortaleza) ? "SIM (1)" : "NÃO (0)"));
        System.out.println("Brasília ↔ Fortaleza: " + 
                          (mapa.temConexaoDireta(brasilia, fortaleza) ? "SIM (1)" : "NÃO (0)"));
        
        // Mostrar matriz por região
        System.out.println("\n=== MATRIZ AGRUPADA POR REGIÃO ===");
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        
        for (String regiao : regioes) {
            System.out.println("\n" + regiao + ":");
            List<Cidade> cidadesRegiao = cidades.stream()
                .filter(c -> c.getRegiao().equals(regiao))
                .toList();
            
            if (!cidadesRegiao.isEmpty()) {
                System.out.printf("%-15s", "");
                for (Cidade cidade : cidadesRegiao) {
                    System.out.printf("%-4s", cidade.getEstado());
                }
                System.out.println();
                
                for (Cidade origem : cidadesRegiao) {
                    System.out.printf("%-15s", origem.getEstado());
                    for (Cidade destino : cidadesRegiao) {
                        if (origem.equals(destino)) {
                            System.out.printf("%-4s", "-");
                        } else {
                            int adjacencia = mapa.temConexaoDireta(origem, destino) ? 1 : 0;
                            System.out.printf("%-4d", adjacencia);
                        }
                    }
                    System.out.println();
                }
            }
        }
    }
}
