import React, { useState, useEffect } from 'react';
import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../plasmic-init';
import { createClient } from '../utils/supabase/client';
import type { ComponentRenderData } from '@plasmicapp/loader-nextjs';
import { ParsedUrlQuery } from 'querystring';
import { isAuthInitialized } from './supabase/SupabaseUserGlobalContext';
import { authManager } from '../utils/auth/AuthManager';

// Компонент загрузки
const AuthLoadingPlaceholder = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    width: '100%',
    backgroundColor: '#ffffff'
  }}>
    <div className="loading-spinner"></div>
  </div>
);

export interface CustomPlasmicRootProviderProps {
  loader: typeof PLASMIC;
  prefetchedData?: ComponentRenderData;
  prefetchedQueryData?: Record<string, unknown>;
  pageRoute?: string;
  pageParams?: Record<string, string>;
  pageQuery?: ParsedUrlQuery;
  children: React.ReactNode;
}

export function CustomPlasmicRootProvider({
  loader,
  prefetchedData,
  prefetchedQueryData,
  pageRoute,
  pageParams,
  pageQuery,
  children,
}: CustomPlasmicRootProviderProps) {
  // Всегда начинаем с isAuthReady = false, чтобы дождаться проверки текущего состояния авторизации
  // Это исправляет проблему, когда используется устаревшее состояние из localStorage
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  useEffect(() => {
    console.log('[CustomPlasmicRootProvider] Проверка состояния авторизации...');
    
    // Принудительно сбрасываем флаг при первой загрузке страницы
    // Это гарантирует, что страница не будет рендериться до получения актуальных данных
    authManager.setInitialized(false);
    
    // Инициируем процесс аутентификации
    const supabase = createClient();
    supabase.auth.getSession();
    
    // Используем requestAnimationFrame для эффективной проверки состояния
    let timeoutId: number | null = null;
    let checkCount = 0;
    
    const checkAuthStatus = () => {
      // Если инициализирована авторизация - подтверждено через API, а не localStorage
      if (isAuthInitialized()) {
        console.log('[CustomPlasmicRootProvider] Авторизация инициализирована');
        setIsAuthReady(true);
        return;
      }
      
      // Ограничение количества проверок (~3 секунды)
      checkCount++;
      if (checkCount > 200) {
        console.warn('[CustomPlasmicRootProvider] Превышено время ожидания инициализации авторизации');
        // В случае таймаута помечаем авторизацию как инициализированную и разрешаем рендеринг
        authManager.setInitialized(true);
        setIsAuthReady(true);
        return;
      }
      
      // Запланировать следующую проверку
      timeoutId = window.requestAnimationFrame(checkAuthStatus);
    };
    
    // Запускаем проверку статуса
    timeoutId = window.requestAnimationFrame(checkAuthStatus);
    
    // Очистка при размонтировании
    return () => {
      if (timeoutId !== null) {
        window.cancelAnimationFrame(timeoutId);
      }
    };
  }, []);
  
  // Блокируем рендеринг до готовности авторизации
  if (!isAuthReady) {
    return <AuthLoadingPlaceholder />;
  }
  
  // Когда авторизация проверена, рендерим компоненты Plasmic
  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={prefetchedData}
      prefetchedQueryData={prefetchedQueryData}
      pageRoute={pageRoute}
      pageParams={pageParams}
      pageQuery={pageQuery}
    >
      {children}
    </PlasmicRootProvider>
  );
} 