import { render } from '@testing-library/react-native';
import { Text } from '../typography';
import { TYPE } from '../../utils/tokens';

function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...(Array.isArray(style) ? style.flat(Infinity) : [style]).filter(Boolean));
}

describe('Text', () => {
  it('maps a role to its size, weight, and line height', () => {
    const { getByText } = render(<Text variant="hero">4.0</Text>);
    const style = flatten(getByText('4.0').props.style);
    expect(style.fontSize).toBe(TYPE.hero.size);
    expect(style.fontWeight).toBe(TYPE.hero.weight);
    expect(style.lineHeight).toBe(TYPE.hero.lineHeight);
  });

  it('caps Dynamic Type scaling at the role ceiling', () => {
    const { getByText } = render(<Text variant="caption">A</Text>);
    expect(getByText('A').props.maxFontSizeMultiplier).toBe(TYPE.caption.maxScale);
  });

  it('overrides the role weight when given one', () => {
    const { getByText } = render(<Text variant="body" weight="700">x</Text>);
    expect(flatten(getByText('x').props.style).fontWeight).toBe('700');
  });

  it('renders numbers with tabular figures when tabular is set', () => {
    const { getByText } = render(<Text tabular>95.5</Text>);
    expect(flatten(getByText('95.5').props.style).fontVariant).toEqual(['tabular-nums']);
  });

  it('leaves fontVariant unset by default', () => {
    const { getByText } = render(<Text>plain</Text>);
    expect(flatten(getByText('plain').props.style).fontVariant).toBeUndefined();
  });
});
