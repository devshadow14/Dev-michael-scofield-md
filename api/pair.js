// api/pair.js
// Proxy HTTPS -> HTTP vers le serveur TechX-mini (MICHAEL SCOFIELD-MD)

const http = require('http');

const BOT_HOST = '51.75.118.149';
const BOT_PORT = 20224;

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Méthode non autorisée.' });
    }

    // TechX-mini attend { number: "..." } et pas { phoneNumber: "..." }
    const bodyString = JSON.stringify({ number: req.body?.phoneNumber });

    const options = {
        hostname: BOT_HOST,
        port: BOT_PORT,
        path: '/api/pair',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyString),
        },
        timeout: 20000,
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk) => { data += chunk; });
        proxyRes.on('end', () => {
            try {
                const parsed = JSON.parse(data);
                // TechX-mini renvoie "pairingCode" -> on le remet en "code" pour le site
                res.status(proxyRes.statusCode || 200).json({
                    success: !!parsed.success,
                    code: parsed.pairingCode,
                    message: parsed.message || parsed.error
                });
            } catch (err) {
                console.error('Réponse TechX-mini non-JSON :', data);
                res.status(502).json({ success: false, message: 'Réponse invalide du serveur de pairing.' });
            }
        });
    });

    proxyReq.on('timeout', () => {
        proxyReq.destroy();
        res.status(504).json({ success: false, message: 'Le serveur de pairing met trop de temps à répondre.' });
    });

    proxyReq.on('error', (err) => {
        console.error('Erreur proxy vers TechX-mini :', err.message);
        res.status(502).json({ success: false, message: `Le serveur de pairing est injoignable : ${err.message}` });
    });

    proxyReq.write(bodyString);
    proxyReq.end();
};
