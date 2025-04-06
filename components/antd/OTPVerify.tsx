import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { DataProvider } from '@plasmicapp/host';
import { createClient } from '../../utils/supabase/supabase-client';

// Настройка логирования
const logPrefix = '[OTPVerify]';
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

interface OTPVerifyProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode; // Поддержка дочерних элементов
  email?: string; // Опциональный email для контекста
  code?: string; // Опциональный код
  autoVerify?: boolean; // Флаг для автоматической верификации
}

interface OTPVerifyActions {
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
}

const OTPVerify = forwardRef<OTPVerifyActions, OTPVerifyProps>(({ 
  onSuccess, 
  onError,
  children,
  email: initialEmail,
  code: initialCode,
  autoVerify = false
}, ref) => {
  // Флаг для отслеживания, была ли уже выполнена верификация
  const [verified, setVerified] = React.useState(false);

  // Устанавливаем начальное значение вместо null
  const [result, setResult] = React.useState<{ 
    success: boolean; 
    message: string;
  }>({
    success: false,
    message: "Ожидание ввода кода подтверждения"
  });

  // Логируем текущее состояние result для отладки
  React.useEffect(() => {
    debug("Состояние результата верификации:", result);
  }, [result]);

  // Обернем в useCallback для предотвращения лишних рендеров
  const handleVerifyOTP = useCallback(async (email: string, otp: string) => {
    if (!email || !otp) {
      const errorMsg = 'Пожалуйста, введите email и код подтверждения';
      setResult({
        success: false,
        message: errorMsg
      });
      
      if (onError) {
        onError(errorMsg);
      }
      
      return { success: false, message: errorMsg };
    }
    
    try {
      debug("Проверка OTP:", email, otp);
      
      // Устанавливаем промежуточный статус проверки
      setResult({
        success: false,
        message: `Проверка кода для ${email}...`
      });
      
      // Используем синглтон клиента Supabase
      const supabase = createClient();
      const response = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      
      if (response.error) {
        throw response.error;
      }
      
      // Устанавливаем флаг, что верификация выполнена успешно
      setVerified(true);
      
      const successMsg = 'Код успешно подтвержден';
      debug("OTP успешно подтвержден");
      setResult({
        success: true,
        message: successMsg
      });
      
      if (onSuccess) {
        onSuccess(successMsg);
      }
      
      // Принудительно перенаправляем пользователя на onboarding после успешной верификации
      // Задержка обеспечивает корректное сохранение cookies и обработку авторизации
      setTimeout(() => {
        debug("Принудительное перенаправление на /onboarding");
        window.location.href = "/onboarding";
      }, 1000);
      
      return { success: true, message: successMsg };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Произошла ошибка при проверке кода';
      debug("Ошибка при проверке OTP:", errorMsg);
      setResult({
        success: false,
        message: errorMsg
      });
      
      if (onError) {
        onError(errorMsg);
      }
      
      return { success: false, message: errorMsg };
    }
  }, [onSuccess, onError, setResult]);

  // Автоматическая верификация при наличии нужных параметров
  React.useEffect(() => {
    if (autoVerify && initialEmail && initialCode && !verified) {
      debug("Автоматическая проверка OTP с начальными значениями");
      handleVerifyOTP(initialEmail, initialCode);
    }
  }, [autoVerify, initialEmail, initialCode, verified, handleVerifyOTP]);

  // Предоставляем метод handleVerifyOTP через ref
  useImperativeHandle(ref, () => ({
    verifyOTP: handleVerifyOTP
  }), [handleVerifyOTP]);

  // Предоставляем данные о результате через DataProvider дочерним компонентам
  return (
    <DataProvider name="otpVerifyResult" data={result}>
      {children ? (
        // Если есть дочерние элементы - отображаем их
        <>{children}</>
      ) : (
        // Если дочерних элементов нет - создаем невидимый элемент
        <div style={{ display: 'none' }}></div>
      )}
    </DataProvider>
  );
});

OTPVerify.displayName = 'OTPVerify';

export default OTPVerify; 