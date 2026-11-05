// Vercel Serverless Function — Fournit les clés publiques Supabase au client en toute sécurité
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Récupération depuis les variables d'environnement Vercel
    const supabaseUrl = process.env.SUPABASE_URL || 
                          process.env.VITE_SUPABASE_URL || 
                          'https://flopepsxpsyrpmhadqkx.supabase.co';

    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 
                             process.env.SUPABASE_KEY || 
                             'sb_publishable_4oYJ9aK5pDiaEXo5GFgLbQ_Bf-LQKOH';

    return res.status(200).json({
        SUPABASE_URL: supabaseUrl,
        SUPABASE_ANON_KEY: supabaseAnonKey
    });
}
