import java.util.*;

/**
 * Classe principal consolidada que integra todas as funcionalidades dos programas anteriores
 * Inclui: grafo básico, tabela de adjacência, roteamento dinâmico, caminho mais curto e análise estatística
 */
public class MapaGrafoMain8 {
    private static Scanner scanner = new Scanner(System.in);
    private static GrafoMapa mapa;
    private static Map<String, Map<String, Double>> distancias;
    
    public static void main(String[] args) {
        System.out.println("=== SISTEMA INTEGRADO DE MAPA BRASILEIRO ===\n");
        System.out.println("🎯 Funcionalidades integradas:");
        System.out.println("   • Grafo de capitais e rodovias");
        System.out.println("   • Tabela de adjacência (binária e ponderada)");
        System.out.println("   • Roteamento dinâmico com restrições");
        System.out.println("   • Caminho mais curto (Dijkstra)");
        System.out.println("   • Análise estatística completa\n");
        
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
        System.out.println("Inicializando sistema integrado...");
        
        mapa = new GrafoMapa();
        
        // Adicionar todas as capitais brasileiras
        adicionarCapitais();
        
        // Adicionar todas as rodovias
        adicionarRodovias();
        
        // Inicializar distâncias
        inicializarDistancias();
        
        System.out.println("✓ Sistema inicializado com " + mapa.getCidades().size() + " cidades e " + 
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
     * Exibe o menu principal integrado
     */
    private static void exibirMenu() {
        int opcao;
        
        do {
            System.out.println("\n" + "=".repeat(60));
            System.out.println("           SISTEMA INTEGRADO DE MAPA BRASILEIRO");
            System.out.println("=".repeat(60));
            System.out.println("📊 ANÁLISE E VISUALIZAÇÃO:");
            System.out.println("   1. Mostrar grafo completo");
            System.out.println("   2. Tabela de adjacência (binária)");
            System.out.println("   3. Tabela de adjacência ponderada (distâncias)");
            System.out.println("   4. Estatísticas do grafo");
            System.out.println("   5. Listar cidades por região");
            System.out.println();
            System.out.println("🛣️  ROTEAMENTO E NAVEGAÇÃO:");
            System.out.println("   6. Buscar rota simples (origem → destino)");
            System.out.println("   7. Buscar rota passando por cidade específica");
            System.out.println("   8. Buscar rota evitando cidade específica");
            System.out.println("   9. Buscar rota com múltiplas restrições");
            System.out.println("   10. Caminho mais curto (Dijkstra)");
            System.out.println();
            System.out.println("💰 ANÁLISE DE CUSTOS:");
            System.out.println("   11. Analisar custos de viagem");
            System.out.println("   12. Comparar diferentes rotas");
            System.out.println();
            System.out.println("🎯 EXEMPLOS E DEMONSTRAÇÕES:");
            System.out.println("   13. Exemplos de rotas com restrições");
            System.out.println("   14. Exemplos de caminhos mais curtos");
            System.out.println("   15. Análise de viabilidade de rota");
            System.out.println();
            System.out.println("   0. Sair");
            System.out.println("=".repeat(60));
            System.out.print("Escolha uma opção: ");
            
            try {
                opcao = scanner.nextInt();
                scanner.nextLine(); // Limpar buffer
                
                switch (opcao) {
                    case 1:
                        mostrarGrafoCompleto();
                        break;
                    case 2:
                        mostrarTabelaAdjacenciaBinaria();
                        break;
                    case 3:
                        mostrarTabelaAdjacenciaPonderada();
                        break;
                    case 4:
                        mostrarEstatisticas();
                        break;
                    case 5:
                        listarCidadesPorRegiao();
                        break;
                    case 6:
                        buscarRotaSimples();
                        break;
                    case 7:
                        buscarRotaPassandoPor();
                        break;
                    case 8:
                        buscarRotaEvitando();
                        break;
                    case 9:
                        buscarRotaComRestricoes();
                        break;
                    case 10:
                        buscarCaminhoMaisCurto();
                        break;
                    case 11:
                        analisarCustos();
                        break;
                    case 12:
                        compararRotas();
                        break;
                    case 13:
                        mostrarExemplosRestricoes();
                        break;
                    case 14:
                        mostrarExemplosCaminhoCurto();
                        break;
                    case 15:
                        analisarViabilidade();
                        break;
                    case 0:
                        System.out.println("\n🎉 Obrigado por usar o Sistema Integrado de Mapa Brasileiro!");
                        System.out.println("📈 Funcionalidades utilizadas: Grafo, Adjacência, Roteamento, Dijkstra");
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
    
    // ==================== ANÁLISE E VISUALIZAÇÃO ====================
    
    /**
     * Mostra o grafo completo com todas as conexões
     */
    private static void mostrarGrafoCompleto() {
        System.out.println("\n=== GRAFO COMPLETO DO MAPA BRASILEIRO ===");
        System.out.println(mapa.toString());
    }
    
    /**
     * Mostra tabela de adjacência binária (1 = conectado, 0 = não conectado)
     */
    private static void mostrarTabelaAdjacenciaBinaria() {
        System.out.println("\n=== TABELA DE ADJACÊNCIA BINÁRIA ===");
        System.out.println("Legenda: 1 = Conexão direta | 0 = Sem conexão direta\n");
        
        List<Cidade> cidades = mapa.getCidades();
        cidades.sort(Comparator.comparing(Cidade::getNome));
        int n = cidades.size();
        
        // Cabeçalho
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
        
        // Matriz
        for (int i = 0; i < n; i++) {
            Cidade cidadeOrigem = cidades.get(i);
            System.out.printf("%-15s", cidadeOrigem.getEstado());
            
            for (int j = 0; j < n; j++) {
                Cidade cidadeDestino = cidades.get(j);
                
                if (i == j) {
                    System.out.printf("%-4s", "-");
                } else {
                    int adjacencia = mapa.temConexaoDireta(cidadeOrigem, cidadeDestino) ? 1 : 0;
                    System.out.printf("%-4d", adjacencia);
                }
            }
            System.out.println();
        }
    }
    
    /**
     * Mostra tabela de adjacência ponderada com distâncias
     */
    private static void mostrarTabelaAdjacenciaPonderada() {
        System.out.println("\n=== TABELA DE ADJACÊNCIA PONDERADA (DISTÂNCIAS KM) ===");
        System.out.println("Legenda: Distância em km | 0 = Sem conexão direta\n");
        
        List<Cidade> cidades = mapa.getCidades();
        cidades.sort(Comparator.comparing(Cidade::getNome));
        int n = cidades.size();
        
        // Cabeçalho
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
        
        // Matriz
        for (int i = 0; i < n; i++) {
            Cidade cidadeOrigem = cidades.get(i);
            System.out.printf("%-15s", cidadeOrigem.getEstado());
            
            for (int j = 0; j < n; j++) {
                Cidade cidadeDestino = cidades.get(j);
                
                if (i == j) {
                    System.out.printf("%-8s", "-");
                } else {
                    double distancia = getDistancia(cidadeOrigem, cidadeDestino);
                    if (distancia > 0 && distancia != Double.MAX_VALUE) {
                        System.out.printf("%-8.0f", distancia);
                    } else {
                        System.out.printf("%-8s", "0");
                    }
                }
            }
            System.out.println();
        }
    }
    
    /**
     * Mostra estatísticas completas do grafo
     */
    private static void mostrarEstatisticas() {
        System.out.println("\n=== ESTATÍSTICAS COMPLETAS DO GRAFO ===");
        
        List<Cidade> cidades = mapa.getCidades();
        List<Rodovia> rodovias = mapa.getRodovias();
        
        // Estatísticas básicas
        System.out.println("📊 ESTATÍSTICAS BÁSICAS:");
        System.out.println("   Total de cidades: " + cidades.size());
        System.out.println("   Total de rodovias: " + rodovias.size());
        
        // Calcular conexões diretas
        int totalConexoes = 0;
        for (Cidade cidade : cidades) {
            totalConexoes += mapa.getCidadesConectadas(cidade).size();
        }
        totalConexoes /= 2; // Cada conexão é contada duas vezes
        
        System.out.println("   Total de conexões diretas: " + totalConexoes);
        System.out.println("   Densidade do grafo: " + String.format("%.2f%%", 
                          (double) totalConexoes / (cidades.size() * (cidades.size() - 1) / 2) * 100));
        System.out.println("   Média de conexões por cidade: " + String.format("%.2f", 
                          (double) totalConexoes * 2 / cidades.size()));
        
        // Estatísticas de distâncias
        double somaDistancias = 0;
        double distanciaMinima = Double.MAX_VALUE;
        double distanciaMaxima = 0;
        int conexoesComDistancia = 0;
        
        for (Cidade cidade1 : cidades) {
            for (Cidade cidade2 : cidades) {
                if (!cidade1.equals(cidade2)) {
                    double distancia = getDistancia(cidade1, cidade2);
                    if (distancia > 0 && distancia != Double.MAX_VALUE) {
                        somaDistancias += distancia;
                        distanciaMinima = Math.min(distanciaMinima, distancia);
                        distanciaMaxima = Math.max(distanciaMaxima, distancia);
                        conexoesComDistancia++;
                    }
                }
            }
        }
        
        if (conexoesComDistancia > 0) {
            System.out.println("\n📏 ESTATÍSTICAS DE DISTÂNCIAS:");
            System.out.println("   Distância total das conexões: " + String.format("%.0f km", somaDistancias));
            System.out.println("   Distância média: " + String.format("%.0f km", somaDistancias / conexoesComDistancia));
            System.out.println("   Menor distância: " + String.format("%.0f km", distanciaMinima));
            System.out.println("   Maior distância: " + String.format("%.0f km", distanciaMaxima));
        }
        
        // Cidade mais conectada
        Cidade cidadeMaisConectada = null;
        int maxConexoes = 0;
        
        for (Cidade cidade : cidades) {
            int conexoes = mapa.getCidadesConectadas(cidade).size();
            if (conexoes > maxConexoes) {
                maxConexoes = conexoes;
                cidadeMaisConectada = cidade;
            }
        }
        
        System.out.println("\n🏆 DESTAQUES:");
        System.out.println("   Cidade mais conectada: " + cidadeMaisConectada + " (" + maxConexoes + " conexões)");
        
        // Cidades por região
        System.out.println("\n📍 DISTRIBUIÇÃO POR REGIÃO:");
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        for (String regiao : regioes) {
            long count = cidades.stream().filter(c -> c.getRegiao().equals(regiao)).count();
            System.out.println("   " + regiao + ": " + count + " cidades");
        }
    }
    
    /**
     * Lista cidades organizadas por região
     */
    private static void listarCidadesPorRegiao() {
        System.out.println("\n=== CIDADES POR REGIÃO ===");
        
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        
        for (String regiao : regioes) {
            System.out.println("\n📍 " + regiao + ":");
            List<Cidade> cidadesRegiao = mapa.getCidades().stream()
                .filter(c -> c.getRegiao().equals(regiao))
                .sorted(Comparator.comparing(Cidade::getNome))
                .toList();
            
            for (Cidade cidade : cidadesRegiao) {
                int conexoes = mapa.getCidadesConectadas(cidade).size();
                System.out.println("   - " + cidade + " (" + conexoes + " conexões)");
            }
        }
    }
    
    // ==================== ROTEAMENTO E NAVEGAÇÃO ====================
    
    /**
     * Busca rota simples entre duas cidades
     */
    private static void buscarRotaSimples() {
        System.out.println("\n=== BUSCA DE ROTA SIMPLES ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Buscando rota de " + origem + " até " + destino + "...");
        
        List<Cidade> caminho = mapa.buscarCaminho(origem, destino);
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Busca rota passando por uma cidade específica
     */
    private static void buscarRotaPassandoPor() {
        System.out.println("\n=== BUSCA DE ROTA PASSANDO POR CIDADE ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        Cidade passandoPor = solicitarCidade("Digite a cidade que deve ser visitada: ");
        if (passandoPor == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Buscando rota de " + origem + " até " + destino + 
                          " passando por " + passandoPor + "...");
        
        List<Cidade> caminho = buscarCaminhoPassandoPor(origem, destino, passandoPor);
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Busca rota evitando uma cidade específica
     */
    private static void buscarRotaEvitando() {
        System.out.println("\n=== BUSCA DE ROTA EVITANDO CIDADE ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        Cidade evitando = solicitarCidade("Digite a cidade que deve ser evitada: ");
        if (evitando == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Buscando rota de " + origem + " até " + destino + 
                          " evitando " + evitando + "...");
        
        List<Cidade> caminho = buscarCaminhoEvitando(origem, destino, evitando);
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Busca rota com múltiplas restrições
     */
    private static void buscarRotaComRestricoes() {
        System.out.println("\n=== BUSCA DE ROTA COM MÚLTIPLAS RESTRIÇÕES ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        // Solicitar cidades que devem ser visitadas
        List<Cidade> passandoPor = new ArrayList<>();
        System.out.println("\nCidades que devem ser visitadas (digite 'fim' para parar):");
        while (true) {
            Cidade cidade = solicitarCidade("Digite uma cidade obrigatória: ");
            if (cidade == null) break;
            if (!passandoPor.contains(cidade)) {
                passandoPor.add(cidade);
                System.out.println("✓ " + cidade + " adicionada à lista de cidades obrigatórias");
            } else {
                System.out.println("⚠️  Cidade já está na lista!");
            }
        }
        
        // Solicitar cidades que devem ser evitadas
        List<Cidade> evitando = new ArrayList<>();
        System.out.println("\nCidades que devem ser evitadas (digite 'fim' para parar):");
        while (true) {
            Cidade cidade = solicitarCidade("Digite uma cidade a ser evitada: ");
            if (cidade == null) break;
            if (!evitando.contains(cidade)) {
                evitando.add(cidade);
                System.out.println("✓ " + cidade + " adicionada à lista de cidades a evitar");
            } else {
                System.out.println("⚠️  Cidade já está na lista!");
            }
        }
        
        System.out.println("\n🔍 Buscando rota com restrições...");
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        System.out.println("Passando por: " + (passandoPor.isEmpty() ? "Nenhuma" : passandoPor));
        System.out.println("Evitando: " + (evitando.isEmpty() ? "Nenhuma" : evitando));
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, passandoPor, evitando);
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Busca o caminho mais curto usando Dijkstra
     */
    private static void buscarCaminhoMaisCurto() {
        System.out.println("\n=== BUSCA DE CAMINHO MAIS CURTO (DIJKSTRA) ===");
        
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
    
    // ==================== ANÁLISE DE CUSTOS ====================
    
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
    
    // ==================== EXEMPLOS E DEMONSTRAÇÕES ====================
    
    /**
     * Mostra exemplos de rotas com restrições
     */
    private static void mostrarExemplosRestricoes() {
        System.out.println("\n=== EXEMPLOS DE ROTAS COM RESTRIÇÕES ===");
        
        System.out.println("\n📋 Exemplos disponíveis:");
        System.out.println("a) São Luís → Belo Horizonte, passando por Recife, evitando Maceió");
        System.out.println("b) Natal → Campo Grande, evitando Salvador e Palmas");
        System.out.println("c) Belo Horizonte → Palmas, passando por Florianópolis");
        
        System.out.print("\nEscolha um exemplo (a, b ou c): ");
        String escolha = scanner.nextLine().trim().toLowerCase();
        
        switch (escolha) {
            case "a":
                executarExemploRestricaoA();
                break;
            case "b":
                executarExemploRestricaoB();
                break;
            case "c":
                executarExemploRestricaoC();
                break;
            default:
                System.out.println("❌ Exemplo inválido!");
        }
    }
    
    /**
     * Executa exemplo A de restrições
     */
    private static void executarExemploRestricaoA() {
        System.out.println("\n=== EXEMPLO A: SÃO LUÍS → BELO HORIZONTE ===");
        System.out.println("Passando por: Recife (PE)");
        System.out.println("Evitando: Maceió (AL)");
        
        Cidade origem = mapa.buscarCidade("São Luís");
        Cidade destino = mapa.buscarCidade("Belo Horizonte");
        Cidade passandoPor = mapa.buscarCidade("Recife");
        Cidade evitando = mapa.buscarCidade("Maceió");
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
                                                         List.of(passandoPor), List.of(evitando));
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Executa exemplo B de restrições
     */
    private static void executarExemploRestricaoB() {
        System.out.println("\n=== EXEMPLO B: NATAL → CAMPO GRANDE ===");
        System.out.println("Evitando: Salvador (BA) e Palmas (TO)");
        
        Cidade origem = mapa.buscarCidade("Natal");
        Cidade destino = mapa.buscarCidade("Campo Grande");
        Cidade evitando1 = mapa.buscarCidade("Salvador");
        Cidade evitando2 = mapa.buscarCidade("Palmas");
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
                                                         new ArrayList<>(), List.of(evitando1, evitando2));
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Executa exemplo C de restrições
     */
    private static void executarExemploRestricaoC() {
        System.out.println("\n=== EXEMPLO C: BELO HORIZONTE → PALMAS ===");
        System.out.println("Passando por: Florianópolis (SC)");
        
        Cidade origem = mapa.buscarCidade("Belo Horizonte");
        Cidade destino = mapa.buscarCidade("Palmas");
        Cidade passandoPor = mapa.buscarCidade("Florianópolis");
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
                                                         List.of(passandoPor), new ArrayList<>());
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Mostra exemplos de caminhos mais curtos
     */
    private static void mostrarExemplosCaminhoCurto() {
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
                executarExemploCaminhoA();
                break;
            case "b":
                executarExemploCaminhoB();
                break;
            case "c":
                executarExemploCaminhoC();
                break;
            case "d":
                executarExemploCaminhoD();
                break;
            default:
                System.out.println("❌ Exemplo inválido!");
        }
    }
    
    /**
     * Executa exemplo A de caminho mais curto
     */
    private static void executarExemploCaminhoA() {
        System.out.println("\n=== EXEMPLO A: SÃO PAULO → RIO DE JANEIRO ===");
        Cidade origem = mapa.buscarCidade("São Paulo");
        Cidade destino = mapa.buscarCidade("Rio de Janeiro");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa exemplo B de caminho mais curto
     */
    private static void executarExemploCaminhoB() {
        System.out.println("\n=== EXEMPLO B: BRASÍLIA → FORTALEZA ===");
        Cidade origem = mapa.buscarCidade("Brasília");
        Cidade destino = mapa.buscarCidade("Fortaleza");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa exemplo C de caminho mais curto
     */
    private static void executarExemploCaminhoC() {
        System.out.println("\n=== EXEMPLO C: NATAL → PORTO ALEGRE ===");
        Cidade origem = mapa.buscarCidade("Natal");
        Cidade destino = mapa.buscarCidade("Porto Alegre");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Executa exemplo D de caminho mais curto
     */
    private static void executarExemploCaminhoD() {
        System.out.println("\n=== EXEMPLO D: BELÉM → FLORIANÓPOLIS ===");
        Cidade origem = mapa.buscarCidade("Belém");
        Cidade destino = mapa.buscarCidade("Florianópolis");
        
        ResultadoDijkstra resultado = dijkstra(origem, destino);
        exibirResultadoDijkstra(resultado, origem, destino);
    }
    
    /**
     * Analisa viabilidade de uma rota
     */
    private static void analisarViabilidade() {
        System.out.println("\n=== ANÁLISE DE VIABILIDADE DE ROTA ===");
        
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Analisando viabilidade da rota...");
        
        // Verificar conectividade básica
        List<Cidade> caminhoSimples = mapa.buscarCaminho(origem, destino);
        boolean conectado = !caminhoSimples.isEmpty();
        
        // Verificar caminho mais curto
        ResultadoDijkstra resultadoDijkstra = dijkstra(origem, destino);
        boolean caminhoCurtoExiste = !resultadoDijkstra.caminho.isEmpty();
        
        // Análise de viabilidade
        System.out.println("\n📊 ANÁLISE DE VIABILIDADE:");
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        
        if (conectado) {
            System.out.println("✅ Rota viável: Sim");
            System.out.println("   Conexões necessárias: " + (caminhoSimples.size() - 1));
            
            if (caminhoCurtoExiste) {
                System.out.println("   Distância mais curta: " + String.format("%.0f km", resultadoDijkstra.distancia));
                System.out.println("   Conexões no caminho mais curto: " + (resultadoDijkstra.caminho.size() - 1));
            }
            
            // Análise de complexidade
            if (caminhoSimples.size() <= 3) {
                System.out.println("   Complexidade: Baixa (rota direta)");
            } else if (caminhoSimples.size() <= 5) {
                System.out.println("   Complexidade: Média (algumas conexões)");
            } else {
                System.out.println("   Complexidade: Alta (muitas conexões)");
            }
            
            // Análise regional
            if (origem.getRegiao().equals(destino.getRegiao())) {
                System.out.println("   Tipo: Rota regional (" + origem.getRegiao() + ")");
            } else {
                System.out.println("   Tipo: Rota inter-regional (" + origem.getRegiao() + " → " + destino.getRegiao() + ")");
            }
            
        } else {
            System.out.println("❌ Rota viável: Não");
            System.out.println("   Motivo: Não existe conexão entre as cidades");
        }
    }
    
    // Métodos auxiliares necessários
    private static List<Cidade> buscarCaminhoPassandoPor(Cidade origem, Cidade destino, Cidade passandoPor) {
        List<Cidade> caminho1 = mapa.buscarCaminho(origem, passandoPor);
        if (caminho1.isEmpty()) return new ArrayList<>();
        List<Cidade> caminho2 = mapa.buscarCaminho(passandoPor, destino);
        if (caminho2.isEmpty()) return new ArrayList<>();
        List<Cidade> caminhoCompleto = new ArrayList<>(caminho1);
        caminhoCompleto.addAll(caminho2.subList(1, caminho2.size()));
        return caminhoCompleto;
    }
    
    private static List<Cidade> buscarCaminhoEvitando(Cidade origem, Cidade destino, Cidade evitando) {
        GrafoMapa grafoTemporario = new GrafoMapa();
        for (Cidade cidade : mapa.getCidades()) {
            if (!cidade.equals(evitando)) grafoTemporario.adicionarCidade(cidade);
        }
        for (Rodovia rodovia : mapa.getRodovias()) {
            if (!rodovia.getOrigem().equals(evitando) && !rodovia.getDestino().equals(evitando)) {
                grafoTemporario.adicionarRodovia(rodovia);
            }
        }
        return grafoTemporario.buscarCaminho(origem, destino);
    }
    
    private static List<Cidade> buscarCaminhoComRestricoes(Cidade origem, Cidade destino, 
                                                          List<Cidade> passandoPor, List<Cidade> evitando) {
        if (passandoPor.isEmpty() && evitando.isEmpty()) return mapa.buscarCaminho(origem, destino);
        if (!passandoPor.isEmpty()) return buscarCaminhoSegmentado(origem, destino, passandoPor, evitando);
        if (!evitando.isEmpty()) {
            GrafoMapa grafoTemporario = mapa;
            for (Cidade cidade : evitando) {
                grafoTemporario = criarGrafoSemCidade(grafoTemporario, cidade);
            }
            return grafoTemporario.buscarCaminho(origem, destino);
        }
        return new ArrayList<>();
    }
    
    private static List<Cidade> buscarCaminhoSegmentado(Cidade origem, Cidade destino, 
                                                       List<Cidade> passandoPor, List<Cidade> evitando) {
        List<Cidade> caminhoCompleto = new ArrayList<>();
        Cidade atual = origem;
        List<Cidade> cidadesOrdenadas = new ArrayList<>(passandoPor);
        cidadesOrdenadas.add(destino);
        
        for (Cidade proxima : cidadesOrdenadas) {
            GrafoMapa grafoTemporario = mapa;
            for (Cidade cidade : evitando) {
                grafoTemporario = criarGrafoSemCidade(grafoTemporario, cidade);
            }
            List<Cidade> segmento = grafoTemporario.buscarCaminho(atual, proxima);
            if (segmento.isEmpty()) return new ArrayList<>();
            if (caminhoCompleto.isEmpty()) caminhoCompleto.addAll(segmento);
            else caminhoCompleto.addAll(segmento.subList(1, segmento.size()));
            atual = proxima;
        }
        return caminhoCompleto;
    }
    
    private static GrafoMapa criarGrafoSemCidade(GrafoMapa grafoOriginal, Cidade cidadeEvitar) {
        GrafoMapa grafoTemporario = new GrafoMapa();
        for (Cidade cidade : grafoOriginal.getCidades()) {
            if (!cidade.equals(cidadeEvitar)) grafoTemporario.adicionarCidade(cidade);
        }
        for (Rodovia rodovia : grafoOriginal.getRodovias()) {
            if (!rodovia.getOrigem().equals(cidadeEvitar) && !rodovia.getDestino().equals(cidadeEvitar)) {
                grafoTemporario.adicionarRodovia(rodovia);
            }
        }
        return grafoTemporario;
    }
    
    private static ResultadoDijkstra dijkstra(Cidade origem, Cidade destino) {
        Map<Cidade, Double> distancias = new HashMap<>();
        Map<Cidade, Cidade> anterior = new HashMap<>();
        PriorityQueue<Cidade> fila = new PriorityQueue<>(Comparator.comparing(distancias::get));
        Set<Cidade> visitadas = new HashSet<>();
        
        for (Cidade cidade : mapa.getCidades()) distancias.put(cidade, Double.MAX_VALUE);
        distancias.put(origem, 0.0);
        fila.add(origem);
        
        while (!fila.isEmpty()) {
            Cidade atual = fila.poll();
            if (visitadas.contains(atual)) continue;
            visitadas.add(atual);
            if (atual.equals(destino)) break;
            
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
        
        List<Cidade> caminho = new ArrayList<>();
        Cidade atual = destino;
        while (atual != null) {
            caminho.add(0, atual);
            atual = anterior.get(atual);
        }
        
        double distanciaTotal = distancias.get(destino);
        if (distanciaTotal == Double.MAX_VALUE) distanciaTotal = 0;
        return new ResultadoDijkstra(caminho, distanciaTotal);
    }
    
    private static double getDistancia(Cidade cidade1, Cidade cidade2) {
        if (cidade1.equals(cidade2)) return 0;
        String nome1 = cidade1.getNome();
        String nome2 = cidade2.getNome();
        if (distancias.containsKey(nome1) && distancias.get(nome1).containsKey(nome2)) {
            return distancias.get(nome1).get(nome2);
        }
        if (distancias.containsKey(nome2) && distancias.get(nome2).containsKey(nome1)) {
            return distancias.get(nome2).get(nome1);
        }
        return Double.MAX_VALUE;
    }
    
    private static double calcularDistanciaTotal(List<Cidade> caminho) {
        double total = 0;
        for (int i = 0; i < caminho.size() - 1; i++) {
            total += getDistancia(caminho.get(i), caminho.get(i + 1));
        }
        return total;
    }
    
    private static Cidade solicitarCidade(String mensagem) {
        System.out.print(mensagem);
        String nomeCidade = scanner.nextLine().trim();
        if (nomeCidade.equalsIgnoreCase("fim")) return null;
        Cidade cidade = mapa.buscarCidade(nomeCidade);
        if (cidade == null) {
            System.out.println("❌ Cidade não encontrada: " + nomeCidade);
            System.out.println("💡 Dica: Use o menu 'Listar cidades' para ver as cidades disponíveis");
            return null;
        }
        return cidade;
    }
    
    private static void exibirResultadoRota(List<Cidade> caminho, Cidade origem, Cidade destino) {
        if (caminho.isEmpty()) {
            System.out.println("\n❌ Rota não encontrada!");
            System.out.println("💡 Possíveis motivos:");
            System.out.println("   - Não existe conexão entre as cidades");
            System.out.println("   - As restrições impedem a formação de uma rota válida");
            System.out.println("   - Alguma cidade obrigatória não é acessível");
        } else {
            System.out.println("\n✅ Rota encontrada:");
            System.out.print("   ");
            for (int i = 0; i < caminho.size(); i++) {
                System.out.print(caminho.get(i));
                if (i < caminho.size() - 1) System.out.print(" → ");
            }
            System.out.println("\n\n📏 Distância total: " + String.format("%.0f km", calcularDistanciaTotal(caminho)));
            System.out.println("🔗 Número de conexões: " + (caminho.size() - 1));
        }
    }
    
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
                if (i < resultado.caminho.size() - 1) System.out.print(" → ");
            }
            System.out.println("\n\n📏 Distância total: " + String.format("%.0f km", resultado.distancia));
            System.out.println("🔗 Número de conexões: " + (resultado.caminho.size() - 1));
            
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
            
            double custoCombustivel = resultado.distancia * 0.15;
            double custoPedagio = (resultado.distancia / 100) * 15;
            double custoTotal = custoCombustivel + custoPedagio;
            
            System.out.println("\n💰 Análise de custos:");
            System.out.println("   Combustível: R$ " + String.format("%.2f", custoCombustivel));
            System.out.println("   Pedágio: R$ " + String.format("%.2f", custoPedagio));
            System.out.println("   Total: R$ " + String.format("%.2f", custoTotal));
            
            double tempoHoras = resultado.distancia / 80;
            int horas = (int) tempoHoras;
            int minutos = (int) ((tempoHoras - horas) * 60);
            System.out.println("⏱️  Tempo estimado: " + horas + "h " + minutos + "min");
        }
    }
    
    private static class ResultadoDijkstra {
        List<Cidade> caminho;
        double distancia;
        public ResultadoDijkstra(List<Cidade> caminho, double distancia) {
            this.caminho = caminho;
            this.distancia = distancia;
        }
    }
}
