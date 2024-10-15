import cx_Oracle
import openai
import os

# Configurações de conexão com o banco de dados Oracle
oracle_config = {
    'host': 'localhost',
    'port': '1521',
    'sid': 'xe',
    'user': 'system',
    'password': 'Pass#2023'
}

# Configuração da API OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY", "aki")  # Pegue da variável de ambiente ou defina manualmente

# Função para conectar ao Oracle
def connect_to_oracle():
    try:
        dsn = cx_Oracle.makedsn(oracle_config['host'], oracle_config['port'], sid=oracle_config['sid'])
        connection = cx_Oracle.connect(oracle_config['user'], oracle_config['password'], dsn)
        return connection
    except cx_Oracle.DatabaseError as e:
        error, = e.args
        print(f"Erro ao conectar ao Oracle: {error.message}")
        return None

# Função que interpreta a pergunta e gera o SQL correspondente
def interpret_question_to_sql(question):
    try:
        # Corrigido o método para a nova API da OpenAI
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Você é um especialista em SQL Oracle."},
                {"role": "user", "content": f"Crie uma query SQL Oracle com base na seguinte pergunta: {question}"}
            ],
            max_tokens=100,
            temperature=0.3,
        )
        sql_query = response['choices'][0]['message']['content'].strip()
        return sql_query
    except openai.error.OpenAIError as e:
        print(f"Erro ao gerar a consulta SQL: {str(e)}")
        return None

# Função para executar a query no Oracle e obter os resultados
def execute_query(query):
    connection = connect_to_oracle()
    if not connection:
        return "Falha ao conectar ao banco de dados."

    try:
        cursor = connection.cursor()
        cursor.execute(query)

        # Pega todos os resultados
        results = cursor.fetchall()

        # Formata os resultados
        result_str = "\n".join([str(row) for row in results])
        
        cursor.close()
        connection.close()

        return result_str or "Nenhum resultado encontrado."
    except cx_Oracle.DatabaseError as e:
        error, = e.args
        return f"Erro ao executar a query: {error.message}"

# Função principal que interage com o usuário
def main():
    print("Bem-vindo! Pergunte algo sobre o banco de dados Oracle ou digite 'sair' para encerrar:")

    while True:
        question = input("Você: ")

        if question.lower() in ['sair', 'exit', 'quit']:
            print("Encerrando o programa.")
            break

        # Gera o SQL baseado na pergunta
        sql_query = interpret_question_to_sql(question)
        
        if sql_query:
            print(f"Query gerada: {sql_query}")
            
            # Executa a query no Oracle
            response = execute_query(sql_query)
            
            # Retorna a resposta
            print(f"Resposta: {response}")
        else:
            print("Não foi possível gerar uma query SQL. Tente novamente.")

if __name__ == "__main__":
    main()
