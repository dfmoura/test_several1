from flask import Flask, render_template, request, redirect, url_for
from .models import db, Transaction, Category
from .utils import import_ofx

@app.route('/')
def index():
    transactions = Transaction.query.all()
    return render_template('index.html', transactions=transactions)

@app.route('/import', methods=['POST'])
def import_transactions():
    file_path = request.form['file_path']
    import_ofx(file_path)
    return redirect(url_for('index'))