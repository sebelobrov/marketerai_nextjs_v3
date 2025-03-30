import { createBrowserClient } from '@supabase/ssr'
import { parse, serialize } from 'cookie';

// Логи для отладки
const logPrefix = '[SupabaseClient]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

// Функция для проверки доступности cookies
// Используется для определения, запущены ли мы в Plasmic Studio/Preview
// В Plasmic Studio/Preview установка cookies не вызывает ошибок, но значение не сохраняется
// Если cookies не работают, будем сохранять сессионную информацию в localStorage
function cookiesAvailable() {
  debug('Проверка доступности cookies');
  document.cookie = 'studioEnv=false';
  const cookies = parse(document.cookie);
  const testCookieRefetched = cookies['studioEnv'];

  if(testCookieRefetched) {
    // Cookie установка работает. Мы не в Plasmic Studio
    // Удаляем ненужную cookie
    document.cookie = "studioEnv=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
    debug('Cookies доступны');
    return true;
  } else {
    // Cookie установка не работает. Мы в Plasmic Studio
    debug('Cookies недоступны, будет использован localStorage');
    return false;
  }
}

export default function createClient() {
  debug('Создание клиента Supabase');
  // Создаем клиент Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Переопределяем поведение по умолчанию для хранения сессионных данных
      // Причина: Plasmic Studio и Plasmic Preview запускают приложение в iframe, который не поддерживает cookies
      // Поэтому в Plasmic Studio мы сохраняем данные сессии в localStorage
      // Но сохраняем стандартное поведение с cookies вне Plasmic Studio для безопасности
      cookies: {
        // Переопределяем получение сессионных данных
        get: (key) => {
          debug('Получение cookie:', key);
          
          if(cookiesAvailable()) {
            // Cookies доступны, получаем данные из cookies
            // Это поведение по умолчанию
            // Этот вариант должен работать везде, кроме Plasmic Studio и Plasmic Preview
            const cookies = parse(document.cookie);
            debug('Cookie из document.cookie:', key, cookies[key] ? '[FOUND]' : '[NOT FOUND]');
            return cookies[key];
          } else {
            // Cookies недоступны, значит мы в Plasmic Studio или Plasmic Preview
            // Ищем данные сессии в localStorage
            const value = localStorage.getItem(key);
            debug('Cookie из localStorage:', key, value ? '[FOUND]' : '[NOT FOUND]');
            return value;
          }
        },

        // Переопределяем сохранение сессионных данных
        set: (key, value, options) => {
          debug('Установка cookie:', key);
          
          if(cookiesAvailable()) {
            // Cookies доступны, сохраняем в cookies
            // Это поведение по умолчанию
            // ТОЛЬКО этот метод будет использоваться, когда cookies доступны
            debug('Сохранение в document.cookie');
            document.cookie = serialize(key, value, options);
          } else {
            // Cookies недоступны, сохраняем в localStorage
            debug('Сохранение в localStorage');
            localStorage.setItem(key, value);
          }
        },

        // Переопределяем удаление сессионных данных
        // Удаляем данные и из cookies, и из localStorage
        remove: (key, options) => {
          debug('Удаление cookie:', key);
          // Удаляем данные из cookies (если есть)
          document.cookie = serialize(key, '', options);
          // Удаляем данные из localStorage (если есть)
          localStorage.removeItem(key);
        }
      },
    }
  );

  debug('Клиент Supabase создан');
  return supabase;
} 