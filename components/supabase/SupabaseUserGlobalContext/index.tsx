import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { DataProvider } from "@plasmicapp/loader-nextjs";
import { GlobalActionsProvider } from "@plasmicapp/host";
import { createClient, resetClient, getUserWithCache } from '../../../utils/supabase/supabase-client';
import getErrMsg from "../../../utils/getErrMsg";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { authManager } from "../../../utils/auth/AuthManager";

// Конфигурация логов
const logPrefix = '[SupabaseUserGlobalContext]';
const DEBUG = process.env.NODE_ENV !== 'production';
// Уровни логирования: 0 - отключено, 1 - только ошибки, 2 - важные события, 3 - все события
const LOG_LEVEL = DEBUG ? 2 : 0;
const debug = (message: string, ...args: unknown[]) => {
  if (DEBUG && LOG_LEVEL >= 2) {
    console.log(logPrefix, message, ...args);
  }
};
const debugVerbose = (message: string, ...args: unknown[]) => {
  if (DEBUG && LOG_LEVEL >= 3) {
    console.log(logPrefix, message, ...args);
  }
};
const debugError = (message: string, ...args: unknown[]) => {
  if (DEBUG && LOG_LEVEL >= 1) {
    console.error(logPrefix, message, ...args);
  }
};

// Глобальное состояние авторизации - должно быть доступно до рендеринга Plasmic
export const AuthState = {
  user: null as User | null,
  session: null as Session | null,
  isAuthenticated: false, // Критично для Plasmic
  isLoading: true,
  error: null as string | null,
  lastFetchTime: 0
};

// Интервал для лимитирования запросов (15 минут вместо 5)
const MIN_FETCH_INTERVAL = 15 * 60 * 1000;

// Для блокирующей инициализации
let initPromise: Promise<void> | null = null;

// Проверка инициализации авторизации
export function isAuthInitialized(): boolean {
  return authManager.getInitialized();
}

// Блокирующая инициализация, возвращает Promise
export async function initializeAuth(force = false): Promise<void> {
  if (initPromise && !force) {
    return initPromise;
  }
  
  initPromise = new Promise<void>((resolve) => {
    const client = createClient();
    
    // Сбрасываем флаг инициализации
    authManager.setInitialized(false);
    
    // Запрашиваем данные пользователя с использованием кеша
    getUserWithCache(client, force).then(({ data, error: userError }) => {
      if (userError) {
        debugError('Ошибка при начальной инициализации:', userError);
        
        // Очищаем состояние
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        AuthState.error = getErrMsg(userError);
        
        // Даже при ошибке завершаем инициализацию
        authManager.setInitialized(true);
        resolve();
        return;
      }
      
      if (data.user) {
        debug('Начальная инициализация: пользователь найден:', data.user.id);
        
        // Получаем сессию
        client.auth.getSession().then(({ data: sessionData }) => {
          // Обновляем глобальное состояние
          AuthState.user = data.user;
          AuthState.session = sessionData.session;
          AuthState.isAuthenticated = true; // Критично для Plasmic
          AuthState.error = null;
          AuthState.lastFetchTime = Date.now();
          
          // Логируем метаданные для Plasmic
          if (DEBUG && LOG_LEVEL >= 3) {
            debugVerbose('Начальная инициализация: user_metadata:', JSON.stringify(data.user.user_metadata));
          }
          
          // Завершаем инициализацию
          authManager.setInitialized(true);
          resolve();
        }).catch(err => {
          debugError('Ошибка при получении сессии:', err);
          
          // Очищаем состояние
          AuthState.user = null;
          AuthState.session = null;
          AuthState.isAuthenticated = false;
          AuthState.error = getErrMsg(err);
          
          // Завершаем инициализацию
          authManager.setInitialized(true);
          resolve();
        });
      } else {
        debugVerbose('Начальная инициализация: пользователь не найден');
        
        // Очищаем состояние
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        AuthState.error = null;
        
        // Завершаем инициализацию
        authManager.setInitialized(true);
        resolve();
      }
    }).catch(err => {
      debugError('Ошибка при начальной инициализации:', err);
      
      // Очищаем состояние
      AuthState.user = null;
      AuthState.session = null;
      AuthState.isAuthenticated = false;
      AuthState.error = getErrMsg(err);
      
      // Завершаем инициализацию
      authManager.setInitialized(true);
      resolve();
    });
  });
  
  return initPromise;
}

// Инициализируем авторизацию немедленно при импорте модуля
// Это критично для Plasmic - данные должны быть доступны до рендеринга
if (typeof window !== 'undefined') {
  initializeAuth().catch(err => {
    debugError('Ошибка при блокирующей инициализации:', err);
  });
}

