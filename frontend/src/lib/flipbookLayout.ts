export type DesktopSpread = { leftIndex: number | null; rightIndex: number | null }

export function maxDesktopSpread(pageCount: number): number {
  return pageCount <= 0 ? 0 : Math.ceil((pageCount - 1) / 2)
}

export function desktopSpread(pageCount: number, spread: number): DesktopSpread {
  if (pageCount <= 0 || spread < 0 || spread > maxDesktopSpread(pageCount)) {
    return { leftIndex: null, rightIndex: null }
  }
  if (spread === 0) return { leftIndex: null, rightIndex: 0 }
  const leftIndex = 2 * spread - 1
  const rightIndex = leftIndex + 1
  return {
    leftIndex: leftIndex < pageCount ? leftIndex : null,
    rightIndex: rightIndex < pageCount ? rightIndex : null,
  }
}
