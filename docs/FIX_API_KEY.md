# Исправление ошибки "The API developer key is invalid"

## Причина

API Key либо неправильно настроен, либо не имеет доступа к Google Picker API.

## Решение

### Шаг 1: Включите Google Picker API

1. Перейдите: https://console.cloud.google.com/apis/library
2. Найдите **"Google Picker API"**
3. Нажмите **"Enable"** (Включить)

### Шаг 2: Проверьте существующий API Key

1. Перейдите: https://console.cloud.google.com/apis/credentials
2. Найдите ваш API Key в списке
3. Нажмите на него для редактирования

### Шаг 3: Настройте ограничения API Key

**API restrictions** (Ограничения API):

- Выберите **"Restrict key"**
- Отметьте следующие API:
  - ✅ Google Drive API
  - ✅ Google Picker API
  - ✅ (опционально) People API

**Application restrictions** (Ограничения приложения):

- Выберите **"HTTP referrers (web sites)"**
- Добавьте:
  - `http://localhost:3000/*`
  - `http://localhost:3000`
  - (для production добавьте ваш домен)

### Шаг 4: Создайте новый API Key (если нужно)

Если проблема не решается:

1. Перейдите: https://console.cloud.google.com/apis/credentials
2. Нажмите **"+ CREATE CREDENTIALS"** → **"API key"**
3. Скопируйте новый ключ
4. Нажмите **"RESTRICT KEY"**
5. Настройте как описано в Шаге 3
6. Нажмите **"Save"**

### Шаг 5: Обновите код

Замените API_KEY в файле `google-drive-picker.tsx` (строка 63):

```typescript
const API_KEY = "ваш_новый_API_KEY";
```

### Шаг 6: Очистите кэш и перезапустите

```bash
npm run clear
npm start
```

## Важно!

- API Key должен быть создан в **том же проекте**, что и OAuth Client ID
- Убедитесь, что Google Picker API **включен** в проекте
- Подождите 1-2 минуты после создания/изменения API Key

## Альтернативное решение

Если ничего не помогает, попробуйте использовать API Key **без ограничений** (только для тестирования!):

1. Создайте новый API Key
2. В разделе "API restrictions" выберите **"Don't restrict key"**
3. В разделе "Application restrictions" выберите **"None"**
4. Сохраните и используйте этот ключ

⚠️ **Внимание**: Неограниченный API Key небезопасен для production! Используйте только для локального тестирования.
