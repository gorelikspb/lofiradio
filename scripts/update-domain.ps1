# Скрипт для массовой замены домена в проекте
param(
    [Parameter(Mandatory=$true)]
    [string]$OldDomain = "lofilofi.pages.dev",
    
    [Parameter(Mandatory=$true)]
    [string]$NewDomain = ""
)

if ([string]::IsNullOrWhiteSpace($NewDomain)) {
    Write-Host "Использование: .\update-domain.ps1 -OldDomain 'старый-домен.com' -NewDomain 'новый-домен.com'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Пример:" -ForegroundColor Cyan
    Write-Host "  .\update-domain.ps1 -OldDomain 'lofilofi.pages.dev' -NewDomain 'lofimusic.online'" -ForegroundColor White
    exit
}

Write-Host "=== Обновление домена в проекте ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Старый домен: $OldDomain" -ForegroundColor Yellow
Write-Host "Новый домен:  $NewDomain" -ForegroundColor Green
Write-Host ""

# Подтверждение
$confirm = Read-Host "Продолжить замену? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Отменено." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Поиск файлов с упоминанием домена..." -ForegroundColor Cyan

# Находим все файлы с упоминанием старого домена
$files = Get-ChildItem -Path "public" -Recurse -Include *.html,*.xml,*.txt,*.json,*.js -File | 
    Where-Object { 
        $content = Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue
        $content -and $content -match [regex]::Escape($OldDomain)
    }

if ($files.Count -eq 0) {
    Write-Host "Файлы с упоминанием домена не найдены." -ForegroundColor Yellow
    exit
}

Write-Host "Найдено файлов: $($files.Count)" -ForegroundColor Green
Write-Host ""

$updatedCount = 0
$errorCount = 0

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        $newContent = $content -replace [regex]::Escape($OldDomain), $NewDomain
        
        if ($content -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
            Write-Host "✓ Обновлен: $($file.FullName)" -ForegroundColor Green
            $updatedCount++
        }
    } catch {
        Write-Host "✗ Ошибка при обновлении $($file.FullName): $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "=== Результат ===" -ForegroundColor Cyan
Write-Host "Обновлено файлов: $updatedCount" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Ошибок: $errorCount" -ForegroundColor Red
}

Write-Host ""
Write-Host "Следующие шаги:" -ForegroundColor Yellow
Write-Host "1. Проверьте изменения: git diff" -ForegroundColor White
Write-Host "2. Закоммитьте изменения: git add . && git commit -m 'Update domain to $NewDomain'" -ForegroundColor White
Write-Host "3. Отправьте на сервер: git push" -ForegroundColor White
Write-Host "4. Обновите настройки в Cloudflare Pages (Custom domains)" -ForegroundColor White
Write-Host "5. Проверьте работу сайта на новом домене" -ForegroundColor White
Write-Host ""

