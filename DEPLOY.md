# 🚀 Деплой на Cloudflare Pages

## Быстрый деплой

### Шаг 1: Создай репозиторий на GitHub

1. Открой: https://github.com/new
2. Название: `lofiradio` (или любое другое)
3. Создай репозиторий (можно пустой)

### Шаг 2: Закоммить и запушить код

```powershell
git init
git add .
git commit -m "Initial commit: Lofi Radio"
git branch -M main
git remote add origin https://github.com/gorelikspb/lofiradio.git
git push -u origin main
```

### Шаг 3: Деплой на Cloudflare Pages

1. Открой: https://dash.cloudflare.com/pages
2. Нажми **"Create a project"** → **"Connect to Git"**
3. Выбери репозиторий: `gorelikspb/lofiradio`
4. Настройки:
   - **Project name**: `lofiradio`
   - **Production branch**: `main`
   - **Framework preset**: **None**
   - **Build command**: (оставь пустым)
   - **Build output directory**: `public` ⚠️ **ВАЖНО!**
   - **Root directory**: (оставь пустым)
5. Нажми **"Save and Deploy"**

### Шаг 4: Готово!

Сайт будет доступен по адресу: `https://lofiradio.pages.dev`

---

## ⚠️ Важно для музыки

**Музыкальные файлы НЕ коммитятся в Git** (они в `.gitignore`).

Если хочешь задеплоить с музыкой:

1. **Вариант 1**: Закоммить музыку (раскомментируй в `.gitignore`):
   ```gitignore
   # public/assets/music/*.mp3  <- убери #
   ```

2. **Вариант 2**: Использовать внешнее хранилище (Cloudflare R2, CDN)

3. **Вариант 3**: Деплоить без музыки, пользователи загружают свои треки локально

---

## 📝 Настройки деплоя

- **Build output directory**: `public`
- **Build command**: (пусто)
- **Framework preset**: None

---

**Готово!** 🎵

