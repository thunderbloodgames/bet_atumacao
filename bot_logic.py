import os
import requests
import json
from datetime import datetime
from telegram import Bot

# --- CONFIGURAÇÃO INICIAL (Use Variáveis de Ambiente na Vercel/Cloudflare) ---
# Chave da API do The Odds API
ODDS_API_KEY = os.environ.get('ODDS_API_KEY')
# Token do seu bot do Telegram (do @BotFather)
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN')
# ID do seu canal do Telegram (ex: '@CentralBetBr')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')

# --- PARÂMETROS DA API ---
# Região, mercados e formato das odds
REGIONS = 'br'
MARKETS = 'h2h' # h2h é o mercado 1x2 (Moneyline)
ODDS_FORMAT = 'decimal'
# Esporte que queremos buscar
SPORT = 'soccer_brazil_campeonato' # Exemplo para o Brasileirão Série A

# --- INICIALIZAÇÃO DO BOT ---
bot = Bot(token=TELEGRAM_TOKEN)

# --- FUNÇÕES PRINCIPAIS ---

def fetch_daily_games():
    """
    Requisição 1: Busca os jogos do dia, formata a mensagem e salva os dados iniciais.
    """
    url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/odds/?apiKey={ODDS_API_KEY}&regions={REGIONS}&markets={MARKETS}&oddsFormat={ODDS_FORMAT}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()  # Lança um erro para códigos de status ruins (4xx ou 5xx)
        games = response.json()

        if not games:
            message = "📊 Nenhum jogo do Brasileirão encontrado para hoje na API."
            bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message)
            return

        # Salva os dados brutos para a próxima requisição poder comparar
        # Na Vercel, o diretório /tmp é o único local gravável
        with open('/tmp/initial_odds.json', 'w') as f:
            json.dump(games, f)

        # Formata a mensagem para o Telegram
        message_lines = ["📊 **MERCADO ABERTO | Jogos do Dia (Brasileirão Série A)**\n"]
        for game in games:
            home_team = game['home_team']
            away_team = game['away_team']
            # Encontra as odds da sua casa parceira (ex: 'Betano')
            bookmaker = next((b for b in game['bookmakers'] if b['key'] == 'betano'), None)
            
            if bookmaker:
                odds = bookmaker['markets'][0]['outcomes']
                home_odds = next((o['price'] for o in odds if o['name'] == home_team), 'N/A')
                away_odds = next((o['price'] for o in odds if o['name'] == away_team), 'N/A')
                
                game_time = datetime.fromisoformat(game['commence_time'].replace('Z', '+00:00')).strftime('%H:%M')
                
                message_lines.append(f"⚽ {game_time} | {home_team} ({home_odds}) vs {away_team} ({away_odds})")

        final_message = "\n".join(message_lines)
        bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=final_message, parse_mode='Markdown')

    except requests.exceptions.RequestException as e:
        print(f"Erro ao buscar jogos: {e}")
        bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=f"🚨 Erro no Robô: Não foi possível buscar os jogos do dia. Detalhe: {e}")


def check_odds_variation():
    """
    Requisição 2: Busca as odds atuais, compara com os dados salvos e envia alertas.
    """
    try:
        with open('/tmp/initial_odds.json', 'r') as f:
            initial_games = json.load(f)
    except FileNotFoundError:
        print("Arquivo de odds iniciais não encontrado. Execute a busca diária primeiro.")
        return

    url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/odds/?apiKey={ODDS_API_KEY}&regions={REGIONS}&markets={MARKETS}&oddsFormat={ODDS_FORMAT}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        current_games = response.json()

        for i_game in initial_games:
            c_game = next((g for g in current_games if g['id'] == i_game['id']), None)
            if not c_game:
                continue

            # Comparando as odds da Betano como exemplo
            initial_bookmaker = next((b for b in i_game['bookmakers'] if b['key'] == 'betano'), None)
            current_bookmaker = next((b for b in c_game['bookmakers'] if b['key'] == 'betano'), None)

            if initial_bookmaker and current_bookmaker:
                i_odds = initial_bookmaker['markets'][0]['outcomes']
                c_odds = current_bookmaker['markets'][0]['outcomes']
                
                i_home_price = next((o['price'] for o in i_odds if o['name'] == i_game['home_team']), 0)
                c_home_price = next((o['price'] for o in c_odds if o['name'] == c_game['home_team']), 0)

                # CONDIÇÃO DO ALERTA: Se a odd subiu mais de 15%
                if c_home_price > i_home_price * 1.15:
                    message = (
                        f"⚡ **ALERTA DE VARIAÇÃO DE ODD!**\n\n"
                        f"Nosso monitor detectou um movimento importante no mercado para o jogo:\n"
                        f"⚽ **{c_game['home_team']} vs {c_game['away_team']}**\n\n"
                        f"A odd para a vitória do **{c_game['home_team']}** subiu de {i_home_price} para **{c_home_price}**!\n\n"
                        f"🔗 [Seu Link de Afiliado para a Betano]"
                    )
                    bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message, parse_mode='Markdown')

    except requests.exceptions.RequestException as e:
        print(f"Erro ao verificar variação de odds: {e}")


def fetch_game_results():
    """
    Requisição 3: Busca os resultados dos jogos do dia.
    (NOTA: A API de resultados geralmente é um endpoint diferente e pode ser um plano pago na The Odds API.
    Este é um exemplo conceitual. Verifique a documentação da API para o endpoint de scores/results correto)
    """
    # Exemplo conceitual, pois o endpoint de scores pode variar
    # url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/scores/?apiKey={ODDS_API_KEY}&daysFrom=1"
    # ... lógica para buscar e postar resultados ...
    
    message = "📋 **RESULTADOS DO DIA**\n\n(Função de resultados em desenvolvimento. Verifique o placar nos seus apps de esporte! ✅)"
    bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message, parse_mode='Markdown')


# --- PONTO DE ENTRADA PARA A VERCELL/CLOUDFLARE ---
# Você pode criar diferentes arquivos ou usar um framework como Flask/FastAPI
# para rotear as requisições para cada função.

# Exemplo de como você chamaria as funções
if __name__ == '__main__':
    # Simula o que os cron jobs fariam
    print("Executando busca diária de jogos...")
    fetch_daily_games()
    
    print("\nExecutando verificação de variação de odds...")
    check_odds_variation()
    
    print("\nExecutando busca de resultados...")
    fetch_game_results()
