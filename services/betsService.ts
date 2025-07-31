import { kv } from '@vercel/kv';
import { postToTelegram } from './telegramService.js';

// --- CONFIGURAÇÃO INICIAL ---
const ODDS_API_KEY = process.env.ODDS_API_KEY;
const AFFILIATE_LINK = process.env.AFFILIATE_LINK;
const PARTNER_BOOKMAKER_KEY = 'betonlineag';
const SPORT = 'soccer_brazil_campeonato';
const REGIONS = 'us';

// --- FUNÇÃO 1: Busca os jogos do dia (Com as alterações de texto) ---
export async function fetchDailyGames() {
    console.log("Iniciando busca de jogos do dia...");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
    
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`ERRO NA API de Odds: Status ${response.status}. Detalhes: ${errorText}`);
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
        await kv.set(game.id, game);
    }
    console.log("Jogos do dia salvos na memória.");

    // --- MUDANÇA 1: Título da mensagem ---
    // Removemos o nome da casa de apostas do título para ficar mais limpo.
    let messageLines = [`📊 *MERCADO ABERTO | Jogos do Dia*\n`];
    
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

    if (messageLines.length > 1) {
        let final_message = messageLines.join('\n');
        if (AFFILIATE_LINK) {
            // --- MUDANÇA 2: Mensagem do link de afiliado ---
            // Trocamos o texto por um mais persuasivo, como você sugeriu.
            final_message += `\n\n💰 Faça suas apostas e ganhe um bônus no cadastro na 1Win: ${AFFILIATE_LINK}`;
        }
        await postToTelegram(final_message);
    } else {
        await postToTelegram(`📊 Nenhum jogo para hoje encontrado com odds do parceiro.`);
    }
}

// --- FUNÇÃO 2: Verifica a variação das odds (com as alterações de texto) ---
export async function checkOddsVariation() {
    console.log("Iniciando verificação de variação de odds...");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");

    const gameIds = await kv.get<string[]>('daily_games_ids');
    if (!gameIds || gameIds.length === 0) {
        console.log("Nenhum ID de jogo na memória para verificar.");
        return;
    }

    const url = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_API_KEY}&regions=${REGIONS}&markets=h2h&oddsFormat=decimal`;
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
            const i_home_price = i_bookmaker.markets[0].outcomes.find((o: any) => o.name === initial_game.home_team)?.price || 0;
            const c_home_price = c_bookmaker.markets[0].outcomes.find((o: any) => o.name === current_game.home_team)?.price || 0;
            
            if (c_home_price > i_home_price * 1.10) {
                 // --- MUDANÇA 2 (Aplicada aqui também): Mensagem do link de afiliado ---
                const message = `⚡ *ALERTA DE VARIAÇÃO DE ODD!*\n\nNosso monitor detectou um movimento importante no mercado para o jogo:\n⚽ *${current_game.home_team} vs ${current_game.away_team}*\n\nA odd para a vitória do *${current_game.home_team}* subiu de ${i_home_price} para *${c_home_price}*!\n\n💰 Aproveite esta odd de valor e ganhe bônus na 1Win: ${AFFILIATE_LINK}`;
                await postToTelegram(message);
                await kv.set(gameId, current_game);
            }
        }
    }
    console.log("Verificação de odds concluída.");
}

// --- FUNÇÃO 3: Busca os resultados dos jogos (sem alterações de texto) ---
export async function fetchGameResults() {
    console.log("Iniciando busca de resultados...");
    if (!ODDS_API_KEY) throw new Error("Falta a variável de ambiente ODDS_API_KEY");
    
    const gameIds = await kv.get<string[]>('daily_games_ids');
    if (!gameIds || gameIds.length === 0) {
        await postToTelegram("📋 Nenhum jogo na memória para buscar resultados.");
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
