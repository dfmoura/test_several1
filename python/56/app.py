from flask import Flask, render_template, request, redirect
import sqlite3

app = Flask(__name__)

@app.route('/')
def index():
    conn = sqlite3.connect('transactions.db')
    c = conn.cursor()
    c.execute("SELECT * FROM transactions")
    transactions = c.fetchall()
    conn.close()
    return render_template('index.html', transactions=transactions)

@app.route('/add_transaction', methods=['POST'])
def add_transaction():
    date = request.form['date']
    value = request.form['value']
    category = request.form['category']
    category_type = request.form['category_type']

    conn = sqlite3.connect('transactions.db')
    c = conn.cursor()
    c.execute("INSERT INTO transactions (date, value, category, category_type) VALUES (?, ?, ?, ?)",
              (date, value, category, category_type))
    conn.commit()
    conn.close()
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
