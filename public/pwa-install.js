// PWA Install Prompt и Bookmark functionality
let deferredPrompt;
let installButton;
let bookmarkButton;

const PWA_TEXT = {
    ru: {
        installBtn: '📱 Установить приложение',
        installedBtn: '✓ Установлено!',
        bookmarkBtn: '⭐ Добавить в закладки',
        installTitle: 'Установка приложения',
        bookmarkTitle: 'Добавить в закладки',
        closeBtn: 'Понятно',
        iosTitle: '📱 Установка на iPhone/iPad:',
        iosSteps: [
            'Нажмите кнопку <strong>Поделиться</strong> (квадрат со стрелкой)',
            'Прокрутите вниз и выберите <strong>"На экран Домой"</strong>',
            'Нажмите <strong>"Добавить"</strong>',
        ],
        androidTitle: '📱 Установка на Android:',
        androidSteps: [
            'Нажмите меню браузера (три точки)',
            'Выберите <strong>"Установить приложение"</strong> или <strong>"Добавить на главный экран"</strong>',
            'Подтвердите установку',
        ],
        desktopInstallTitle: '📱 Установка приложения:',
        desktopInstallBody: 'Нажмите на иконку установки в адресной строке браузера или используйте меню браузера.',
        bookmarkHeading: '⭐ Добавление в закладки:',
        chromeBookmarkSteps: [
            'Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)',
            'Или нажмите на звездочку в адресной строке',
            'Подтвердите добавление',
        ],
        firefoxBookmarkSteps: [
            'Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)',
            'Или нажмите на звездочку в адресной строке',
            'Выберите папку и подтвердите',
        ],
        safariBookmarkSteps: [
            'Нажмите <strong>Cmd+D</strong>',
            'Или используйте меню: <strong>Закладки → Добавить закладку</strong>',
            'Подтвердите добавление',
        ],
        defaultBookmarkBody: 'Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)',
    },
    en: {
        installBtn: '📱 Install app',
        installedBtn: '✓ Installed!',
        bookmarkBtn: '⭐ Bookmark',
        installTitle: 'Install app',
        bookmarkTitle: 'Add to bookmarks',
        closeBtn: 'Got it',
        iosTitle: '📱 Install on iPhone/iPad:',
        iosSteps: [
            'Tap the <strong>Share</strong> button (square with arrow)',
            'Scroll down and choose <strong>"Add to Home Screen"</strong>',
            'Tap <strong>"Add"</strong>',
        ],
        androidTitle: '📱 Install on Android:',
        androidSteps: [
            'Open the browser menu (three dots)',
            'Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>',
            'Confirm installation',
        ],
        desktopInstallTitle: '📱 Install app:',
        desktopInstallBody: 'Click the install icon in your browser address bar or use the browser menu.',
        bookmarkHeading: '⭐ Add to bookmarks:',
        chromeBookmarkSteps: [
            'Press <strong>Ctrl+D</strong> (Windows) or <strong>Cmd+D</strong> (Mac)',
            'Or click the star icon in the address bar',
            'Confirm adding the bookmark',
        ],
        firefoxBookmarkSteps: [
            'Press <strong>Ctrl+D</strong> (Windows) or <strong>Cmd+D</strong> (Mac)',
            'Or click the star icon in the address bar',
            'Choose a folder and confirm',
        ],
        safariBookmarkSteps: [
            'Press <strong>Cmd+D</strong>',
            'Or use menu: <strong>Bookmarks → Add Bookmark</strong>',
            'Confirm adding the bookmark',
        ],
        defaultBookmarkBody: 'Press <strong>Ctrl+D</strong> (Windows) or <strong>Cmd+D</strong> (Mac)',
    },
};

function getPwaText() {
    const isEn =
        (document.documentElement.lang || '').toLowerCase().startsWith('en') ||
        window.location.pathname.startsWith('/en');
    return isEn ? PWA_TEXT.en : PWA_TEXT.ru;
}

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
        return;
    }
    initPWAInstall();
    initBookmarkButton();
});

