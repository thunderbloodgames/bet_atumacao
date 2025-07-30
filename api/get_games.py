import sys
import os

# --- INÍCIO DA CORREÇÃO ---
# Pega o caminho absoluto do diretório do arquivo atual (api)
current_dir = os.path.dirname(__file__)
# Pega o caminho do diretório pai (a raiz do projeto)
project_root = os.path.abspath(os.path.join(current_dir, '..'))
# Adiciona a raiz do projeto ao 'caminho' que o Python usa para procurar módulos
sys.path.append(project_root)
# --- FIM DA CORREÇÃO ---

# Agora a importação direta, sem os '..', vai funcionar
from bot_logic import fetch_daily_games

def handler(request, response):
    try:
        print("Iniciando a função: fetch_daily_games")
        fetch_daily_games()
        # Responde à requisição do cron job com sucesso
        response.status_code = 200
        # Vercel espera um corpo na resposta, mesmo que vazio
        response.json({"status": "success", "message": "Busca de jogos diários executada."})
    except Exception as e:
        print(f"Erro em get_games: {e}")
        response.status_code = 500
        response.json({"status": "error", "message": f"Erro ao executar a busca de jogos: {e}"})
