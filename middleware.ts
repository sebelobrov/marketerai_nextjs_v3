import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Определение логирования
const logPrefix = '[Middleware]';
// Включаем логи только в development режиме
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

// Страница логина
const loginPage = '/';

// Публичные маршруты (не требуют авторизации)
const publicRoutes = [
  '/',                   // Главная страница
  '/auth/callback',      // Страница обработки OAuth callback
  '/plasmic-host'        // Plasmic host
];

/**
 * Middleware для проверки авторизации и управления доступом к страницам
 * Основано на официальной документации Supabase для Next.js Pages Router
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages
 */
export async function middleware(request: NextRequest) {
  try {
    debug('Начало обработки middleware для:', request.nextUrl.pathname);
    
    // Создаем базовый ответ, который будем модифицировать по необходимости
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Создаем серверный клиент Supabase для проверки сессии
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookie = request.cookies.get(name)?.value;
            debug(`Получение cookie ${name}:`, cookie ? '[найдено]' : '[не найдено]');
            return cookie;
          },
          set(name, value, options) {
            debug(`Установка cookie ${name}`);
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
            debug(`Удаление cookie ${name}`);
            request.cookies.delete(name);
            response.cookies.delete(name);
          },
        },
      }
    );

    // Получаем текущую сессию пользователя с серверной стороны
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      debug('Ошибка при получении сессии:', sessionError.message);
    }
    
    // Текущий путь запроса
    const path = request.nextUrl.pathname;
    
    // Отключаем кэширование для более предсказуемого поведения
    response.headers.set('x-middleware-cache', 'no-cache');
    
    // Логируем информацию о пользователе для отладки
    if (session) {
      debug('Пользователь авторизован:', {
        id: session.user.id,
        email: session.user.email,
        provider: session.user.app_metadata?.provider
      });
    } else {
      debug('Пользователь не авторизован');
    }
    
    // Проверяем, является ли путь публичным
    const isPublicRoute = publicRoutes.some(route => 
      path === route || path.startsWith(`${route}/`)
    );
    
    debug(`Проверка маршрута: ${path}, публичный: ${isPublicRoute}, авторизован: ${!!session}`);

    // Если путь не публичный и пользователь не авторизован - перенаправляем на главную
    if (!isPublicRoute && !session) {
      debug(`Перенаправление неавторизованного пользователя с ${path} на /`);
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Если пользователь авторизован и пытается посетить главную страницу - перенаправляем на /onboarding
    if (session && path === '/') {
      debug(`Перенаправление авторизованного пользователя с / на /onboarding`);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    
    // Во всех остальных случаях продолжаем выполнение запроса
    debug('Продолжение обработки запроса без перенаправления');
    return response;
    
  } catch (err) {
    console.error('Ошибка в middleware:', err);
    // В случае ошибки пропускаем запрос, чтобы система продолжала работать
    return NextResponse.next();
  }
}

// Определяет, на каких маршрутах будет запускаться middleware
export const config = {
  matcher: [
    /*
     * Обрабатываем все запросы, кроме:
     * - Статических ресурсов (_next/static)
     * - Изображений (_next/image)
     * - Favicon и других часто запрашиваемых статических файлов
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}; 