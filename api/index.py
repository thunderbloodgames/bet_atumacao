
from dotenv import load_dotenv
load_dotenv()

# --- O resto do seu código começa aqui ---
from flask import Flask, jsonify
# ...from flask import Flask, jsonify
# A importação agora é direta, pois os arquivos estão no mesmo diretório.
# As linhas de 'sys.path.append' foram removidas.
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

# Rota de Debug (opcional, mas útil)
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
