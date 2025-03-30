import { createServerClient, serialize } from '@supabase/ssr';
import { type GetServerSidePropsContext } from 'next';

// Логи для отладки
const logPrefix = '[SupabaseServerProps]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

export function createClient(context: GetServerSidePropsContext) {
  debug('Создание серверного клиента для getServerSideProps');
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          debug('Получение cookie:', name);
          const value = context.req.cookies[name];
          debug('Значение cookie:', name, value ? '[FOUND]' : '[NOT FOUND]');
          return value;
        },
        set(name, value, options) {
          debug('Установка cookie:', name);
          context.res.appendHeader('Set-Cookie', serialize(name, value, options));
        },
        remove(name, options) {
          debug('Удаление cookie:', name);
          context.res.appendHeader('Set-Cookie', serialize(name, '', options));
        },
      },
    }
  );

  debug('Серверный клиент для getServerSideProps создан');
  return supabase;
} 