/**
 * utils/supabase/server.ts
 * Клиент Supabase для использования на стороне сервера в API маршрутах
 * @deprecated Рекомендуется использовать utils/supabase/supabase-client.ts напрямую
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForApi } from './supabase-client';

// Логирование для отладки
const logPrefix = '[SupabaseServer]';
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

/**
 * Создает клиент Supabase для API-маршрутов
 * @deprecated Рекомендуется использовать utils/supabase/supabase-client.ts напрямую
 */
export function createClient(req: NextApiRequest, res: NextApiResponse) {
  debug('Создание серверного клиента через устаревший метод');
  return createServerClientForApi(req, res);
} 