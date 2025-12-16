// PWA Install Prompt и Bookmark functionality
let deferredPrompt;
let installButton;
let bookmarkButton;

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    initPWAInstall();
    initBookmarkButton();
});

// PWA Install Prompt
function initPWAInstall() {
    // Проверяем, установлено ли уже приложение
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        // Приложение уже установлено
        return;
    }

    // Создаем кнопку установки если её нет
    if (!document.getElementById('installButton')) {
        installButton = document.createElement('button');
        installButton.id = 'installButton';
        installButton.className = 'pwa-install-btn';
        installButton.innerHTML = '📱 Установить приложение';
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
        
        // Показываем с небольшой задержкой для лучшего UX
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
            // Если промпт недоступен, показываем инструкции
            showInstallInstructions();
            return;
        }

        // Показываем промпт установки
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`User response to install prompt: ${outcome}`);
        
        if (outcome === 'accepted') {
            installButton.textContent = '✓ Установлено!';
            installButton.style.background = '#4caf50';
            setTimeout(() => {
                installButton.style.display = 'none';
            }, 3000);
        } else {
            installButton.textContent = '📱 Установить приложение';
        }
        
        deferredPrompt = null;
        installButton.style.display = 'none';
    });

    // Скрываем кнопку если приложение уже установлено
    window.addEventListener('appinstalled', () => {
        console.log('PWA установлено');
        installButton.style.display = 'none';
        deferredPrompt = null;
    });
}

// Кнопка добавления в закладки
function initBookmarkButton() {
    // Проверяем, поддерживается ли API закладок
    if (!('bookmark' in window)) {
        // Создаем кнопку добавления в закладки
        if (!document.getElementById('bookmarkButton')) {
            bookmarkButton = document.createElement('button');
            bookmarkButton.id = 'bookmarkButton';
            bookmarkButton.className = 'bookmark-btn';
            bookmarkButton.innerHTML = '⭐ Добавить в закладки';
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

        // Показываем кнопку через 3 секунды после загрузки
        setTimeout(() => {
            bookmarkButton.style.opacity = '0';
            bookmarkButton.style.display = 'block';
            setTimeout(() => {
                bookmarkButton.style.transition = 'opacity 0.3s ease';
                bookmarkButton.style.opacity = '1';
            }, 10);
        }, 3000);

        // Обработчик клика
        bookmarkButton.addEventListener('click', () => {
            showBookmarkInstructions();
        });
    }
}

// Показ инструкций по установке
function showInstallInstructions() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isIOS) {
        instructions = `
            <div style="padding: 20px;">
                <h3>📱 Установка на iPhone/iPad:</h3>
                <ol style="text-align: left; line-height: 1.8;">
                    <li>Нажмите кнопку <strong>Поделиться</strong> (квадрат со стрелкой)</li>
                    <li>Прокрутите вниз и выберите <strong>"На экран Домой"</strong></li>
                    <li>Нажмите <strong>"Добавить"</strong></li>
                </ol>
            </div>
        `;
    } else if (isAndroid) {
        instructions = `
            <div style="padding: 20px;">
                <h3>📱 Установка на Android:</h3>
                <ol style="text-align: left; line-height: 1.8;">
                    <li>Нажмите меню браузера (три точки)</li>
                    <li>Выберите <strong>"Установить приложение"</strong> или <strong>"Добавить на главный экран"</strong></li>
                    <li>Подтвердите установку</li>
                </ol>
            </div>
        `;
    } else {
        instructions = `
            <div style="padding: 20px;">
                <h3>📱 Установка приложения:</h3>
                <p>Нажмите на иконку установки в адресной строке браузера или используйте меню браузера.</p>
            </div>
        `;
    }
    
    showModal('Установка приложения', instructions);
}

// Показ инструкций по добавлению в закладки
function showBookmarkInstructions() {
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    const isEdge = /Edge/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome || isEdge) {
        instructions = `
            <div style="padding: 20px;">
                <h3>⭐ Добавление в закладки:</h3>
                <ol style="text-align: left; line-height: 1.8;">
                    <li>Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)</li>
                    <li>Или нажмите на звездочку в адресной строке</li>
                    <li>Подтвердите добавление</li>
                </ol>
            </div>
        `;
    } else if (isFirefox) {
        instructions = `
            <div style="padding: 20px;">
                <h3>⭐ Добавление в закладки:</h3>
                <ol style="text-align: left; line-height: 1.8;">
                    <li>Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)</li>
                    <li>Или нажмите на звездочку в адресной строке</li>
                    <li>Выберите папку и подтвердите</li>
                </ol>
            </div>
        `;
    } else if (isSafari) {
        instructions = `
            <div style="padding: 20px;">
                <h3>⭐ Добавление в закладки:</h3>
                <ol style="text-align: left; line-height: 1.8;">
                    <li>Нажмите <strong>Cmd+D</strong></li>
                    <li>Или используйте меню: <strong>Закладки → Добавить закладку</strong></li>
                    <li>Подтвердите добавление</li>
                </ol>
            </div>
        `;
    } else {
        instructions = `
            <div style="padding: 20px;">
                <h3>⭐ Добавление в закладки:</h3>
                <p>Нажмите <strong>Ctrl+D</strong> (Windows) или <strong>Cmd+D</strong> (Mac)</p>
            </div>
        `;
    }
    
    showModal('Добавить в закладки', instructions);
}

// Модальное окно для инструкций
function showModal(title, content) {
    // Удаляем существующее модальное окно если есть
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
            ">Понятно</button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Анимации
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

    // Закрытие модального окна
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

