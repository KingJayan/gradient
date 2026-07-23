import { fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { renderScreen } from '../../test/render';
import { Button, StatBadge, Chip } from '../screen';

afterEach(() => jest.clearAllMocks());

describe('Button', () => {
  it('fires onPress and a selection haptic when tapped', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderScreen(<Button title="Save" onPress={onPress} />);
    fireEvent.press(getByLabelText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('suppresses press and haptic while disabled', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderScreen(<Button title="Save" onPress={onPress} disabled />);
    fireEvent.press(getByLabelText('Save'));
    expect(onPress).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe('StatBadge', () => {
  it('renders its label', () => {
    const { getByText } = renderScreen(<StatBadge label="AP" background="#000000" />);
    expect(getByText('AP')).toBeTruthy();
  });

  it('fires onPress with a haptic when interactive', () => {
    const onPress = jest.fn();
    const { getByLabelText } = renderScreen(
      <StatBadge label="AP" background="#000000" onPress={onPress} accessibilityLabel="Cycle weight" />
    );
    fireEvent.press(getByLabelText('Cycle weight'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });
});

describe('Chip', () => {
  it('renders its label and fires onPress with a haptic', () => {
    const onPress = jest.fn();
    const { getByText } = renderScreen(<Chip label="4.0" selected={false} onPress={onPress} />);
    fireEvent.press(getByText('4.0'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('reflects selection in its accessibility state', () => {
    const { getByLabelText } = renderScreen(
      <Chip label="High" selected onPress={jest.fn()} accessibilityLabel="High priority" />
    );
    expect(getByLabelText('High priority').props.accessibilityState).toMatchObject({ checked: true });
  });
});
