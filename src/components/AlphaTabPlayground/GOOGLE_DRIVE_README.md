# Google Drive Integration - Quick Start

## Что было добавлено

Новый компонент `GoogleDrivePicker` позволяет:

- ✅ Авторизоваться через Google Drive
- ✅ Выбрать папку в Google Drive
- ✅ Просмотреть список файлов Guitar Pro
- ✅ Загрузить файл напрямую в AlphaTab

## Файлы

1. **Компонент**: `src/components/AlphaTabPlayground/google-drive-picker.tsx`
2. **Стили**: `src/components/AlphaTabPlayground/styles.module.scss` (добавлены новые стили)
3. **Интеграция**: `src/components/AlphaTabPlayground/player-controls-group.tsx` (добавлена кнопка)

## Как настроить

### 1. Google Cloud Console

Следуйте инструкциям в файле: [`docs/GOOGLE_DRIVE_SETUP.md`](../docs/GOOGLE_DRIVE_SETUP.md)

Кратко:

- Создайте проект в Google Cloud Console
- Включите Google Drive API и Google Picker API
- Создайте OAuth 2.0 Client ID
- Создайте API Key

### 2. Настройка компонента

Откройте файл `src/components/AlphaTabPlayground/google-drive-picker.tsx` и замените:

```typescript
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY";
```

На ваши реальные значения из Google Cloud Console.

### 3. Запуск

```bash
npm start
```

## Как использовать

1. Откройте AlphaTab Playground
2. Найдите кнопку с иконкой Google Drive (рядом с кнопкой "Open File")
3. Нажмите для авторизации через Google
4. После авторизации нажмите снова для открытия модального окна
5. Выберите папку в Google Drive
6. Выберите файл из списка
7. Файл автоматически загрузится в AlphaTab

## Поддерживаемые форматы

- `.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp7` - Guitar Pro
- `.musicxml`, `.xml`, `.mxl` - MusicXML
- `.capx`, `.ptb` - Другие форматы табулатур

## Особенности реализации

### Безопасность

- Токен доступа сохраняется в `localStorage`
- Используется режим read-only (`drive.readonly` scope)
- Токен действует ~1 час, после чего нужна повторная авторизация

### UI/UX

- Модальное окно с анимациями
- Поддержка светлой и тёмной темы
- Фильтрация только поддерживаемых файлов
- Разные иконки для разных типов файлов
- Автоматическое закрытие модального окна после выбора файла

### Архитектура

- Компонент изолирован в отдельном файле
- Использует React hooks (useState, useEffect)
- TypeScript типизация
- Соответствует стилю проекта

## Дальнейшие улучшения

Можно добавить:

- ✨ Навигацию по вложенным папкам (при клике на папку открывать её)
- ✨ Поиск файлов по имени
- ✨ Сортировку файлов (по имени, дате, размеру)
- ✨ Кэширование списка файлов
- ✨ Refresh token для автоматического обновления токена
- ✨ Предпросмотр файла перед загрузкой
- ✨ Возможность загрузки файлов в Google Drive из AlphaTab
- ✨ Синхронизацию настроек между устройствами

## Troubleshooting

### Кнопка Google Drive не работает

- Проверьте консоль браузера на наличие ошибок
- Убедитесь, что CLIENT_ID и API_KEY настроены правильно
- Проверьте, что разрешены Authorized JavaScript origins в Google Cloud Console

### "Access blocked: This app's request is invalid"

- Добавьте `http://localhost:3000` в Authorized JavaScript origins
- Настройте OAuth consent screen

### Файлы не загружаются

- Проверьте, что файлы имеют поддерживаемые расширения
- Убедитесь, что у вас есть доступ к этим файлам в Google Drive
- Проверьте консоль на наличие CORS ошибок

## Контакты и поддержка

Полная документация: [`docs/GOOGLE_DRIVE_SETUP.md`](../docs/GOOGLE_DRIVE_SETUP.md)
