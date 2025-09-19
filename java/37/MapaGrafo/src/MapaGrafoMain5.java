import java.util.*;

/**
 * Classe principal que demonstra roteamento dinâmico no grafo do mapa brasileiro
 * Permite ao usuário definir rotas com pontos obrigatórios e pontos a serem evitados
 */
public class MapaGrafoMain5 {
    private static Scanner scanner = new Scanner(System.in);
    private static GrafoMapa mapa;
    
    public static void main(String[] args) {
        System.out.println("=== ROTEAMENTO DINÂMICO - MAPA BRASILEIRO ===\n");
        
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
        
        System.out.println("✓ Grafo inicializado com " + mapa.getCidades().size() + " cidades e " + 
                          mapa.getRodovias().size() + " rodovias\n");
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
     * Exibe o menu principal e processa as opções do usuário
     */
    private static void exibirMenu() {
        int opcao;
        
        do {
            System.out.println("\n=== MENU DE ROTEAMENTO DINÂMICO ===");
            System.out.println("1. Buscar rota simples (origem → destino)");
            System.out.println("2. Buscar rota passando por cidade específica");
            System.out.println("3. Buscar rota evitando cidade específica");
            System.out.println("4. Buscar rota com múltiplas restrições");
            System.out.println("5. Mostrar exemplos de rotas");
            System.out.println("6. Listar todas as cidades disponíveis");
            System.out.println("0. Sair");
            System.out.print("\nEscolha uma opção: ");
            
            try {
                opcao = scanner.nextInt();
                scanner.nextLine(); // Limpar buffer
                
                switch (opcao) {
                    case 1:
                        buscarRotaSimples();
                        break;
                    case 2:
                        buscarRotaPassandoPor();
                        break;
                    case 3:
                        buscarRotaEvitando();
                        break;
                    case 4:
                        buscarRotaComRestricoes();
                        break;
                    case 5:
                        mostrarExemplos();
                        break;
                    case 6:
                        listarCidades();
                        break;
                    case 0:
                        System.out.println("\nObrigado por usar o Roteamento Dinâmico!");
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
     * Busca uma rota simples entre duas cidades
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
     * Busca uma rota passando por uma cidade específica
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
     * Busca uma rota evitando uma cidade específica
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
     * Busca uma rota com múltiplas restrições
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
     * Mostra exemplos de rotas com restrições
     */
    private static void mostrarExemplos() {
        System.out.println("\n=== EXEMPLOS DE ROTAS COM RESTRIÇÕES ===");
        
        System.out.println("\n📋 Exemplos disponíveis:");
        System.out.println("a) São Luís → Belo Horizonte, passando por Recife e não passando por Maceió");
        System.out.println("b) Natal → Campo Grande, não passando por Salvador e não passando por Palmas");
        System.out.println("c) Belo Horizonte → Palmas, passando por Florianópolis");
        
        System.out.print("\nEscolha um exemplo (a, b ou c): ");
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
            default:
                System.out.println("❌ Exemplo inválido!");
        }
    }
    
    /**
     * Executa o exemplo A: São Luís → Belo Horizonte, passando por Recife e não passando por Maceió
     */
    private static void executarExemploA() {
        System.out.println("\n=== EXEMPLO A ===");
        Cidade origem = mapa.buscarCidade("São Luís");
        Cidade destino = mapa.buscarCidade("Belo Horizonte");
        Cidade passandoPor = mapa.buscarCidade("Recife");
        Cidade evitando = mapa.buscarCidade("Maceió");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        System.out.println("Passando por: " + passandoPor);
        System.out.println("Evitando: " + evitando);
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
            Arrays.asList(passandoPor), Arrays.asList(evitando));
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Executa o exemplo B: Natal → Campo Grande, não passando por Salvador e não passando por Palmas
     */
    private static void executarExemploB() {
        System.out.println("\n=== EXEMPLO B ===");
        Cidade origem = mapa.buscarCidade("Natal");
        Cidade destino = mapa.buscarCidade("Campo Grande");
        Cidade evitando1 = mapa.buscarCidade("Salvador");
        Cidade evitando2 = mapa.buscarCidade("Palmas");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        System.out.println("Evitando: " + evitando1 + " e " + evitando2);
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
            new ArrayList<>(), Arrays.asList(evitando1, evitando2));
        exibirResultadoRota(caminho, origem, destino);
    }
    
    /**
     * Executa o exemplo C: Belo Horizonte → Palmas, passando por Florianópolis
     */
    private static void executarExemploC() {
        System.out.println("\n=== EXEMPLO C ===");
        Cidade origem = mapa.buscarCidade("Belo Horizonte");
        Cidade destino = mapa.buscarCidade("Palmas");
        Cidade passandoPor = mapa.buscarCidade("Florianópolis");
        
        System.out.println("Origem: " + origem);
        System.out.println("Destino: " + destino);
        System.out.println("Passando por: " + passandoPor);
        
        List<Cidade> caminho = buscarCaminhoComRestricoes(origem, destino, 
            Arrays.asList(passandoPor), new ArrayList<>());
        exibirResultadoRota(caminho, origem, destino);
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
     * Solicita uma cidade ao usuário
     * @param mensagem Mensagem a ser exibida
     * @return Cidade encontrada ou null se não encontrada
     */
    private static Cidade solicitarCidade(String mensagem) {
        System.out.print(mensagem);
        String nomeCidade = scanner.nextLine().trim();
        
        if (nomeCidade.equalsIgnoreCase("fim")) {
            return null;
        }
        
        Cidade cidade = mapa.buscarCidade(nomeCidade);
        
        if (cidade == null) {
            System.out.println("❌ Cidade não encontrada: " + nomeCidade);
            System.out.println("💡 Dica: Use o menu 'Listar cidades' para ver as cidades disponíveis");
            return null;
        }
        
        return cidade;
    }
    
    /**
     * Busca caminho passando por uma cidade específica
     */
    private static List<Cidade> buscarCaminhoPassandoPor(Cidade origem, Cidade destino, Cidade passandoPor) {
        // Buscar caminho da origem até a cidade obrigatória
        List<Cidade> caminho1 = mapa.buscarCaminho(origem, passandoPor);
        if (caminho1.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Buscar caminho da cidade obrigatória até o destino
        List<Cidade> caminho2 = mapa.buscarCaminho(passandoPor, destino);
        if (caminho2.isEmpty()) {
            return new ArrayList<>();
        }
        
        // Combinar os caminhos
        List<Cidade> caminhoCompleto = new ArrayList<>(caminho1);
        caminhoCompleto.addAll(caminho2.subList(1, caminho2.size())); // Evitar duplicar a cidade intermediária
        
        return caminhoCompleto;
    }
    
    /**
     * Busca caminho evitando uma cidade específica
     */
    private static List<Cidade> buscarCaminhoEvitando(Cidade origem, Cidade destino, Cidade evitando) {
        // Criar uma cópia do grafo sem a cidade a ser evitada
        GrafoMapa grafoTemporario = criarGrafoSemCidade(evitando);
        
        // Buscar caminho no grafo modificado
        return grafoTemporario.buscarCaminho(origem, destino);
    }
    
    /**
     * Busca caminho com múltiplas restrições
     */
    private static List<Cidade> buscarCaminhoComRestricoes(Cidade origem, Cidade destino, 
                                                          List<Cidade> passandoPor, List<Cidade> evitando) {
        // Se não há cidades obrigatórias, usar busca simples evitando as cidades proibidas
        if (passandoPor.isEmpty()) {
            return buscarCaminhoEvitandoMultiplas(origem, destino, evitando);
        }
        
        // Se há cidades obrigatórias, construir caminho passando por todas elas
        List<Cidade> caminhoCompleto = new ArrayList<>();
        Cidade atual = origem;
        
        for (Cidade cidadeObrigatoria : passandoPor) {
            List<Cidade> segmento = buscarCaminhoEvitandoMultiplas(atual, cidadeObrigatoria, evitando);
            if (segmento.isEmpty()) {
                return new ArrayList<>();
            }
            
            if (caminhoCompleto.isEmpty()) {
                caminhoCompleto.addAll(segmento);
            } else {
                caminhoCompleto.addAll(segmento.subList(1, segmento.size()));
            }
            atual = cidadeObrigatoria;
        }
        
        // Adicionar segmento final até o destino
        List<Cidade> segmentoFinal = buscarCaminhoEvitandoMultiplas(atual, destino, evitando);
        if (segmentoFinal.isEmpty()) {
            return new ArrayList<>();
        }
        
        caminhoCompleto.addAll(segmentoFinal.subList(1, segmentoFinal.size()));
        return caminhoCompleto;
    }
    
    /**
     * Busca caminho evitando múltiplas cidades
     */
    private static List<Cidade> buscarCaminhoEvitandoMultiplas(Cidade origem, Cidade destino, List<Cidade> evitando) {
        // Criar grafo temporário sem as cidades a serem evitadas
        GrafoMapa grafoTemporario = mapa;
        
        for (Cidade cidadeEvitar : evitando) {
            grafoTemporario = criarGrafoSemCidade(grafoTemporario, cidadeEvitar);
        }
        
        return grafoTemporario.buscarCaminho(origem, destino);
    }
    
    /**
     * Cria uma cópia do grafo sem uma cidade específica
     */
    private static GrafoMapa criarGrafoSemCidade(Cidade cidadeEvitar) {
        return criarGrafoSemCidade(mapa, cidadeEvitar);
    }
    
    /**
     * Cria uma cópia do grafo sem uma cidade específica
     */
    private static GrafoMapa criarGrafoSemCidade(GrafoMapa grafoOriginal, Cidade cidadeEvitar) {
        GrafoMapa novoGrafo = new GrafoMapa();
        
        // Adicionar todas as cidades exceto a que deve ser evitada
        for (Cidade cidade : grafoOriginal.getCidades()) {
            if (!cidade.equals(cidadeEvitar)) {
                novoGrafo.adicionarCidade(cidade);
            }
        }
        
        // Adicionar todas as rodovias que não conectam a cidade evitada
        for (Rodovia rodovia : grafoOriginal.getRodovias()) {
            if (!rodovia.getOrigem().equals(cidadeEvitar) && !rodovia.getDestino().equals(cidadeEvitar)) {
                novoGrafo.adicionarRodovia(rodovia);
            }
        }
        
        return novoGrafo;
    }
    
    /**
     * Exibe o resultado da busca de rota
     */
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
                if (i < caminho.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println("\n\n📏 Distância: " + (caminho.size() - 1) + " conexões");
            
            // Mostrar rodovias utilizadas
            System.out.println("\n🛣️  Rodovias utilizadas:");
            for (int i = 0; i < caminho.size() - 1; i++) {
                Cidade atual = caminho.get(i);
                Cidade proxima = caminho.get(i + 1);
                
                List<Rodovia> rodovias = mapa.getRodoviasDe(atual);
                for (Rodovia rodovia : rodovias) {
                    if (rodovia.conecta(atual, proxima)) {
                        System.out.println("   " + rodovia.getNumero() + ": " + atual + " → " + proxima);
                        break;
                    }
                }
            }
        }
    }
}
