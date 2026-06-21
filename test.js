const fs = require('fs');

(async () => {
    const url = 'https://dizipal1556.com/movies/squatch';
    const html = await fetch(url).then(r => r.text());
    
    // Sayfanın HTML'ini kaydet
    fs.writeFileSync('sayfa.html', html);
    console.log('✅ sayfa.html kaydedildi');
    
    // Video ID ara (farklı pattern'ler)
    const patterns = [
        /data-id=["']([^"']+)["']/i,
        /video-id=["']([^"']+)["']/i,
        /video_id=["']([^"']+)["']/i,
        /id=["']video-([^"']+)["']/i,
        /data-video=["']([^"']+)["']/i,
        /player\/([a-zA-Z0-9]+)/i,
        /v=([a-zA-Z0-9]+)/i,
        /"video":"([^"]+)"/i,
        /"id":"([^"]+)"/i,
        /window\.videoId=["']([^"']+)["']/i,
        /videoId=["']([^"']+)["']/i
    ];
    
    console.log('\n🔍 ARANAN PATTERN\'LER:');
    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
            console.log(`✅ BULUNDU: ${pattern} → ${match[1]}`);
        }
    }
    
    // Tüm script'leri ara
    const scripts = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    console.log(`\n📄 ${scripts.length} adet script bulundu`);
    
    for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].includes('video') || scripts[i].includes('player')) {
            console.log(`\n📜 Script ${i+1}:`);
            console.log(scripts[i].substring(0, 500));
            console.log('...');
        }
    }
})();
