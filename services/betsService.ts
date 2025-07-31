import { kv } from '@vercel/kv';
import { postToTelegram } from './telegramService.js';

// --- CONFIGURAÇÃO INICIAL ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const PARTNER_BOOKMAKER_KEY = 'betano';
const PARTNER_BOOKMAKER_NAME = 'Betano';
const SPORT = 'soccer_brazil_campeonato';
const REGIONS = 'us';

// --- FUNÇÃO DE TESTE (MODO DETETIVE) ---
export async function fetchDailyGames() {
    console.log("Iniciando fetch_daily_games (Modo Detetive)...");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
    
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`ERRO NA RESPOSTA DA API: Status ${response.status}. Detalhes: ${errorText}`);
        throw new Error(`Erro na API de Odds: ${response.statusText}`);
    }
    
    const games: any[] = await response.json();
    console.log(`Encontrados ${games.length} jogos.`);

    // --- MODO DETETIVE: INÍCIO ---
    // Se encontrarmos jogos, vamos imprimir os dados do primeiro jogo para análise.
    if (games.length > 0) {
        console.log("--- DADOS DO PRIMEIRO JOGO (MODO DETETIVE) ---");
        console.log(JSON.stringify(games[0], null, 2));
        console.log("----------------------------------------------");
    }
    // --- MODO DETETIVE: FIM ---

    // Vamos desativar o envio para o Telegram temporariamente para não poluir o canal.
    console.log("Modo Detetive: Envio para o Telegram desativado temporariamente.");

    // O código abaixo está desativado para o teste.
    /*
    if (games.length === 0) {
        await postToTelegram("📊 Nenhum jogo do Brasileirão encontrado para hoje na API.");
        return;
    }
    // ... resto da lógica
    */
   return; // Termina a execução aqui para o teste
}

// As outras funções continuam aqui...
export async function checkOddsVariation() { /* ... seu código ... */ }
export async function fetchGameResults() { /* ... seu código ... */ }
