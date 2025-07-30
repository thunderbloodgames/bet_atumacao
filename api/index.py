from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify
from bot_logic import fetch_daily_games, check_odds_variation, fetch_game_results

app = Flask(__name__)

@app.route('/api/get_games', methods=['GET'])
def get_games_route():
    try:
        fetch_daily_games()
        return jsonify({"status": "success", "task": "get_games"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/check_odds', methods=['GET'])
def check_odds_route():
    try:
        check_odds_variation()
        return jsonify({"status": "success", "task": "check_odds"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/get_results', methods=['GET'])
def get_results_route():
    try:
        fetch_game_results()
        return jsonify({"status": "success", "task": "get_results"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api', methods=['GET'])
def index():
    return jsonify({"message": "Bot CentralBetBr API is running."}), 200

@app.route('/api/debug', methods=['GET'])
def debug_route():
    import os
    env_vars = dict(os.environ)
    debug_info = {
        "mensagem": "Verificação de Variáveis de Ambiente",
        "KV_URL_ENCONTRADA": "Sim" if env_vars.get("KV_URL") else "NÃO",
        "KV_TOKEN_ENCONTRADO": "Sim" if env_vars.get("KV_REST_API_TOKEN") else "NÃO",
        "ODDS_API_KEY_ENCONTRADA": "Sim" if env_vars.get("ODDS_API_KEY") else "NÃO",
        "TELEGRAM_TOKEN_ENCONTRADO": "Sim" if env_vars.get("TELEGRAM_TOKEN") else "NÃO",
    }
    return jsonify(debug_info), 200
