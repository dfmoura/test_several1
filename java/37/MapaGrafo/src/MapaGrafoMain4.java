import java.util.*;

/**
 * Classe principal que demonstra o grafo do mapa brasileiro através de uma tabela de adjacência ponderada
 * Mostra uma matriz onde cada valor representa a distância em quilômetros entre capitais
 * 0 indica ausência de conexão direta
 */
public class MapaGrafoMain4 {
    
    public static void main(String[] args) {
        System.out.println("=== TABELA DE ADJACÊNCIA PONDERADA - DISTÂNCIAS EM KM ===\n");
        
        // Inicializar o grafo
        GrafoMapa mapa = inicializarGrafo();
        
        // Gerar e exibir a tabela de distâncias
        exibirTabelaDistancias(mapa);
        
        // Mostrar estatísticas das distâncias
        mostrarEstatisticasDistancias(mapa);
        
        // Demonstrar funcionalidades específicas das distâncias
        demonstrarFuncionalidadesDistancias(mapa);
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
     * Retorna a distância em quilômetros entre duas cidades
     * @param cidade1 Primeira cidade
     * @param cidade2 Segunda cidade
     * @return Distância em km ou 0 se não houver conexão direta
     */
    private static double getDistancia(Cidade cidade1, Cidade cidade2) {
        if (cidade1.equals(cidade2)) {
            return 0; // Mesma cidade
        }
        
        // Dados de distância reais entre capitais brasileiras (em km)
        Map<String, Map<String, Double>> distancias = getDistanciasReais();
        
        String nome1 = cidade1.getNome();
        String nome2 = cidade2.getNome();
        
        // Verificar se existe conexão direta
        if (distancias.containsKey(nome1) && distancias.get(nome1).containsKey(nome2)) {
            return distancias.get(nome1).get(nome2);
        }
        
        return 0; // Sem conexão direta
    }
    
    /**
     * Retorna um mapa com as distâncias reais entre capitais brasileiras
     * @return Mapa de distâncias
     */
    private static Map<String, Map<String, Double>> getDistanciasReais() {
        Map<String, Map<String, Double>> distancias = new HashMap<>();
        
        // Brasília (hub central)
        Map<String, Double> brasilia = new HashMap<>();
        brasilia.put("Belém", 2110.0);
        brasilia.put("Fortaleza", 2200.0);
        brasilia.put("Rio de Janeiro", 1140.0);
        brasilia.put("São Paulo", 1015.0);
        brasilia.put("Campo Grande", 1134.0);
        brasilia.put("Cuiabá", 1134.0);
        brasilia.put("Goiânia", 209.0);
        brasilia.put("Belo Horizonte", 740.0);
        brasilia.put("Salvador", 1090.0);
        brasilia.put("Palmas", 973.0);
        distancias.put("Brasília", brasilia);
        
        // Sudeste
        Map<String, Double> saoPaulo = new HashMap<>();
        saoPaulo.put("Rio de Janeiro", 429.0);
        saoPaulo.put("Belo Horizonte", 586.0);
        saoPaulo.put("Curitiba", 408.0);
        distancias.put("São Paulo", saoPaulo);
        
        Map<String, Double> rioJaneiro = new HashMap<>();
        rioJaneiro.put("Belo Horizonte", 434.0);
        rioJaneiro.put("Vitória", 521.0);
        distancias.put("Rio de Janeiro", rioJaneiro);
        
        Map<String, Double> beloHorizonte = new HashMap<>();
        beloHorizonte.put("Vitória", 524.0);
        distancias.put("Belo Horizonte", beloHorizonte);
        
        // Sul
        Map<String, Double> curitiba = new HashMap<>();
        curitiba.put("Florianópolis", 300.0);
        distancias.put("Curitiba", curitiba);
        
        Map<String, Double> florianopolis = new HashMap<>();
        florianopolis.put("Porto Alegre", 460.0);
        distancias.put("Florianópolis", florianopolis);
        
        // Nordeste - Litoral BR-101
        Map<String, Double> natal = new HashMap<>();
        natal.put("João Pessoa", 180.0);
        distancias.put("Natal", natal);
        
        Map<String, Double> joaoPessoa = new HashMap<>();
        joaoPessoa.put("Recife", 120.0);
        distancias.put("João Pessoa", joaoPessoa);
        
        Map<String, Double> recife = new HashMap<>();
        recife.put("Maceió", 285.0);
        distancias.put("Recife", recife);
        
        Map<String, Double> maceio = new HashMap<>();
        maceio.put("Aracaju", 294.0);
        distancias.put("Maceió", maceio);
        
        Map<String, Double> aracaju = new HashMap<>();
        aracaju.put("Salvador", 356.0);
        distancias.put("Aracaju", aracaju);
        
        // Nordeste - Conexões internas
        Map<String, Double> salvador = new HashMap<>();
        salvador.put("Fortaleza", 1089.0);
        distancias.put("Salvador", salvador);
        
        Map<String, Double> fortaleza = new HashMap<>();
        fortaleza.put("Teresina", 634.0);
        distancias.put("Fortaleza", fortaleza);
        
        Map<String, Double> teresina = new HashMap<>();
        teresina.put("São Luís", 446.0);
        distancias.put("Teresina", teresina);
        
        // Norte
        Map<String, Double> belem = new HashMap<>();
        belem.put("Palmas", 1137.0);
        distancias.put("Belém", belem);
        
        Map<String, Double> cuiaba = new HashMap<>();
        cuiaba.put("Porto Velho", 694.0);
        distancias.put("Cuiabá", cuiaba);
        
        Map<String, Double> portoVelho = new HashMap<>();
        portoVelho.put("Rio Branco", 544.0);
        distancias.put("Porto Velho", portoVelho);
        
        Map<String, Double> manaus = new HashMap<>();
        manaus.put("Porto Velho", 890.0);
        distancias.put("Manaus", manaus);
        
        Map<String, Double> boaVista = new HashMap<>();
        boaVista.put("Manaus", 785.0);
        distancias.put("Boa Vista", boaVista);
        
        return distancias;
    }
    
    /**
     * Exibe a tabela de distâncias do grafo
     * @param mapa Grafo para gerar a tabela
     */
    private static void exibirTabelaDistancias(GrafoMapa mapa) {
        List<Cidade> cidades = mapa.getCidades();
        int n = cidades.size();
        
        // Ordenar cidades para exibição consistente
        cidades.sort(Comparator.comparing(Cidade::getNome));
        
        System.out.println("=== TABELA DE DISTÂNCIAS (KM) ===");
        System.out.println("Legenda: Distância em km | 0 = Sem conexão direta\n");
        
        // Cabeçalho da tabela
        System.out.printf("%-15s", "");
        for (Cidade cidade : cidades) {
            System.out.printf("%-8s", cidade.getEstado());
        }
        System.out.println();
        
        // Linha separadora
        System.out.printf("%-15s", "");
        for (int i = 0; i < n; i++) {
            System.out.print("--------");
        }
        System.out.println();
        
        // Matriz de distâncias
        for (int i = 0; i < n; i++) {
            Cidade cidadeOrigem = cidades.get(i);
            System.out.printf("%-15s", cidadeOrigem.getEstado());
            
            for (int j = 0; j < n; j++) {
                Cidade cidadeDestino = cidades.get(j);
                
                if (i == j) {
                    System.out.printf("%-8s", "-"); // Diagonal principal
                } else {
                    double distancia = getDistancia(cidadeOrigem, cidadeDestino);
                    if (distancia > 0) {
                        System.out.printf("%-8.0f", distancia);
                    } else {
                        System.out.printf("%-8s", "0");
                    }
                }
            }
            System.out.println();
        }
        System.out.println();
    }
    
    /**
     * Mostra estatísticas das distâncias
     * @param mapa Grafo para análise
     */
    private static void mostrarEstatisticasDistancias(GrafoMapa mapa) {
        List<Cidade> cidades = mapa.getCidades();
        int n = cidades.size();
        int totalConexoes = 0;
        double somaDistancias = 0;
        double distanciaMinima = Double.MAX_VALUE;
        double distanciaMaxima = 0;
        
        // Calcular estatísticas
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                Cidade cidade1 = cidades.get(i);
                Cidade cidade2 = cidades.get(j);
                double distancia = getDistancia(cidade1, cidade2);
                
                if (distancia > 0) {
                    totalConexoes++;
                    somaDistancias += distancia;
                    distanciaMinima = Math.min(distanciaMinima, distancia);
                    distanciaMaxima = Math.max(distanciaMaxima, distancia);
                }
            }
        }
        
