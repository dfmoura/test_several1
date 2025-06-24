import React, { useContext } from 'react';
import { TarefasContext } from '../context/TarefasContext';

function Tarefa({ tarefa }) {
  const { dispatch } = useContext(TarefasContext);

  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <input
        type="checkbox"
        checked={tarefa.concluida}
        onChange={() => dispatch({ type: 'TOGGLE', payload: tarefa.id })}
      />
      <span style={{ textDecoration: tarefa.concluida ? 'line-through' : 'none', flexGrow: 1 }}>
        {tarefa.texto}
      </span>
      <button onClick={() => dispatch({ type: 'EXCLUIR', payload: tarefa.id })}>
        Excluir
      </button>
    </li>
  );
}

export default Tarefa;
