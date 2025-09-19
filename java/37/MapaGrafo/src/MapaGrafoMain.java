import java.util.*;

/**
 * Classe principal que demonstra o uso do grafo do mapa brasileiro
 * Cria o grafo com todas as capitais e rodovias do arquivo mapa.md
 */
public class MapaGrafoMain {
    
    public static void main(String[] args) {
        System.out.println("=== CONSTRUINDO GRAFO DO MAPA BRASILEIRO ===\n");
        
        // Criar o grafo
        GrafoMapa mapa = new GrafoMapa();
        
        // Adicionar todas as capitais brasileiras
        adicionarCapitais(mapa);
        
        // Adicionar todas as rodovias
        adicionarRodovias(mapa);
        
        // Demonstrar funcionalidades do grafo
        demonstrarFuncionalidades(mapa);
    }
    
    /**
     * Adiciona todas as capitais brasileiras ao grafo
     * @param mapa Grafo onde as cidades serão adicionadas
     */
    private static void adicionarCapitais(GrafoMapa mapa) {
        System.out.println("Adicionando capitais brasileiras...");
        
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
        
        System.out.println("✓ " + mapa.getCidades().size() + " capitais adicionadas\n");
    }
    
    /**
     * Adiciona todas as rodovias principais ao grafo
     * @param mapa Grafo onde as rodovias serão adicionadas
     */
    private static void adicionarRodovias(GrafoMapa mapa) {
        System.out.println("Adicionando rodovias federais...");
        
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
        
        System.out.println("✓ " + mapa.getRodovias().size() + " rodovias adicionadas\n");
    }
    
    /**
     * Demonstra as funcionalidades do grafo
     * @param mapa Grafo para demonstração
     */
    private static void demonstrarFuncionalidades(GrafoMapa mapa) {
        System.out.println("=== DEMONSTRAÇÃO DAS FUNCIONALIDADES ===\n");
        
        // Estatísticas do grafo
        System.out.println(mapa.getEstatisticas() + "\n");
        
        // Buscar cidade específica
        Cidade cidade_especifica = mapa.buscarCidade("Belo Horizonte");
        System.out.println("Cidade encontrada: " + cidade_especifica);
        System.out.println("Região: " + cidade_especifica.getRegiao() + "\n");
        
        // Mostrar conexões de Brasília
        System.out.println("Conexões diretas de: "+cidade_especifica);
        List<Cidade> conectadas = mapa.getCidadesConectadas(cidade_especifica);
        for (Cidade cidade : conectadas) {
            System.out.println("  → " + cidade);
        }
        System.out.println();
        
        // Buscar caminho entre duas cidades
        Cidade origem = mapa.buscarCidade("Manaus");
        Cidade destino = mapa.buscarCidade("Porto Alegre");
        
        System.out.println("Buscando caminho de " + origem + " até " + destino + ":");
        List<Cidade> caminho = mapa.buscarCaminho(origem, destino);
        
        if (caminho.isEmpty()) {
            System.out.println("  Caminho não encontrado!");
        } else {
            System.out.print("  Caminho: ");
            for (int i = 0; i < caminho.size(); i++) {
                System.out.print(caminho.get(i));
                if (i < caminho.size() - 1) {
                    System.out.print(" → ");
                }
            }
            System.out.println("\n  Distância: " + (caminho.size() - 1) + " conexões\n");
        }
        
        // Verificar conexão direta
        Cidade rio = mapa.buscarCidade("São Paulo");
        Cidade bh = mapa.buscarCidade("Belo Horizonte");
        
        System.out.println("Conexão direta entre " + rio + " e " + bh + ": " + 
                         (mapa.temConexaoDireta(rio, bh) ? "SIM" : "NÃO"));
        
//        // Mostrar todas as cidades por região
//        System.out.println("\n=== CIDADES POR REGIÃO ===");
//        String[] regioes = {"Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"};
//
//        for (String regiao : regioes) {
//            System.out.println("\n" + regiao + ":");
//            mapa.getCidades().stream()
//                .filter(cidade -> cidade.getRegiao().equals(regiao))
//                .forEach(cidade -> System.out.println("  - " + cidade));
//        }
    }
}
