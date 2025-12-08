// Автоматическая генерация скриншотов для дневника проекта
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '../lofiradio_log/screenshots');
const PUBLIC_DIR = path.join(__dirname, '../public');

async function captureScreenshots() {
    // Создаем папки если их нет
    [path.join(SCREENSHOTS_DIR, 'ru'), path.join(SCREENSHOTS_DIR, 'en')].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Настройка размера экрана
    await page.setViewport({ width: 1920, height: 1080 });

    // Запускаем локальный сервер или используем file://
    const fileUrl = `file://${path.join(PUBLIC_DIR, 'index.html')}`;
    
    console.log('Загрузка страницы...');
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Ждем загрузки плейлиста и элементов
    await page.waitForSelector('.player-wrapper', { timeout: 10000 });
    await page.waitForTimeout(2000); // Дополнительная задержка для загрузки

    // Скриншот 1: Главная страница (плеер)
    console.log('Скриншот 1: Главная страница...');
    await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ru', '01-main-player.png'),
        fullPage: false,
        clip: { x: 0, y: 0, width: 1920, height: 1080 }
    });

    // Скриншот 2: Плеер в режиме воспроизведения (если нужно)
    const playButton = await page.$('#playBtn');
    if (playButton) {
        await playButton.click();
        await page.waitForTimeout(1000); // Ждем начала воспроизведения
        
        console.log('Скриншот 2: Плеер играет...');
        await page.screenshot({
            path: path.join(SCREENSHOTS_DIR, 'ru', '02-player-playing.png'),
            fullPage: false,
            clip: { x: 0, y: 0, width: 1920, height: 1080 }
        });
    }

    // Мобильный скриншот
    await page.setViewport({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForTimeout(2000);
    
    console.log('Скриншот 3: Мобильная версия...');
    await page.screenshot({
        path: path.join(SCREENSHOTS_DIR, 'ru', '03-mobile.png'),
        fullPage: true
    });

    await browser.close();
    console.log('✅ Скриншоты созданы в:', SCREENSHOTS_DIR);
}

captureScreenshots().catch(console.error);

