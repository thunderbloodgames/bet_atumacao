import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    const debugInfo = {
        mensagem: "Verificação de Variáveis de Ambiente",
        KV_URL_ENCONTRADA: process.env.KV_URL ? "Sim" : "NÃO",
        KV_TOKEN_ENCONTRADO: process.env.KV_REST_API_TOKEN ? "Sim" : "NÃO",
        ODDS_API_KEY_ENCONTRADA: process.env.ODDS_API_KEY ? "Sim" : "NÃO",
        TELEGRAM_TOKEN_ENCONTRADO: process.env.TELEGRAM_TOKEN ? "Sim" : "NÃO",
        TELEGRAM_CHAT_ID_ENCONTRADO: process.env.TELEGRAM_CHAT_ID ? "Sim" : "NÃO",
        AFFILIATE_LINK_ENCONTRADO: process.env.AFFILIATE_LINK ? "Sim" : "NÃO",
        CRON_SECRET_ENCONTRADO: process.env.CRON_SECRET ? "Sim" : "NÃO",
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
