import { useRouter } from 'next/router';
import { useEffect } from 'react';
import createClient from '../../utils/supabase/component';

// Логи для отладки
const logPrefix = '[AuthCallback]';
const debug = (...message: unknown[]) => console.log(logPrefix, ...message);

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    debug('Инициализация страницы обратного вызова');
    
    const handleCallback = async () => {
      try {
        debug('Начало обработки callback');
        
        // Проверяем, что мы на клиенте
        if (typeof window === 'undefined') {
          debug('Мы на сервере, пропускаем обработку');
          return;
        }

        const supabase = createClient();
        
        // Получаем хэш из URL
        const hash = window.location.hash;
        
        // Если есть хэш, значит это обратный вызов от провайдера OAuth
        if (hash) {
          debug('Обрабатываем хэш:', hash);
          
          // Обрабатываем сессию
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            debug('Ошибка при получении сессии:', error);
            throw error;
          }
          
          if (data.session) {
            debug('Сессия получена успешно:', data.session.user.id);
            
            // Перенаправляем на страницу onboarding
            const redirectUrl = '/onboarding';
            debug('Перенаправление на:', redirectUrl);
            router.push(redirectUrl);
          } else {
            debug('Сессия не создана после OAuth');
            router.push('/');
          }
        } else {
          debug('Нет хэша в URL, возможно это не callback');
          router.push('/');
        }
      } catch (error) {
        debug('Ошибка при обработке callback:', error);
        console.error('Ошибка при обработке callback:', error);
        router.push('/');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-center text-lg">Выполняется вход...</p>
    </div>
  );
} 