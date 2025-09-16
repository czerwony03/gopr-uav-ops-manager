declare module 'react-native-image-pan-zoom' {
  import * as React from 'react';
  import { StyleProp, ViewStyle } from 'react-native';

  export interface ImageZoomProps {
    cropWidth: number;
    cropHeight: number;
    imageWidth: number;
    imageHeight: number;
    children?: React.ReactNode;
    onClick?: () => void;
    onDoubleClick?: () => void;
    onMove?: (position: { x: number; y: number; scale: number }) => void;
    panToMove?: boolean;
    pinchToZoom?: boolean;
    clickDistance?: number;
    horizontalOuterRangeOffset?: (offsetX?: number) => void;
    onDragLeft?: () => void;
    responderRelease?: (vx: number) => void;
    maxOverflow?: number;
    longPressTime?: number;
    onLongPress?: () => void;
    doubleClickInterval?: number;
    centerOn?: { x: number; y: number; scale: number; duration: number };
    enableSwipeDown?: boolean;
    enableCenterFocus?: boolean;
    enableDoubleClickZoom?: boolean;
    minScale?: number;
    maxScale?: number;
    style?: StyleProp<ViewStyle>;
  }

  export default class ImageZoom extends React.Component<ImageZoomProps> {}
}