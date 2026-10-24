import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bar, Button, Chip, Dot, Ring, tabular, Txt } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/app-store';

const GOAL = '#C2410C';

type Slide = { title: string; body: string; art: ReactNode };

export default function IntroScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const loadSampleData = useAppStore((s) => s.loadSampleData);

  const slides: Slide[] = [
    {
      title: 'One clock for your whole day',
      body: 'Start it when you wake up. It never stops — so every minute of your day is accounted for, not just the ones you remember to log.',
      art: <ClockArt />,
    },
    {
      title: 'Tap Lap when you switch',
      body: 'Finished breakfast? Lap. Then say what that was, add a quick note, and rate your energy and focus. The next lap is already running.',
      art: <LapArt />,
    },
    {
      title: 'Give each goal a share',
      body: 'Decide how much of your waking time a goal deserves — say 25% for Physique — and roughly how many hours it needs.',
      art: <GoalArt />,
    },
    {
      title: 'See plan vs reality',
      body: 'Reviews compare what you planned with what you actually gave, and turn your real pace into an honest finish date.',
      art: <RealityArt />,
    },
    {
      title: 'Drill up and down',
      body: 'Zoom from a year to a month, a week, a day — right down to a single lap and its note. Tips will point things out as you go.',
      art: <DrillArt />,
    },
  ];
  const last = page === slides.length - 1;

  const goTo = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== page) setPage(i);
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={10} style={styles.topButton}>
          <Txt variant="body" color={t.accent}>
            Back
          </Txt>
        </Pressable>
        {!last ? (
          <Pressable onPress={() => goTo(slides.length - 1)} accessibilityRole="button" hitSlop={10} style={styles.topButton}>
            <Txt variant="body" color={t.accent}>
              Skip
            </Txt>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}>
        {slides.map((s, i) => (
          <View key={s.title} style={[styles.slide, { width }]} accessibilityLabel={`Step ${i + 1} of ${slides.length}`}>
            <View style={[styles.art, { backgroundColor: t.card }]}>{s.art}</View>
            <View style={styles.copy}>
              <Txt variant="overline" tone="secondary">
                {i + 1} of {slides.length}
              </Txt>
              <Txt variant="title" style={{ fontSize: 28, lineHeight: 34 }} accessibilityRole="header">
                {s.title}
              </Txt>
              <Txt variant="body" tone="secondary">
                {s.body}
              </Txt>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityElementsHidden>
          {slides.map((s, i) => (
            <View key={s.title} style={[styles.pageDot, { backgroundColor: i === page ? t.text : t.fillStrong, width: i === page ? 20 : 8 }]} />
          ))}
        </View>
        {last ? (
          <View style={{ gap: Spacing.three }}>
            <Button label="Start my first day" onPress={completeOnboarding} />
            <Button label="Explore with sample data" variant="secondary" onPress={loadSampleData} />
          </View>
        ) : (
          <Button label="Next" onPress={() => goTo(page + 1)} />
        )}
      </View>
    </View>
  );
}

function ClockArt() {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Dot color={GOAL} />
        <Txt variant="headline">Workout</Txt>
      </View>
      <Txt style={[{ fontSize: 56, fontWeight: '200', letterSpacing: -1.5 }, tabular]}>0:42:18</Txt>
      <Txt variant="subhead" tone="secondary">
        Lap 6 · Day 2:43:14
      </Txt>
      <View style={{ flexDirection: 'row', gap: 40, marginTop: 14 }}>
        <View style={[styles.round, { backgroundColor: t.fillStrong }]}>
          <Txt variant="subhead" style={{ fontWeight: '600' }}>
            End day
          </Txt>
        </View>
        <View style={[styles.round, { backgroundColor: t.primary }]}>
          <Txt variant="headline" color={t.onPrimary}>
            Lap
          </Txt>
        </View>
      </View>
    </View>
  );
}

function LapArt() {
  const t = useTheme();
  return (
    <View style={{ gap: 16, width: '100%' }}>
      <Txt variant="headline">What was that?</Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Chip label="Workout" selected />
        <Chip label="Breakfast" />
        <Chip label="Work" />
        <Chip label="Scrolling" />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="callout">Energy</Txt>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[styles.score, { backgroundColor: n === 4 ? GOAL : t.fill }]}>
              <Txt variant="subhead" color={n === 4 ? '#FFFFFF' : t.text}>
                {n}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function GoalArt() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
      <Ring fraction={0.43} color={GOAL} size={96} stroke={10} />
      <View style={{ gap: 4 }}>
        <Txt variant="title">Physique</Txt>
        <Txt variant="callout" tone="secondary">
          Target 25% of waking time
        </Txt>
        <Txt variant="callout" tone="secondary">
          About 150 hours
        </Txt>
      </View>
    </View>
  );
}

function RealityArt() {
  const t = useTheme();
  return (
    <View style={{ gap: 16, width: '100%' }}>
      <View style={{ gap: 6 }}>
        <View style={styles.between}>
          <Txt variant="subhead" tone="secondary">
            You planned
          </Txt>
          <Txt variant="subhead" style={{ fontWeight: '600' }}>
            60 days
          </Txt>
        </View>
        <Bar fraction={0.667} color={t.textTertiary} height={12} />
      </View>
      <View style={{ gap: 6 }}>
        <View style={styles.between}>
          <Txt variant="subhead" tone="secondary">
            At your real pace
          </Txt>
          <Txt variant="subhead" color={t.accentText} style={{ fontWeight: '600' }}>
            90 days
          </Txt>
        </View>
        <Bar fraction={1} color={GOAL} height={12} />
      </View>
    </View>
  );
}

function DrillArt() {
  const t = useTheme();
  const levels = ['Year', 'Month', 'Week', 'Day', 'Lap'];
  return (
    <View style={{ gap: 8, width: '100%' }}>
      {levels.map((l, i) => (
        <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: i * 18 }}>
          <View style={{ height: 30, width: 140 - i * 18, borderRadius: 8, backgroundColor: i === levels.length - 1 ? GOAL : t.fillStrong }} />
          <Txt variant="subhead" tone="secondary">
            {l}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, height: 44, alignItems: 'center' },
  topButton: { minHeight: 44, justifyContent: 'center' },
  slide: { paddingHorizontal: 24, paddingTop: 8, gap: 28 },
  art: { borderRadius: 24, padding: 24, minHeight: 260, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 10 },
  footer: { paddingHorizontal: 24, gap: 20 },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  pageDot: { height: 8, borderRadius: 4 },
  round: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  score: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
});
