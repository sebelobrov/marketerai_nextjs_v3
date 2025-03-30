import { createServerClient, serialize } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';

// Логи для отладки
const logPrefix = '[SupabaseApi]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

export function createClient(req: NextApiRequest, res: NextApiResponse) {
  debug('Создание серверного клиента для API маршрутов');
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          debug('Получение cookie:', name);
          const value = req.cookies[name];
          debug('Значение cookie:', name, value ? '[FOUND]' : '[NOT FOUND]');
          return value;
        },
        set(name, value, options) {
          debug('Установка cookie:', name);
          res.setHeader('Set-Cookie', serialize(name, value, options));
        },
        remove(name, options) {
          debug('Удаление cookie:', name);
          res.setHeader('Set-Cookie', serialize(name, '', options));
        },
      },
    }
  );

  debug('Серверный клиент для API маршрутов создан');
  return supabase;
} 