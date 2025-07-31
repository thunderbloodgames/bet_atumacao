import type { NextRequest } from 'next/server';
import { fetchGameResults } from '../services/betsService.js';

export const runtime = 'edge';
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }
    try {
        await fetchGameResults();
        return new Response(JSON.stringify({ status: "success", task: "get_results" }), { status: 200 });
    } catch (e: any) {
        return new Response(JSON.stringify({ status: "error", message: e.message }), { status: 500 });
    }
}
