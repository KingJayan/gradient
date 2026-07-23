import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/use-theme';
import { openLink } from '../utils/links';
import { SPACING } from '../utils/tokens';
import { Screen, ScreenHeader, Card, IconButton } from '../components/screen';
import { Text } from '../components/typography';

const PROXY_HOST = 'gradient-hac-api.vercel.app';

export default function PrivacyScreen() {
  const { currentTheme } = useTheme();
  const navigation = useNavigation();

  const section = (title: string, body: React.ReactNode) => (
    <View style={styles.section}>
      <Text variant="heading" color={currentTheme.text} accessibilityRole="header">
        {title}
      </Text>
      {body}
    </View>
  );

  const paragraph = (text: string) => (
    <Text variant="body" color={currentTheme.textSecondary} style={styles.body}>{text}</Text>
  );

  return (
    <Screen
      header={
        <ScreenHeader
          title="Privacy"
          right={
            <IconButton
              name="close"
              color={currentTheme.textSecondary}
              label="Close privacy policy"
              onPress={() => navigation.goBack()}
            />
          }
        />
      }
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="body" color={currentTheme.text} style={styles.intro}>
          Gradient has no accounts of its own and keeps no database of your grades. Here is exactly
          what happens to your Home Access Center login.
        </Text>

        {section(
          'Where your password lives',
          paragraph(
            `Your district URL, username, and password are saved only in this device's iOS Keychain, the same encrypted store Apple uses for Safari passwords. Your password is read from the Keychain the moment a request is made and is never copied into the app's regular storage or written to any log.`
          )
        )}

        {section(
          'How grades get loaded',
          <>
            {paragraph(
              `Home Access Center has no public API, so Gradient can't sign in from your phone alone. Instead, each time you open a screen it sends your credentials over HTTPS to Gradient's own proxy at ${PROXY_HOST}.`
            )}
            {paragraph(
              'The proxy signs into your district on your behalf, scrapes the page you asked for, and hands the parsed grades back. It is a relay, not a vault: it does not store your password, it does not keep your grades, and it holds nothing after the response is sent. The code is open source, linked below.'
            )}
          </>
        )}

        {section(
          "What's stored on your device",
          paragraph(
            'The grades, schedule, and personal tasks you see are cached on this device so the app opens instantly and works offline. That cache lives only here. Signing out or tapping Delete Account erases it along with your Keychain credentials.'
          )
        )}

        {section(
          'Diagnostics',
          paragraph(
            "Gradient collects anonymous crash and performance reports so bugs can be fixed. These carry no grades, no name, and no login, and they're never used to track you or sold to anyone."
          )
        )}

        <Card
          style={styles.linkCard}
          onPress={() => openLink('https://github.com/KingJayan/gradient-hac-api')}
          haptic
          accessibilityRole="link"
          accessibilityLabel="View the proxy source code on GitHub"
        >
          <Text variant="body" weight="600" color={currentTheme.primary}>View the proxy source</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: SPACING.sm },
  content: { padding: SPACING.lg },
  intro: { marginBottom: SPACING.xl },
  linkCard: { alignItems: 'center', marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
  section: { marginBottom: SPACING.xl },
});
