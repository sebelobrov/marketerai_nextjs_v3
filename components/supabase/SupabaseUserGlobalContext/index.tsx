import React from "react";
import { DataProvider } from "@plasmicapp/loader-nextjs";
import { GlobalActionsProvider } from "@plasmicapp/host";
import { useState, useEffect, useMemo } from "react";
import createClient from '../../../utils/supabase/component';
import getErrMsg from "../../../utils/getErrMsg";
import type { AuthTokenResponse } from "@supabase/supabase-js";

// Логи для отладки
const logPrefix = '[SupabaseUserGlobalContext]';
const debug = (...message: unknown[]) => console.log(logPrefix, ...message);

// Примечание по использованию window.location для перенаправлений/перезагрузок в этом компоненте

// Контекст:
// Next.js <Link> компоненты предзагружают страницы в фоне для более быстрой навигации
// Это может вызывать непредсказуемое поведение при использовании Middleware для защиты страниц от неавторизованных пользователей

// Сценарий:
// 1. Пользователь не вошел в систему и посещает страницу, содержащую <Link> на защищенную страницу
// 2. <Link> предзагружает защищенную страницу. Middleware запускается, кэшируя перенаправление на /login
// 3. Пользователь входит в систему, но мы НЕ используем window.location.reload или window.location.href для перенаправления
// 4. Пользователь кликает <Link> на защищенную страницу, но из-за кэшированной предзагрузки, они все еще перенаправляются на /login

// Проблема:
// Middleware запускается во время предзагрузки, но не во время фактической навигации, что приводит к проверкам устаревшего состояния аутентификации

// Решение:
// Использовать window.location.reload() или window.location.href для перенаправлений/перезагрузок после логина/логаута
// Это сбрасывает предзагруженные страницы, гарантируя, что middleware запустится снова на основе нового состояния аутентификации

interface DataProviderData {
  user: AuthTokenResponse["data"]["user"] | null;
  error: string | null;
}

export interface SupabaseUserGlobalContextProps {
  children: React.ReactNode;
  defaultRedirectOnLoginSuccess?: string;
}

export const SupabaseUserGlobalContext = ({ children }: SupabaseUserGlobalContextProps) => {
  debug('Рендеринг компонента');
  
  // Настройка состояния
  const [user, setUser] = useState<AuthTokenResponse["data"]["user"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Вспомогательная функция для получения пользователя и сохранения в состояние
  async function getUserAndSaveToState() {
    debug('Получение данных пользователя');
    try {
      const supabase = createClient();

      // Получаем сессию из сохраненных учетных данных (не с сервера)
      const { data: getSessionData, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError) {
        debug('Ошибка при получении сессии:', getSessionError);
        throw getSessionError;
      }

      // Если нет сессии, устанавливаем пользователя в null
      if (!getSessionData.session) {
        debug('Сессия не найдена, пользователь не авторизован');
        setUser(null);
        setError(null);
        return;
      }

      // Если есть сессия, сохраняем пользователя в состояние
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        debug('Ошибка при получении пользователя:', error);
        console.error(error);
        throw error;
      }
      
      // Выводим подробную информацию о пользователе для анализа структуры данных
      debug('Полные данные пользователя:', JSON.stringify(data?.user, null, 2));
      
      // Проверим все доступные поля пользователя
      if (data?.user) {
        debug('ID пользователя:', data.user.id);
        debug('Email пользователя:', data.user.email);
        debug('Phone пользователя:', data.user.phone);
        
        // Проверяем metadata и user_metadata
        if (data.user.user_metadata) {
          debug('user_metadata:', data.user.user_metadata);
          debug('Имя из user_metadata.name:', data.user.user_metadata.name);
          debug('Имя из user_metadata.full_name:', data.user.user_metadata.full_name);
        }
        
        if (data.user.app_metadata) {
          debug('app_metadata:', data.user.app_metadata);
        }
        
        // Проверяем identity_data (если есть)
        if (data.user.identities && data.user.identities.length > 0) {
          debug('identities:', data.user.identities);
          for (const identity of data.user.identities) {
            if (identity.identity_data) {
              debug('identity_data:', identity.identity_data);
              debug('Имя из identity_data.name:', identity.identity_data.name);
              debug('Имя из identity_data.full_name:', identity.identity_data.full_name);
            }
          }
        }
      }
      
      setUser(data?.user);
    } catch (err) {
      debug('Ошибка в getUserAndSaveToState:', err);
      setError(getErrMsg(err));
    }
  }

  // При первой загрузке, устанавливаем сессию в состояние
  useEffect(() => {
    debug('Инициализация: получение данных пользователя');
    getUserAndSaveToState();
  }, []);

  // Глобальные действия, которые можно вызывать из Plasmic Studio
  const actions = useMemo(
    () => ({
      // Логин через Google OAuth
      loginWithGoogle: async () => {
        debug('Попытка входа через Google');
        try {
          const supabase = createClient();
          
          const redirectTo = window.location.origin + '/auth/callback';
          debug('Настройка перенаправления OAuth на:', redirectTo);
          
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              }
            }
          });
          
          if (error) {
            debug('Ошибка при инициации OAuth входа:', error);
            throw error;
          }
          
          // При успешной инициации OAuth, supabase перенаправит на URL авторизации Google
          debug('OAuth инициирован успешно, перенаправление на URL авторизации');
          
          if (data.url) {
            debug('Перенаправление на URL провайдера:', data.url);
            window.location.href = data.url;
          }
          
          return;
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при инициации OAuth входа:', errorMsg);
          setError(errorMsg);
          return;
        }
      },
      
      // Выход
      logout: async () => {
        debug('Попытка выхода');
        try {
          const supabase = createClient();
          const { error } = await supabase.auth.signOut();
          if (error) {
            debug('Ошибка при выходе:', error);
            throw error;
          }
          
          // Сбрасываем сессию в состоянии
          debug('Выход успешен, сбрасываем данные пользователя');
          setUser(null);

          // Сбрасываем ошибки если есть
          setError(null);

          // Перенаправляем на главную страницу при успешном выходе
          debug('Перенаправление на главную страницу');
          window.location.href = '/';

          return;
        } catch (e) {
          const errorMsg = getErrMsg(e);
          debug('Ошибка при выходе:', errorMsg);
          setError(errorMsg);
          return;
        }
      },
      
      // Отправка OTP кода на email
      sendOTP: async (email: string) => {
        debug('Попытка отправки OTP на:', email);
        try {
          const supabase = createClient();
          
          // Отправляем ссылку для одноразового входа на email
          const { error } = await supabase.auth.signInWithOtp({
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
          const supabase = createClient();
          
          // Проверяем OTP код
          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email'
          });
          
          if (error) {
            debug('Ошибка при проверке OTP:', error);
            throw error;
          }
          
          // Сохраняем сессию в состояние
          debug('OTP проверен успешно, сохраняем данные пользователя');
          if (data?.user) {
            debug('Данные пользователя после верификации:', JSON.stringify(data.user, null, 2));
          }
          
          setUser(data?.user);
          
          // Сбрасываем ошибки если есть
          setError(null);
          
          // Перенаправляем на страницу onboarding после успешного входа
          debug('Перенаправление на onboarding');
          window.location.href = '/onboarding';
          
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
    }),
    []
  );
  
  // Настройка данных, которые будут переданы как глобальный контекст в Plasmic Studio
  const dataProviderData: DataProviderData = {
    user,
    error,
  };

  debug('Рендеринг с данными пользователя:', user?.id);
  
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