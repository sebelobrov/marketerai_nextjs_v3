import React from 'react';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'antd/dist/reset.css';
import { SupabaseUserGlobalContext } from '../components/supabase/SupabaseUserGlobalContext';
import '../styles/globals.css';

const App = ({ Component, pageProps }: AppProps) => (
  <AntdRegistry>
    <ConfigProvider>
      <SupabaseUserGlobalContext>
        <Component {...pageProps} />
      </SupabaseUserGlobalContext>
    </ConfigProvider>
  </AntdRegistry>
);

export default App; 