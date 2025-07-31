// Este arquivo não precisa importar nada. Ele apenas define e exporta a função.

/**
 * Envia uma mensagem de texto para o Telegram.
 * @param text O texto a ser enviado.
 */
export async function postToTelegram(text: string): Promise<void> {
    const token = process.env.TELEGRAM_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!token || !chatId) {
        console.error("ERRO: As variáveis de ambiente TELEGRAM_TOKEN e TELEGRAM_CHAT_ID são obrigatórias.");
        // Retorna sem lançar erro para não parar a execução de outras tarefas.
        return; 
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Apenas registra o erro no log, mas não para a aplicação
            console.error(`Erro ao postar no Telegram: ${errorData.description}`);
        } else {
            console.log("Mensagem enviada com sucesso para o Telegram.");
        }
    } catch (error) {
        console.error("Falha na conexão com a API do Telegram:", error);
    }
}
