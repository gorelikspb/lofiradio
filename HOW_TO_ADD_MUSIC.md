# 🎵 Как добавить музыку в Lofi Radio

## Быстрый способ

1. **Скачайте бесплатные lofi треки**:
   - [Free Music Archive](https://freemusicarchive.org/genre/Lo-Fi/) - бесплатные треки
   - [Pixabay Music](https://pixabay.com/music/search/lofi/) - бесплатные треки без авторских прав
   - [Jamendo](https://www.jamendo.com/search?qs=fq=genre:lofi) - бесплатная музыка
   - Или используйте свои треки

2. **Поместите файлы в папку**:
   ```
   public/assets/music/
   ```
   
   Формат: MP3 файлы с именами `track-001.mp3`, `track-002.mp3` и т.д.

3. **Обновите `playlist.json`**:
   
   Добавьте информацию о каждом треке:
   ```json
   {
     "tracks": [
       {
         "id": 1,
         "title": "Название трека 1",
         "file": "assets/music/track-001.mp3",
         "artist": "Исполнитель"
       },
       {
         "id": 2,
         "title": "Название трека 2",
         "file": "assets/music/track-002.mp3",
         "artist": "Исполнитель"
       }
     ],
     "shuffle": true,
     "repeat": true
   }
   ```

4. **Готово!** Откройте `index.html` и наслаждайтесь музыкой.

## Автоматическое создание плейлиста

Если у вас много файлов, можно использовать скрипт для автоматического создания `playlist.json`:

### PowerShell скрипт (Windows):

```powershell
# create-playlist.ps1
$musicDir = "public/assets/music"
$playlistFile = "public/playlist.json"

$tracks = Get-ChildItem -Path $musicDir -Filter "*.mp3" | ForEach-Object -Begin { $id = 1 } -Process {
    @{
        id = $id++
        title = $_.BaseName
        file = "assets/music/$($_.Name)"
        artist = "Lofi Artist"
    }
}

$playlist = @{
    tracks = $tracks
    shuffle = $true
    repeat = $true
} | ConvertTo-Json -Depth 10

$playlist | Out-File -FilePath $playlistFile -Encoding UTF8
Write-Host "Создан плейлист с $($tracks.Count) треками"
```

**Использование:**
```powershell
.\create-playlist.ps1
```

### Bash скрипт (Linux/Mac):

```bash
#!/bin/bash
# create-playlist.sh

MUSIC_DIR="public/assets/music"
PLAYLIST_FILE="public/playlist.json"

echo '{"tracks":[' > "$PLAYLIST_FILE"
ID=1
FIRST=true

for file in "$MUSIC_DIR"/*.mp3; do
    if [ -f "$file" ]; then
        if [ "$FIRST" = false ]; then
            echo ',' >> "$PLAYLIST_FILE"
        fi
        FIRST=false
        
        filename=$(basename "$file")
        basename="${filename%.*}"
        
        echo "  {" >> "$PLAYLIST_FILE"
        echo "    \"id\": $ID," >> "$PLAYLIST_FILE"
        echo "    \"title\": \"$basename\"," >> "$PLAYLIST_FILE"
        echo "    \"file\": \"assets/music/$filename\"," >> "$PLAYLIST_FILE"
        echo "    \"artist\": \"Lofi Artist\"" >> "$PLAYLIST_FILE"
        echo -n "  }" >> "$PLAYLIST_FILE"
        
        ID=$((ID + 1))
    fi
done

echo '' >> "$PLAYLIST_FILE"
echo '],"shuffle":true,"repeat":true}' >> "$PLAYLIST_FILE"

echo "Плейлист создан!"
```

**Использование:**
```bash
chmod +x create-playlist.sh
./create-playlist.sh
```

## Рекомендации

- **Формат файлов**: MP3 (самый совместимый формат)
- **Качество**: 128-192 kbps достаточно для lofi музыки
- **Размер файлов**: Оптимизируйте файлы для быстрой загрузки
- **Количество**: Можно добавить сколько угодно треков (100+)

## Структура файлов

```
lofiradio/
├── public/
│   ├── assets/
│   │   └── music/
│   │       ├── track-001.mp3
│   │       ├── track-002.mp3
│   │       └── ...
│   └── playlist.json
```

## Настройки плейлиста

В `playlist.json` можно настроить:

- `shuffle: true` - случайный порядок треков
- `repeat: true` - повторять плейлист по кругу
- `shuffle: false` - играть по порядку
- `repeat: false` - остановиться в конце плейлиста

---

**Готово!** Теперь у вас есть стабильное локальное радио без задержек! 🎧

