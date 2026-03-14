import type { CSSProperties } from 'react';
import type { BaseBlockSettings } from '../types/blocks.types';

export const paddingOptions: Array<{ value: NonNullable<BaseBlockSettings['padding']>; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

export const maxWidthOptions: Array<{ value: NonNullable<BaseBlockSettings['maxWidth']>; label: string }> = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'medium', label: 'Medium' },
  { value: 'wide', label: 'Wide' },
  { value: 'full', label: 'Full' },
];

const paddingValues: Record<NonNullable<BaseBlockSettings['padding']>, string> = {
  none: '0',
  small: '0.75rem',
  medium: '1.25rem',
  large: '2rem',
};

const widthValues: Record<NonNullable<BaseBlockSettings['maxWidth']>, string> = {
  narrow: '640px',
  medium: '820px',
  wide: '980px',
  full: '100%',
};

export function getBlockContainerStyle(settings: BaseBlockSettings): CSSProperties {
  return {
    maxWidth: widthValues[settings.maxWidth ?? 'medium'],
    marginInline: 'auto',
  };
}

export function getBlockSurfaceStyle(settings: BaseBlockSettings): CSSProperties {
  const style: CSSProperties = {
    padding: paddingValues[settings.padding ?? 'medium'],
  };

  if (settings.backgroundColor) {
    style.backgroundColor = settings.backgroundColor;
  }

  return style;
}
