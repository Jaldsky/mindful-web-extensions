#!/bin/bash

echo "🧪 Запуск тестов для Chrome Extension..."
echo "=================================="
echo ""

if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Запустите скрипт из папки extensions/chrome/"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ Ошибка: npx не найден. Установите Node.js"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Установка зависимостей..."
    npm install
fi

echo "🚀 Запуск тестов..."
echo ""
npx jest --config=tests/jest.config.js --verbose --coverage

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Все тесты прошли успешно!"
    echo "📊 Отчет о покрытии кода сохранен в папке coverage/"
else
    echo ""
    echo "❌ Некоторые тесты не прошли. Проверьте вывод выше."
    exit 1
fi
