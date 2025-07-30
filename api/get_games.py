# Importa a função específica do nosso arquivo de lógica
from ..bot_logic import fetch_daily_games

# A Vercel procura por uma função 'handler' para executar
# Esta é a função que será acionada quando a URL for chamada
def handler(request, response):
    try:
        print("Iniciando a função: fetch_daily_games")
        fetch_daily_games()
        # Responde à requisição do cron job com sucesso
        response.status_code = 200
        response.send("Busca de jogos diários executada.")
    except Exception as e:
        print(f"Erro em get_games: {e}")
        response.status_code = 500
        response.send(f"Erro ao executar a busca de jogos: {e}")
