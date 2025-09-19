import java.util.*;

/**
 * Classe principal interativa que demonstra o uso do grafo do mapa brasileiro
 * Permite ao usuário buscar cidades e caminhos através de interface de linha de comando
 */
public class MapaGrafoMain2 {
    private static Scanner scanner = new Scanner(System.in);
    private static GrafoMapa mapa;
    
    public static void main(String[] args) {
        System.out.println("=== GRAFO INTERATIVO DO MAPA BRASILEIRO ===\n");
        
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
        
        System.out.println("✓ Grafo inicializado com sucesso!\n");
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
            System.out.println("\n=== MENU PRINCIPAL ===");
            System.out.println("1. Mostrar todas as rotas disponíveis");
            System.out.println("2. Buscar cidade específica");
            System.out.println("3. Buscar caminho entre duas cidades");
            System.out.println("4. Mostrar estatísticas do grafo");
            System.out.println("5. Listar todas as cidades por região");
            System.out.println("0. Sair");
            System.out.print("\nEscolha uma opção: ");
            
            try {
                opcao = scanner.nextInt();
                scanner.nextLine(); // Limpar buffer
                
                switch (opcao) {
                    case 1:
                        mostrarRotasDisponiveis();
                        break;
                    case 2:
                        buscarCidadeEspecifica();
                        break;
                    case 3:
                        buscarCaminhoEntreCidades();
                        break;
                    case 4:
                        mostrarEstatisticas();
                        break;
                    case 5:
                        listarCidadesPorRegiao();
                        break;
                    case 0:
                        System.out.println("\nObrigado por usar o Grafo do Mapa Brasileiro!");
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
     * Mostra todas as rotas disponíveis no grafo
     */
    private static void mostrarRotasDisponiveis() {
        System.out.println("\n=== ROTAS DISPONÍVEIS NO MAPA BRASILEIRO ===");
        
        for (Cidade cidade : mapa.getCidades()) {
            System.out.println("\n📍 " + cidade + " (" + cidade.getRegiao() + "):");
            List<Cidade> conectadas = mapa.getCidadesConectadas(cidade);
            
            if (conectadas.isEmpty()) {
                System.out.println("   - Sem conexões diretas");
            } else {
                for (Cidade conectada : conectadas) {
                    // Encontrar a rodovia que conecta essas cidades
                    List<Rodovia> rodovias = mapa.getRodoviasDe(cidade);
                    for (Rodovia rodovia : rodovias) {
                        if (rodovia.conecta(cidade, conectada)) {
                            System.out.println("   → " + conectada + " via " + rodovia.getNumero());
                            break;
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Busca uma cidade específica baseada na entrada do usuário
     */
    private static void buscarCidadeEspecifica() {
        System.out.println("\n=== BUSCAR CIDADE ESPECÍFICA ===");
        System.out.print("Digite o nome da cidade: ");
        String nomeCidade = scanner.nextLine().trim();
        
        Cidade cidade = mapa.buscarCidade(nomeCidade);
        
        if (cidade != null) {
            System.out.println("\n✅ Cidade encontrada!");
            System.out.println("Nome: " + cidade.getNome());
            System.out.println("Estado: " + cidade.getEstado());
            System.out.println("Região: " + cidade.getRegiao());
            
            // Mostrar conexões da cidade
            List<Cidade> conectadas = mapa.getCidadesConectadas(cidade);
            System.out.println("\nConexões diretas:");
            
            if (conectadas.isEmpty()) {
                System.out.println("   - Sem conexões diretas");
            } else {
                for (Cidade conectada : conectadas) {
                    List<Rodovia> rodovias = mapa.getRodoviasDe(cidade);
                    for (Rodovia rodovia : rodovias) {
                        if (rodovia.conecta(cidade, conectada)) {
                            System.out.println("   → " + conectada + " via " + rodovia.getNumero());
                            break;
                        }
                    }
                }
            }
        } else {
            System.out.println("\n❌ Cidade não encontrada!");
            System.out.println("Cidades disponíveis:");
            mapa.getCidades().stream()
                .sorted(Comparator.comparing(Cidade::getNome))
                .forEach(c -> System.out.println("   - " + c));
        }
    }
    
    /**
     * Busca o caminho entre duas cidades baseado na entrada do usuário
     */
    private static void buscarCaminhoEntreCidades() {
        System.out.println("\n=== BUSCAR CAMINHO ENTRE DUAS CIDADES ===");
        
        // Buscar cidade de origem
        System.out.print("Digite a cidade de origem: ");
        String origemNome = scanner.nextLine().trim();
        Cidade origem = mapa.buscarCidade(origemNome);
        
        if (origem == null) {
            System.out.println("❌ Cidade de origem não encontrada!");
            return;
        }
        
        // Buscar cidade de destino
        System.out.print("Digite a cidade de destino: ");
        String destinoNome = scanner.nextLine().trim();
        Cidade destino = mapa.buscarCidade(destinoNome);
        
        if (destino == null) {
            System.out.println("❌ Cidade de destino não encontrada!");
            return;
        }
        
        if (origem.equals(destino)) {
            System.out.println("⚠️  Cidade de origem e destino são iguais!");
            return;
        }
        
        System.out.println("\n🔍 Buscando caminho de " + origem + " até " + destino + "...");
        
        List<Cidade> caminho = mapa.buscarCaminho(origem, destino);
        
        if (caminho.isEmpty()) {
            System.out.println("❌ Caminho não encontrado entre as cidades!");
        } else {
            System.out.println("\n✅ Caminho encontrado:");
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
    
    /**
     * Mostra as estatísticas do grafo
     */
    private static void mostrarEstatisticas() {
        System.out.println("\n=== ESTATÍSTICAS DO GRAFO ===");
        System.out.println(mapa.getEstatisticas());
    }
    
    /**
     * Lista todas as cidades organizadas por região
     */
    private static void listarCidadesPorRegiao() {
        System.out.println("\n=== CIDADES POR REGIÃO ===");
        
        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
        
        for (String regiao : regioes) {
            System.out.println("\n📍 " + regiao + ":");
            List<Cidade> cidadesRegiao = mapa.getCidades().stream()
                .filter(cidade -> cidade.getRegiao().equals(regiao))
                .sorted(Comparator.comparing(Cidade::getNome))
                .toList();
            
            if (cidadesRegiao.isEmpty()) {
                System.out.println("   - Nenhuma cidade encontrada");
            } else {
                for (Cidade cidade : cidadesRegiao) {
                    System.out.println("   - " + cidade);
                }
            }
        }
    }
}
