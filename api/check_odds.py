# No topo do seu arquivo bot_logic.py, adicione a nova variável
AFFILIATE_LINK = os.environ.get('AFFILIATE_LINK')

# ... (resto do seu código) ...

def check_odds_variation():
    """
    Requisição 2: Busca as odds atuais, compara com os dados salvos e envia alertas.
    """
    # ... (início da sua função, até a parte da mensagem) ...

                # CONDIÇÃO DO ALERTA: Se a odd subiu mais de 15%
                if c_home_price > i_home_price * 1.15:
                    
                    # --- INÍCIO DA ALTERAÇÃO ---
                    
                    # Monta a mensagem já com o link de afiliado
                    message = (
                        f"⚡ **ALERTA DE VARIAÇÃO DE ODD!**\n\n"
                        f"Nosso monitor detectou um movimento importante no mercado para o jogo:\n"
                        f"⚽ **{c_game['home_team']} vs {c_game['away_team']}**\n\n"
                        f"A odd para a vitória do **{c_game['home_team']}** subiu de {i_home_price} para **{c_home_price}**!\n\n"
                        f"🔗 **Aproveite esta odd na [Nome da Casa]: {AFFILIATE_LINK}**"
                    )
                    
                    # --- FIM DA ALTERAÇÃO ---
                    
                    bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message, parse_mode='Markdown', disable_web_page_preview=False)

    except requests.exceptions.RequestException as e:
        print(f"Erro ao verificar variação de odds: {e}")
