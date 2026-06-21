// pages/api/decrypt.js
import axios from 'axios';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

export default async function handler(req, res) {
    // CORS ayarları (Frontend'in bu API'ye erişebilmesi için)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parametresi eksik.' });
    }

    try {
        // 1. Hedef siteye istek at
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://dizipal1556.com'
            }
        });

        const $ = cheerio.load(data);
        const encryptedText = $('div[data-rm-k=true]').text();

        let iframeUrl = '';

        // 2. Şifreli veri varsa çöz (Kotlin kodunun Node.js karşılığı)
        if (encryptedText) {
            const passphrase = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
            
            const ctMatch = encryptedText.match(/"ciphertext"\s*:\s*"([^"]+)"/);
            const ivMatch = encryptedText.match(/"iv"\s*:\s*"([^"]+)"/);
            const saltMatch = encryptedText.match(/"salt"\s*:\s*"([^"]+)"/);

            if (ctMatch && ivMatch && saltMatch) {
                const salt = Buffer.from(saltMatch[1], 'hex');
                const iv = Buffer.from(ivMatch[1], 'hex');
                const ciphertext = Buffer.from(ctMatch[1], 'base64');

                // PBKDF2 ile key üretimi (Kotlin: 999 iteration, 256 bit = 32 bytes)
                const key = crypto.pbkdf2Sync(passphrase, salt, 999, 32, 'sha512');
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                
                let decrypted = decipher.update(ciphertext, undefined, 'utf8');
                decrypted += decipher.final('utf8');
                
                iframeUrl = decrypted.replace(/\\\//g, '/');
                
                if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
                else if (!iframeUrl.startsWith("http")) iframeUrl = "https://" + iframeUrl;
            }
        } else {
            // Şifre yoksa direkt iframe'i al
            iframeUrl = $('iframe').attr('src');
        }

        return res.status(200).json({ success: true, iframeUrl });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
