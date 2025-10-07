public class Lutador implements Execucao {
    private String nome,nacionalidade,categoria;
    private float altura,peso;
    private int idade,vitorias,derrotas,empates;


    public Lutador(String nome, String nacionalidade, int idade,
                   float altura, float peso, int vitorias, int derrotas, int empates) {
        this.nome = nome;
        this.nacionalidade = nacionalidade;
        this.idade = idade;
        this.altura = altura;
        this.setPeso(peso);
        this.vitorias = vitorias;
        this.derrotas = derrotas;
        this.empates = empates;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public String getNacionalidade() {
        return nacionalidade;
    }

    public void setNacionalidade(String nacionalidade) {
        this.nacionalidade = nacionalidade;
    }

    public int getIdade() {
        return idade;
    }

    public void setIdade(int idade) {
        this.idade = idade;
    }

    public float getAltura() {
        return altura;
    }

    public void setAltura(float altura) {
        this.altura = altura;
    }

    public float getPeso() {
        return peso;
    }

    public void setPeso(float peso) {
        this.peso = peso;
        this.setCategoria();
    }

    public String getCategoria() {
        return categoria;
    }

    private void setCategoria() {
        if (getPeso()<52.2){
           this.categoria = "Inválido";
        }else if(getPeso()<=70.3){
           this.categoria = "Leve";
        }else if(getPeso()<=83.9){
           this.categoria = "Médio";
        }else if (getPeso()<=120.2){
           this.categoria = "Pesado";
        }else{
           this.categoria = "Inválido";
        }
    }

    public int getVitorias() {
        return vitorias;
    }

    public void setVitorias(int vitorias) {
        this.vitorias = vitorias;
    }

    public int getDerrotas() {
        return derrotas;
    }

    public void setDerrotas(int derrotas) {
        this.derrotas = derrotas;
    }

    public int getEmpates() {
        return empates;
    }

    public void setEmpates(int empates) {
        this.empates = empates;
    }

    @Override
    public void apresentar() {
        System.out.println("---------------------------------------");
        System.out.println("CHEGOU A HORA! Apresentamos o lutador ");
        System.out.println("Lutador: "+getNome());
        System.out.println("Origem: "+getNacionalidade());
        System.out.println("Idade: "+getIdade());
        System.out.println("Altura: "+getAltura());
        System.out.println("Peso: "+getPeso()+" KG");
        System.out.println("Vitorias: "+getVitorias());
        System.out.println("Derrotas: "+getDerrotas());
        System.out.println("Empates: "+getEmpates());
    }

    @Override
    public void status() {
        System.out.println(getNome());
        System.out.println(" e um peso " + getCategoria());
        System.out.println(getVitorias()+" vitórias ");
        System.out.println(getDerrotas()+" derrotas ");
        System.out.println(getEmpates()+" empates ");
    }

    @Override
    public void ganharLuta() {
        this.setVitorias(getVitorias()+1);
    }

    @Override
    public void perderLuta() {
        this.setDerrotas(getDerrotas()+1);
    }

    @Override
    public void empatarLuta() {
        this.setEmpates(getEmpates()+1);
    }
}
