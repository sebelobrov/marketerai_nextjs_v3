import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from './utils/supabase/supabase-client';

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

// Паттерны для статических ресурсов, которые следует пропускать
const staticPatterns = [
  /^\/(_next|static)\//,
  /\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/i,
  /^\/(favicon\.ico|robots\.txt|manifest\.json|sw\.js)$/
];

// Функция для проверки, является ли путь статическим ресурсом
const isStaticResource = (path: string): boolean => {
  return staticPatterns.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(path);
    }
    return path === pattern;
  });
};

/**
 * Middleware для обработки авторизации и маршрутизации
 * Основано на официальной документации Supabase для Next.js Pages Router
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs-pages
 */
export async function middleware(request: NextRequest) {
  try {
    const path = request.nextUrl.pathname;
    
    // Пропускаем статические ресурсы без обработки
    if (staticPatterns.some(pattern => pattern.test(path))) {
      return NextResponse.next();
    }
    
    debug('Проверка авторизации для:', path);
    
    // Создаем базовый ответ
    const response = NextResponse.next();
    
    // Отключаем кэширование для предсказуемого поведения
    response.headers.set('x-middleware-cache', 'no-cache');

    // Создаем клиент Supabase
    const supabase = createMiddlewareClient(request, response);

    // Проверяем пользователя
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    
    // Проверяем, является ли путь публичным
    const isPublicRoute = publicRoutes.some(route => 
      path === route || path.startsWith(`${route}/`)
    );
    
    debug(`Маршрут: ${path}, публичный: ${isPublicRoute}, авторизован: ${!!user}`);

    // Если путь не публичный и пользователь не авторизован - перенаправляем на главную
    if (!isPublicRoute && !user) {
      debug(`Перенаправление неавторизованного пользователя с ${path} на /`);
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Если пользователь авторизован и пытается посетить главную страницу - перенаправляем на /onboarding
    if (user && path === '/') {
      debug(`Перенаправление авторизованного пользователя с / на /onboarding`);
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    
    // Во всех остальных случаях продолжаем обработку запроса
    return response;
    
  } catch (err) {
    console.error('Ошибка в middleware:', err);
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