import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { ResolvedBadge } from "../../lib/badges";
import { useTheme } from "../../lib/ThemeContext";

function SeedGlyph({ color }: { color: string }) {
  return (
    <>
      <Ellipse cx={10} cy={11} rx={4.2} ry={5.4} transform="rotate(-18 10 11)" fill={color} />
      <Path d="M10 5.8 C10.5 4.2 12 3.4 13.2 3.6" stroke={color} strokeWidth={1.1} fill="none" strokeLinecap="round" />
    </>
  );
}

function SproutGlyph({ color }: { color: string }) {
  return (
    <>
      <Path d="M10 17V10" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M10 11c0-3-2.6-4.6-5.4-4.4C5 9.6 7.2 11.4 10 11z" fill={color} />
      <Path d="M10 9.6c0-2.6 2.2-4.2 4.6-4.1C14.4 8 12.4 9.6 10 9.6z" fill={color} opacity={0.75} />
    </>
  );
}

function LeafGlyph({ color, accentColor }: { color: string; accentColor: string }) {
  return (
    <>
      <Path d="M4.5 15.5C3 9 8 3.5 15.5 4c0.6 7.4-4.9 12.4-11 11.5z" fill={color} />
      <Path
        d="M5.2 15C8 11.6 11 8.8 14.6 5"
        stroke={accentColor}
        strokeWidth={1}
        fill="none"
        strokeLinecap="round"
        opacity={0.55}
      />
    </>
  );
}

// "Option C" from the reviewed design artifact -- resized (via the
// wrapping transform) across two rounds of feedback so platinum reads
// at least as prominent as the lower tiers, not smaller.
function BlossomGlyph({ color, accentColor }: { color: string; accentColor: string }) {
  return (
    <G transform="translate(10,10.5) scale(1.43) translate(-10,-10.5)">
      <Path d="M10 17V12.5" stroke={color} strokeWidth={1.3} strokeLinecap="round" />
      <Path d="M8.7 12.7c-1.5 0.4-3.1-0.7-3.3-2 1.4-0.5 3 0.3 3.3 2z" fill={color} opacity={0.75} />
      <Path d="M10 9.3c1.7-1.7 1.7-4.3 0-6-1.7 1.7-1.7 4.3 0 6z" fill={color} />
      <Path d="M10 9.3c2.4 0 4.4-1.6 5-3.8-2.5-0.4-4.7 1-5 3.8z" fill={color} />
      <Path d="M10 9.3c-2.4 0-4.4-1.6-5-3.8 2.5-0.4 4.7 1 5 3.8z" fill={color} />
      <Circle cx={10} cy={9.3} r={1.3} fill={accentColor} />
      <Circle cx={10} cy={9.3} r={0.7} fill={color} />
    </G>
  );
}

// Deliberately outside the growth-stage family -- a beta tester didn't
// necessarily donate, so it shouldn't look like a 5th tier.
function WateringCanGlyph({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M5 8.5h7a1.5 1.5 0 0 1 1.5 1.5v3A1.5 1.5 0 0 1 12 14.5H5A1.5 1.5 0 0 1 3.5 13v-3A1.5 1.5 0 0 1 5 8.5z"
        fill={color}
      />
      <Path
        d="M13 9.3l3.6-1.7c0.5-0.2 1 0.2 1 0.7 0 0.3-0.15 0.55-0.4 0.7L13.8 10.7"
        stroke={color}
        strokeWidth={1.3}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7 8.5V6.8A1.8 1.8 0 0 1 8.8 5h1.4" stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path
        d="M17.6 8.6l0.9 1.6M18.9 9.6l1 0.5M18.9 8l1-0.3"
        stroke={color}
        strokeWidth={0.9}
        strokeLinecap="round"
        opacity={0.7}
      />
    </>
  );
}

// size/color are props on purpose -- the same icon renders at ~16px
// inline (Treatment 1) or ~13px inside a chip (Treatment 3). The
// leaf/blossom's inner contrast accent always resolves to the current
// theme's paperRaised internally, not caller-configurable -- it must
// always contrast against the icon's own fill regardless of context.
export function BadgeIcon({ badge, size = 16, color }: { badge: ResolvedBadge; size?: number; color: string }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      {badge.kind === "beta_tester" ? (
        <WateringCanGlyph color={color} />
      ) : badge.tier === "bronze" ? (
        <SeedGlyph color={color} />
      ) : badge.tier === "silver" ? (
        <SproutGlyph color={color} />
      ) : badge.tier === "gold" ? (
        <LeafGlyph color={color} accentColor={colors.paperRaised} />
      ) : (
        <BlossomGlyph color={color} accentColor={colors.paperRaised} />
      )}
    </Svg>
  );
}
