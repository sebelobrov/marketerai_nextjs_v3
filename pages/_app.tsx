import React from 'react';
import { ConfigProvider } from 'antd';
import type { AppProps } from 'next/app';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import 'antd/dist/reset.css';

const App = ({ Component, pageProps }: AppProps) => (
  <AntdRegistry>
    <ConfigProvider>
      <Component {...pageProps} />
    </ConfigProvider>
  </AntdRegistry>
);

export default App; 