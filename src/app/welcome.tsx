import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/logo';

const INK = '#141416';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Logo size={132} tile={false} />
        <Text style={styles.name} accessibilityRole="header">
          LifeSplits
        </Text>
        <Text style={styles.tagline}>See what your goals really cost in time.</Text>
      </View>

      <View style={styles.points}>
        <Point title="One clock, all day" body="Tap Lap whenever you switch what you're doing." />
        <Point title="Goals get a share" body="Decide how much of your day each goal deserves." />
        <Point title="Plans meet reality" body="Get an honest finish date from your real pace." />
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={() => router.push('/intro')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.8 : 1 }]}>
          <Text style={styles.ctaText}>Get started</Text>
        </Pressable>
        <Text style={styles.privacy}>No account needed. Everything stays on this phone.</Text>
      </View>
    </View>
  );
}

function Point({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.point}>
      <View style={styles.pointDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pointTitle}>{title}</Text>
        <Text style={styles.pointBody}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: INK, paddingHorizontal: 28, justifyContent: 'space-between' },
  hero: { alignItems: 'center', gap: 14, marginTop: 40 },
  name: { color: '#F5F5F7', fontSize: 40, fontWeight: '700', letterSpacing: -0.8 },
  tagline: { color: '#A1A1AA', fontSize: 17, lineHeight: 23, textAlign: 'center', maxWidth: 280 },
  points: { gap: 18, maxWidth: 420, alignSelf: 'center', width: '100%' },
  point: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  pointDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#F26B1D', marginTop: 6 },
  pointTitle: { color: '#F5F5F7', fontSize: 17, fontWeight: '600' },
  pointBody: { color: '#A1A1AA', fontSize: 15, lineHeight: 20, marginTop: 2 },
  footer: { gap: 14, maxWidth: 420, alignSelf: 'center', width: '100%' },
  cta: { height: 54, borderRadius: 14, backgroundColor: '#F5F5F7', alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: INK, fontSize: 17, fontWeight: '600' },
  privacy: { color: '#8E8E93', fontSize: 13, textAlign: 'center' },
});
