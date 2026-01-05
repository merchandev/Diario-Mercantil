declare module 'react-pageflip' {
  import * as React from 'react'

  export interface HTMLFlipBookProps {
    width?: number
    height?: number
    size?: 'fixed' | 'stretch'
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    showCover?: boolean
    className?: string
    style?: React.CSSProperties
    startPage?: number
    maxShadowOpacity?: number
    flippingTime?: number
    useMouseEvents?: boolean
    clickEventForward?: boolean
    swipeDistance?: number
    disableFlipByClick?: boolean
    onFlip?: (e: { data: number }) => void
    onChangeOrientation?: (e: { data: 'portrait' | 'landscape' }) => void
    onChangeState?: (e: { data: string }) => void
    children?: React.ReactNode
  }

  export default class HTMLFlipBook extends React.Component<HTMLFlipBookProps> {}
}
