from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
db = SQLAlchemy(app)

class Movimentacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(100), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    tipo = db.Column(db.String(10), nullable=False)  # 'receita' ou 'despesa'
    categoria_id = db.Column(db.Integer, db.ForeignKey('categoria.id'), nullable=False)
    categoria = db.relationship('Categoria', backref=db.backref('movimentacoes', lazy=True))

class Categoria(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(50), nullable=False)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/movimentacoes', methods=['GET', 'POST'])
def movimentacoes():
    if request.method == 'POST':
        data = request.json
        nova_movimentacao = Movimentacao(
            descricao=data['descricao'],
            valor=data['valor'],
            tipo=data['tipo'],
            categoria_id=data['categoria_id']
        )
        db.session.add(nova_movimentacao)
        db.session.commit()
        return jsonify({"message": "Movimentação adicionada com sucesso!"}), 201
    else:
        movimentacoes = Movimentacao.query.all()
        return jsonify([{
            "id": m.id,
            "descricao": m.descricao,
            "valor": m.valor,
            "tipo": m.tipo,
            "categoria": m.categoria.nome
        } for m in movimentacoes])

@app.route('/categorias', methods=['GET', 'POST'])
def categorias():
    if request.method == 'POST':
        data = request.json
        nova_categoria = Categoria(nome=data['nome'])
        db.session.add(nova_categoria)
        db.session.commit()
        return jsonify({"message": "Categoria adicionada com sucesso!"}), 201
    else:
        categorias = Categoria.query.all()
        return jsonify([{"id": c.id, "nome": c.nome} for c in categorias])

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)