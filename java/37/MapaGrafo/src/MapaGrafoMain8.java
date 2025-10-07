import java.util.*;

/**
 * Classe que encontra os K menores caminhos (1º, 2º, 3º) entre capitais
 * usando o algoritmo de Yen sobre Dijkstra, reutilizando o grafo e
 * as distâncias já definidas no projeto.
 */
public class MapaGrafoMain8 {
    private static final Scanner scanner = new Scanner(System.in);

    // Estruturas reutilizadas indiretamente: usaremos GrafoMapa e o conjunto de distâncias do Main7 (copiadas aqui)
    private static GrafoMapa mapa;
    private static Map<String, Map<String, Double>> distancias;

    /** Caminho com custo total */
    private static class Caminho implements Comparable<Caminho> {
        List<Cidade> nos;
        double custo;
        Caminho(List<Cidade> nos, double custo) { this.nos = new ArrayList<>(nos); this.custo = custo; }
        @Override public int compareTo(Caminho o) { return Double.compare(this.custo, o.custo); }
        @Override public String toString() {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < nos.size(); i++) {
                sb.append(nos.get(i));
                if (i < nos.size() - 1) sb.append(" → ");
            }
            sb.append(" | ").append(String.format("%.0f km", custo));
            return sb.toString();
        }
    }

    public static void main(String[] args) {
        System.out.println("=== K MENORES CAMINHOS (YEN) ENTRE CAPITAIS ===\n");
        inicializarGrafoEDistancias();
        menu();
    }

    private static void menu() {
        while (true) {
            System.out.println("\n1) Encontrar K menores caminhos");
            System.out.println("0) Sair");
            System.out.print("\nEscolha: ");
            String opt = scanner.nextLine().trim();
            if (opt.equals("0")) break;
            if (opt.equals("1")) executarConsulta(); else System.out.println("Opção inválida.");
        }
    }

    private static void executarConsulta() {
        Cidade origem = solicitarCidade("Digite a cidade de origem: ");
        if (origem == null) return;
        Cidade destino = solicitarCidade("Digite a cidade de destino: ");
        if (destino == null) return;
        System.out.print("Digite K (1, 2 ou 3): ");
        int K;
        try { K = Integer.parseInt(scanner.nextLine().trim()); } catch (Exception e) { System.out.println("K inválido"); return; }
        if (K < 1) K = 1; if (K > 3) K = 3;

        List<Caminho> caminhos = yenKMenoresCaminhos(origem, destino, K);
        if (caminhos.isEmpty()) {
            System.out.println("\n❌ Nenhum caminho encontrado.");
            return;
        }
        System.out.println("\n✅ Caminhos encontrados (ordenados por menor distância):");
        for (int i = 0; i < caminhos.size(); i++) {
            System.out.println(" " + (i + 1) + ") " + caminhos.get(i));
        }
        // Rodovias por caminho
        for (int i = 0; i < caminhos.size(); i++) {
            Caminho c = caminhos.get(i);
            System.out.println("\n🛣️  Detalhe das rodovias do caminho " + (i + 1) + ":");
            for (int j = 0; j < c.nos.size() - 1; j++) {
                Cidade a = c.nos.get(j), b = c.nos.get(j + 1);
                double d = getDistancia(a, b);
                String via = encontrarRodovia(a, b);
                System.out.println("   " + via + ": " + a + " → " + b + " (" + String.format("%.0f km", d) + ")");
            }
        }
    }

    // Algoritmo de Yen simplificado (até K=3) sobre Dijkstra
    private static List<Caminho> yenKMenoresCaminhos(Cidade origem, Cidade destino, int K) {
        List<Caminho> A = new ArrayList<>(); // soluções finais
        PriorityQueue<Caminho> B = new PriorityQueue<>(); // candidatos

        Caminho p0 = dijkstra(origem, destino, null, null);
        if (p0 == null) return A;
        A.add(p0);

        for (int k = 1; k < K; k++) {
            Caminho anterior = A.get(k - 1);
            for (int i = 0; i < anterior.nos.size() - 1; i++) {
                Cidade spurNode = anterior.nos.get(i);
                List<Cidade> rootPath = anterior.nos.subList(0, i + 1);

                // Bloqueios temporários: arestas que duplicariam prefixos já usados
                Set<String> arestasBanidas = new HashSet<>();
                Set<Cidade> nosBanidos = new HashSet<>();

                for (Caminho p : A) {
                    if (p.nos.size() > i && p.nos.subList(0, i + 1).equals(rootPath)) {
                        Cidade u = p.nos.get(i);
                        Cidade v = p.nos.get(i + 1);
                        arestasBanidas.add(chaveAresta(u, v));
                    }
                }
                // Banir nós do rootPath exceto spurNode
                for (Cidade n : rootPath) if (!n.equals(spurNode)) nosBanidos.add(n);

                Caminho spurPath = dijkstra(spurNode, destino, arestasBanidas, nosBanidos);
                if (spurPath != null) {
                    List<Cidade> total = new ArrayList<>(rootPath);
                    total.addAll(spurPath.nos.subList(1, spurPath.nos.size()));
                    double custo = calcularCusto(total);
                    B.add(new Caminho(total, custo));
                }
            }
            if (B.isEmpty()) break;
            A.add(B.poll());
        }
        return A;
    }

    // Dijkstra com bloqueio de arestas/nós
    private static Caminho dijkstra(Cidade origem, Cidade destino, Set<String> arestasBanidas, Set<Cidade> nosBanidos) {
        Map<Cidade, Double> dist = new HashMap<>();
        Map<Cidade, Cidade> prev = new HashMap<>();
        PriorityQueue<Cidade> pq = new PriorityQueue<>(Comparator.comparing(dist::get));
        for (Cidade c : mapa.getCidades()) dist.put(c, Double.MAX_VALUE);
        dist.put(origem, 0.0); pq.add(origem);
        while (!pq.isEmpty()) {
            Cidade u = pq.poll();
            if (u.equals(destino)) break;
            if (nosBanidos != null && nosBanidos.contains(u)) continue;
            for (Cidade v : mapa.getCidadesConectadas(u)) {
                if (nosBanidos != null && nosBanidos.contains(v)) continue;
                if (arestasBanidas != null && arestasBanidas.contains(chaveAresta(u, v))) continue;
                double w = getDistancia(u, v);
                if (w == Double.MAX_VALUE) continue;
                double nd = dist.get(u) + w;
                if (nd < dist.get(v)) { dist.put(v, nd); prev.put(v, u); pq.add(v); }
            }
        }
        if (dist.get(destino) == null || dist.get(destino) == Double.MAX_VALUE) return null;
        List<Cidade> caminho = new ArrayList<>();
        for (Cidade at = destino; at != null; at = prev.get(at)) caminho.add(0, at);
        return new Caminho(caminho, dist.get(destino));
    }

    private static String chaveAresta(Cidade a, Cidade b) {
        // não direcionado
        String s1 = a.getNome() + "#" + b.getNome();
        String s2 = b.getNome() + "#" + a.getNome();
        return s1.compareTo(s2) <= 0 ? s1 : s2;
    }

    // Inicializa o grafo e as distâncias (mesmo conjunto do Main7)
    private static void inicializarGrafoEDistancias() {
        mapa = new GrafoMapa();
        // Capitais
        adicionarCapitais();
        // Rodovias
        adicionarRodovias();
        // Distâncias
        inicializarDistancias();
        System.out.println("✓ Grafo e distâncias prontos. Cidades: " + mapa.getCidades().size());
    }

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

    private static void adicionarRodovias() {
        mapa.adicionarRodovia(new Rodovia("BR-010", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Belém"), "Radial Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-020", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Fortaleza"), "Radial Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-040", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Rio de Janeiro"), "Radial Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-050", mapa.buscarCidade("Brasília"), mapa.buscarCidade("São Paulo"), "Radial Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-060", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Campo Grande"), "Radial Centro-Oeste"));
        mapa.adicionarRodovia(new Rodovia("BR-070", mapa.buscarCidade("Brasília"), mapa.buscarCidade("Cuiabá"), "Radial Centro-Oeste"));
        mapa.adicionarRodovia(new Rodovia("BR-060", mapa.buscarCidade("Goiânia"), mapa.buscarCidade("Brasília"), "Conexão Centro-Oeste"));
        mapa.adicionarRodovia(new Rodovia("BR-364", mapa.buscarCidade("Cuiabá"), mapa.buscarCidade("Porto Velho"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-364", mapa.buscarCidade("Porto Velho"), mapa.buscarCidade("Rio Branco"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-040", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("Brasília"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-381", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("São Paulo"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-262", mapa.buscarCidade("Belo Horizonte"), mapa.buscarCidade("Vitória"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("São Paulo"), mapa.buscarCidade("Rio de Janeiro"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Vitória"), mapa.buscarCidade("Rio de Janeiro"), "Conexão Sudeste"));
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("São Paulo"), mapa.buscarCidade("Curitiba"), "Conexão Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-376", mapa.buscarCidade("Curitiba"), mapa.buscarCidade("Florianópolis"), "Conexão Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Florianópolis"), mapa.buscarCidade("Porto Alegre"), "Conexão Sul"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Natal"), mapa.buscarCidade("João Pessoa"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("João Pessoa"), mapa.buscarCidade("Recife"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Recife"), mapa.buscarCidade("Maceió"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Maceió"), mapa.buscarCidade("Aracaju"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-101", mapa.buscarCidade("Aracaju"), mapa.buscarCidade("Salvador"), "Litoral Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-242", mapa.buscarCidade("Salvador"), mapa.buscarCidade("Brasília"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-116", mapa.buscarCidade("Salvador"), mapa.buscarCidade("Fortaleza"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-222", mapa.buscarCidade("Fortaleza"), mapa.buscarCidade("Teresina"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-316", mapa.buscarCidade("Teresina"), mapa.buscarCidade("São Luís"), "Conexão Nordeste"));
        mapa.adicionarRodovia(new Rodovia("BR-153", mapa.buscarCidade("Palmas"), mapa.buscarCidade("Brasília"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-153", mapa.buscarCidade("Belém"), mapa.buscarCidade("Palmas"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-319", mapa.buscarCidade("Manaus"), mapa.buscarCidade("Porto Velho"), "Conexão Norte"));
        mapa.adicionarRodovia(new Rodovia("BR-174", mapa.buscarCidade("Boa Vista"), mapa.buscarCidade("Manaus"), "Conexão Norte"));
    }

    private static void inicializarDistancias() {
        distancias = new HashMap<>();
        Map<String, Double> brasilia = new HashMap<>();
        brasilia.put("Belém", 2110.0); brasilia.put("Fortaleza", 2200.0); brasilia.put("Rio de Janeiro", 1140.0);
        brasilia.put("São Paulo", 1015.0); brasilia.put("Campo Grande", 1134.0); brasilia.put("Cuiabá", 1134.0);
        brasilia.put("Goiânia", 209.0); brasilia.put("Belo Horizonte", 740.0); brasilia.put("Salvador", 1090.0);
        brasilia.put("Palmas", 973.0); distancias.put("Brasília", brasilia);
        Map<String, Double> saoPaulo = new HashMap<>();
        saoPaulo.put("Rio de Janeiro", 429.0); saoPaulo.put("Belo Horizonte", 586.0); saoPaulo.put("Curitiba", 408.0);
        distancias.put("São Paulo", saoPaulo);
        Map<String, Double> rio = new HashMap<>(); rio.put("Belo Horizonte", 434.0); rio.put("Vitória", 521.0);
        distancias.put("Rio de Janeiro", rio);
        Map<String, Double> bh = new HashMap<>(); bh.put("Vitória", 524.0); distancias.put("Belo Horizonte", bh);
        Map<String, Double> cwb = new HashMap<>(); cwb.put("Florianópolis", 300.0); distancias.put("Curitiba", cwb);
        Map<String, Double> fln = new HashMap<>(); fln.put("Porto Alegre", 460.0); distancias.put("Florianópolis", fln);
        Map<String, Double> nat = new HashMap<>(); nat.put("João Pessoa", 180.0); distancias.put("Natal", nat);
        Map<String, Double> jpa = new HashMap<>(); jpa.put("Recife", 120.0); distancias.put("João Pessoa", jpa);
        Map<String, Double> rec = new HashMap<>(); rec.put("Maceió", 285.0); distancias.put("Recife", rec);
        Map<String, Double> mac = new HashMap<>(); mac.put("Aracaju", 294.0); distancias.put("Maceió", mac);
        Map<String, Double> aju = new HashMap<>(); aju.put("Salvador", 356.0); distancias.put("Aracaju", aju);
        Map<String, Double> ssa = new HashMap<>(); ssa.put("Fortaleza", 1089.0); distancias.put("Salvador", ssa);
        Map<String, Double> forx = new HashMap<>(); forx.put("Teresina", 634.0); distancias.put("Fortaleza", forx);
        Map<String, Double> the = new HashMap<>(); the.put("São Luís", 446.0); distancias.put("Teresina", the);
        Map<String, Double> bel = new HashMap<>(); bel.put("Palmas", 1137.0); distancias.put("Belém", bel);
        Map<String, Double> cui = new HashMap<>(); cui.put("Porto Velho", 694.0); distancias.put("Cuiabá", cui);
        Map<String, Double> pvh = new HashMap<>(); pvh.put("Rio Branco", 544.0); distancias.put("Porto Velho", pvh);
        Map<String, Double> maa = new HashMap<>(); maa.put("Porto Velho", 890.0); distancias.put("Manaus", maa);
        Map<String, Double> bvb = new HashMap<>(); bvb.put("Manaus", 785.0); distancias.put("Boa Vista", bvb);
    }

    private static double getDistancia(Cidade a, Cidade b) {
        if (a.equals(b)) return 0.0;
        Map<String, Double> m1 = distancias.get(a.getNome());
        if (m1 != null && m1.containsKey(b.getNome())) return m1.get(b.getNome());
        Map<String, Double> m2 = distancias.get(b.getNome());
        if (m2 != null && m2.containsKey(a.getNome())) return m2.get(a.getNome());
        return Double.MAX_VALUE;
    }

    private static double calcularCusto(List<Cidade> caminho) {
        double total = 0.0;
        for (int i = 0; i < caminho.size() - 1; i++) total += getDistancia(caminho.get(i), caminho.get(i + 1));
        return total;
    }

    private static Cidade solicitarCidade(String prompt) {
        System.out.print(prompt);
        String nome = scanner.nextLine().trim();
        Cidade c = mapa.buscarCidade(nome);
        if (c == null) System.out.println("❌ Cidade não encontrada: " + nome);
        return c;
    }

    private static String encontrarRodovia(Cidade a, Cidade b) {
        for (Rodovia r : mapa.getRodoviasDe(a)) if (r.conecta(a, b)) return r.getNumero();
        return "(rodovia desconhecida)";
    }
}
