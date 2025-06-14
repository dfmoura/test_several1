### 📘 **Resumo Didático: Componentes do React**

#### 🎯 Objetivos de Aprendizagem:

* Entender o que são componentes no React.
* Compreender o conceito de `props`.
* Criar uma página utilizando componentes e props.

---

### 🧱 O que são Componentes?

* **Componentes** são blocos reutilizáveis de código que definem partes da interface (UI).
* Eles ajudam a **organizar** e **reutilizar** o código, deixando a aplicação mais **modular**.
* Podem ser escritos como:

  * **Funções** (`function NomeDoComponente()`)
  * **Classes** (`class NomeDoComponente extends React.Component`)
* Usam uma linguagem chamada **JSX**, que mistura HTML com JavaScript.

#### ✅ Boas práticas:

* Componentes devem ter **nomes com letra maiúscula**.
* HTML no JSX usa `className` (e não `class`).

---

### 🧩 O que são Props?

* **Props** (propriedades) são **valores passados para os componentes**, como argumentos de função.
* Permitem **personalizar** o comportamento/visual do componente.
* São **somente leitura** (não devem ser alteradas dentro do componente).

#### Exemplo com função:

```jsx
function Saudacao(props) {
  return <h1>Olá, {props.nome}!</h1>;
}
```

#### Exemplo com classe:

```jsx
class Saudacao extends React.Component {
  render() {
    return <h1>Olá, {this.props.nome}!</h1>;
  }
}
```

---

### 🖼️ Renderização de Componentes

* É o processo de mostrar o componente na tela.
* Usa `ReactDOM.render(<Componente />, destino)`, onde o destino é um elemento HTML (geralmente com `id="root"`).

---

### 🔁 Interação entre Componentes

* Um componente pode **incluir outros componentes**.
* É possível passar **props diferentes para cada um**.

#### Exemplo:

```jsx
function App() {
  return (
    <div>
      <Saudacao nome="João" />
      <Saudacao nome="Maria" />
    </div>
  );
}
```

---

### 🛠️ Criando sua primeira página com React

1. **Instalar o Create React App** (ferramenta que configura tudo automaticamente).

   * Requisitos: Node.js e npm instalados.
   * Comando:

     ```bash
     npx create-react-app my-app
     cd my-app
     npm start
     ```

2. **Estrutura da aplicação**:

   * O React atualiza a tela automaticamente a cada salvamento.
   * O componente principal é o `App`, que inclui outros como `<Header />`, `<Nav />`, `<Section />` e `<Footer />`.

3. **Organização do projeto**:

   * Crie uma pasta `components/` com um arquivo `.js` para cada componente.
   * Cada componente pode ter seu próprio CSS.
   * Use `export` e `import` para montar a estrutura da página no `App.js`.

---

### 💅 Estilização com Bootstrap

* Pode-se usar o **Bootstrap 4** para estilizar a página.
* Os links do Bootstrap devem ser adicionados no `public/index.html`.

---

### 🧠 Conclusão

* Componentização torna o código mais organizado, reaproveitável e fácil de manter.
* Props permitem criar componentes dinâmicos e personalizados.
* React simplifica o desenvolvimento de interfaces modernas e interativas.