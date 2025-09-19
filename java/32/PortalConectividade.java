import java.util.List;

/**
 * Classe principal que demonstra o uso da busca em largura para verificar
 * a conectividade de páginas de um portal web
 */
public class PortalConectividade {
    
    public static void main(String[] args) {
        System.out.println("=== Sistema de Verificação de Conectividade do Portal ===\n");
        
        // Exemplo 1: Portal com todas as páginas conectadas
        System.out.println("EXEMPLO 1: Portal totalmente conectado");
        System.out.println("==========================================");
        
        // Cria um grafo com 6 páginas (vértices) e suas conexões (arestas)
        Integer[][] arestasPortal1 = {
            {0, 1}, {0, 2},  // Página 0 conecta com páginas 1 e 2
            {1, 3}, {1, 4},  // Página 1 conecta com páginas 3 e 4
            {2, 4}, {2, 5},  // Página 2 conecta com páginas 4 e 5
            {3, 5},          // Página 3 conecta com página 5
            {4, 5}           // Página 4 conecta com página 5
        };
        
        ListaAdjacencia portal1 = new ListaAdjacencia(6, arestasPortal1);
        BuscaEmLargura bfs1 = new BuscaEmLargura(portal1);
        
        System.out.println("Estrutura do portal (lista de adjacências):");
        portal1.imprimir();
        
        // Verifica conectividade a partir da página inicial (página 0)
        Vertice paginaInicial = portal1.obterVertice(0);
        bfs1.imprimirResultadoBFS(paginaInicial);
        
        // Exemplo 2: Portal com páginas desconectadas
        System.out.println("\n\nEXEMPLO 2: Portal com páginas desconectadas");
        System.out.println("=============================================");
        
        Integer[][] arestasPortal2 = {
            {0, 1}, {0, 2},  // Grupo 1: páginas 0, 1, 2
            {1, 2},
            {3, 4}, {3, 5},  // Grupo 2: páginas 3, 4, 5 (desconectado do grupo 1)
            {4, 5}
        };
        
        ListaAdjacencia portal2 = new ListaAdjacencia(6, arestasPortal2);
        BuscaEmLargura bfs2 = new BuscaEmLargura(portal2);
        
        System.out.println("Estrutura do portal (lista de adjacências):");
        portal2.imprimir();
        
        // Verifica conectividade a partir da página inicial (página 0)
        Vertice paginaInicial2 = portal2.obterVertice(0);
        bfs2.imprimirResultadoBFS(paginaInicial2);
        
        // Encontra todos os componentes conectados
        System.out.println("\nComponentes conectados encontrados:");
        List<List<Vertice>> componentes = bfs2.encontrarComponentesConectados();
        for (int i = 0; i < componentes.size(); i++) {
            System.out.print("Componente " + (i + 1) + ": ");
            for (Vertice v : componentes.get(i)) {
                System.out.print(v.getNome() + " ");
            }
            System.out.println();
        }
        
        // Exemplo 3: Demonstração de caminho mais curto
        System.out.println("\n\nEXEMPLO 3: Caminho mais curto entre páginas");
        System.out.println("=============================================");
        
        // Usa o portal conectado do exemplo 1
        Vertice origem = portal1.obterVertice(0);
        Vertice destino = portal1.obterVertice(5);
        
        List<Vertice> caminho = bfs1.encontrarCaminhoMaisCurto(origem, destino);
        int distancia = bfs1.calcularDistancia(origem, destino);
        
        System.out.println("Caminho mais curto da página " + origem.getNome() + 
                         " para a página " + destino.getNome() + ":");
        System.out.print("Páginas: ");
        for (int i = 0; i < caminho.size(); i++) {
            System.out.print(caminho.get(i).getNome());
            if (i < caminho.size() - 1) {
                System.out.print(" -> ");
            }
        }
        System.out.println("\nDistância: " + distancia + " links");
        
        // Exemplo 4: Verificação de integridade do portal
        System.out.println("\n\nEXEMPLO 4: Relatório de integridade do portal");
        System.out.println("===============================================");
        
        verificarIntegridadePortal(portal1, "Portal Principal");
        verificarIntegridadePortal(portal2, "Portal Secundário");
    }
    
    /**
     * Método auxiliar para verificar a integridade de um portal
     * @param portal grafo representando o portal
     * @param nomePortal nome do portal para exibição
     */
    private static void verificarIntegridadePortal(ListaAdjacencia portal, String nomePortal) {
        BuscaEmLargura bfs = new BuscaEmLargura(portal);
        
        System.out.println("\n" + nomePortal + ":");
        System.out.println("Total de páginas: " + portal.getNumVertices());
        
        // Verifica conectividade a partir de cada página
        int paginasInacessiveis = 0;
        for (int i = 0; i < portal.getNumVertices(); i++) {
            Vertice pagina = portal.obterVertice(i);
            if (!bfs.verificarConectividade(pagina)) {
                paginasInacessiveis++;
            }
        }
        
        if (paginasInacessiveis == 0) {
            System.out.println("Status: ✓ Portal íntegro - todas as páginas são acessíveis");
        } else {
            System.out.println("Status: ✗ Portal com problemas - " + paginasInacessiveis + 
                             " páginas podem ter links quebrados");
            
            // Mostra os componentes conectados
            List<List<Vertice>> componentes = bfs.encontrarComponentesConectados();
            System.out.println("Componentes conectados: " + componentes.size());
        }
    }
}
