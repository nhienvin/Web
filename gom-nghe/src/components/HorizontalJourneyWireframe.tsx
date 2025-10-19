"use client";

import { useRef, type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Wireframe React: Hành trình Gốm Việt của Nghê – cuộn ngang
 * - TailwindCSS for layout & styling
 * - Framer Motion for subtle motions
 * - Pure horizontal scroll (overflow-x-auto + snap)
 *
 * Notes:
 * - This is a low‑fidelity wireframe: shapes, blocks, copy placeholders.
 * - Two lanes: Emotion (top) & Knowledge (bottom)
 * - Sections: Source → Earth → Fire → Glaze → People → Knowledge → Rebirth → End
 */

type Tone = "earth" | "fire" | "glaze" | "ash" | "smoke";

type SectionKey =
  | "source"
  | "earth"
  | "fire"
  | "glaze"
  | "people"
  | "knowledge"
  | "rebirth"
  | "end";

interface SectionData {
  key: SectionKey;
  title: string;
  emoji: string;
  emo: {
    h: string;
    p: string;
  };
  know: {
    h: string;
    items: string[];
  };
}

const sections: SectionData[] = [
  {
    key: "source",
    title: "Khởi nguồn",
    emoji: "🪔",
    emo: {
      h: "Tiếng gọi từ tro bếp",
      p: "Tôi từng quên mùi đất. Lửa khẽ nhen trong căn nhà nhỏ.",
    },
    know: {
      h: "Tro bếp trong văn hóa Việt",
      items: [
        "Tro rơm giàu silica (men ngà)",
        "Tro lá chuối có Fe (xanh nâu)",
        "Tro là ký ức của bếp Việt",
      ],
    },
  },
  {
    key: "earth",
    title: "Đất",
    emoji: "🪶",
    emo: {
      h: "Bỏ phố – gặp đất biết thở",
      p: "Tay chạm bùn, đất dính ngón, gió đồng thổi nhẹ.",
    },
    know: {
      h: "Bản đồ đất – chất liệu",
      items: [
        "Đất đỏ, đất phù sa, đất sét non",
        "Tính dẻo, co ngót, hạt mịn",
        "Đất phù sa giàu sắt – nung khử ra đỏ",
      ],
    },
  },
  {
    key: "fire",
    title: "Lửa",
    emoji: "🔥",
    emo: {
      h: "Ngọn lửa cô độc – thầy và lò",
      p: "Vì đời chuộng bóng, thầy chọn tro. Lửa dạy cách sống.",
    },
    know: {
      h: "Nung & Khử – Damper",
      items: [
        "Lò bầu, lò rồng, lò gas",
        "Oxy hóa ↔ Khử – biểu đồ màu men",
        "Damper 80% (oxy) ↔ 70% (khử)",
      ],
    },
  },
  {
    key: "glaze",
    title: "Men",
    emoji: "🧪",
    emo: {
      h: "Thất bại & vẻ đẹp khuyết tật",
      p: "Ấm không khít, men không đều, sập lò – rồi thấy sần cũng đẹp.",
    },
    know: {
      h: "Men tro tự nhiên",
      items: [
        "Celadon tro – hiệu ứng kết tinh",
        "Men công nghiệp vs men tro",
        "Ảnh macro – vệt kết tinh",
      ],
    },
  },
  {
    key: "people",
    title: "Người",
    emoji: "👁",
    emo: {
      h: "Đi qua làng nghề – nghe tiếng lò cũ",
      p: "\"Giờ còn mỗi mình tôi làm.\" – tiếng nói nhỏ mà sâu.",
    },
    know: {
      h: "Bản đồ làng gốm",
      items: [
        "Thổ Hà, Chu Đậu, Bát Tràng",
        "Biên Hòa, Sa Đéc…",
        "Ảnh/âm thanh tư liệu",
      ],
    },
  },
  {
    key: "knowledge",
    title: "Tri thức",
    emoji: "📚",
    emo: {
      h: "Kho bản địa sống",
      p: "Bàn gỗ, giấy tái chế, mực tím – nơi tri thức lắng xuống.",
    },
    know: {
      h: "Kho tư liệu mở",
      items: [
        "Công thức tro theo vùng",
        "Kỹ nghệ nung truyền thống",
        "Phỏng vấn nghệ nhân",
      ],
    },
  },
  {
    key: "rebirth",
    title: "Hồi sinh",
    emoji: "🌸",
    emo: {
      h: "Gốm Tro Bếp Đồng Bằng",
      p: "Ấm – bát – lọ thở hơi đất. Sần – nhưng thở.",
    },
    know: {
      h: "Bộ sưu tập hiện tại",
      items: [
        "Ấm Trà Vụn – rót mượt, ấm nhỏ 120–200ml",
        "Bát cơm mộc – giữ nhiệt",
        "Lọ celadon tro – loang tự nhiên",
      ],
    },
  },
  {
    key: "end",
    title: "Kết",
    emoji: "🪔",
    emo: {
      h: "Lời mời từ Nghê",
      p: "Nếu bạn còn nghe hơi đất, hãy đến và góp lửa.",
    },
    know: {
      h: "Tham gia hành trình",
      items: [
        "Đăng ký workshop",
        "Góp tư liệu tri thức",
        "Gửi cảm nhận – thắp sáng bản đồ",
      ],
    },
  },
];

interface CardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  tone?: Tone;
}

