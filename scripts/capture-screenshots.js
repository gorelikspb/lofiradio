// Автоматическая генерация скриншотов для дневника проекта
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../lofiradio_log/screenshots');
const PUBLIC_DIR = path.join(__dirname, '../public');
const LANGUAGES = ['ru', 'en'];

async function captureScreenshots() {
    // Создаем папки если их нет
    LANGUAGES.forEach(lang => {
        const dir = path.join(SCREENSHOTS_DIR, lang);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const browser = await puppeteer.launch({ headless: true });
    
    for (const lang of LANGUAGES) {
        console.log(`\n=== Язык: ${lang.toUpperCase()} ===`);
        const page = await browser.newPage();
        
        // Настройка размера экрана
        await page.setViewport({ width: 1920, height: 1080 });

        // URL с параметром языка
        const fileUrl = `file://${path.join(PUBLIC_DIR, 'index.html')}?lang=${lang}`;
        
        console.log(`Загрузка страницы (${lang})...`);
        await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
        
        // Ждем загрузки плейлиста и элементов
        await page.waitForSelector('.player-wrapper', { timeout: 10000 });
        await page.waitForTimeout(2000);

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
            await page.waitForTimeout(1500);
            
            console.log(`Скриншот 2: Плеер играет (${lang})...`);
            await page.screenshot({
                path: path.join(SCREENSHOTS_DIR, lang, '02-player-playing.png'),
                fullPage: false,
                clip: { x: 0, y: 0, width: 1920, height: 1080 }
            });
        }

        // Мобильный скриншот
        await page.setViewport({ width: 375, height: 667 });
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForTimeout(2000);
        
        console.log(`Скриншот 3: Мобильная версия (${lang})...`);
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, lang, '03-mobile.png'),
            fullPage: true
        });

        await page.close();
    }

    await browser.close();
    console.log('\n✅ Скриншоты созданы для всех языков в:', SCREENSHOTS_DIR);
}

captureScreenshots().catch(console.error);

