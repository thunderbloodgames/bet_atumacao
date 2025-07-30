import os
import requests
import json
from datetime import datetime
from vercel_kv import KV

# Tentativa de importar o módulo telegram, com fallback em caso de erro
try:
    from telegram import Bot
    from telegram.error import TelegramError
    TELEGRAM_AVAILABLE = True
except ImportError:
    TELEGRAM_AVAILABLE = False
    print("Aviso: Módulo telegram não encontrado. Certifique-se de que python-telegram-bot está instalado corretamente.")

# --- CONFIGURAÇÃO INICIAL ---
ODDS_API_KEY = os.environ.get('ODDS_API_KEY')
TELEGRAM_TOKEN = os.environ.get('TELEGRAM_TOKEN')
TELEGRAM_CHAT_ID = os.environ.get('TELEGRAM_CHAT_ID')
AFFILIATE_LINK = os.environ.get('AFFILIATE_LINK')

if not all([ODDS_API_KEY, TELEGRAM_TOKEN, TELEGRAM_CHAT_ID]) and TELEGRAM_AVAILABLE:
    raise ValueError("Faltam variáveis de ambiente obrigatórias")

# --- PARÂMETROS ---
PARTNER_BOOKMAKER_KEY = 'betano'
PARTNER_BOOKMAKER_NAME = 'Betano'
REGIONS = 'br'
MARKETS = 'h2h'
ODDS_FORMAT = 'decimal'
SPORT = 'soccer_brazil_campeonato'

# --- FUNÇÕES PRINCIPAIS ---

def send_telegram_message(bot, chat_id, text, parse_mode='Markdown', disable_web_page_preview=True):
    """Função auxiliar para enviar mensagens Telegram com tratamento de erros."""
    if TELEGRAM_AVAILABLE:
        try:
            bot.send_message(chat_id=chat_id, text=text, parse_mode=parse_mode, disable_web_page_preview=disable_web_page_preview)
        except TelegramError as e:
            print(f"Erro ao enviar mensagem Telegram: {e}")

