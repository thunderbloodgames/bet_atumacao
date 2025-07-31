// Envia uma mensagem de texto para o Telegram
export async function postToTelegram(text: string): Promise<void> {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
        console.error("Credenciais do Telegram não configuradas.");
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Erro ao postar no Telegram: ${errorData.description}`);
    }
}
