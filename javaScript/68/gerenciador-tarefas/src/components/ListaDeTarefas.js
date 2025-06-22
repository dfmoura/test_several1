import React, { useContext, useState } from 'react';
import { TarefasContext } from '../context/TarefasContext';
import Tarefa from './Tarefa';

function ListaDeTarefas() {
  const { state, dispatch } = useContext(TarefasContext);
  const [novaTarefa, setNovaTarefa] = useState('');

  const adicionarTarefa = () => {
    if (novaTarefa.trim() === '') return;

    const tarefa = {
      id: Date.now(),
      texto: novaTarefa,
      concluida: false
    };

    dispatch({ type: 'ADICIONAR', payload: tarefa });
    setNovaTarefa('');
  };

  const tarefasFiltradas = state.tarefas.filter(tarefa => {
    if (state.filtro === 'concluidas') return tarefa.concluida;
    if (state.filtro === 'pendentes') return !tarefa.concluida;
    return true;
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Digite uma tarefa"
        value={novaTarefa}
        onChange={e => setNovaTarefa(e.target.value)}
      />
      <button onClick={adicionarTarefa}>Adicionar</button>

      <div style={{ marginTop: '20px' }}>
        <button onClick={() => dispatch({ type: 'FILTRO', payload: 'todas' })}>Todas</button>
        <button onClick={() => dispatch({ type: 'FILTRO', payload: 'concluidas' })}>Concluídas</button>
        <button onClick={() => dispatch({ type: 'FILTRO', payload: 'pendentes' })}>Pendentes</button>
      </div>

      <ul>
        {tarefasFiltradas.map(tarefa => (
          <Tarefa key={tarefa.id} tarefa={tarefa} />
        ))}
      </ul>
    </div>
  );
}

export default ListaDeTarefas;
