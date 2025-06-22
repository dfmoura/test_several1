import React, { useContext } from 'react';
import { TarefasContext } from './App';
import Tarefa from './Tarefa';

export default function ListaDeTarefas({ filtro }) {
  const { state } = useContext(TarefasContext);

  const filtrarTarefas = () => {
    if(filtro === 'concluidas') return state.tarefas.filter(t => t.concluida);
    if(filtro === 'pendentes') return state.tarefas.filter(t => !t.concluida);
    return state.tarefas;
  };

  const tarefasFiltradas = filtrarTarefas();

  return (
    <ul>
      {tarefasFiltradas.map(t => (
        <Tarefa key={t.id} tarefa={t} />
      ))}
    </ul>
  );
}
