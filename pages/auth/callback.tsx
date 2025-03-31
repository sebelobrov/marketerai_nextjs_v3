import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Head from "next/head";

// Компонент загрузки с белым фоном
const LoadingScreen = () => (
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

const AuthCallbackPage: NextPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [details] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Обработка OAuth колбэка...');
        const supabase = createClient();
        
        // Простой, но эффективный метод обработки OAuth колбэка
        // Supabase автоматически найдет code_verifier в localStorage
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Ошибка при получении сессии:', sessionError);
          setError(`Ошибка аутентификации: ${sessionError.message}`);
          return;
        }
        
        // Проверяем, что сессия успешно получена
        if (data.session) {
          console.log('Успешная аутентификация через OAuth');
          
          // Небольшая задержка, чтобы убедиться, что cookies сохранены
          setTimeout(() => {
            window.location.replace('/onboarding');
          }, 500);
        } else {
          console.error('Сессия не установлена после OAuth');
          setError('Не удалось установить сессию при входе через Google');
        }
      } catch (err) {
        console.error('Ошибка при обработке OAuth колбэка:', err);
        setError('Произошла ошибка при аутентификации');
      }
    };
    
    handleCallback();
  }, []);
  
  // Отображаем состояние
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        width: '100%',
        backgroundColor: '#ffffff',
        padding: '20px',
        textAlign: 'center'
      }}>
        <Head>
          <title>Авторизация</title>
        </Head>
        <h2>Ошибка аутентификации</h2>
        <p>{error}</p>
        
        {details && (
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => setDetailsVisible(!detailsVisible)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#f0f0f0',
                cursor: 'pointer'
              }}
            >
              {detailsVisible ? 'Скрыть детали' : 'Показать детали'}
            </button>
            
            {detailsVisible && (
              <pre style={{ 
                textAlign: 'left', 
                marginTop: '10px',
                padding: '15px',
                background: '#f8f8f8',
                borderRadius: '4px',
                overflow: 'auto',
                maxWidth: '500px'
              }}>
                {details}
              </pre>
            )}
          </div>
        )}
        
        <button 
          onClick={() => window.location.href = '/'}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#0070f3',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Вернуться на главную
        </button>
      </div>
    );
  }
  
  // В процессе обработки отображаем загрузку
  return <LoadingScreen />;
};

export default AuthCallbackPage; 