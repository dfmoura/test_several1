<<<<<<< HEAD
Dashboard Análise de Metas -> Nível de Análise de Custo
  - Criar parâmetro para que o usuário indique se a data das despesas a ser considerada será data de baixa ou data de entrada (TFGFIN.DTENTSAI)
  - Criar parâmetro para que o usuário possa filtrar as naturezas financeiras das despesas da análise de custo (aplicar o filtro por parametro em todos páineis/níveis da análise de custo)
  - Criar botão dentro do nível de análise de custo, para acessar uma tabela semelhante a planilha disponibilizada pelo Gusmão (link no campo observação)
  - Garantir a apresentação do vendedor 0 na análise de custo pois pode ser que um C.R desses tenha despesas vinculadas mas o Gusmão não veja pelo fato do C.R estar sem um vendedor responsável. Vincular o vendedor 0 em todo C.R comercial que não possuir um reponsável, ou seja, a faixa de C.R comercial nunca ficará com o campo de responsável vazio, nesse caso, entra o vendedor 0 (considerar criar trigger e atualizar os registros do C.R conforme essa orientação)
- Possibilitar alterar a visualização da análise de custo, mantendo a visao atual como padrão mas possibilitando apresentar uma visão desmenbrada por C.R, nesse caso, um vendedor poderia ter vários registros, cada um se referindo a um C.R que ele é responsável.
- Adicionar a coluna de apelido do C.R no nível principal de análise de custo e no nível inferior (detalhe do vendedor). No nível principal, entendo que deve haver agrupamento (listagg), pois o mesmo vendedor pode ter vários C.R/apelidos.
 - Ajustar o nível 3 da análise de custo para demonstrar no título dos paineis, o nome do vendedor que o usuário selecionou e no painel lateral de naturezas, apresentar o nome do C.R selecionado.
 
 
=======
 # 📊 **Tarefas para Implementação no Dashboard de Análise de Metas - Nível de Análise de Custo**

## 📌 **Objetivo**
Melhorar a experiência do usuário no nível de análise de custo do dashboard de análise de metas, garantindo maior flexibilidade, precisão e usabilidade na apresentação das despesas e responsáveis comerciais.

---

## 🛠 **Tarefas a serem Executadas**

### 1️⃣ **Configuração de Parâmetros**
✅ Criar parâmetro para que o usuário indique se a data das despesas a ser considerada será:
   - **Data de baixa**
   - **Data de entrada** (Campo: `TFGFIN.DTENTSAI`)

✅ Criar parâmetro para que o usuário possa filtrar as **naturezas financeiras** das despesas na análise de custo.
   - O filtro deve ser aplicado **em todos os painéis e níveis** da análise de custo.

### 2️⃣ **Aprimoramento da Visualização e Navegação**
✅ Criar um botão dentro do nível de análise de custo para acessar uma **tabela semelhante à planilha** disponibilizada pelo Gusmão.
   - **Link da planilha** deve estar disponível no campo de observação.

✅ Garantir a **apresentação do vendedor 0** na análise de custo:
   - Alguns C.R.s podem ter despesas vinculadas, mas não serem exibidos para o Gusmão por não possuírem um vendedor responsável.
   - **Solução**: Vincular automaticamente o **vendedor 0** a todo C.R. comercial que não possuir um responsável.
   - **Considerar criar uma trigger** para atualizar os registros do C.R. conforme essa lógica.

✅ Possibilitar a **alteração da visualização da análise de custo**:
   - **Visão atual** será mantida como padrão.
   - Nova opção para exibir uma visão **desmembrada por C.R.**.
     - Nesse caso, um mesmo vendedor poderá ter vários registros, cada um referente a um C.R. sob sua responsabilidade.

### 3️⃣ **Ajustes e Melhorias nas Informações Exibidas**
✅ **Adicionar a coluna de apelido do C.R.** nos seguintes níveis:
   - **Nível principal da análise de custo** → Utilizar `LISTAGG`, pois um vendedor pode ter vários C.R.s/apelidos.
   - **Nível inferior (detalhe do vendedor)** → Exibir os apelidos correspondentes.

✅ **Ajustar o nível 3 da análise de custo**:
   - No **título dos painéis**, exibir o **nome do vendedor** selecionado pelo usuário.
   - No **painel lateral de naturezas**, exibir o **nome do C.R.** selecionado.

---

## 🔄 **Próximos Passos**
📅 **Definir prazos** para implementação de cada tarefa.<br>
📝 **Revisar e validar** com o time antes da entrega final.<br>
✅ **Testar todas as implementações** para garantir funcionalidade e usabilidade.



📌 Execução realizada em 21/02, das 13:10 às 16:40. O parâmetro foi implementado com sucesso, 
permitindo que o usuário selecione entre a data de baixa e a data de entrada das despesas. 
Foram realizados testes para validar o correto funcionamento da funcionalidade, garantindo 
que os filtros sejam aplicados conforme a escolha do usuário.

📌 Execução realizada em 21/02, das 17:00 às 18:40. Implementamos o filtro de naturezas financeiras , 
permitindo que o usuário refine a análise de custo conforme as categorias 
desejadas. O filtro foi integrado a todos os painéis e níveis da análise, garantindo consistência na 
aplicação dos critérios definidos. Foram realizados testes para validar a correta segmentação das 
informações conforme os filtros aplicados.
>>>>>>> e470db721f43ea2db0f9ce018d76b3cbe6852793
