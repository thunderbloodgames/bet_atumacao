import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/debug', methods=['GET'])
def debug_route():
    env_vars = dict(os.environ)
    debug_info = {
        "mensagem": "Verificação de Variáveis de Ambiente",
        "KV_URL_ENCONTRADA": "Sim" if env_vars.get("KV_URL") else "NÃO",
        "KV_TOKEN_ENCONTRADO": "Sim" if env_vars.get("KV_REST_API_TOKEN") else "NÃO",
        "ODDS_API_KEY_ENCONTRADA": "Sim" if env_vars.get("ODDS_API_KEY") else "NÃO",
        "TELEGRAM_TOKEN_ENCONTRADO": "Sim" if env_vars.get("TELEGRAM_TOKEN") else "NÃO",
        "CHAVES_TOTAIS_ENCONTRADAS": list(env_vars.keys())
    }
    return jsonify(debug_info), 200
