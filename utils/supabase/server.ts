import { createServerClient } from '@supabase/ssr'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { CookieOptions } from '@supabase/ssr'

// Логирование для отладки
const logPrefix = '[SupabaseServer]';
const debug = (...message: unknown[]) => console.log(logPrefix, ...message);

// Создание клиента Supabase для API-маршрутов (req/res)
export function createClient(req: NextApiRequest, res: NextApiResponse) {
  debug('Создание серверного клиента для API routes');
  
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          debug('Получение cookie:', name);
          return req.cookies[name];
        },
        set(name, value, options) {
          debug('Установка cookie:', name);
          
          // Формируем строку cookie
          const cookieValue = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`;
          
          // Добавляем опции, если они указаны
          const cookieWithOptions = [
            cookieValue,
            options?.maxAge ? `Max-Age=${options.maxAge}` : '',
            options?.domain ? `Domain=${options.domain}` : '',
            options?.secure ? 'Secure' : '',
          ].filter(Boolean).join('; ');
          
          // Устанавливаем cookie через заголовок Set-Cookie
          res.setHeader('Set-Cookie', cookieWithOptions);
        },
        remove(name, options) {
          debug('Удаление cookie:', name);
          // Устанавливаем cookie с истекшим сроком действия
          res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0`);
        },
      },
    }
  );
  
  debug('Серверный клиент создан');
  return client;
} 