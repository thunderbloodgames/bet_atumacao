import { kv } from '@vercel/kv';
import { postToTelegram } from './telegramService.js';

// --- CONFIGURAÇÃO INICIAL (sem alterações) ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const PARTNER_BOOKMAKER_KEY = 'betonlineag';
const PARTNER_BOOKMAKER_NAME = 'BetOnline.ag';
const SPORT = 'soccer_brazil_campeonato';
const REGIONS = 'us';

// --- Função 1: Busca os jogos do dia (versão limpa) ---
export async function fetchDailyGames() {
    console.log("Iniciando fetch_daily_games");
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

    if (games.length === 0) {
        await postToTelegram("📊 Nenhum jogo do Brasileirão encontrado para hoje na API.");
        return;
    }

    await kv.del('daily_games_ids');
    const gameIds = games.map(game => game.id);
    await kv.set('daily_games_ids', gameIds);
    for (const game of games) {
        // Salva cada jogo individualmente usando o ID como chave
        await kv.set(game.id, game);
    }
    console.log("Jogos do dia salvos no KV.");

    let messageLines = [`📊 *MERCADO ABERTO | Jogos do Dia (${PARTNER_BOOKMAKER_NAME})*\n`];
    for (const game of games) {
        const bookmaker = game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);
        if (bookmaker) {
            const odds = bookmaker.markets[0].outcomes;
            const home_odds = odds.find((o: any) => o.name === game.home_team)?.price || 'N/A';
            const away_odds = odds.find((o: any) => o.name === game.away_team)?.price || 'N/A';
            const gameTime = new Date(game.commence_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            messageLines.push(`⚽ ${gameTime} | ${game.home_team} (${home_odds}) vs ${game.away_team} (${away_odds})`);
        }
    }

    let final_message = messageLines.join('\n');
    if (AFFILIATE_LINK) {
        final_message += `\n\n👉 Veja todas as odds e mercados no seu site parceiro: ${AFFILIATE_LINK}`;
    }
            
    await postToTelegram(final_message);
}

// --- Função 2: Verifica a variação das odds (COM LOGS DETALHADOS) ---
export async function checkOddsVariation() {
    console.log("Iniciando check_odds_variation (Modo Investigativo)...");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");

    const gameIds = await kv.get<string[]>('daily_games_ids');
    console.log(`Encontrados ${gameIds ? gameIds.length : 0} IDs de jogos para verificar.`);

    if (!gameIds || gameIds.length === 0) {
        console.log("Lista de jogos vazia. Encerrando verificação.");
        return;
    }

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro na API de Odds: ${response.statusText}`);
    const current_games: any[] = await response.json();

    console.log("Iniciando loop de verificação de cada jogo...");
    for (const gameId of gameIds) {
        console.log(`- Verificando jogo com ID: ${gameId}`);
        const initial_game = await kv.get<any>(gameId);
        
        if (!initial_game) {
            console.log(`--> ERRO: Detalhes do jogo com ID ${gameId} não foram encontrados no KV. Pulando.`);
            continue;
        }
        
        console.log(`--> Detalhes do jogo '${initial_game.home_team}' encontrados! Comparando odds.`);
        const current_game = current_games.find(g => g.id === initial_game.id);
        if (!current_game) {
            console.log(`--> Jogo '${initial_game.home_team}' não encontrado na busca atual. Pulando.`);
            continue;
        }

        const i_bookmaker = initial_game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);
        const c_bookmaker = current_game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);

        if (i_bookmaker && c_bookmaker) {
            const i_home_price = i_bookmaker.markets[0].outcomes.find((o: any) => o.name === initial_game.home_team)?.price || 0;
            const c_home_price = c_bookmaker.markets[0].outcomes.find((o: any) => o.name === current_game.home_team)?.price || 0;
            
            console.log(`--> Comparando odds para ${initial_game.home_team}: Antiga (${i_home_price}), Nova (${c_home_price})`);
            if (c_home_price > i_home_price * 1.10) {
                const message = `⚡ *ALERTA DE VARIAÇÃO DE ODD!*\n\nNosso monitor detectou um movimento importante no mercado para o jogo:\n⚽ *${current_game.home_team} vs ${current_game.away_team}*\n\nA odd para a vitória do *${current_game.home_team}* subiu de ${i_home_price} para *${c_home_price}* na ${PARTNER_BOOKMAKER_NAME}!\n\n🔗 *Aproveite esta odd de valor aqui: ${AFFILIATE_LINK}*`;
                await postToTelegram(message);
                await kv.set(gameId, current_game);
            }
        }
    }
    console.log("Verificação de todos os jogos concluída.");
}

// --- Função 3: Busca os resultados dos jogos (sem alterações) ---
export async function fetchGameResults() { /* ... seu código existente ... */ }
