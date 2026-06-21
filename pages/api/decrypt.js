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
        
        // 2. Tüm olası video kaynaklarını bul
        let videoUrl = '';
        let videoSource = '';

        // 2.1. Şifreli veriyi kontrol et (data-rm-k=true)
        const encryptedText = $('div[data-rm-k=true]').text();
        
        if (encryptedText) {
            const passphrase = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
            
            const ctMatch = encryptedText.match(/"ciphertext"\s*:\s*"([^"]+)"/);
            const ivMatch = encryptedText.match(/"iv"\s*:\s*"([^"]+)"/);
            const saltMatch = encryptedText.match(/"salt"\s*:\s*"([^"]+)"/);

            if (ctMatch && ivMatch && saltMatch) {
                const salt = Buffer.from(saltMatch[1], 'hex');
                const iv = Buffer.from(ivMatch[1], 'hex');
                const ciphertext = Buffer.from(ctMatch[1], 'base64');

                const key = crypto.pbkdf2Sync(passphrase, salt, 999, 32, 'sha512');
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
                
                let decrypted = decipher.update(ciphertext, undefined, 'utf8');
                decrypted += decipher.final('utf8');
                
                videoUrl = decrypted.replace(/\\\//g, '/');
                videoSource = 'decrypted';
                
                if (videoUrl.startsWith("//")) videoUrl = "https:" + videoUrl;
                else if (!videoUrl.startsWith("http")) videoUrl = "https://" + videoUrl;
            }
        }

        // 2.2. Şifreli veri yoksa veya çözülemediyse, iframe ara
        if (!videoUrl) {
            const iframe = $('iframe');
            if (iframe.length > 0) {
                videoUrl = iframe.attr('src');
                videoSource = 'iframe';
            }
        }

        // 2.3. İframe yoksa, video etiketi ara
        if (!videoUrl) {
            const video = $('video source');
            if (video.length > 0) {
                videoUrl = video.attr('src');
                videoSource = 'video';
            }
        }

        // 2.4. Video etiketi yoksa, link ara (m3u8, mp4, playlist)
        if (!videoUrl) {
            const link = $('a[href*="m3u8"], a[href*="mp4"], a[href*="playlist"]');
            if (link.length > 0) {
                videoUrl = link.attr('href');
                videoSource = 'link';
            }
        }

        // 2.5. Hala bulunamadıysa, script içinden URL yakala
        if (!videoUrl) {
            const scripts = $('script').map((i, el) => $(el).html()).get();
            for (const script of scripts) {
                if (script && (script.includes('m3u8') || script.includes('video') || script.includes('player') || script.includes('source'))) {
                    const matches = script.match(/(https?:\/\/[^\s"']+\.(m3u8|mp4|playlist|m3u)[^\s"']*)/gi);
                    if (matches && matches.length > 0) {
                        videoUrl = matches[0];
                        videoSource = 'script';
                        break;
                    }
                }
            }
        }

        // 2.6. Hala bulunamadıysa, data-src veya data-video ara
        if (!videoUrl) {
            const dataSrc = $('[data-src*="m3u8"], [data-src*="mp4"], [data-video]');
            if (dataSrc.length > 0) {
                videoUrl = dataSrc.attr('data-src') || dataSrc.attr('data-video');
                videoSource = 'data-attribute';
            }
        }

        // 3. Sonuçları döndür
        if (videoUrl) {
            // URL'yi temizle
            videoUrl = videoUrl.replace(/\\/g, '');
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;
            
            return res.status(200).json({ 
                success: true, 
                videoUrl: videoUrl,
                source: videoSource,
                message: 'Video kaynağı bulundu'
            });
        } else {
            return res.status(200).json({ 
                success: false, 
                videoUrl: null,
                message: 'Video kaynağı bulunamadı. Sayfada video oynatıcı olmayabilir veya JavaScript ile yükleniyor olabilir.'
            });
        }

    } catch (error) {
        return res.status(500).json({ 
            error: error.message,
            success: false
        });
    }
}