        System.out.println("=== ESTATÍSTICAS DAS DISTÂNCIAS ===");
        System.out.println("Total de conexões diretas: " + totalConexoes);
        System.out.println("Distância total das conexões: " + String.format("%.0f km", somaDistancias));
        System.out.println("Distância média: " + String.format("%.0f km", somaDistancias / totalConexoes));
        System.out.println("Menor distância: " + String.format("%.0f km", distanciaMinima));
        System.out.println("Maior distância: " + String.format("%.0f km", distanciaMaxima));
        System.out.println();
    }
    
    /**
     * Demonstra funcionalidades específicas das distâncias
     * @param mapa Grafo para demonstração
     */
    private static void demonstrarFuncionalidadesDistancias(GrafoMapa mapa) {
        System.out.println("=== ANÁLISE DAS DISTÂNCIAS ===");
        
        List<Cidade> cidades = mapa.getCidades();
        cidades.sort(Comparator.comparing(Cidade::getNome));
        
        // Encontrar conexões mais próximas e mais distantes
        String conexaoMaisProxima = "";
        String conexaoMaisDistante = "";
        double menorDistancia = Double.MAX_VALUE;
        double maiorDistancia = 0;
        
        for (int i = 0; i < cidades.size(); i++) {
            for (int j = i + 1; j < cidades.size(); j++) {
                Cidade cidade1 = cidades.get(i);
                Cidade cidade2 = cidades.get(j);
                double distancia = getDistancia(cidade1, cidade2);
                
                if (distancia > 0) {
                    if (distancia < menorDistancia) {
                        menorDistancia = distancia;
                        conexaoMaisProxima = cidade1.getEstado() + " ↔ " + cidade2.getEstado();
                    }
                    if (distancia > maiorDistancia) {
                        maiorDistancia = distancia;
                        conexaoMaisDistante = cidade1.getEstado() + " ↔ " + cidade2.getEstado();
                    }
                }
            }
        }
        
        System.out.println("Conexão mais próxima: " + conexaoMaisProxima + " (" + 
                          String.format("%.0f km", menorDistancia) + ")");
        System.out.println("Conexão mais distante: " + conexaoMaisDistante + " (" + 
                          String.format("%.0f km", maiorDistancia) + ")");
        
        // Mostrar distâncias de Brasília
        System.out.println("\nDistâncias de Brasília:");
        Cidade brasilia = mapa.buscarCidade("Brasília");
        for (Cidade cidade : cidades) {
            if (!cidade.equals(brasilia)) {
                double distancia = getDistancia(brasilia, cidade);
                if (distancia > 0) {
                    System.out.println("  " + cidade + ": " + String.format("%.0f km", distancia));
                }
            }
        }
        
        // Mostrar matriz por região com distâncias
        System.out.println("\n=== MATRIZ DE DISTÂNCIAS POR REGIÃO ===");
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        
        for (String regiao : regioes) {
            System.out.println("\n" + regiao + ":");
            List<Cidade> cidadesRegiao = cidades.stream()
                .filter(c -> c.getRegiao().equals(regiao))
                .toList();
            
            if (!cidadesRegiao.isEmpty()) {
                System.out.printf("%-15s", "");
                for (Cidade cidade : cidadesRegiao) {
                    System.out.printf("%-8s", cidade.getEstado());
                }
                System.out.println();
                
                for (Cidade origem : cidadesRegiao) {
                    System.out.printf("%-15s", origem.getEstado());
                    for (Cidade destino : cidadesRegiao) {
                        if (origem.equals(destino)) {
                            System.out.printf("%-8s", "-");
                        } else {
                            double distancia = getDistancia(origem, destino);
                            if (distancia > 0) {
                                System.out.printf("%-8.0f", distancia);
                            } else {
                                System.out.printf("%-8s", "0");
                            }
                        }
                    }
                    System.out.println();
                }
            }
        }
    }
}
