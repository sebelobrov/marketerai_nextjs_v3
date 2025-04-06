/**
 * utils/supabase/client.ts
 * Клиент Supabase для использования на стороне клиента (браузера)
 * @deprecated Рекомендуется использовать utils/supabase/supabase-client.ts напрямую
 */

import { createClient as createClientUtil } from './supabase-client';

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
 * Создает клиент Supabase для использования на стороне клиента (браузера)
 * @deprecated Рекомендуется использовать utils/supabase/supabase-client.ts напрямую
 */
export const createClient = () => {
  debug('Создание клиента через устаревший метод');
  return createClientUtil();
}; 