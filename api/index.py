# Importa o Flask e as funções do nosso arquivo de lógica
from flask import Flask, jsonify
import sys
import os

# Adiciona o diretório raiz ao 'caminho' do Python para encontrar o bot_logic
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from bot_logic import fetch_daily_games, check_odds_variation, fetch_game_results

# Cria a aplicação Flask
app = Flask(__name__)

# Rota para buscar os jogos da manhã
@app.route('/api/get_games', methods=['GET'])
def get_games_route():
    try:
        fetch_daily_games()
        return jsonify({"status": "success", "task": "get_games"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Rota para verificar as odds da tarde
@app.route('/api/check_odds', methods=['GET'])
def check_odds_route():
    try:
        check_odds_variation()
        return jsonify({"status": "success", "task": "check_odds"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Rota para buscar os resultados da noite
@app.route('/api/get_results', methods=['GET'])
def get_results_route():
    try:
        fetch_game_results()
        return jsonify({"status": "success", "task": "get_results"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# Rota principal (opcional, bom para testar se a API está no ar)
@app.route('/api', methods=['GET'])
def index():
    return jsonify({"message": "Bot CentralBetBr API is running."}), 200
