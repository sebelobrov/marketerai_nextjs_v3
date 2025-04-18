import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { DataProvider } from '@plasmicapp/host';
import { createClient } from '../../utils/supabase/supabase-client';

// Настройка логирования
const logPrefix = '[OTPSender]';
const DEBUG = process.env.NODE_ENV !== 'production';
const debug = (...message: unknown[]) => {
  if (DEBUG) {
    console.log(logPrefix, ...message);
  }
};

// Определение интерфейса для свойств компонента
export interface OTPSenderProps {
  initialEmail?: string;
  autoSend?: boolean;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode;
}

// Определение интерфейса для ref компонента
export interface OTPSenderRef {
  sendOTP: (email: string) => Promise<{ success: boolean; message: string }>;
}

// Компонент для отправки OTP
const OTPSender = forwardRef<OTPSenderRef, OTPSenderProps>(({ 
  initialEmail = '', // По умолчанию пустая строка
  onSuccess, 
  onError,
  children, 
  autoSend = false // По умолчанию автоматическая отправка отключена
}, ref) => {
  // Устанавливаем результат отправки OTP
  const [result, setResult] = React.useState<{ 
    success: boolean; 
    message: string; 
  }>({ 
    success: false, 
    message: '' 
  });

  // Обернем в useCallback для предотвращения лишних рендеров
  const handleSendOTP = useCallback(async (email: string) => {
    if (!email) {
      const errorMsg = 'Пожалуйста, введите email';
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
      debug("Отправка OTP на:", email);
      
      // Устанавливаем промежуточный статус отправки
      setResult({
        success: false,
        message: `Отправка кода на ${email}...`
      });
      
      // Используем синглтон клиента Supabase
      const supabase = createClient();
      const response = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        }
      });
      
      if (response.error) {
        throw response.error;
      }
      
      // При успешной отправке
      const successMsg = `Код подтверждения отправлен на ${email}`;
      debug("OTP успешно отправлен");
      setResult({
        success: true,
        message: successMsg
      });
      
      if (onSuccess) {
        onSuccess(successMsg);
      }
      
      return { success: true, message: successMsg };
    } catch (error) {
      // В случае ошибки
      const errorMsg = error instanceof Error ? error.message : 'Произошла ошибка при отправке кода';
      setResult({
        success: false,
        message: errorMsg
      });
      
      debug("Ошибка при отправке OTP:", errorMsg);
      
      if (onError) {
        onError(errorMsg);
      }
      
      return { success: false, message: errorMsg };
    }
  }, [onSuccess, onError, setResult]);

  // Отправляем OTP автоматически при монтировании, если указаны autoSend и initialEmail
  React.useEffect(() => {
    if (autoSend && initialEmail) {
      debug("Автоматическая отправка OTP на:", initialEmail);
      handleSendOTP(initialEmail);
    }
  }, [autoSend, initialEmail, handleSendOTP]);

  // Предоставляем метод sendOTP через ref
  useImperativeHandle(ref, () => ({
    sendOTP: handleSendOTP
  }), [handleSendOTP]); // Добавляем handleSendOTP в зависимости

  // Предоставляем данные о результате через DataProvider дочерним компонентам
  return (
    <DataProvider name="otpResult" data={result}>
      {children}
    </DataProvider>
  );
});

// Имя для отображения в React DevTools
OTPSender.displayName = 'OTPSender';

export default OTPSender; 