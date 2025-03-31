import { createBrowserClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';

// Логирование для отладки
const logPrefix = '[SupabaseClient]';
// Включаем логи только в development режиме
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

/**
 * Создает клиент Supabase для использования на стороне клиента (браузера).
 * Реализован в соответствии с документацией Supabase для Next.js Pages Router.
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages
 */
export const createClient = () => {
  debug('Создание клиента Supabase');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL или Anon Key не определены в переменных окружения');
  }

  // Создаем клиент с поддержкой cookies и localStorage
  const client = createBrowserClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: 'pkce', // Используем PKCE-поток для безопасной авторизации
      autoRefreshToken: true, // Автоматически обновлять токены
      persistSession: true, // Сохранять сессию между перезагрузками страницы
      detectSessionInUrl: true, // Автоматически обрабатывать код авторизации в URL
      // Обработка кода произойдет автоматически при инициализации клиента
      // если в URL есть параметр code и в localStorage есть code_verifier
    },
    cookies: {
      get(name: string) {
        // Проверка на клиентскую среду
        if (typeof document === 'undefined') {
          debug('get cookie: не в браузере');
          return undefined;
        }
        
        try {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];
            
          debug(`get cookie ${name}:`, cookie ? '[найдено]' : '[не найдено]');
          return cookie;
        } catch (e) {
          debug('Ошибка при получении cookie:', e);
          return undefined;
        }
      },
      set(name: string, value: string, options?: CookieOptions) {
        debug(`set cookie ${name}:`, value.substring(0, 10) + '...');
        
        // Проверка на клиентскую среду
        if (typeof document === 'undefined') {
          debug('set cookie: не в браузере');
          return;
        }
        
        try {
          let cookieString = `${name}=${value}`;
          
          if (options) {
            if (options.expires) {
              cookieString += `; expires=${options.expires.toUTCString()}`;
            }
            if (options.maxAge) {
              cookieString += `; max-age=${options.maxAge}`;
            }
            if (options.domain) {
              cookieString += `; domain=${options.domain}`;
            }
            if (options.path) {
              cookieString += `; path=${options.path}`;
            } else {
              // По умолчанию устанавливаем cookie для всего сайта
              cookieString += "; path=/";
            }
            if (options.secure) {
              cookieString += '; secure';
            }
            if (options.httpOnly) {
              cookieString += '; httpOnly';
            }
            if (options.sameSite) {
              cookieString += `; samesite=${options.sameSite}`;
            }
          } else {
            // По умолчанию устанавливаем cookie для всего сайта
            cookieString += "; path=/";
          }
          
          document.cookie = cookieString;
          debug(`Cookie ${name} установлен`);
        } catch (e) {
          debug('Ошибка при установке cookie:', e);
        }
      },
      remove(name: string, options?: CookieOptions) {
        debug(`remove cookie ${name}`);
        
        // Проверка на клиентскую среду
        if (typeof document === 'undefined') {
          debug('remove cookie: не в браузере');
          return;
        }
        
        try {
          // Для удаления cookie устанавливаем пустое значение и срок действия в прошлом
          let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
          
          if (options) {
            if (options.domain) {
              cookieString += `; domain=${options.domain}`;
            }
            if (options.path) {
              cookieString += `; path=${options.path}`;
            } else {
              cookieString += "; path=/";
            }
            if (options.secure) {
              cookieString += '; secure';
            }
            if (options.sameSite) {
              cookieString += `; samesite=${options.sameSite}`;
            }
          } else {
            cookieString += "; path=/";
          }
          
          document.cookie = cookieString;
          debug(`Cookie ${name} удален`);
        } catch (e) {
          debug('Ошибка при удалении cookie:', e);
        }
      },
    },
  });

  if (DEBUG) {
    // Логируем при создании клиента, если включена отладка
    setTimeout(() => {
      client.auth.getSession().then(({ data }) => {
        if (data.session) {
          debug('Сессия при инициализации клиента:', {
            userId: data.session.user.id,
            expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
          });
        } else {
          debug('Нет активной сессии при инициализации клиента');
          // Проверяем наличие code_verifier в localStorage для отладки
          const hasCodeVerifier = Object.keys(localStorage).some(key => 
            key.includes('code_verifier') || key.includes('supabase')
          );
          debug('Наличие code_verifier в localStorage:', hasCodeVerifier);
        }
      });
    }, 0);
  }

  return client;
};

// Проверка наличия токенов в localStorage для отладки
export const checkTokensInLocalStorage = () => {
  if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (supabaseUrl) {
      const accessToken = localStorage.getItem(`sb-${new URL(supabaseUrl).hostname}-auth-token`);
      console.debug('[AUTH-DEBUG] Токены в localStorage:', accessToken ? 'найдены' : 'не найдены');
      
      if (accessToken) {
        try {
          const parsedToken = JSON.parse(accessToken);
          console.debug('[AUTH-DEBUG] Срок действия токена:', new Date(parsedToken.expires_at * 1000).toISOString());
        } catch (e) {
          console.debug('[AUTH-DEBUG] Не удалось распарсить токен');
        }
      }
    }
  }
}; 