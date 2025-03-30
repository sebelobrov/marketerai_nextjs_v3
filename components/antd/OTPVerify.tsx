import React, { forwardRef, useImperativeHandle } from 'react';
import { DataProvider } from '@plasmicapp/host';
import createClient from '../../utils/supabase/component';

interface OTPVerifyProps {
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  children?: React.ReactNode; // Поддержка дочерних элементов
}

interface OTPVerifyActions {
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
}

const OTPVerify = forwardRef<OTPVerifyActions, OTPVerifyProps>(({ 
  onSuccess, 
  onError,
  children 
}, ref) => {
  // Устанавливаем начальное значение вместо null
  const [result, setResult] = React.useState<{ 
    success: boolean; 
    message: string;
  }>({
    success: false,
    message: "Waiting for OTP verification"
  });

  // Сообщаем в консоль о текущем состоянии result для отладки
  React.useEffect(() => {
    console.log("OTPVerify result:", result);
  }, [result]);

  useImperativeHandle(ref, () => ({
    // Функция для проверки OTP, которая будет вызываться через Element Action
    verifyOTP: async (email: string, otp: string) => {
      try {
        console.log("Verifying OTP for:", email, "with code:", otp);
        
        // Устанавливаем промежуточный статус проверки
        setResult({
          success: false,
          message: `Verifying OTP for ${email}...`
        });
        
        // Используем Supabase клиент напрямую
        const supabase = createClient();
        
        // Проверяем OTP код
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: otp,
          type: 'email'
        });
        
        if (error) {
          console.error('Ошибка верификации OTP:', error);
          setResult({
            success: false,
            message: error.message
          });
          if (onError) onError(error.message);
          return {
            success: false,
            message: error.message
          };
        }
        
        console.log('Верификация OTP успешна, перенаправление на onboarding');
        setResult({
          success: true,
          message: 'Вход выполнен успешно'
        });
        
        if (onSuccess) onSuccess('Вход выполнен успешно');
        
        // После успешной верификации перенаправляем на страницу onboarding
        window.location.href = '/onboarding';
        
        return {
          success: true,
          message: 'Вход выполнен успешно'
        };
      } catch (error) {
        console.error('Ошибка при верификации OTP:', error);
        const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при верификации кода';
        setResult({
          success: false,
          message: errorMessage
        });
        
        if (onError) onError(errorMessage);
        
        return {
          success: false,
          message: errorMessage
        };
      }
    }
  }), [onSuccess, onError]);

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