function Card({ title, subtitle, children, tone = "earth" }: CardProps) {
  const tones: Record<Tone, string> = {
    earth: "bg-[#F4EBD0] border-[#7A5B3A]/60",
    fire: "bg-[#F9E5DE] border-[#B44B3C]/60",
    glaze: "bg-[#E4F0EC] border-[#7AAE9E]/60",
    ash: "bg-[#F3EBC6] border-[#D8C27A]/60",
    smoke: "bg-[#EEEDE8] border-[#6D6A5F]/50",
  };
  return (
    <div
      className={`w-[540px] min-w-[540px] rounded-2xl border p-6 shadow-sm mr-6 backdrop-blur-sm ${tones[tone]}`}
    >
      <div className="text-xs uppercase tracking-wider opacity-70">{subtitle}</div>
      <h3 className="text-2xl font-semibold mt-1">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

interface LaneLabelProps {
  children: ReactNode;
  side?: "top" | "bottom";
}

function LaneLabel({ children, side = "top" }: LaneLabelProps) {
  return (
    <div className={`sticky ${side === "top" ? "top-4" : "bottom-4"} z-10 flex items-center gap-2 text-xs font-medium opacity-80`}> 
      <div className="w-2 h-2 rounded-full bg-neutral-800" />
      <span className="backdrop-blur px-2 py-1 rounded border bg-white/70">{children}</span>
    </div>
  );
}

interface SectionProps {
  data: SectionData;
}

function Section({ data }: SectionProps) {
  // choose tone by section
  const toneMap: Record<SectionKey, { emo: Tone; know: Tone }> = {
    source: { emo: "ash", know: "smoke" },
    earth: { emo: "earth", know: "ash" },
    fire: { emo: "fire", know: "smoke" },
    glaze: { emo: "glaze", know: "ash" },
    people: { emo: "earth", know: "smoke" },
    knowledge: { emo: "smoke", know: "ash" },
    rebirth: { emo: "glaze", know: "earth" },
    end: { emo: "ash", know: "smoke" },
  };

  return (
    <motion.div
      className="snap-center shrink-0 w-[1280px] px-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
    >
      <div className="grid grid-rows-[1fr_12px_1fr] grid-cols-1 h-[560px]"> 
        {/* Emotion lane */}
        <div className="flex items-end">
        <Card title={`${data.emoji} ${data.title}`} subtitle={data.emo.h} tone={toneMap[data.key].emo}>
            <p>{data.emo.p}</p>
            <div className="mt-4 text-[11px] italic opacity-70">Microcopy: “Đất không cần bóng để đẹp.”</div>
          </Card>
        </div>
        {/* connector */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.45)_0_8px,rgba(0,0,0,0)_8px_16px)]" />
          <div className="absolute left-8 -top-2 text-[11px] opacity-60">điểm chạm</div>
        </div>
        {/* Knowledge lane */}
        <div className="flex items-start">
        <Card title={`Tri thức: ${data.know.h}`} subtitle="Kho bản địa — ghi chép" tone={toneMap[data.key].know}>
            <ul className="list-disc pl-4 space-y-1">
              {data.know.items.map((t: string, i: number) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <div className="mt-3 text-[11px] opacity-60">Hover/click để bật tooltip – ảnh macro/âm thanh/biểu đồ.</div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

export default function HorizontalJourneyWireframe() {
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen w-full bg-[#F8F3E6] text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/70 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-neutral-800" />
          <div>
            <h1 className="text-lg font-semibold tracking-wide">Gốm Tro Bếp Đồng Bằng</h1>
            <p className="text-xs opacity-70 -mt-0.5">Hành trình của Nghê — bản đồ cảm xúc & tri thức bản địa</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <a className="opacity-80 hover:opacity-100" href="#">Về dự án</a>
          <a className="opacity-80 hover:opacity-100" href="#">Kho tri thức</a>
          <a className="opacity-80 hover:opacity-100" href="#">Workshop</a>
        </nav>
      </header>

      {/* Lanes labels */}
      <div className="relative">
        <div className="absolute left-6 right-6 top-0 pointer-events-none">
          <LaneLabel side="top">Làn CẢM XÚC — câu chuyện Nghê (thủ công, hơi đất)</LaneLabel>
        </div>
        <div className="absolute left-6 right-6 bottom-0 pointer-events-none">
          <LaneLabel side="bottom">Làn TRI THỨC — kho bản địa (ghi chép, công thức, tư liệu)</LaneLabel>
        </div>
      </div>

      {/* Horizontal scroller */}
      <div
        ref={scrollerRef}
        className="mt-6 overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        <div className="flex items-stretch px-6 pb-10" style={{ width: "max-content" }}>
          {sections.map((s) => (
            <Section key={s.key} data={s} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 border-t bg-white/60 backdrop-blur">
        <div className="text-xs opacity-70">
          Wireframe v1 • Cuộn ngang để khám phá • Màu sắc & texture sẽ bổ sung ở bước thiết kế kế tiếp.
        </div>
      </footer>
    </div>
  );
}