// PWA Install Prompt
function initPWAInstall() {
    // Проверяем, установлено ли уже приложение
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        return;
    }

    const t = getPwaText();

    // Создаем кнопку установки если её нет
    if (!document.getElementById('installButton')) {
        installButton = document.createElement('button');
        installButton.id = 'installButton';
        installButton.className = 'pwa-install-btn';
        installButton.innerHTML = t.installBtn;
        installButton.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            transition: all 0.3s ease;
            display: none;
        `;
        installButton.addEventListener('mouseenter', () => {
            installButton.style.transform = 'scale(1.05)';
            installButton.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
        });
        installButton.addEventListener('mouseleave', () => {
            installButton.style.transform = 'scale(1)';
            installButton.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
        });
        document.body.appendChild(installButton);
    } else {
        installButton = document.getElementById('installButton');
    }

    // Слушаем событие beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installButton.style.display = 'block';

        setTimeout(() => {
            installButton.style.opacity = '0';
            installButton.style.display = 'block';
            setTimeout(() => {
                installButton.style.transition = 'opacity 0.3s ease';
                installButton.style.opacity = '1';
            }, 10);
        }, 2000);
    });

    // Обработчик клика на кнопку установки
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showInstallInstructions();
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`User response to install prompt: ${outcome}`);

        if (outcome === 'accepted') {
            installButton.textContent = t.installedBtn;
            installButton.style.background = '#4caf50';
            setTimeout(() => {
                installButton.style.display = 'none';
            }, 3000);
        } else {
            installButton.textContent = t.installBtn;
        }

        deferredPrompt = null;
        installButton.style.display = 'none';
    });

    // Скрываем кнопку если приложение уже установлено
    window.addEventListener('appinstalled', () => {
        console.log('PWA installed');
        installButton.style.display = 'none';
        deferredPrompt = null;
    });
}

// Кнопка добавления в закладки
function initBookmarkButton() {
    if (!('bookmark' in window)) {
        const t = getPwaText();

        if (!document.getElementById('bookmarkButton')) {
            bookmarkButton = document.createElement('button');
            bookmarkButton.id = 'bookmarkButton';
            bookmarkButton.className = 'bookmark-btn';
            bookmarkButton.innerHTML = t.bookmarkBtn;
            bookmarkButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 10000;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 25px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
                transition: all 0.3s ease;
                display: none;
            `;
            bookmarkButton.addEventListener('mouseenter', () => {
                bookmarkButton.style.transform = 'scale(1.05)';
                bookmarkButton.style.boxShadow = '0 6px 20px rgba(245, 87, 108, 0.6)';
            });
            bookmarkButton.addEventListener('mouseleave', () => {
                bookmarkButton.style.transform = 'scale(1)';
                bookmarkButton.style.boxShadow = '0 4px 15px rgba(245, 87, 108, 0.4)';
            });
            document.body.appendChild(bookmarkButton);
        } else {
            bookmarkButton = document.getElementById('bookmarkButton');
        }

        setTimeout(() => {
            bookmarkButton.style.opacity = '0';
            bookmarkButton.style.display = 'block';
            setTimeout(() => {
                bookmarkButton.style.transition = 'opacity 0.3s ease';
                bookmarkButton.style.opacity = '1';
            }, 10);
        }, 3000);

        bookmarkButton.addEventListener('click', () => {
            showBookmarkInstructions();
        });
    }
}

function renderSteps(heading, steps) {
    const items = steps.map((s) => `<li>${s}</li>`).join('');
    return `
        <div style="padding: 20px;">
            <h3>${heading}</h3>
            <ol style="text-align: left; line-height: 1.8;">${items}</ol>
        </div>
    `;
}

// Показ инструкций по установке
function showInstallInstructions() {
    const t = getPwaText();
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructions = '';
    if (isIOS) {
        instructions = renderSteps(t.iosTitle, t.iosSteps);
    } else if (isAndroid) {
        instructions = renderSteps(t.androidTitle, t.androidSteps);
    } else {
        instructions = `
            <div style="padding: 20px;">
                <h3>${t.desktopInstallTitle}</h3>
                <p>${t.desktopInstallBody}</p>
            </div>
        `;
    }

    showModal(t.installTitle, instructions);
}

// Показ инструкций по добавлению в закладки
function showBookmarkInstructions() {
    const t = getPwaText();
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edge/.test(navigator.userAgent);

    let instructions = '';
    if (isChrome || isEdge) {
        instructions = renderSteps(t.bookmarkHeading, t.chromeBookmarkSteps);
    } else if (isFirefox) {
        instructions = renderSteps(t.bookmarkHeading, t.firefoxBookmarkSteps);
    } else if (isSafari) {
        instructions = renderSteps(t.bookmarkHeading, t.safariBookmarkSteps);
    } else {
        instructions = `
            <div style="padding: 20px;">
                <h3>${t.bookmarkHeading}</h3>
                <p>${t.defaultBookmarkBody}</p>
            </div>
        `;
    }

    showModal(t.bookmarkTitle, instructions);
}

// Модальное окно для инструкций
function showModal(title, content) {
    const t = getPwaText();
    const existingModal = document.getElementById('pwaModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'pwaModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 10001;
        display: flex;
        justify-content: center;
        align-items: center;
        animation: fadeIn 0.3s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease;
    `;

    modalContent.innerHTML = `
        <div style="padding: 30px; text-align: center;">
            <h2 style="margin-top: 0; color: #333;">${title}</h2>
            ${content}
            <button id="closeModal" style="
                margin-top: 20px;
                padding: 10px 30px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 25px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
            ">${t.closeBtn}</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    document.getElementById('closeModal').addEventListener('click', () => {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
    });
}