def fetch_daily_games():
    """
    Busca os jogos do dia, formata a mensagem e salva os dados no Vercel KV.
    """
    print(f"DEBUG: KV_URL={os.environ.get('KV_URL')}, ODDS_API_KEY={ODDS_API_KEY[:5]}...")  # Depuração
    kv = KV()
    url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/odds/?apiKey={ODDS_API_KEY}&regions={REGIONS}&markets={MARKETS}&oddsFormat={ODDS_FORMAT}"
    
    try:
        print(f"DEBUG: Fazendo requisição para {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        games = response.json()
        print(f"DEBUG: Resposta da API: {len(games)} jogos encontrados")

        if not games:
            if TELEGRAM_AVAILABLE:
                bot = Bot(token=TELEGRAM_TOKEN)
                send_telegram_message(bot, TELEGRAM_CHAT_ID, "📊 Nenhum jogo do Brasileirão encontrado para hoje na API.")
            return
        
        kv.delete('daily_games_ids')
        game_ids = [game['id'] for game in games]
        kv.set('daily_games_ids', json.dumps(game_ids))
        for game in games:
            kv.set(game['id'], json.dumps(game))

        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            message_lines = [f"📊 **MERCADO ABERTO | Jogos do Dia ({PARTNER_BOOKMAKER_NAME})**\n"]
            for game in games:
                home_team = game['home_team']
                away_team = game['away_team']
                bookmaker = next((b for b in game['bookmakers'] if b['key'] == PARTNER_BOOKMAKER_KEY), None)
                
                if bookmaker:
                    odds = bookmaker['markets'][0]['outcomes']
                    home_odds = next((o['price'] for o in odds if o['name'] == home_team), 'N/A')
                    away_odds = next((o['price'] for o in odds if o['name'] == away_team), 'N/A')
                    game_time_utc = datetime.fromisoformat(game['commence_time'].replace('Z', '+00:00'))
                    game_time_br = game_time_utc.astimezone(datetime.now().astimezone().tzinfo)
                    
                    message_lines.append(f"⚽ {game_time_br.strftime('%H:%M')} | {home_team} ({home_odds}) vs {away_team} ({away_odds})")

            final_message = "\n".join(message_lines)
            if AFFILIATE_LINK:
                final_message += f"\n\n👉 Veja todas as odds e mercados na {PARTNER_BOOKMAKER_NAME}: {AFFILIATE_LINK}"
                
            send_telegram_message(bot, TELEGRAM_CHAT_ID, final_message)

    except requests.exceptions.RequestException as e:
        print(f"DEBUG: Erro na requisição: {str(e)}")
        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            send_telegram_message(bot, TELEGRAM_CHAT_ID, f"🚨 Erro no Robô: Não foi possível buscar os jogos do dia. Detalhes: {str(e)}")
    except Exception as e:
        print(f"DEBUG: Erro inesperado: {str(e)}")

def check_odds_variation():
    """
    Busca as odds atuais, compara com os dados do Vercel KV e envia alertas.
    """
    kv = KV()
    game_ids_json = kv.get('daily_games_ids')
    if not game_ids_json:
        print("Nenhum ID de jogo encontrado no Vercel KV.")
        return
    
    game_ids = json.loads(game_ids_json)
    url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/odds/?apiKey={ODDS_API_KEY}&regions={REGIONS}&markets={MARKETS}&oddsFormat={ODDS_FORMAT}"
    
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        current_games = response.json()

        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            for game_id in game_ids:
                initial_game_json = kv.get(game_id)
                if not initial_game_json:
                    continue
                
                i_game = json.loads(initial_game_json)
                c_game = next((g for g in current_games if g['id'] == i_game['id']), None)
                
                if not c_game:
                    continue

                initial_bookmaker = next((b for b in i_game['bookmakers'] if b['key'] == PARTNER_BOOKMAKER_KEY), None)
                current_bookmaker = next((b for b in c_game['bookmakers'] if b['key'] == PARTNER_BOOKMAKER_KEY), None)

                if initial_bookmaker and current_bookmaker:
                    i_odds = initial_bookmaker['markets'][0]['outcomes']
                    c_odds = current_bookmaker['markets'][0]['outcomes']
                    
                    i_home_price = next((o['price'] for o in i_odds if o['name'] == i_game['home_team']), 0)
                    c_home_price = next((o['price'] for o in c_odds if o['name'] == c_game['home_team']), 0)

                    if c_home_price > i_home_price * 1.10 and c_home_price > 0:
                        message = (
                            f"⚡ **ALERTA DE VARIAÇÃO DE ODD!**\n\n"
                            f"Nosso monitor detectou um movimento importante no mercado para o jogo:\n"
                            f"⚽ **{c_game['home_team']} vs {c_game['away_team']}**\n\n"
                            f"A odd para a vitória do **{c_game['home_team']}** subiu de {i_home_price} para **{c_home_price}** na {PARTNER_BOOKMAKER_NAME}!\n\n"
                            f"🔗 **Aproveite esta odd de valor aqui: {AFFILIATE_LINK}**"
                        )
                        send_telegram_message(bot, TELEGRAM_CHAT_ID, message)

    except requests.exceptions.RequestException as e:
        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            send_telegram_message(bot, TELEGRAM_CHAT_ID, f"🚨 Erro ao verificar variação de odds. Detalhes: {str(e)}")
    except Exception as e:
        print(f"DEBUG: Erro inesperado: {str(e)}")

def fetch_game_results():
    """
    Busca os resultados dos jogos do dia usando os dados salvos.
    """
    kv = KV()
    game_ids_json = kv.get('daily_games_ids')
    if not game_ids_json:
        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            send_telegram_message(bot, TELEGRAM_CHAT_ID, "📋 Nenhum jogo disponível para resultados.")
        return
    
    game_ids = json.loads(game_ids_json)
    results = []

    try:
        url = f"https://api.the-odds-api.com/v4/sports/{SPORT}/scores/?apiKey={ODDS_API_KEY}&regions={REGIONS}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        scores = response.json()

        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            for game_id in game_ids:
                initial_game_json = kv.get(game_id)
                if not initial_game_json:
                    continue
                
                i_game = json.loads(initial_game_json)
                score = next((s for s in scores if s['id'] == i_game['id']), None)
                
                if score and 'scores' in score:
                    home_score = score['scores'][0]['score'] if score['scores'] else 'N/A'
                    away_score = score['scores'][1]['score'] if len(score['scores']) > 1 else 'N/A'
                    results.append(f"⚽ {i_game['home_team']} {home_score} x {away_score} {i_game['away_team']}")
            
            if results:
                final_message = "📋 **RESULTADOS DO DIA**\n\n" + "\n".join(results)
                send_telegram_message(bot, TELEGRAM_CHAT_ID, final_message)
            else:
                send_telegram_message(bot, TELEGRAM_CHAT_ID, "📋 Nenhum resultado disponível para os jogos do dia.")

    except requests.exceptions.RequestException as e:
        if TELEGRAM_AVAILABLE:
            bot = Bot(token=TELEGRAM_TOKEN)
            send_telegram_message(bot, TELEGRAM_CHAT_ID, f"🚨 Erro ao buscar resultados. Detalhes: {str(e)}")
    except Exception as e:
        print(f"DEBUG: Erro inesperado: {str(e)}")
