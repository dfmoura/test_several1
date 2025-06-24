import React, { useReducer, createContext, useContext, useState } from 'react';
import ListaDeTarefas from './ListaDeTarefas';

// Estado inicial
const initialState = {
  tarefas: []
};

// Criar contexto
const TarefasContext = createContext();

// Reducer para manipular estado global
function tarefasReducer(state, action) {
  switch(action.type) {
    case 'ADICIONAR_TAREFA':
      return { tarefas: [...state.tarefas, { id: Date.now(), texto: action.texto, concluida: false }] };
    case 'TOGGLE_TAREFA':
      return {
        tarefas: state.tarefas.map(t =>
          t.id === action.id ? {...t, concluida: !t.concluida} : t
        )
      };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(tarefasReducer, initialState);
  const [filtro, setFiltro] = useState('todas');

  return (
    <TarefasContext.Provider value={{ state, dispatch }}>
      <div>
        <h1>Gerenciador de Tarefas</h1>
        <AdicionarTarefa />
        <Filtros setFiltro={setFiltro} filtro={filtro} />
        <ListaDeTarefas filtro={filtro} />
      </div>
    </TarefasContext.Provider>
  );
}

function AdicionarTarefa() {
  const [texto, setTexto] = useState('');
  const { dispatch } = useContext(TarefasContext);

  const adicionar = () => {
    if(texto.trim() === '') return;
    dispatch({ type: 'ADICIONAR_TAREFA', texto });
    setTexto('');
  };

  return (
    <div>
      <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Nova tarefa" />
      <button onClick={adicionar}>Adicionar</button>
    </div>
  );
}

function Filtros({ setFiltro, filtro }) {
  return (
    <div>
      <button onClick={() => setFiltro('todas')} disabled={filtro === 'todas'}>Todas</button>
      <button onClick={() => setFiltro('concluidas')} disabled={filtro === 'concluidas'}>Concluídas</button>
      <button onClick={() => setFiltro('pendentes')} disabled={filtro === 'pendentes'}>Pendentes</button>
    </div>
  );
}

export { TarefasContext };
export default App;
