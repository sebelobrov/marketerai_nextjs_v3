import React, { useState, useEffect, useRef, useContext } from 'react';
import { PlasmicRootProvider } from '@plasmicapp/loader-nextjs';
import { PLASMIC } from '../plasmic-init';
import { createClient } from '../utils/supabase/supabase-client';
import type { ComponentRenderData } from '@plasmicapp/loader-nextjs';
import { ParsedUrlQuery } from 'querystring';
import { authManager } from '../utils/auth/AuthManager';
import { isAuthInitialized, AuthState } from '../components/supabase/SupabaseUserGlobalContext';
import { ThemeProvider, useTheme, ThemeContext } from './contexts/ThemeContext';

// Конфигурация логов
const logPrefix = '[PlasmicRoot]';
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

// Максимальное время ожидания (в миллисекундах)
const MAX_WAIT_TIME = 3000;

// Компонент загрузки
const LoadingPlaceholder = () => (
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

// Внутренний компонент для доступа к контексту темы
function InnerCustomPlasmicRootProvider({
  loader,
  prefetchedData,
  prefetchedQueryData,
  pageRoute,
  pageParams,
  pageQuery,
  children,
}: CustomPlasmicRootProviderProps) {
  const { theme } = useTheme(); // Получаем тему из контекста

  return (
    <PlasmicRootProvider
      loader={loader}
      prefetchedData={prefetchedData}
      prefetchedQueryData={prefetchedQueryData}
      pageRoute={pageRoute}
      pageParams={pageParams}
      pageQuery={pageQuery}
      globalVariants={[{ name: 'Mode', value: theme }]} // Передаем тему как глобальный вариант 'Mode'
    >
      {children}
    </PlasmicRootProvider>
  );
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
  // Состояние готовности авторизации
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Для предотвращения повторных запросов
  const hasCheckedAuth = useRef(false);
  
  useEffect(() => {
    debug('Проверка авторизации...');
    
    // Предотвращаем повторные проверки
    if (hasCheckedAuth.current) {
      return;
    }
    
    hasCheckedAuth.current = true;
    
    // Создаем таймаут безопасности
    const timeoutId = setTimeout(() => {
      debug('Таймаут инициализации авторизации, разрешаем рендеринг');
      setIsAuthReady(true);
    }, MAX_WAIT_TIME);
    
    // Если авторизация уже инициализирована, сразу разрешаем рендеринг
    if (isAuthInitialized()) {
      debug('Авторизация уже инициализирована, немедленный рендеринг');
      clearTimeout(timeoutId);
      setIsAuthReady(true);
      
      // Выводим информацию о пользователе
      if (AuthState.user) {
        debug('Пользователь авторизован:', AuthState.user.id);
      }
      return;
    }
    
    // Проверка, была ли авторизация инициализирована недавно
    const lastInitTime = authManager.getLastInitTime();
    const now = Date.now();
    if (lastInitTime > 0 && now - lastInitTime < 30000) {
      debug('Авторизация была инициализирована недавно');
      clearTimeout(timeoutId);
      setIsAuthReady(true);
      return;
    }
    
    // Функция для активного опроса состояния авторизации с ограниченной частотой
    let checkCount = 0;
    const maxChecks = 15; // Уменьшаем максимальное количество проверок с 100 до 15
    
    const checkAuthStatus = () => {
      // Прекращаем проверки если достигли максимального количества
      if (checkCount > maxChecks) {
        debug('Достигнуто максимальное количество проверок авторизации');
        clearTimeout(timeoutId);
        setIsAuthReady(true);
        return;
      }
      
      checkCount++;
      
      // Если авторизация уже инициализирована
      if (isAuthInitialized()) {
        debug('Авторизация инициализирована, разрешаем рендеринг');
        
        // Проверяем, есть ли данные пользователя
        if (AuthState.user) {
          debug('Пользователь авторизован:', AuthState.user.id);
        } else {
          debug('Пользователь не авторизован');
        }
        
        clearTimeout(timeoutId);
        setIsAuthReady(true);
        return;
      }
      
      // Увеличиваем интервал между проверками по мере увеличения количества проверок
      // Начиная с 200мс вместо 50мс и более быстро увеличиваем до 800мс вместо 300мс
      const interval = Math.min(200 + Math.floor(checkCount / 2) * 100, 800);
      
      // Запускаем проверку через динамический интервал
      setTimeout(checkAuthStatus, interval);
    };
    
    // Инициируем проверку авторизации только один раз
    createClient();
    
    // Запускаем активный опрос статуса авторизации
    checkAuthStatus();
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);
  
  // Показываем индикатор загрузки, пока не готова авторизация
  if (!isAuthReady) {
    return <LoadingPlaceholder />;
  }
  
  // Рендерим Plasmic компоненты когда авторизация готова
  return (
    // Оборачиваем все в ThemeProvider
    <ThemeProvider> 
      <InnerCustomPlasmicRootProvider
        loader={loader}
        prefetchedData={prefetchedData}
        prefetchedQueryData={prefetchedQueryData}
        pageRoute={pageRoute}
        pageParams={pageParams}
        pageQuery={pageQuery}
      >
        {children}
      </InnerCustomPlasmicRootProvider>
    </ThemeProvider>
  );
} 