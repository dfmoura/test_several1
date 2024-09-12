import cx_Oracle

# Configurações de conexão
dsn = cx_Oracle.makedsn('localhost', 1521, sid='xe')
username = 'system'
password = 'Pass#2023'

# Criar uma conexão
connection = cx_Oracle.connect(user=username, password=password, dsn=dsn)

# Criar um cursor
cursor = connection.cursor()

# Executar a consulta
employee_id = 2
query = 'SELECT * FROM EMPLOYEES WHERE employee_id = :id'
cursor.execute(query, id=employee_id)

# Fetch e exibir os resultados
result = cursor.fetchone()
print(result)

# Fechar cursor e conexão
cursor.close()
connection.close()
