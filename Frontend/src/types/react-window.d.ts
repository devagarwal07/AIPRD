declare module 'react-window' {
  import * as React from 'react';
  export interface ListChildComponentProps {
    index: number;
    style: React.CSSProperties;
    data?: any;
    isScrolling?: boolean;
  }
  export interface FixedSizeListProps {
    height: number;
    width: number | string;
    itemCount: number;
    itemSize: number;
    className?: string;
    children: (props: ListChildComponentProps) => React.ReactNode;
  }
  export class FixedSizeList extends React.Component<FixedSizeListProps> {}
  export { FixedSizeList as List };
}