// Интерфейс данных, передаваемых через провайдер
interface DataProviderData {
  user: User | null;
  error: string | null;
  isAuthenticated: boolean;
  session: Session | null;
  isLoading: boolean;
  userFullName: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  userPicture: string;
}

export interface SupabaseUserGlobalContextProps {
  children: React.ReactNode;
}

export const SupabaseUserGlobalContext = ({ children }: SupabaseUserGlobalContextProps) => {
  // Состояние компонента отражает глобальное состояние
  const [user, setUser] = useState<User | null>(AuthState.user);
  const [session, setSession] = useState<Session | null>(AuthState.session);
  const [error, setError] = useState<string | null>(AuthState.error);
  const [isLoading, setIsLoading] = useState<boolean>(AuthState.isLoading);
  
  // Статус авторизации
  const isAuthenticated = !!user;
  
  // Клиент Supabase - мемоизируем для предотвращения повторных созданий
  const supabaseClient = useMemo<SupabaseClient>(() => createClient(), []);
  
  // Функция для группового обновления состояний и предотвращения каскадных обновлений
  const updateUserState = useCallback((userData: User | null, sessionData: Session | null, errorMsg: string | null, loading: boolean = false) => {
    // Обновляем все состояния одновременно для предотвращения ререндеров
    setUser(userData);
    setSession(sessionData);
    setError(errorMsg);
    setIsLoading(loading);
  }, []);
  
  // Флаг инициализации компонента
  const initialized = useRef(false);
  
  // Флаг выполнения запроса
  const fetchingData = useRef(false);

  // Получение данных пользователя (используется для обновления, не для инициализации)
  const fetchUserData = useCallback(async (force = false) => {
    if (fetchingData.current) {
      debugVerbose('Пропуск запроса: уже выполняется запрос');
      return;
    }
    
    const now = Date.now();
    if (!force && AuthState.lastFetchTime > 0 && now - AuthState.lastFetchTime < MIN_FETCH_INTERVAL) {
      debugVerbose('Пропуск запроса: последний запрос был выполнен недавно');
      return;
    }
    
    try {
      debug('Получение данных пользователя');
      fetchingData.current = true;
      setIsLoading(true);
      
      // Запрашиваем данные пользователя с использованием кеша
      const { data, error: userError } = await getUserWithCache(supabaseClient, force);
      
      // Обновляем время запроса
      AuthState.lastFetchTime = Date.now();
      
      if (userError) {
        throw userError;
      }

      if (data.user) {
        debug('Пользователь найден:', data.user.id);
        
        // Получаем сессию только если пользователь изменился
        if (!AuthState.user || AuthState.user.id !== data.user.id) {
          const { data: sessionData } = await supabaseClient.auth.getSession();
          
          // Обновляем состояние AuthState и компонента в один прием
          AuthState.user = data.user;
          AuthState.session = sessionData.session;
          AuthState.isAuthenticated = true;
          AuthState.error = null;
          
          // Используем групповое обновление состояний
          updateUserState(data.user, sessionData.session, null);
        } else {
          // Пользователь тот же, обновляем только данные пользователя
          AuthState.user = data.user;
          AuthState.isAuthenticated = true;
          AuthState.error = null;
          
          // Обновляем только нужные состояния
          setUser(data.user);
          setError(null);
        }
        
        if (LOG_LEVEL >= 3) {
          debugVerbose('Данные пользователя:', {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at,
            last_sign_in_at: data.user.last_sign_in_at,
            provider: data.user.app_metadata?.provider
          });
          
          // Важно для Plasmic - подробный лог метаданных
          debugVerbose('user_metadata:', JSON.stringify(data.user.user_metadata));
        }
      } else {
        debugVerbose('Пользователь не найден');
        
        // Очищаем состояние только если ранее был пользователь
        if (AuthState.user) {
          AuthState.user = null;
          AuthState.session = null;
          AuthState.isAuthenticated = false;
          AuthState.error = null;
          
          // Используем групповое обновление состояний
          updateUserState(null, null, null);
        }
      }
    } catch (err) {
      debugError('Ошибка при получении данных:', err);
      
      // Обновляем состояние ошибки
      const errorMsg = getErrMsg(err);
      AuthState.error = errorMsg;
      AuthState.user = null;
      AuthState.session = null;
      AuthState.isAuthenticated = false;
      
      // Используем групповое обновление состояний
      updateUserState(null, null, errorMsg);
    } finally {
      fetchingData.current = false;
      setIsLoading(false);
      AuthState.isLoading = false;
      
      // Устанавливаем флаг инициализации
      authManager.setInitialized(true);
    }
  }, [supabaseClient, updateUserState]);

  // Обработка изменений состояния авторизации
  const handleAuthStateChange = useCallback((event: string, updatedSession: Session | null) => {
    // Игнорируем события при неактивной вкладке
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      debugVerbose(`Пропуск события ${event} при неактивной вкладке`);
      return;
    }
    
    const sessionId = updatedSession?.user?.id;
    
    // Проверяем, не дублирующее ли это событие (в течение 1 секунды)
    if (authManager.isDuplicateEvent(event, sessionId)) {
      debugVerbose(`Пропуск дублирующего события ${event}`);
      return;
    }
    
    // Записываем информацию о текущем событии
    authManager.recordAuthEvent(event, sessionId);
    
    debug('Событие авторизации:', event, updatedSession ? '(сессия присутствует)' : '(сессия отсутствует)');
    
    // Обработка событий в зависимости от их типа
    switch (event) {
      case 'SIGNED_IN':
        debug('Пользователь вошел в систему, обновляем данные');
        fetchUserData(true);
        break;
        
      case 'SIGNED_OUT':
        debug('Пользователь вышел из системы, очищаем данные');
        // Очищаем данные сразу, не дожидаясь API
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        AuthState.error = null;
        
        // Используем групповое обновление состояний
        updateUserState(null, null, null);
        break;
        
      case 'USER_UPDATED':
        debug('Данные пользователя обновлены, запрашиваем актуальные данные');
        fetchUserData(true);
        break;
        
      case 'TOKEN_REFRESHED':
        // Обновляем данные только если токен действительно изменился
        if (updatedSession && (!session || session.access_token !== updatedSession.access_token)) {
          debug('Токен обновлен, запрашиваем актуальные данные');
          fetchUserData(false); // Используем кеш при обновлении токена
        } else {
          debugVerbose('Пропуск дублирующего события обновления токена');
        }
        break;
        
      case 'INITIAL_SESSION':
        if (updatedSession) {
          debug('Получена начальная сессия, обновляем данные');
          fetchUserData(false); // Используем кеш при начальной сессии
        } else {
          debugVerbose('Начальная сессия отсутствует, пользователь не авторизован');
        }
        break;
        
      default:
        debugVerbose(`Пропуск обработки события ${event}, не требующего специальной обработки`);
    }
  }, [fetchUserData, session, updateUserState]);

  // Инициализация компонента
  useEffect(() => {
    // Пропускаем повторную инициализацию
    if (initialized.current) {
      debugVerbose('Компонент уже инициализирован, пропускаем повторную инициализацию');
      return;
    }
    
    debug('Инициализация компонента');
    initialized.current = true;
    
    // Установка слушателя изменений авторизации
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
    
    // Синхронизируем состояние компонента с глобальным состоянием
    let needsUpdate = false;
    const newUser = AuthState.user !== user ? AuthState.user : null;
    const newSession = AuthState.session !== session ? AuthState.session : null;
    const newError = AuthState.error !== error ? AuthState.error : null;
    
    // Проверяем, нужно ли обновлять состояние
    if (newUser !== null || newSession !== null || newError !== null) {
      needsUpdate = true;
    }
    
    // Если есть изменения - обновляем состояние единым вызовом
    if (needsUpdate) {
      debugVerbose('Синхронизация состояния компонента с глобальным состоянием');
      updateUserState(
        newUser !== null ? newUser : user,
        newSession !== null ? newSession : session,
        newError !== null ? newError : error,
        AuthState.isLoading
      );
    } else {
      // Если только isLoading изменился - обновляем только его
      if (AuthState.isLoading !== isLoading) {
        setIsLoading(AuthState.isLoading);
      }
    }
    
    // Если авторизация еще не инициализирована, делаем запрос
    if (!isAuthInitialized()) {
      debug('Авторизация не инициализирована, запускаем инициализацию');
      initializeAuth().then(() => {
        // Синхронизируем состояние после инициализации с помощью единого обновления
        updateUserState(AuthState.user, AuthState.session, AuthState.error, false);
        debug('Данные пользователя получены при инициализации');
      });
    } else {
      debugVerbose('Авторизация уже инициализирована, пропускаем инициализацию');
    }
    
    // Очистка при размонтировании
    return () => {
      subscription.unsubscribe();
    };
  }, [supabaseClient, handleAuthStateChange, user, session, error, isLoading, updateUserState]);

  // Глобальные действия для Plasmic
  const actions = useMemo(() => ({
    // Google OAuth
    loginWithGoogle: async () => {
      debug('Вход через Google');
      try {
        setIsLoading(true);
        setError(null);
        
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const redirectUrl = `${origin}/auth/callback`;
        
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account'
            }
          }
        });
        
        if (error) throw error;
        
        if (!data?.url) {
          throw new Error('Не удалось получить URL для авторизации');
        }
        
        window.location.href = data.url;
        return { success: true };
      } catch (e) {
        const errorMsg = getErrMsg(e);
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, message: errorMsg };
      }
    },
    
    // Выход
    logout: async () => {
      debug('Выход пользователя');
      try {
        setIsLoading(true);
        
        const { error } = await supabaseClient.auth.signOut();
        if (error) throw error;
        
        // Очищаем состояние
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        AuthState.error = null;
        AuthState.lastFetchTime = 0;
        
        // Используем групповое обновление состояний
        updateUserState(null, null, null);
        
        // Сбрасываем состояние
        authManager.reset();
        resetClient();

        // Перенаправляем на главную
        window.location.href = '/';
        return { success: true };
      } catch (e) {
        const errorMsg = getErrMsg(e);
        setError(errorMsg);
        setIsLoading(false);
        return { success: false, message: errorMsg };
      }
    },
    
    // Отправка OTP
    sendOTP: async (email: string) => {
      debug('Отправка OTP на:', email);
      try {
        const { error } = await supabaseClient.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
          }
        });
        
        if (error) throw error;
        
        return { 
          success: true, 
          message: `Код подтверждения отправлен на ${email}` 
        };
      } catch (e) {
        return { 
          success: false, 
          message: getErrMsg(e) 
        };
      }
    },
    
    // Проверка OTP
    verifyOTP: async (email: string, otp: string) => {
      debug('Проверка OTP для:', email);
      try {
        const { data, error } = await supabaseClient.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        
        if (error) throw error;
        
        if (data?.session) {
          // Обновляем состояние
          AuthState.user = data.session.user;
          AuthState.session = data.session;
          AuthState.isAuthenticated = true;
          AuthState.lastFetchTime = Date.now();
          
          // Используем групповое обновление состояний
          updateUserState(data.session.user, data.session, null);
          
          // Перенаправляем после успешной авторизации
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        } else {
          throw new Error('Сессия не создана после верификации');
        }
        
        return { 
          success: true, 
          message: 'Вход выполнен успешно' 
        };
      } catch (e) {
        return { 
          success: false, 
          message: getErrMsg(e) 
        };
      }
    },
    
    // Проверка сессии (для отладки)
    checkSession: async () => {
      debug('Проверка текущей сессии');
      try {
        const { data, error } = await supabaseClient.auth.getSession();
        
        if (error) throw error;
        
        debug('Текущая сессия:', data.session?.user.id || 'Нет сессии');
        return { 
          success: true, 
          message: 'Сессия получена',
          session: data.session
        };
      } catch (e) {
        const errorMsg = getErrMsg(e);
        debug('Ошибка при проверке сессии:', errorMsg);
        
        return { 
          success: false, 
          message: errorMsg 
        };
      }
    }
  }), [supabaseClient, updateUserState]);
  
  // Мемоизация данных для провайдера, чтобы избежать лишних ререндерингов
  const dataProviderData = useMemo<DataProviderData>(() => ({
    user,
    error,
    isAuthenticated,
    session,
    isLoading,
    // Дополнительные поля для удобства работы с Plasmic
    userFullName: user?.user_metadata?.full_name || '',
    userName: user?.user_metadata?.name || '',
    userEmail: user?.email || '',
    userAvatar: user?.user_metadata?.avatar_url || '',
    userPicture: user?.user_metadata?.picture || ''
  }), [user, error, isAuthenticated, session, isLoading]);

  // Refs для отслеживания предыдущих значений статуса авторизации и инициализации
  const prevAuthStatusRef = useRef<string>(isAuthenticated ? 'авторизован' : 'не авторизован');
  const prevInitStatusRef = useRef<string>(isAuthInitialized() ? 'инициализирован' : 'не инициализирован');

  // Отладочная информация
  if (DEBUG && LOG_LEVEL >= 2) {
    // Уменьшаем количество логов для повышения производительности
    // Выводим только при изменении важных состояний
    const authStatus = isAuthenticated ? 'авторизован' : 'не авторизован';
    const initStatus = isAuthInitialized() ? 'инициализирован' : 'не инициализирован';
    
    // Выводим лог только при изменении статуса
    if (prevAuthStatusRef.current !== authStatus || prevInitStatusRef.current !== initStatus) {
      debug('Рендеринг состояния:', authStatus);
      debug('Инициализация:', initStatus);
      
      // Обновляем предыдущие значения
      prevAuthStatusRef.current = authStatus;
      prevInitStatusRef.current = initStatus;
    }
  }
  
  return (
    <GlobalActionsProvider
      contextName="SupabaseUserGlobalContext"
      actions={actions}
    >
      <DataProvider name="SupabaseUser" data={dataProviderData}>
        {children}
      </DataProvider>
    </GlobalActionsProvider>
  );
}; 