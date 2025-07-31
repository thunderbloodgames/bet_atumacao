import type { NextRequest } from 'next/server';
import { checkOddsVariation } from '../services/betsService.js'; // <--- CORREÇÃO AQUI

export const runtime = 'edge';
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        await checkOddsVariation();
        return new Response(JSON.stringify({ status: "success", task: "check_odds" }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ status: "error", message: e.message }), { status: 500 });
    }
}
