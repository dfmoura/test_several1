from flask import flask
app = Flas(__name__)

@app.rout('/')
def index():
    return 'Exemplo de aplicativo container'

if __name__ == '__main__':
    app.run(hot="0.0.0.0", debug=True)