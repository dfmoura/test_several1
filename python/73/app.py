# app.py
import cx_Oracle

# Configurações do banco de dados
host = "localhost"
port = 1521
service_name = "xe"
user = "system"
password = "Pass#2023"

# String de conexão
dsn = cx_Oracle.makedsn(host, port, service_name=service_name)

try:
    # Conectar ao banco de dados
    connection = cx_Oracle.connect(user=user, password=password, dsn=dsn)
    print("Conexão bem-sucedida!")

    # Aqui você pode adicionar operações com o banco de dados

except cx_Oracle.DatabaseError as e:
    print("Erro ao conectar ao banco de dados:", e)

finally:
    if 'connection' in locals():
        connection.close()
