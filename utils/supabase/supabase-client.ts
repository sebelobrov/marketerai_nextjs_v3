/**
 * utils/supabase/supabase-client.ts
 * Упрощенная фабрика клиентов Supabase, соответствующая официальной документации
 * для интеграции с Next.js Pages Router
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Конфигурация логов
const logPrefix = '[SupabaseClient]';
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

// Хранилище для синглтона клиента браузера
let browserClient: SupabaseClient | null = null;
// Флаг для отслеживания процесса инициализации
let isInitializing = false;
// Кеш для хранения последнего результата getUser
let userDataCache: { data: any, timestamp: number } | null = null;

// Проверка обязательных переменных окружения
const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL или Anon Key не определены в переменных окружения');
  }

  return { supabaseUrl, supabaseKey };
};

/**
 * Создает или возвращает существующий клиент Supabase для использования на стороне клиента
 * в соответствии с официальной документацией. Реализует паттерн синглтона.
 */
export const createClient = () => {
  // Возвращаем существующий клиент, если он уже создан
  if (browserClient !== null) {
    return browserClient;
  }

  // Если мы не в браузере, но почему-то вызвали эту функцию, 
  // возвращаем новый клиент (не сохраняем синглтон)
  if (typeof window === 'undefined') {
    debug('Создание клиента для сервера через createClient (не рекомендуется)');
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    return createBrowserClient(supabaseUrl, supabaseKey, {});
  }

  // Предотвращаем параллельную инициализацию
  if (isInitializing) {
    debug('Предотвращение параллельной инициализации клиента');
    // Создаем временный клиент, если инициализация уже идет
    const { supabaseUrl, supabaseKey } = getSupabaseConfig();
    return createBrowserClient(supabaseUrl, supabaseKey, {});
  }
  
  isInitializing = true;
  debug('Создание нового клиента Supabase для браузера');
  
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  // Создаем новый клиент
  browserClient = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce', // Используем PKCE-поток для безопасной авторизации
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    }
  });

  isInitializing = false;
  return browserClient;
};

/**
 * Получает данные пользователя с использованием кеширования для предотвращения
 * избыточных запросов к API
 */
export const getUserWithCache = async (client: SupabaseClient, forceRefresh = false) => {
  const MAX_CACHE_AGE = 30 * 1000; // 30 секунд
  const now = Date.now();
  
  // Используем кеш, если он существует, не устарел и не требуется принудительное обновление
  if (userDataCache && !forceRefresh && now - userDataCache.timestamp < MAX_CACHE_AGE) {
    debug('Используем кешированные данные пользователя');
    return userDataCache.data;
  }

  debug('Получение данных пользователя от API');
  const result = await client.auth.getUser();
  
  // Кешируем результат
  userDataCache = {
    data: result,
    timestamp: now
  };
  
  return result;
};

/**
 * Сбрасывает синглтон клиента Supabase и кеш данных.
 * Используется только при выходе пользователя.
 */
export const resetClient = () => {
  debug('Сброс синглтона клиента Supabase и кеша');
  browserClient = null;
  userDataCache = null;
  isInitializing = false;
};

/**
 * Создает клиент Supabase для использования в API-маршрутах (Pages Router)
 */
export const createServerClientForApi = (req: NextApiRequest, res: NextApiResponse) => {
  debug('Создание клиента Supabase для API routes');
  
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return req.cookies[name];
      },
      set(name, value, options) {
        res.setHeader(
          'Set-Cookie',
          `${name}=${value}; Path=${options?.path || '/'}; ${
            options?.maxAge ? `Max-Age=${options.maxAge};` : ''
          } ${options?.domain ? `Domain=${options.domain};` : ''} ${
            options?.secure ? 'Secure;' : ''
          } ${options?.httpOnly ? 'HttpOnly;' : ''} ${
            options?.sameSite ? `SameSite=${options.sameSite}` : ''
          }`
        );
      },
      remove(name, options) {
        res.setHeader(
          'Set-Cookie',
          `${name}=; Path=${options?.path || '/'}; Max-Age=0; ${
            options?.domain ? `Domain=${options.domain};` : ''
          } ${options?.secure ? 'Secure;' : ''} ${
            options?.sameSite ? `SameSite=${options.sameSite}` : ''
          }`
        );
      },
    },
  });
};

/**
 * Создает клиент Supabase для использования в middleware
 */
export const createMiddlewareClient = (
  request: NextRequest, 
  response: NextResponse
) => {
  debug('Создание клиента Supabase для middleware');
  
  const { supabaseUrl, supabaseKey } = getSupabaseConfig();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name, options) {
        request.cookies.delete(name);
        response.cookies.delete(name);
      },
    },
  });
}; 