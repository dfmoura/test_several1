function App() {
    const [count, setCount] = React.useState(0); // State para o contador

    return (
        <div className="container">
            <h1>Bem-vindo ao React!</h1>
            <p>Este é um exemplo simples de uma aplicação React com contador.</p>
            <p>Você clicou <strong>{count}</strong> vezes.</p>
            <button onClick={() => setCount(count + 1)}>Clique Aqui</button>
        </div>
    );
}

// Renderizar o componente no DOM
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
