import oracledb
import openai
import re

# Configuração do ChatGPT (substitua pela sua chave da API do OpenAI)
openai.api_key = 'aki token'

# Dados de conexão do Oracle DB
dsn = oracledb.makedsn("localhost", 1521, service_name="xe")
connection = oracledb.connect(user="system", password="Pass#2023", dsn=dsn)

def get_tables_and_columns():
    """Obtém as tabelas e colunas do banco de dados"""
    query = """
    SELECT table_name, column_name 
    FROM user_tab_columns
    """
    with connection.cursor() as cursor:
        cursor.execute(query)
        return cursor.fetchall()

def execute_query(query):
    """Executa uma consulta SQL no Oracle e retorna o resultado"""
    print(f"Executando a consulta: {query}")  # Log da consulta que será executada
    try:
        with connection.cursor() as cursor:
            cursor.execute(query)
            result = cursor.fetchall()
            # Obter os nomes das colunas
            columns = [col[0] for col in cursor.description]
            return columns, result
    except Exception as e:
        return f"Erro ao executar a consulta: {str(e)}"

def clean_sql_query(query):
    """Limpa a consulta SQL, removendo caracteres indesejados"""
    cleaned_query = re.sub(r'\s+', ' ', query).strip()
    if cleaned_query.endswith(';'):
        cleaned_query = cleaned_query[:-1]
    return cleaned_query

def generate_sql_from_question(question, schema_info):
    """Utiliza o GPT para gerar uma query SQL a partir de uma pergunta e do esquema do banco de dados"""
    # Transformar as informações do esquema em uma string
    tables_info = "\n".join([f"Tabela: {table}, Colunas: {', '.join(columns)}" for table, columns in schema_info.items()])
    
    try:
        messages = [
            {
                "role": "user",
                "content": f"Você é um especialista em banco de dados Oracle. A partir da pergunta: '{question}', gere uma consulta SQL SELECT que possa ser executada diretamente em um banco de dados Oracle. Use as seguintes tabelas e colunas:\n{tables_info}\n"
            }
        ]
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",  # Pode ser ajustado para gpt-4 se necessário
            messages=messages,
            max_tokens=150,
            temperature=0.5
        )
        sql_query = response['choices'][0]['message']['content'].strip()
        return sql_query
    except Exception as e:
        return f"Erro ao gerar SQL: {str(e)}"

def print_results(columns, results):
    """Exibe os resultados de forma formatada."""
    if not results:
        print("Nenhum resultado encontrado.")
        return

    # Imprime o cabeçalho
    print("\t".join(columns))
    print("-" * 40)

    # Imprime cada linha de resultado
    for row in results:
        print("\t".join(map(str, row)))

def main():
    # Obter informações do esquema do banco de dados
    tables_info = get_tables_and_columns()
    
    # Transformar as informações em um dicionário
    schema_info = {}
    for table, column in tables_info:
        if table not in schema_info:
            schema_info[table] = []
        schema_info[table].append(column)

    while True:
        # Pergunta do usuário
        user_question = input("Digite sua pergunta sobre o banco de dados (ou 'sair' para finalizar): ")

        if user_question.lower() == 'sair':
            break

        # Gerar SQL a partir da pergunta
        sql_query = generate_sql_from_question(user_question, schema_info)
        print(f"SQL gerado: {sql_query}")

        # Limpar SQL gerado
        cleaned_query = clean_sql_query(sql_query)

        # Executar SQL e retornar o resultado
        result = execute_query(cleaned_query)
        if isinstance(result, str):  # Verifica se houve erro na execução
            print(result)
        else:
            columns, data = result
            print_results(columns, data)

if __name__ == "__main__":
    main()
