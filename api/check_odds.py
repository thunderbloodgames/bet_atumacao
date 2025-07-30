# Importa a função específica do nosso arquivo de lógica
from ..bot_logic import check_odds_variation

def handler(request, response):
    try:
        print("Iniciando a função: check_odds_variation")
        check_odds_variation()
        response.status_code = 200
        response.send("Verificação de variação de odds executada.")
    except Exception as e:
        print(f"Erro em check_odds: {e}")
        response.status_code = 500
        response.send(f"Erro ao executar a verificação de odds: {e}")
