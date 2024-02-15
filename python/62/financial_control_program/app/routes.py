from app import app, db
from flask import render_template, request, redirect, url_for
from app.models import Transaction

@app.route('/')
def index():
    transactions = Transaction.query.all()
    return render_template('index.html', transactions=transactions)

@app.route('/add', methods=['GET', 'POST'])
def add_transaction():
    if request.method == 'POST':
        description = request.form['description']
        amount = float(request.form['amount'])
        category = request.form['category']
        transaction = Transaction(description=description, amount=amount, category=category)
        db.session.add(transaction)
        db.session.commit()
        return redirect(url_for('index'))
    return render_template('add_transaction.html')
