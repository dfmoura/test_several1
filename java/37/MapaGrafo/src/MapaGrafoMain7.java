import java.util.*;

/**
 * Classe principal que demonstra o algoritmo de Dijkstra para encontrar o caminho mais curto
 * entre capitais brasileiras considerando as distâncias em quilômetros das rodovias
 */
public class MapaGrafoMain7 {
    private static Scanner scanner = new Scanner(System.in);
    private static GrafoMapa mapa;
    private static Map<String, Map<String, Double>> distancias;
    
    public static void main(String[] args) {
        System.out.println("=== CAMINHO MAIS CURTO - ALGORITMO DE DIJKSTRA ===\n");
        
        // Inicializar o grafo
        inicializarGrafo();
        
        // Menu principal
        exibirMenu();
        
        scanner.close();
    }
    
    /**
     * Inicializa o grafo com todas as capitais e rodovias
     */
    private static void inicializarGrafo() {
        System.out.println("Inicializando grafo do mapa brasileiro...");
        
        mapa = new GrafoMapa();
        
        // Adicionar todas as capitais brasileiras
        adicionarCapitais();
        
        // Adicionar todas as rodovias
        adicionarRodovias();
        
        // Inicializar distâncias
        inicializarDistancias();
        
        System.out.println("✓ Grafo inicializado com " + mapa.getCidades().size() + " cidades e " + 
                          mapa.getRodovias().size() + " rodovias");
        System.out.println("✓ Distâncias carregadas para " + distancias.size() + " conexões\n");
    }
    
