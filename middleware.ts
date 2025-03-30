import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Логи для отладки
const logPrefix = '[Middleware]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

// Путь к странице входа
const loginPage = '/';

// Путь к странице onboarding
const onboardingPage = '/onboarding';

// Добавьте сюда публичные (не требующие входа) маршруты
// Все другие маршруты будут защищены и требовать входа
// Важно: plasmic-host и ваша страница входа всегда должны быть публичными
const publicRoutes = [
  '/',
  '/plasmic-host',
  '/auth/callback',
];

// Функция middleware
// Она будет выполняться при каждом запросе к вашему приложению, соответствующему шаблону внизу этого файла
// Адаптирована из документации @supabase/ssr https://supabase.com/docs/guides/auth/server-side/nextjs
export async function middleware(request: NextRequest) {
  debug('Запуск middleware для:', request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request,
  });

  // Создаем новый supabase клиент
  // Обновляем истекшие токены аутентификации и устанавливаем новые cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ВАЖНО: Избегайте написания логики между createServerClient и
  // supabase.auth.getUser(). Простая ошибка может сделать очень сложным отладку
  // проблем с пользователями, которые случайно выходят из системы.

  // Получаем данные залогиненного пользователя, если он есть
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  debug('Пользователь:', user ? 'авторизован' : 'не авторизован');
  
  // Если пользователь авторизован и находится на главной странице, 
  // перенаправляем на страницу onboarding
  if (user && request.nextUrl.pathname === '/') {
    debug('Авторизованный пользователь на главной странице, перенаправление на:', onboardingPage);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = onboardingPage;
    return NextResponse.redirect(redirectUrl);
  }
  
  // Решаем, нужно ли перенаправлять на страницу / или нет
  // Если маршрут не в списке публичных и пользователь не авторизован,
  // перенаправляем на главную страницу
  if (publicRoutes.includes(request.nextUrl.pathname) !== true && !user) {
    // Это защищенный маршрут, но пользователь не вошел в систему
    // Перенаправляем на страницу входа
    debug('Перенаправление на страницу входа:', loginPage);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = loginPage;
    redirectUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

// Только запускаем middleware для запросов, соответствующих этому шаблону
export const config = {
  matcher: [
    /*
     * Совпадает со всеми путями кроме:
     * - файлов с расширением (например, файлы в /public)
     * - опционально, путей, начинающихся с _next/static или _next/image
     * - опционально, api/auth/* (для кастомных обработчиков авторизации)
     */
    '/((?!_next/static|_next/image|favicon.ico|.+\\..+).*)',
  ],
}; 