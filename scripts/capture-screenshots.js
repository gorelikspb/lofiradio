// Автоматическая генерация скриншотов для дневника проекта
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../lofiradio_log/screenshots');
const PUBLIC_DIR = path.join(__dirname, '../public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');
const LANGUAGES = ['ru', 'en'];

async function captureScreenshots() {
    // Создаем папки если их нет
    LANGUAGES.forEach(lang => {
        const dir = path.join(SCREENSHOTS_DIR, lang);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Проверяем наличие файла
    if (!fs.existsSync(INDEX_HTML)) {
        console.error('❌ Файл не найден:', INDEX_HTML);
        process.exit(1);
    }
    
    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-web-security', // Обходим CORS для file://
                '--allow-file-access-from-files'
            ]
        });
        
        for (const lang of LANGUAGES) {
            console.log(`\n=== Язык: ${lang.toUpperCase()} ===`);
            const page = await browser.newPage();
            
            // Настройка размера экрана
            await page.setViewport({ width: 1920, height: 1080 });

            // Используем file:// протокол напрямую (быстро, без сервера)
            const fileUrl = `file://${INDEX_HTML.replace(/\\/g, '/')}?lang=${lang}`;
            
            console.log(`Загрузка страницы (${lang})...`);
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
            // Ждем только нужные элементы (быстрее)
            await page.waitForSelector('.player-wrapper', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 500)); // Минимальная задержка

            // Скриншот 1: Главная страница (плеер)
            console.log(`Скриншот 1: Главная страница (${lang})...`);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, lang, '01-main-player.png'),
                fullPage: false,
                clip: { x: 0, y: 0, width: 1920, height: 1080 }
            });

            // Скриншот 2: Плеер в режиме воспроизведения
            const playButton = await page.$('#playBtn');
            if (playButton) {
                await playButton.click();
                await new Promise(resolve => setTimeout(resolve, 800)); // Уменьшено время ожидания
                
                console.log(`Скриншот 2: Плеер играет (${lang})...`);
                await page.screenshot({
                    path: path.join(SCREENSHOTS_DIR, lang, '02-player-playing.png'),
                    fullPage: false,
                    clip: { x: 0, y: 0, width: 1920, height: 1080 }
                });
            }

            // Мобильный скриншот
            await page.setViewport({ width: 375, height: 667 });
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('.player-wrapper', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log(`Скриншот 3: Мобильная версия (${lang})...`);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, lang, '03-mobile.png'),
                fullPage: true
            });

            await page.close();
        }

        await browser.close();
        console.log('\n✅ Скриншоты созданы для всех языков в:', SCREENSHOTS_DIR);
    } catch (error) {
        console.error('Ошибка:', error.message);
        process.exit(1);
    }
}

captureScreenshots().catch(console.error);