    /**
     * Adiciona todas as capitais brasileiras ao grafo
     */
    private static void adicionarCapitais() {
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
     */
    private static void adicionarRodovias() {
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
     * Inicializa as distâncias entre as capitais
     */
    private static void inicializarDistancias() {
        distancias = new HashMap<>();
        
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
    }
    
    /**
     * Exibe o menu principal e processa as opções do usuário
     */
    private static void exibirMenu() {
        int opcao;
        
        do {
            System.out.println("\n=== MENU DE CAMINHO MAIS CURTO ===");
            System.out.println("1. Buscar caminho mais curto entre duas cidades");
            System.out.println("2. Mostrar exemplos de caminhos mais curtos");
            System.out.println("3. Listar todas as cidades disponíveis");
            System.out.println("4. Analisar custos de viagem");
            System.out.println("5. Comparar diferentes rotas");
            System.out.println("0. Sair");
            System.out.print("\nEscolha uma opção: ");
            
            try {
                opcao = scanner.nextInt();
                scanner.nextLine(); // Limpar buffer
                
                switch (opcao) {
                    case 1:
                        buscarCaminhoMaisCurto();
                        break;
                    case 2:
                        mostrarExemplos();
                        break;
                    case 3:
                        listarCidades();
                        break;
                    case 4:
                        analisarCustos();
                        break;
                    case 5:
                        compararRotas();
                        break;
                    case 0:
                        System.out.println("\nObrigado por usar o Sistema de Caminho Mais Curto!");
                        break;
                    default:
                        System.out.println("\n❌ Opção inválida! Tente novamente.");
                }
            } catch (InputMismatchException e) {
                System.out.println("\n❌ Entrada inválida! Digite um número.");
                scanner.nextLine(); // Limpar buffer
                opcao = -1;
            }
            
        } while (opcao != 0);
    }
    
    /**
     * Busca o caminho mais curto entre duas cidades usando Dijkstra
     */
    private static void buscarCaminhoMaisCurto() {
        System.out.println("\n=== BUSCA DE CAMINHO MAIS CURTO ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Calculando caminho mais curto de " + origem + " até " + destino + "...");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Mostra exemplos de caminhos mais curtos
     */
    private static void mostrarExemplos() {
        System.out.println("\n=== EXEMPLOS DE CAMINHOS MAIS CURTOS ===");
        
        System.out.println("\n📋 Exemplos disponíveis:");
        System.out.println("a) São Paulo → Rio de Janeiro");
        System.out.println("b) Brasília → Fortaleza");
        System.out.println("c) Natal → Porto Alegre");
        System.out.println("d) Belém → Florianópolis");
        
        System.out.print("\nEscolha um exemplo (a, b, c ou d): ");
        String escolha = scanner.nextLine().trim().toLowerCase();
        
        switch (escolha) {
            case "a":
                executarExemploA();
                break;
            case "b":
                executarExemploB();
                break;
            case "c":
                executarExemploC();
                break;
            case "d":
                executarExemploD();
                break;
            default:
                System.out.println("❌ Exemplo inválido!");
        }
    }
    
    /**
     * Executa o exemplo A: São Paulo → Rio de Janeiro
     */
    private static void executarExemploA() {
        System.out.println("\n=== EXEMPLO A: SÃO PAULO → RIO DE JANEIRO ===");
        Cidade origem = mapa.buscarCidade("São Paulo");
        Cidade destino = mapa.buscarCidade("Rio de Janeiro");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa o exemplo B: Brasília → Fortaleza
     */
    private static void executarExemploB() {
        System.out.println("\n=== EXEMPLO B: BRASÍLIA → FORTALEZA ===");
        Cidade origem = mapa.buscarCidade("Brasília");
        Cidade destino = mapa.buscarCidade("Fortaleza");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa o exemplo C: Natal → Porto Alegre
     */
    private static void executarExemploC() {
        System.out.println("\n=== EXEMPLO C: NATAL → PORTO ALEGRE ===");
        Cidade origem = mapa.buscarCidade("Natal");
        Cidade destino = mapa.buscarCidade("Porto Alegre");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa o exemplo D: Belém → Florianópolis
     */
    private static void executarExemploD() {
        System.out.println("\n=== EXEMPLO D: BELÉM → FLORIANÓPOLIS ===");
        Cidade origem = mapa.buscarCidade("Belém");
        Cidade destino = mapa.buscarCidade("Florianópolis");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Lista todas as cidades disponíveis
     */
    private static void listarCidades() {
        System.out.println("\n=== CIDADES DISPONÍVEIS ===");
        
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        
        for (String regiao : regioes) {
            System.out.println("\n📍 " + regiao + ":");
            List<Cidade> cidadesRegiao = mapa.getCidades().stream()
                .filter(c -> c.getRegiao().equals(regiao))
                .sorted(Comparator.comparing(Cidade::getNome))
                .toList();
            
            for (Cidade cidade : cidadesRegiao) {
                System.out.println("  - " + cidade);
            }
        }
    }
    
    /**
     * Analisa custos de viagem
     */
    private static void analisarCustos() {
        System.out.println("\n=== ANÁLISE DE CUSTOS DE VIAGEM ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Analisando custos de viagem...");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        
        if (resultado.caminho.isEmpty()) {
            System.out.println("❌ Não foi possível calcular o caminho!");
            return;
        }
        
        double distanciaTotal = resultado.distancia;
        
        System.out.println("\n📊 ANÁLISE DE CUSTOS:");
        System.out.println("Distância total: " + String.format("%.0f km", distanciaTotal));
        
        // Cálculos de custo baseados em valores aproximados
        double custoCombustivel = distanciaTotal * 0.15; // R$ 0,15 por km
        double custoPedagio = (distanciaTotal / 100) * 15; // R$ 15 a cada 100km
        double custoTotal = custoCombustivel + custoPedagio;
        
        System.out.println("Custo estimado de combustível: R$ " + String.format("%.2f", custoCombustivel));
        System.out.println("Custo estimado de pedágio: R$ " + String.format("%.2f", custoPedagio));
        System.out.println("Custo total estimado: R$ " + String.format("%.2f", custoTotal));
        
        // Tempo estimado
        double tempoHoras = distanciaTotal / 80; // 80 km/h média
        int horas = (int) tempoHoras;
        int minutos = (int) ((tempoHoras - horas) * 60);
        
        System.out.println("Tempo estimado de viagem: " + horas + "h " + minutos + "min");
        
        // Análise por segmento
        System.out.println("\n📋 ANÁLISE POR SEGMENTO:");
        for (int i = 0; i < resultado.caminho.size() - 1; i++) {
            Cidade atual = resultado.caminho.get(i);
            Cidade proxima = resultado.caminho.get(i + 1);
            double dist = getDistancia(atual, proxima);
            
            System.out.println("  " + atual + " → " + proxima + ": " + 
                             String.format("%.0f km", dist) + " (R$ " + 
                             String.format("%.2f", dist * 0.15) + ")");
        }
    }
    
    /**
     * Compara diferentes rotas entre duas cidades
     */
    private static void compararRotas() {
        System.out.println("\n=== COMPARAÇÃO DE ROTAS ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Comparando diferentes rotas...");
        
        // Rota mais curta (Dijkstra)
        ResultadoDijkstra rotaCurta = dijkstra(origem, destino);
        
        // Rota com menos conexões (BFS)
        List<Cidade> rotaMenosConexoes = mapa.buscarCaminho(origem, destino);
        
        System.out.println("\n📊 COMPARAÇÃO DE ROTAS:");
        
        if (!rotaCurta.caminho.isEmpty()) {
            System.out.println("\n1️⃣ ROTA MAIS CURTA (Dijkstra):");
            System.out.println("   Distância: " + String.format("%.0f km", rotaCurta.distancia));
            System.out.println("   Conexões: " + (rotaCurta.caminho.size() - 1));
            System.out.print("   Caminho: ");
            for (int i = 0; i < rotaCurta.caminho.size(); i++) {
                System.out.print(rotaCurta.caminho.get(i));
                if (i < rotaCurta.caminho.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println();
        }
        
        if (!rotaMenosConexoes.isEmpty()) {
            double distanciaMenosConexoes = calcularDistanciaTotal(rotaMenosConexoes);
            System.out.println("\n2️⃣ ROTA COM MENOS CONEXÕES (BFS):");
            System.out.println("   Distância: " + String.format("%.0f km", distanciaMenosConexoes));
            System.out.println("   Conexões: " + (rotaMenosConexoes.size() - 1));
            System.out.print("   Caminho: ");
            for (int i = 0; i < rotaMenosConexoes.size(); i++) {
                System.out.print(rotaMenosConexoes.get(i));
                if (i < rotaMenosConexoes.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println();
            
            // Comparação
            if (!rotaCurta.caminho.isEmpty()) {
                double diferencaDistancia = rotaCurta.distancia - distanciaMenosConexoes;
                int diferencaConexoes = rotaCurta.caminho.size() - rotaMenosConexoes.size();
                
                System.out.println("\n📈 ANÁLISE COMPARATIVA:");
                System.out.println("Diferença de distância: " + String.format("%.0f km", Math.abs(diferencaDistancia)));
                System.out.println("Diferença de conexões: " + Math.abs(diferencaConexoes));
                
                if (diferencaDistancia < 0) {
                    System.out.println("✅ Rota mais curta é " + String.format("%.0f km", Math.abs(diferencaDistancia)) + " mais curta");
                } else if (diferencaDistancia > 0) {
                    System.out.println("⚠️  Rota com menos conexões é " + String.format("%.0f km", diferencaDistancia) + " mais curta");
                } else {
                    System.out.println("🤝 Ambas as rotas têm a mesma distância");
                }
            }
        }
    }
    
    /**
     * Implementa o algoritmo de Dijkstra para encontrar o caminho mais curto
     */
    private static ResultadoDijkstra dijkstra(Cidade origem, Cidade destino) {
        Map<Cidade, Double> distancias = new HashMap<>();
        Map<Cidade, Cidade> anterior = new HashMap<>();
        PriorityQueue<Cidade> fila = new PriorityQueue<>(Comparator.comparing(distancias::get));
        Set<Cidade> visitadas = new HashSet<>();
        
        // Inicializar distâncias
        for (Cidade cidade : mapa.getCidades()) {
            distancias.put(cidade, Double.MAX_VALUE);
        }
        distancias.put(origem, 0.0);
        fila.add(origem);
        
        while (!fila.isEmpty()) {
            Cidade atual = fila.poll();
            
            if (visitadas.contains(atual)) {
                continue;
            }
            
            visitadas.add(atual);
            
            if (atual.equals(destino)) {
                break;
            }
            
            // Explorar vizinhos
            for (Cidade vizinha : mapa.getCidadesConectadas(atual)) {
                if (!visitadas.contains(vizinha)) {
                    double novaDistancia = distancias.get(atual) + getDistancia(atual, vizinha);
                    
                    if (novaDistancia < distancias.get(vizinha)) {
                        distancias.put(vizinha, novaDistancia);
                        anterior.put(vizinha, atual);
                        fila.add(vizinha);
                    }
                }
            }
        }
        
        // Reconstruir caminho
        List<Cidade> caminho = new ArrayList<>();
        Cidade atual = destino;
        
        while (atual != null) {
            caminho.add(0, atual);
            atual = anterior.get(atual);
        }
        
        double distanciaTotal = distancias.get(destino);
        if (distanciaTotal == Double.MAX_VALUE) {
            distanciaTotal = 0;
        }
        
        return new ResultadoDijkstra(caminho, distanciaTotal);
    }
    
    /**
     * Retorna a distância entre duas cidades
     */
    private static double getDistancia(Cidade cidade1, Cidade cidade2) {
        if (cidade1.equals(cidade2)) {
            return 0;
        }
        
        String nome1 = cidade1.getNome();
        String nome2 = cidade2.getNome();
        
        if (distancias.containsKey(nome1) && distancias.get(nome1).containsKey(nome2)) {
            return distancias.get(nome1).get(nome2);
        }
        
        if (distancias.containsKey(nome2) && distancias.get(nome2).containsKey(nome1)) {
            return distancias.get(nome2).get(nome1);
        }
        
        return Double.MAX_VALUE; // Sem conexão direta
    }
    
    /**
     * Calcula a distância total de um caminho
     */
    private static double calcularDistanciaTotal(List<Cidade> caminho) {
        double total = 0;
        for (int i = 0; i < caminho.size() - 1; i++) {
            total += getDistancia(caminho.get(i), caminho.get(i + 1));
        }
        return total;
    }
    
    /**
     * Solicita uma cidade ao usuário
     */
    private static Cidade solicitarCidade(String mensagem) {
        System.out.print(mensagem);
        String nomeCidade = scanner.nextLine().trim();
        
        Cidade cidade = mapa.buscarCidade(nomeCidade);
        
        if (cidade == null) {
            System.out.println("❌ Cidade não encontrada: " + nomeCidade);
            System.out.println("💡 Dica: Use o menu 'Listar cidades' para ver as cidades disponíveis");
            return null;
        }
        
        return cidade;
    }
    
    /**
     * Exibe o resultado do algoritmo de Dijkstra
     */
    private static void exibirResultadoDijkstra(ResultadoDijkstra resultado, Cidade origem, Cidade destino) {
        if (resultado.caminho.isEmpty() || resultado.distancia == 0) {
            System.out.println("\n❌ Caminho não encontrado!");
            System.out.println("💡 Possíveis motivos:");
            System.out.println("   - Não existe conexão entre as cidades");
            System.out.println("   - Alguma cidade não está conectada ao grafo");
        } else {
            System.out.println("\n✅ Caminho mais curto encontrado:");
            System.out.print("   ");
            for (int i = 0; i < resultado.caminho.size(); i++) {
                System.out.print(resultado.caminho.get(i));
                if (i < resultado.caminho.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println("\n\n📏 Distância total: " + String.format("%.0f km", resultado.distancia));
            System.out.println("🔗 Número de conexões: " + (resultado.caminho.size() - 1));
            
            // Mostrar rodovias utilizadas
            System.out.println("\n🛣️  Rodovias utilizadas:");
            for (int i = 0; i < resultado.caminho.size() - 1; i++) {
                Cidade atual = resultado.caminho.get(i);
                Cidade proxima = resultado.caminho.get(i + 1);
                double dist = getDistancia(atual, proxima);
                
                List<Rodovia> rodovias = mapa.getRodoviasDe(atual);
                for (Rodovia rodovia : rodovias) {
                    if (rodovia.conecta(atual, proxima)) {
                        System.out.println("   " + rodovia.getNumero() + ": " + atual + " → " + proxima + 
                                         " (" + String.format("%.0f km", dist) + ")");
                        break;
                    }
                }
            }
            
            // Análise de custos
            double custoCombustivel = resultado.distancia * 0.15;
            double custoPedagio = (resultado.distancia / 100) * 15;
            double custoTotal = custoCombustivel + custoPedagio;
            
            System.out.println("\n💰 Análise de custos:");
            System.out.println("   Combustível: R$ " + String.format("%.2f", custoCombustivel));
            System.out.println("   Pedágio: R$ " + String.format("%.2f", custoPedagio));
            System.out.println("   Total: R$ " + String.format("%.2f", custoTotal));
            
            // Tempo estimado
            double tempoHoras = resultado.distancia / 80;
            int horas = (int) tempoHoras;
            int minutos = (int) ((tempoHoras - horas) * 60);
            
            System.out.println("⏱️  Tempo estimado: " + horas + "h " + minutos + "min");
        }
    }
    
    /**
     * Classe para armazenar o resultado do algoritmo de Dijkstra
     */
    private static class ResultadoDijkstra {
        List<Cidade> caminho;
        double distancia;
        
        public ResultadoDijkstra(List<Cidade> caminho, double distancia) {
            this.caminho = caminho;
            this.distancia = distancia;
        }
    }
}
