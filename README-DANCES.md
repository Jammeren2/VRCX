# VRCX: патч "Оттанцованные"

Этот fork/patch добавляет локальную вкладку "Оттанцованные" в VRCX. Данные
хранятся в локальной SQLite-базе VRCX и привязаны к текущему аккаунту VRCX.

## Сборка

Требования:

- Node.js `>=24.10.0`
- npm `>=11.5.0`
- .NET SDK 10 для CEF-билда
- Visual Studio Build Tools для Windows CEF-билда
- 7-Zip и NSIS для полного zip/installer pipeline

Проверочный release-билд:

```powershell
npm ci
npm run prod
dotnet build Dotnet\VRCX-Cef.csproj -p:Configuration=Release -p:WarningLevel=0 -p:Platform=x64 -p:PlatformTarget=x64 -p:RestorePackagesConfig=true -t:"Restore;Clean;Build" -m -a x64 --self-contained
build-scripts\make-junction.cmd
```

Запуск собранного приложения:

```powershell
build\Cef\VRCX.exe
```

Полная сборка zip/installer из Visual Studio Developer PowerShell:

```powershell
.\build-scripts\build-all.ps1
```

Ожидаемые результаты:

- `VRCX_YYYYMMDD.zip`
- `VRCX_YYYYMMDD_Setup.exe`
- `SHA256SUMS.txt`

## Перенос на новую версию VRCX

Держите изменения танцев отдельной веткой и небольшим patch-файлом:

```powershell
git switch -c feature/dances
New-Item -ItemType Directory -Force patches
git diff --output=patches\vrcx-dances.patch -- . ':!patches/vrcx-dances.patch'
```

После обновления VRCX:

```powershell
git remote add upstream https://github.com/vrcx-team/VRCX.git
git fetch upstream
git rebase upstream/master
git apply patches\vrcx-dances.patch
```

Основная логика танцев лежит в новых файлах. Существующие файлы VRCX изменены
только как точки подключения: инициализация базы, stores, router/nav, профиль
пользователя, layout-диалог и таблица "Список игроков".
