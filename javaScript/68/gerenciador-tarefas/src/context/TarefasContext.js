import React, { createContext, useReducer } from 'react';

export const TarefasContext = createContext();

const estadoInicial = {
  tarefas: [],
  filtro: 'todas'
};

function reducer(state, action) {
  switch (action.type) {
    case 'ADICIONAR':
      return { ...state, tarefas: [...state.tarefas, action.payload] };
    case 'TOGGLE':
      return {
        ...state,
        tarefas: state.tarefas.map(tarefa =>
          tarefa.id === action.payload ? { ...tarefa, concluida: !tarefa.concluida } : tarefa
        )
      };

      case 'EXCLUIR':
        return {
          ...state,
          tarefas: state.tarefas.filter(tarefa => tarefa.id !== action.payload)
        };

    case 'FILTRO':
      return { ...state, filtro: action.payload };
    default:
      return state;
  }
}

export const TarefasProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, estadoInicial);

  return (
    <TarefasContext.Provider value={{ state, dispatch }}>
      {children}
    </TarefasContext.Provider>
  );
};
