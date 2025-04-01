import React, { forwardRef } from 'react';
import { Badge as AntBadge } from 'antd';

interface BadgeProps {
  count?: React.ReactNode;
  showZero?: boolean;
  overflowCount?: number;
  dot?: boolean;
  status?: 'success' | 'processing' | 'default' | 'error' | 'warning';
  color?: string;
  text?: React.ReactNode;
  offset?: [number, number];
  size?: 'default' | 'small';
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * Компонент Badge из Ant Design
 * Обертка для использования в Plasmic
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(({
  count,
  showZero = false,
  overflowCount = 99,
  dot = false,
  status,
  color,
  text,
  offset,
  size,
  title,
  className,
  style,
  children
}, ref) => {
  return (
    <AntBadge
      ref={ref}
      count={count}
      showZero={showZero}
      overflowCount={overflowCount}
      dot={dot}
      status={status}
      color={color}
      text={text}
      offset={offset}
      size={size}
      title={title}
      className={className}
      style={style}
    >
      {children}
    </AntBadge>
  );
});

Badge.displayName = 'Badge';

export default Badge; 