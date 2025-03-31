import React from "react";
import { DataProvider } from "@plasmicapp/loader-nextjs";
import { GlobalActionsProvider } from "@plasmicapp/host";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createClient } from '../../../utils/supabase/client';
import getErrMsg from "../../../utils/getErrMsg";
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { authManager } from "../../../utils/auth/AuthManager";

// Логи для отладки
const logPrefix = '[SupabaseUserGlobalContext]';
const debug = (...message: unknown[]) => console.log(logPrefix, ...message);

// Примечание: мы используем window.location для перенаправлений вместо router.push
// для полной перезагрузки страницы, чтобы middleware мог корректно отработать

// Создаем глобальный объект для хранения состояния авторизации
// Это позволит всем компонентам, использующим данные авторизации, обновляться при изменении этих данных
export const AuthState = {
  user: null as User | null,
  session: null as Session | null,
  isAuthenticated: false,
  isLoading: true,
  error: null as string | null,
};

// Экспортируем функцию для проверки инициализации авторизации из AuthManager
export function isAuthInitialized(): boolean {
  return authManager.getInitialized();
}

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
  // Состояние
  const [user, setUser] = useState<User | null>(AuthState.user);
  const [session, setSession] = useState<Session | null>(AuthState.session);
  const [error, setError] = useState<string | null>(AuthState.error);
  const [isLoading, setIsLoading] = useState<boolean>(AuthState.isLoading);
  
  // Вычисляем статус авторизации только на основе user
  // т.к. session может еще не быть установлен при первом рендеринге
  const isAuthenticated = !!user;
  
  // Создаем клиент Supabase только один раз
  const supabaseClient = useMemo<SupabaseClient>(() => createClient(), []);
  
  // Флаг инициализации
  const isInitialized = useRef(false);
  
  // Флаг получения данных для дедупликации запросов
  const isFetchingUser = useRef(false);

  // Получение данных пользователя с дедупликацией запросов
  const getUserData = useCallback(async () => {
    // Проверяем, не выполняется ли уже запрос данных
    if (isFetchingUser.current) {
      debug('Пропуск запроса getUserData: запрос уже выполняется');
      return;
    }

    try {
      debug('Получаем данные пользователя');
      setIsLoading(true);
      isFetchingUser.current = true;
      
      // Используем только getUser() для повышения безопасности и оптимизации
      const { data: userData, error: userError } = await supabaseClient.auth.getUser();
      
      if (userError) {
        // Специальная обработка для ошибки отсутствия сессии - обычная ситуация для неавторизованных пользователей
        if (userError.message === 'Auth session missing!') {
          debug('Пользователь не авторизован (Auth session missing)');
          
          // Очищаем данные в глобальном объекте
          AuthState.user = null;
          AuthState.session = null;
          AuthState.isAuthenticated = false;
          AuthState.error = null;
          
          setUser(null);
          setSession(null);
          setError(null);
          setIsLoading(false);
          
          // Считаем авторизацию инициализированной, хотя пользователь не авторизован
          authManager.setInitialized(true);
          isFetchingUser.current = false;
          return;
        }
        
        debug('Ошибка при получении пользователя:', userError);
        throw userError;
      }
      
      // Если у нас есть пользователь, получаем сессию для токенов
      if (userData.user) {
        debug('Получен пользователь:', userData.user.id);
        
        // Если текущий пользователь не изменился, можно пропустить обновление
        if (user?.id === userData.user.id) {
          debug('Пропуск обновления данных: пользователь не изменился');
          // Обновляем только флаг инициализации и загрузки
          authManager.setInitialized(true);
          setIsLoading(false);
          isFetchingUser.current = false;
          return;
        }
        
        // Получаем сессию только для доступа к токенам и метаданным сессии
        const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
        
        if (sessionError) {
          debug('Ошибка при получении сессии:', sessionError);
          // Не выбрасываем ошибку здесь, продолжаем с пользователем
          debug('Продолжаем без данных сессии');
        } else {
          debug('Данные сессии:', sessionData.session ? 'Получены' : 'Отсутствуют');
          
          if (sessionData.session) {
            // Обновляем глобальное состояние сессии
            AuthState.session = sessionData.session;
            setSession(sessionData.session);
          }
        }
        
        // Обновляем пользователя в глобальном объекте
        AuthState.user = userData.user;
        AuthState.isAuthenticated = true;
        
        // Устанавливаем пользователя, чтобы предотвратить промежуточные рендеринги
        setUser(userData.user);
        setError(null);
        
        // Добавляем расширенное логирование данных пользователя в режиме разработки
        if (process.env.NODE_ENV === 'development' || true) { // Временно включаем логи на продакшене
          debug('Подробные данные пользователя:', {
            id: userData.user.id,
            email: userData.user.email,
            phone: userData.user.phone,
            created_at: userData.user.created_at,
            last_sign_in_at: userData.user.last_sign_in_at,
            app_metadata: userData.user.app_metadata,
            user_metadata: userData.user.user_metadata,
            identities: userData.user.identities?.length
          });
          
          // Добавляем детальные логи для user_metadata для отладки
          debug('user_metadata детально:', JSON.stringify(userData.user.user_metadata));
        }
      } else {
        debug('Пользователь не найден, не авторизован');
        // Очищаем данные в глобальном объекте
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        
        setSession(null);
        setUser(null);
        setError(null);
      }
    } catch (err) {
      debug('Ошибка в getUserData:', err);
      setError(getErrMsg(err));
      // Очищаем данные в глобальном объекте
      AuthState.user = null;
      AuthState.session = null;
      AuthState.isAuthenticated = false;
      AuthState.error = getErrMsg(err);
      
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
      // Помечаем, что авторизация инициализирована
      authManager.setInitialized(true);
      isFetchingUser.current = false;
      
      // Добавляем дополнительную проверку для предотвращения многократных рендерингов
      AuthState.isLoading = false;
    }
  }, [supabaseClient, user]);

  // Улучшенная обработка событий авторизации с дедупликацией
  const handleAuthStateChange = useCallback((event: string, updatedSession: Session | null) => {
    debug('Событие авторизации:', event);
    debug('Сессия при событии:', updatedSession ? 'Присутствует' : 'Отсутствует');
    
    if (updatedSession) {
      debug('ID пользователя в обновленной сессии:', updatedSession.user.id);
      debug('Источник авторизации:', updatedSession.user.app_metadata?.provider || 'не указан');
      debug('Время истечения токена:', new Date(updatedSession.expires_at! * 1000).toISOString());
    }
    
    // Обрабатываем только ключевые события авторизации
    switch (event) {
      case 'SIGNED_IN':
        debug(`Обработка события ${event}`);
        // Если пользователь уже авторизован с теми же данными, пропускаем обновление
        if (updatedSession && user?.id === updatedSession.user.id) {
          debug(`Пропуск обработки ${event}, т.к. пользователь уже авторизован`);
          return;
        }
        
        // Устанавливаем флаг загрузки в глобальном объекте
        AuthState.isLoading = true;
        getUserData();
        break;
        
      case 'INITIAL_SESSION':
        // Если мы уже обрабатываем SIGNED_IN или уже авторизованы, можно пропустить INITIAL_SESSION
        if (isFetchingUser.current) {
          debug('Пропуск обработки INITIAL_SESSION, т.к. данные уже запрашиваются');
          return;
        }
        
        if (updatedSession && user?.id === updatedSession.user.id) {
          debug('Пропуск обработки INITIAL_SESSION, т.к. пользователь уже авторизован');
          return;
        }
        
        debug('Обработка события INITIAL_SESSION');
        // Устанавливаем флаг загрузки в глобальном объекте
        AuthState.isLoading = true;
        getUserData();
        break;
        
      case 'SIGNED_OUT':
        debug('Очистка данных пользователя при выходе');
        // Очищаем данные в глобальном объекте
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        
        setUser(null);
        setSession(null);
        setError(null);
        break;
        
      case 'TOKEN_REFRESHED':
      case 'USER_UPDATED':
        const eventName = event === 'TOKEN_REFRESHED' ? 'TOKEN_REFRESHED' : 'USER_UPDATED';
        debug(`Обработка события ${eventName}`);
        
        // Пропускаем обновление, если запрос уже выполняется
        if (isFetchingUser.current) {
          debug(`Пропуск обновления при ${eventName}, т.к. данные уже запрашиваются`);
          return;
        }
        
        // Если пользователь не изменился, пропускаем обновление
        if (updatedSession && user?.id === updatedSession.user.id) {
          debug(`Пропуск обновления при ${eventName}, т.к. пользователь не изменился`);
          return;
        }
        
        // Устанавливаем флаг загрузки в глобальном объекте
        AuthState.isLoading = true;
        getUserData();
        break;
        
      default:
        // Не обрабатываем другие события, которые не меняют состояние авторизации
        debug(`Пропуск обработки события ${event}`);
        break;
    }
  }, [getUserData, user]);

  // Инициализация и подписка на изменения авторизации
  useEffect(() => {
    // Проверяем, инициализированы ли мы уже
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    debug('Инициализация компонента');
    
    // Создаем единую функцию инициализации
    const initAuth = async () => {
      if (typeof window === 'undefined') return;
      
      debug('Инициализация авторизации');
      
      try {
        // Сбрасываем флаг инициализации до начала проверки
        authManager.setInitialized(false);
        
        // Явно запускаем процесс обнаружения сессии
        await supabaseClient.auth.initialize();
        
        // Получаем данные пользователя только один раз
        await getUserData();
        
        debug('Авторизация инициализирована');
      } catch (err) {
        debug('Ошибка при инициализации авторизации:', err);
        // Очищаем данные в глобальном объекте
        AuthState.user = null;
        AuthState.session = null;
        AuthState.isAuthenticated = false;
        AuthState.error = getErrMsg(err);
        AuthState.isLoading = false;
        
        // Даже при ошибке помечаем, что авторизация инициализирована
        authManager.setInitialized(true);
      }
    };
    
    // Запускаем инициализацию один раз
    initAuth();
    
    // Устанавливаем слушатель изменений состояния аутентификации
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(handleAuthStateChange);
    
    // Очистка слушателя при размонтировании компонента
    return () => {
      debug('Очистка слушателя авторизации');
      authListener?.subscription.unsubscribe();
    };
  }, [supabaseClient, getUserData, handleAuthStateChange]);

  // Глобальные действия, доступные в Plasmic Studio
  const actions = useMemo(
    () => ({
      // Логин через Google OAuth
      loginWithGoogle: async () => {
        debug('Попытка входа через Google');
        try {
          setIsLoading(true);
          
          // Сбрасываем предыдущие ошибки, если они были
          setError(null);
          
          // Получаем текущий URL для корректного формирования redirectTo
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const redirectUrl = `${origin}/auth/callback`;
          
          debug('URL для перенаправления после OAuth:', redirectUrl);
          
          // Используем signInWithOAuth для авторизации через Google
          // это сохранит code_verifier в localStorage автоматически
          const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: redirectUrl,
              queryParams: {
                // Запрашиваем offline-доступ для получения refresh_token
                access_type: 'offline',
                // Всегда показывать окно выбора аккаунта
                prompt: 'select_account'
              }
            }
          });
          
          if (error) {
            debug('Ошибка при инициации OAuth входа:', error);
            throw error;
          }
          
          // Проверяем, что получен URL для авторизации
          if (!data?.url) {
            debug('Не получен URL для OAuth авторизации');
            throw new Error('Не удалось получить URL для авторизации');
          }
          
          // Перед перенаправлением проверяем, что у нас сохранен code_verifier
          if (typeof localStorage !== 'undefined') {
            const hasCodeVerifier = Object.keys(localStorage).some(key => 
              key.includes('code_verifier') || key.includes('supabase')
            );
            
            if (!hasCodeVerifier) {
              debug('Внимание: не найден code_verifier в localStorage перед редиректом');
            } else {
              debug('code_verifier найден в localStorage, редирект безопасен');
            }
          }
          
          // Перенаправляем пользователя на страницу авторизации Google
          debug('Перенаправление на URL авторизации:', data.url);
          window.location.href = data.url;
          
          return { success: true };
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при инициации OAuth входа:', errorMsg);
          setError(errorMsg);
          setIsLoading(false);
          return { success: false, message: errorMsg };
        }
      },
      
      // Выход
      logout: async () => {
        debug('Попытка выхода');
        try {
          const { error } = await supabaseClient.auth.signOut();
          if (error) {
            debug('Ошибка при выходе:', error);
            throw error;
          }
          
          // Сбрасываем сессию в состоянии
          debug('Выход успешен, сбрасываем данные пользователя');
          setUser(null);
          setSession(null);
          setError(null);
          
          // Сбрасываем состояние AuthManager
          debug('Сброс состояния авторизации');
          authManager.reset();

          // Перенаправляем на главную страницу при успешном выходе
          // Важно: используем window.location для полной перезагрузки страницы
          debug('Перенаправление на главную страницу');
          window.location.href = '/';

          return { success: true };
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при выходе:', errorMsg);
          setError(errorMsg);
          return { success: false, message: errorMsg };
        }
      },
      
      // Отправка OTP кода на email
      sendOTP: async (email: string) => {
        debug('Попытка отправки OTP на:', email);
        try {
          // Отправляем ссылку для одноразового входа на email
          const { error } = await supabaseClient.auth.signInWithOtp({
            email,
            options: {
              // Эта опция отключает автоматическую авторизацию при переходе по ссылке,
              // чтобы пользователь должен был ввести OTP код вручную
              shouldCreateUser: true,
            }
          });
          
          if (error) {
            debug('Ошибка при отправке OTP:', error);
            throw error;
          }
          
          debug('OTP отправлен успешно на:', email);
          
          return { 
            success: true, 
            message: `Код подтверждения отправлен на ${email}` 
          };
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при отправке OTP:', errorMsg);
          
          return { 
            success: false, 
            message: errorMsg 
          };
        }
      },
      
      // Проверка OTP кода
      verifyOTP: async (email: string, otp: string) => {
        debug('Попытка проверки OTP для:', email, 'с кодом:', otp);
        try {
          // Проверяем OTP код
          const { data, error } = await supabaseClient.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
          });
          
          if (error) {
            debug('Ошибка при проверке OTP:', error);
            throw error;
          }
          
          debug('OTP проверен успешно, данные:', data ? 'получены' : 'отсутствуют');
          
          if (data?.session) {
            debug('Сессия после OTP верификации:', data.session.user.id);
            
            // После успешной верификации устанавливаем сессию сразу для предотвращения мигания UI
            setSession(data.session);
            
            // И затем запускаем полное получение данных пользователя асинхронно
            // чтобы не блокировать интерфейс
            getUserData().then(() => {
              debug('Данные пользователя обновлены после OTP верификации');
            }).catch(err => {
              debug('Ошибка при обновлении данных после OTP:', err);
            });
            
            // Делаем небольшую задержку перед перенаправлением,
            // чтобы cookies успели сохраниться
            setTimeout(() => {
              debug('Перенаправление после успешной OTP верификации');
              window.location.href = '/';
            }, 500);
          } else {
            debug('Ошибка: сессия не создана после OTP верификации');
            throw new Error('Сессия не создана после верификации');
          }
          
          return { 
            success: true, 
            message: 'Вход выполнен успешно' 
          };
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при проверке OTP:', errorMsg);
          
          return { 
            success: false, 
            message: errorMsg 
          };
        }
      },
      
      // Проверка текущей сессии (для отладки)
      checkSession: async () => {
        debug('Проверка текущей сессии');
        try {
          const { data, error } = await supabaseClient.auth.getSession();
          
          if (error) {
            debug('Ошибка при получении сессии:', error);
            throw error;
          }
          
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
      },
    }),
    [supabaseClient, getUserData]
  );
  
  // Настройка данных, которые будут переданы как глобальный контекст в Plasmic Studio
  const dataProviderData: DataProviderData = {
    user,
    error,
    isAuthenticated,
    session,
    isLoading,
    // Добавляем выделенные поля для удобства доступа из Plasmic
    userFullName: user?.user_metadata?.full_name || '',
    userName: user?.user_metadata?.name || '',
    userEmail: user?.email || '',
    userAvatar: user?.user_metadata?.avatar_url || '',
    userPicture: user?.user_metadata?.picture || ''
  };

  debug('Рендеринг с данными пользователя:', user?.id);
  debug('Статус аутентификации:', isAuthenticated ? 'авторизован' : 'не авторизован');
  debug('Статус инициализации:', isAuthInitialized() ? 'инициализирован' : 'не инициализирован');
  
  // Отрисовка компонентов
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