
from flask import Flask, request, jsonify, render_template
import cx_Oracle
import openai

# Configurações do banco de dados Oracle
db_config = {
    'user': 'system',
    'password': '#2023@XE',
    'dsn': 'localhost:1521/xe'
}

# Configuração da API do ChatGPT

openai.api_key = '.....'

# Inicialize o Flask
app = Flask(__name__)

def get_db_connection():
    return cx_Oracle.connect(**db_config)

def query_database(query):
    connection = get_db_connection()
    cursor = connection.cursor()
    cursor.execute(query)
    result = cursor.fetchall()
    cursor.close()
    connection.close()
    return result

def generate_sql_query(question):
    prompt = f"Gere uma consulta SQL para a seguinte pergunta: {question}"
    response = openai.Completion.create(
        engine="text-davinci-003",
        prompt=prompt,
        max_tokens=150,
        temperature=0.7,
    )
    
    sql_query = response.choices[0].text.strip()
    return sql_query

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question', '')

    # Gere a consulta SQL dinamicamente
    sql_query = generate_sql_query(question)
    
    # Execute a consulta no banco de dados
    try:
        db_result = query_database(sql_query)
        response = f"Resultado para sua pergunta '{question}': {db_result}"
    except cx_Oracle.DatabaseError as e:
        response = f"Ocorreu um erro ao executar a consulta: {str(e)}"

    return jsonify({"response": response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
