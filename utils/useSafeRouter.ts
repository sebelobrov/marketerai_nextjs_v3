import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

// Логи для отладки
const logPrefix = '[SafeRouter]';
const debug = (...args: any[]) => console.log(logPrefix, ...args);

// Хук для безопасного использования роутера
// Решает проблему с SSR при вызове методов роутера, когда роутер еще не готов
export function useSafeRouter() {
  const router = useRouter();
  const [isSafeToUseRouter, setIsSafeToUseRouter] = useState(false);

  useEffect(() => {
    if (router.isReady) {
      debug('Router готов к использованию');
      setIsSafeToUseRouter(true);
    }
  }, [router.isReady]);

  // Возвращаем безопасные обертки вокруг методов роутера
  return {
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      if (isSafeToUseRouter) {
        debug('Вызов router.push', args[0]);
        return router.push(...args);
      }
      debug('Попытка вызова router.push когда router не готов');
      return Promise.resolve(false);
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      if (isSafeToUseRouter) {
        debug('Вызов router.replace', args[0]);
        return router.replace(...args);
      }
      debug('Попытка вызова router.replace когда router не готов');
      return Promise.resolve(false);
    },
    isSafeToUseRouter,
  };
} 