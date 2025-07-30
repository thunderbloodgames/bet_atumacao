# Importa a função específica do nosso arquivo de lógica
from ..bot_logic import fetch_game_results

def handler(request, response):
    try:
        print("Iniciando a função: fetch_game_results")
        fetch_game_results()
        response.status_code = 200
        response.send("Busca de resultados executada.")
    except Exception as e:
        print(f"Erro em get_results: {e}")
        response.status_code = 500
        response.send(f"Erro ao executar a busca de resultados: {e}")
