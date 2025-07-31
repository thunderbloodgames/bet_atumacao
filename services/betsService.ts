import { kv } from '@vercel/kv';
import { postToTelegram } from './telegramService.js'; // Correction is here

// --- CONFIGURAÇÃO INICIAL ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const PARTNER_BOOKMAKER_KEY = 'betano';
const PARTNER_BOOKMAKER_NAME = 'Betano';
const SPORT = 'soccer_brazil_campeonato'; // Brasileirão Série A

// --- FUNÇÕES PRINCIPAIS ---

// Função 1: Busca os jogos do dia
export async function fetchDailyGames() {
    console.log("Iniciando fetch_daily_games");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=br&markets=h2h&oddsFormat=decimal`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro na API de Odds: ${response.statusText}`);
    
    const games: any[] = await response.json();
    console.log(`Encontrados ${games.length} jogos.`);

    if (games.length === 0) {
        await postToTelegram("📊 Nenhum jogo do Brasileirão encontrado para hoje na API.");
        return;
    }

    // Salva os jogos no Vercel KV
    await kv.del('daily_games_ids'); // Limpa a lista antiga
    const gameIds = games.map(game => game.id);
    await kv.set('daily_games_ids', gameIds);
    for (const game of games) {
        await kv.set(game.id, game);
    }
    console.log("Jogos do dia salvos no KV.");

    // Monta e envia a mensagem para o Telegram
    let messageLines = [`📊 *MERCADO ABERTO | Jogos do Dia (${PARTNER_BOOKMAKER_NAME})*\n`];
    for (const game of games) {
        const home_team = game.home_team;
        const away_team = game.away_team;
        const bookmaker = game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);
        
        if (bookmaker) {
            const odds = bookmaker.markets[0].outcomes;
            const home_odds = odds.find((o: any) => o.name === home_team)?.price || 'N/A';
            const away_odds = odds.find((o: any) => o.name === away_team)?.price || 'N/A';
            
            // Converte a data para o fuso horário de São Paulo
            const gameTime = new Date(game.commence_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
            
            messageLines.push(`⚽ ${gameTime} | ${home_team} (${home_odds}) vs ${away_team} (${away_odds})`);
        }
    }

    let final_message = messageLines.join('\n');
    if (AFFILIATE_LINK) {
        final_message += `\n\n👉 Veja todas as odds e mercados na ${PARTNER_BOOKMAKER_NAME}: ${AFFILIATE_LINK}`;
    }
            
    await postToTelegram(final_message);
}

// Função 2: Verifica a variação das odds
export async function checkOddsVariation() {
    console.log("Iniciando check_odds_variation");
    const gameIds = await kv.get<string[]>('daily_games_ids');
    if (!gameIds || gameIds.length === 0) {
        console.log("Nenhum ID de jogo encontrado para verificar odds.");
        return;
    }

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=br&markets=h2h&oddsFormat=decimal`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro na API de Odds: ${response.statusText}`);
    const current_games: any[] = await response.json();

    for (const gameId of gameIds) {
        const initial_game = await kv.get<any>(gameId);
        if (!initial_game) continue;
        
        const current_game = current_games.find(g => g.id === initial_game.id);
        if (!current_game) continue;

        const i_bookmaker = initial_game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);
        const c_bookmaker = current_game.bookmakers.find((b: any) => b.key === PARTNER_BOOKMAKER_KEY);

        if (i_bookmaker && c_bookmaker) {
            const i_odds = i_bookmaker.markets[0].outcomes;
            const c_odds = c_bookmaker.markets[0].outcomes;
            
            const i_home_price = i_odds.find((o: any) => o.name === initial_game.home_team)?.price || 0;
            const c_home_price = c_odds.find((o: any) => o.name === current_game.home_team)?.price || 0;
            
            // Se a odd atual for 10% maior que a inicial, envia o alerta
            if (c_home_price > i_home_price * 1.10) {
                const message = `⚡ *ALERTA DE VARIAÇÃO DE ODD!*\n\nNosso monitor detectou um movimento importante no mercado para o jogo:\n⚽ *${current_game.home_team} vs ${current_game.away_team}*\n\nA odd para a vitória do *${current_game.home_team}* subiu de ${i_home_price} para *${c_home_price}* na ${PARTNER_BOOKMAKER_NAME}!\n\n🔗 *Aproveite esta odd de valor aqui: ${AFFILIATE_LINK}*`;
                await postToTelegram(message);
                // Atualiza o valor no KV para não notificar de novo
                await kv.set(gameId, current_game);
            }
        }
    }
}

// Função 3: Busca os resultados dos jogos
export async function fetchGameResults() {
    console.log("Iniciando fetch_game_results");
    const gameIds = await kv.get<string[]>('daily_games_ids');
    if (!gameIds || gameIds.length === 0) {
        await postToTelegram("📋 Nenhum jogo disponível para resultados.");
        return;
    }

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/scores/?apiKey=${ODDS_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro na API de Scores: ${response.statusText}`);
    const scores: any[] = await response.json();

    let results: string[] = [];
    for (const gameId of gameIds) {
        const initial_game = await kv.get<any>(gameId);
        if (!initial_game) continue;
        
        const score = scores.find(s => s.id === initial_game.id);
        if (score && score.scores) {
            const home_score = score.scores.find((s: any) => s.name === initial_game.home_team)?.score || 'N/A';
            const away_score = score.scores.find((s: any) => s.name === initial_game.away_team)?.score || 'N/A';
            results.push(`⚽ ${initial_game.home_team} ${home_score} x ${away_score} ${initial_game.away_team}`);
        }
    }
    
    if (results.length > 0) {
        const final_message = "📋 *RESULTADOS DO DIA*\n\n" + results.join('\n');
        await postToTelegram(final_message);
    } else {
        await postToTelegram("📋 Nenhum resultado disponível para os jogos do dia.");
    }
}
