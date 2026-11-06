import { useId } from "react";

type Pose = "default" | "wave";

/**
 * 마스코트 "반짝" 벡터 스케치 (Claude Design 캐릭터 시트 v0.2).
 * 3D 렌더가 완성되면 투명 WebP <Image>로 교체한다.
 */
export function Banjjak({ pose = "default", size = 112, title }: { pose?: Pose; size?: number; title: string }) {
  const id = useId();
  const g = `banjjak-${id}`;
  const body = (
    <>
      <path
        d="M60 18L72 44L100 47L79 66L86 96L60 81L34 96L41 66L20 47L48 44Z"
        fill={`url(#${g})`}
        stroke={`url(#${g})`}
        strokeWidth="14"
        strokeLinejoin="round"
      />
      <ellipse cx="46" cy="40" rx="7" ry="4" fill="#FFFFFF" opacity="0.85" transform="rotate(-30 46 40)" />
      <circle cx="51" cy="60" r="4" fill="#1F2329" />
      <circle cx="69" cy="60" r="4" fill="#1F2329" />
      <path d="M55 69q5 5 10 0" stroke="#1F2329" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="42" cy="70" rx="5.5" ry="3.2" fill="#FF9FBF" opacity="0.7" />
      <ellipse cx="78" cy="70" rx="5.5" ry="3.2" fill="#FF9FBF" opacity="0.7" />
    </>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={title}>
      <defs>
        <radialGradient id={g} cx="38%" cy="35%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#BFE2FF" />
          <stop offset="1" stopColor="#5AAEFF" />
        </radialGradient>
      </defs>
      {pose === "wave" ? (
        <>
          <g transform="rotate(-8 60 60)">{body}</g>
          <path d="M108 32q4 4 2 10M112 24q7 7 4 18" stroke="#7CC0FF" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M100 8l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#B88CFF" />
          <path d="M14 22l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#F6C21C" />
        </>
      ) : (
        body
      )}
    </svg>
  );
}
