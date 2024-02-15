import sqlite3
import pandas as pd
import matplotlib.pyplot as plt
from flask import Flask, render_template, request

app = Flask(__name__)

# Database setup
conn = sqlite3.connect('finance.db')
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT,
        amount REAL
    )
''')
conn.commit()
conn.close()


@app.route('/')
def index():
    conn = sqlite3.connect('finance.db')
    df = pd.read_sql_query('SELECT * FROM expenses', conn)
    conn.close()
    return render_template('index.html', data=df.to_html(index=False))


@app.route('/add', methods=['POST'])
def add():
    description = request.form['description']
    amount = float(request.form['amount'])

    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO expenses (description, amount) VALUES (?, ?)', (description, amount))
    conn.commit()
    conn.close()

    return index()


@app.route('/delete/<int:id>')
def delete(id):
    conn = sqlite3.connect('finance.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (id,))
    conn.commit()
    conn.close()

    return index()


@app.route('/plot')
def plot():
    conn = sqlite3.connect('finance.db')
    df = pd.read_sql_query('SELECT * FROM expenses', conn)
    conn.close()

    plt.figure(figsize=(8, 6))
    plt.bar(df['description'], df['amount'])
    plt.xlabel('Description')
    plt.ylabel('Amount')
    plt.title('Expense Chart')
    plt.savefig('static/chart.png')

    return render_template('plot.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
