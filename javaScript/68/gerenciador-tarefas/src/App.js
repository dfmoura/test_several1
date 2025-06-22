import React from 'react';
import ListaDeTarefas from './components/ListaDeTarefas';
import { TarefasProvider } from './context/TarefasContext';

function App() {
  return (
    <TarefasProvider>
      <div style={{ padding: '20px' }}>
        <h1>Gerenciador de Tarefas</h1>
        <ListaDeTarefas />
      </div>
    </TarefasProvider>
  );
}

export default App;
