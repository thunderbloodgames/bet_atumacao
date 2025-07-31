import type { NextRequest } from 'next/server';
import { kv } from '@vercel/kv'; // Importamos o KV para poder ler a memória

export const runtime = 'edge';

export async function GET(request: NextRequest) {
    
    // --- Nova Lógica: Tenta ler a chave do banco de dados ---
    let gameIds = null;
    let kvError = null;
    try {
        gameIds = await kv.get('daily_games_ids');
    } catch (e: any) {
        kvError = e.message;
    }
    // --- Fim da nova lógica ---

    const debugInfo = {
        mensagem: "Verificação de Variáveis de Ambiente e Banco de Dados",
        ODDS_API_KEY_ENCONTRADA: process.env.ODDS_API_KEY ? "Sim" : "NÃO",
        TELEGRAM_TOKEN_ENCONTRADO: process.env.TELEGRAM_TOKEN ? "Sim" : "NÃO",
        // ... (outras variáveis que você queira checar) ...
        
        // --- Verificação do Banco de Dados ---
        "VERCEL_KV_CHECK": {
            "erro_ao_ler_do_kv": kvError || "Nenhum erro",
            "chave_procurada": "daily_games_ids",
            "conteudo_da_chave": gameIds || "VAZIO ou não encontrado",
            "numero_de_jogos_salvos": Array.isArray(gameIds) ? gameIds.length : 0,
        }
    };

    return new Response(JSON.stringify(debugInfo, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
}
