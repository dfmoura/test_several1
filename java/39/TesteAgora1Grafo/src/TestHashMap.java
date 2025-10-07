import java.util.HashMap;
import java.util.Collection;

public class TestHashMap {
    public static void main(String[] args) {
        HashMap<String, Integer> mapa = new HashMap<>();

         // adicionar elementos (chave -> valor)
         mapa.put("diogo",30);
         mapa.put("jordan",13);
         mapa.put("debora",18);
         mapa.put("iara",44);

        System.out.println("Idade do diogo: "+mapa.get("diogo"));
        System.out.println("Tem chave iara: "+mapa.containsKey("iara"));
        System.out.println("Tem algum valor de: "+mapa.containsValue(18));
        System.out.println("Tem algum valor de: "+mapa.containsValue(2));

        mapa.remove("jordan");

        // percorrer o mapa
        for (String nome: mapa.keySet()){
            System.out.println(nome+" -> "+mapa.get(nome));
        }


        // Pegar todos os valores
        Collection<Integer> valores = mapa.values();

        System.out.println("Valores: " + valores);

        // Percorrer valores
        for (Integer idade : valores) {
            System.out.println("Valor: " + idade);
        }



    }
}
