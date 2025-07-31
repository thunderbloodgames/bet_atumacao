import { kv } from '@vercel/kv';
import { postToTelegram } from './telegramService.js';

// --- CONFIGURAÇÃO INICIAL ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const PARTNER_BOOKMAKER_KEY = 'betano';
const PARTNER_BOOKMAKER_NAME = 'Betano';
const SPORT = 'soccer_brazil_campeonato';

// --- FUNÇÃO DE TESTE ---
export async function fetchDailyGames() {
    console.log("1. Iniciando fetch_daily_games");

    if (!ODDS_API_KEY) {
        console.error("ERRO IMEDIATO: ODDS_API_KEY não encontrada.");
        throw new Error("Falta a variável de ambiente ODDS_API_KEY");
    }
    console.log("2. ODDS_API_KEY encontrada.");

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=br&markets=h2h&oddsFormat=decimal`;
    console.log(`3. URL montada. Tentando fazer a chamada para: ${url}`);

    try {
        const response = await fetch(url);
        console.log(`4. Chamada fetch concluída. Status da resposta: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`ERRO NA RESPOSTA DA API: A API de Odds retornou um erro. Status: ${response.status}. Detalhes: ${errorText}`);
            throw new Error(`Erro na API de Odds: ${response.statusText}`);
        }
        
        const games: any[] = await response.json();
        console.log(`5. Resposta JSON processada. Encontrados ${games.length} jogos.`);
        
        // O resto da lógica...
        // ... (código original para postar e salvar)
        
        await postToTelegram("Teste de conexão bem-sucedido!");
        
    } catch (error) {
        console.error("ERRO CRÍTICO DURANTE A EXECUÇÃO:", error);
        throw error; // Re-lança o erro para que a Vercel o registre claramente
    }
}

// As outras funções (checkOddsVariation, fetchGameResults) continuam iguais.
// ... (cole o restante das suas funções aqui)
