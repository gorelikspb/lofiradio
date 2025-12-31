<<<<<<< HEAD
// Скрипт для автоматического создания скриншотов проекта Lofi Radio
// Использует Puppeteer для создания скриншотов на русском и английском языках
=======
// Автоматическая генерация скриншотов для дневника проекта
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

<<<<<<< HEAD
const PROJECT_ROOT = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(PROJECT_ROOT, 'lofiradio_log', 'screenshots');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
=======
const SCREENSHOTS_DIR = path.join(__dirname, '../lofiradio_log/screenshots');
const PUBLIC_DIR = path.join(__dirname, '../public');
const INDEX_HTML = path.join(PUBLIC_DIR, 'index.html');
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
const LANGUAGES = ['ru', 'en'];

async function captureScreenshots() {
    // Создаем папки если их нет
    LANGUAGES.forEach(lang => {
        const dir = path.join(SCREENSHOTS_DIR, lang);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

<<<<<<< HEAD
    // Проверяем наличие файлов
    const ruIndex = path.join(PUBLIC_DIR, 'ru', 'index.html');
    const enIndex = path.join(PUBLIC_DIR, 'en', 'index.html');
    
    if (!fs.existsSync(ruIndex) || !fs.existsSync(enIndex)) {
        console.error('❌ Файлы не найдены:', ruIndex, enIndex);
=======
    // Проверяем наличие файла
    if (!fs.existsSync(INDEX_HTML)) {
        console.error('❌ Файл не найден:', INDEX_HTML);
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
        process.exit(1);
    }
    
    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
<<<<<<< HEAD
                '--disable-web-security',
=======
                '--disable-web-security', // Обходим CORS для file://
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
                '--allow-file-access-from-files'
            ]
        });
        
        for (const lang of LANGUAGES) {
            console.log(`\n=== Язык: ${lang.toUpperCase()} ===`);
            const page = await browser.newPage();
            
            // Настройка размера экрана
            await page.setViewport({ width: 1920, height: 1080 });

<<<<<<< HEAD
            // Используем file:// протокол для языковой версии
            const indexPath = path.join(PUBLIC_DIR, lang, 'index.html');
            const fileUrl = `file://${indexPath.replace(/\\/g, '/')}`;
=======
            // Используем file:// протокол напрямую (быстро, без сервера)
            const fileUrl = `file://${INDEX_HTML.replace(/\\/g, '/')}?lang=${lang}`;
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
            
            console.log(`Загрузка страницы (${lang})...`);
            await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
            
<<<<<<< HEAD
            // Ждем загрузки плеера
            await page.waitForSelector('.player-wrapper', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 1000)); // Даем время на загрузку
=======
            // Ждем только нужные элементы (быстрее)
            await page.waitForSelector('.player-wrapper', { timeout: 5000 });
            await new Promise(resolve => setTimeout(resolve, 500)); // Минимальная задержка
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60

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
<<<<<<< HEAD
                await new Promise(resolve => setTimeout(resolve, 1500)); // Ждем начала воспроизведения и визуализации
=======
                await new Promise(resolve => setTimeout(resolve, 800)); // Уменьшено время ожидания
>>>>>>> 62fb05cce1eb900a92e9afe92e40646d597c9b60
                
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

