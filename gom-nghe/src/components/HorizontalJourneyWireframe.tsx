"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import Hero from "@/components/Hero"
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

  interface TooltipItem {
    title: string;
    body: string;
    media?: string; // ảnh nhỏ (tuỳ chọn)
  }
  
  interface MediaLite {
    poster: string;
    src: string;
    caption?: string;
  }
  type TouchPointConfig = {
    label: string;              // text hover
    title: string;              // tiêu đề panel
    desc: string;               // mô tả 1 câu
    primary: { text: string; onClick: () => void };
    secondary?: { text: string; onClick: () => void };
  };
  const tpConfigs: Record<SectionKey, TouchPointConfig | undefined> = {
    source: {
      label: "tro bếp",
      title: "Tro bếp là men",
      desc: "Xem 8s khói/tro — và vì sao tro rơm có thể thành men.",
      primary: { text: "▶ Xem micro-video", onClick: () => {/* play hotspot video */} },
      secondary: { text: "ⓘ Tro rơm / Tro lá / Tro trấu", onClick: () => {/* open tooltips */} }
    },
    earth: {
      label: "đất biết thở",
      title: "Soi macro đất",
      desc: "Phóng to hạt mịn, xem vết co ngót khi khô.",
      primary: { text: "🔍 Mở kính lúp", onClick: () => {/* toggle macro viewer */} },
      secondary: { text: "ⓘ Phân loại đất", onClick: () => {/* open tooltips */} }
    },
    fire: undefined,
    glaze: undefined,
    people: undefined,
    knowledge: undefined,
    rebirth: undefined,
    end: undefined,
  };
    
  interface SectionData {
    key: SectionKey;
    title: string;
    emoji: string;
    emo: {
      h: string;
      p: string;
      media?: MediaLite; // chỉ dùng cho source & earth (bây giờ)
    };
    know: {
      h: string;
      items?: string[];       // fallback dạng danh sách cũ
      tooltips?: TooltipItem[]; // cho source & earth
    };
  }
  
  /* ===================== DATA ===================== */
  
  const sections: SectionData[] = [
    {
      key: "source",
      title: "Khởi nguồn",
      emoji: "🪔",
      emo: {
        h: "Tiếng gọi từ tro bếp",
        p: "Tôi từng quên mùi đất. Lửa khẽ nhen trong căn nhà nhỏ.",
        media: {
          poster: "/media/DSC_9152[1].jpg",
          src: "/media/Vào men Tro.mp4",
          caption: "Tôi từng quên mùi đất.",
        },
      },
      know: {
        h: "Tro bếp trong văn hóa Việt",
        tooltips: [
          {
            title: "Tro rơm",
            body: "Giàu silica → khi nung cao tạo lớp men mỏng, trong mờ, ngà sáng.",
          },
          {
            title: "Tro lá chuối",
            body: "Chứa oxit sắt (Fe) → sắc xanh nâu trầm khi nung khử.",
          },
          {
            title: "Tro trấu",
            body: "Hạt mịn, nhiều silica tinh → thiên về men sáng & trong.",
          },
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
        media: {
          poster: "/media/earth-poster.jpg",
          src: "/media/earth-knead.mp4",
          caption: "Học lại cách hỏi đất.",
        },
      },
      know: {
        h: "Bản đồ đất – chất liệu",
        tooltips: [
          {
            title: "Đất phù sa sông Hồng",
            body: "Giàu sắt; hạt mịn, dẻo; nung khử cho tông đỏ sẫm, ấm.",
          },
          {
            title: "Đất sét non",
            body: "Rất dẻo & giữ nước; thường làm nền cho men tro tự nhiên.",
          },
          {
            title: "Đất đỏ / đá ong",
            body: "Nhiều sắt, màu nâu đỏ ấm; hợp tông tro & lửa bếp.",
          },
          {
            title: "Co ngót & nứt",
            body: "Phơi nhanh/nung gấp dễ nứt chân chim; phơi chậm + ủ ẩm để ổn định.",
          },
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
        p: '"Giờ còn mỗi mình tôi làm." – tiếng nói nhỏ mà sâu.',
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
      className={`card-ink w-[540px] min-w-[540px] rounded-2xl border p-6 shadow-sm mr-6 backdrop-blur-sm ${tones[tone]}`}
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

/* ===================== HOTSPOT VIDEO (LITE) ===================== */

function HotspotVideoLite({ media }: { media?: MediaLite }) {
  const [muted, setMuted] = useState(true);
  if (!media) return null;
  return (
    <div className="mt-4 relative rounded-xl overflow-hidden border border-black/10">
      <video
        className="w-full aspect-video object-cover"
        src={media.src}
        poster={media.poster}
        muted={muted}
        autoPlay
        loop
        playsInline
      />
      {/* Controls lite */}
      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <button
          onClick={() => setMuted((m) => !m)}
          className="text-[11px] px-2 py-1 rounded bg-black/60 text-white"
          aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}
        >
          {muted ? "🔈 Bật âm" : "🔇 Tắt âm"}
        </button>
        <span className="text-[11px] px-2 py-1 rounded bg-white/70 backdrop-blur">
          {media.caption || ""}
        </span>
      </div>
      {/* Placeholder nút xem bản dài (để dành) */}
      {/* <button className="absolute top-2 right-2 text-[11px] px-2 py-1 rounded bg-white/70">▶ Xem đầy đủ</button> */}
    </div>
  );
}

/* ===================== TOOLTIP LIST ===================== */

function TooltipList({ items }: { items?: TooltipItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <div key={i} className="relative">
            <button
              className="text-xs px-3 py-1.5 rounded-full border bg-white/70 hover:bg-white transition"
              aria-haspopup="dialog"
              aria-expanded={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              ⓘ {it.title}
            </button>

            {openIndex === i && (
              <div
                role="dialog"
                aria-label={it.title}
                className="absolute z-20 mt-2 w-64 p-3 rounded-lg border bg-white shadow-lg text-[13px]"
                style={{ transform: "translateX(-10%)" }}
              >
                <div className="font-medium mb-1">{it.title}</div>
                <p className="opacity-80 leading-relaxed">{it.body}</p>
                {it.media && (
                  <img
                    src={it.media}
                    alt={it.title}
                    className="mt-2 rounded-md border object-cover h-24 w-full"
                  />
                )}
                <div className="mt-2 flex justify-end">
                  <button
                    className="text-xs px-2 py-1 rounded bg-neutral-900 text-white"
                    onClick={() => setOpenIndex(null)}
                    aria-label="Đóng tooltip"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Click ngoài để đóng (đơn giản): */}
      {openIndex !== null && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setOpenIndex(null)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

/* ===================== SECTION ===================== */

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

  
  const isFirstTwo = data.key === "source" || data.key === "earth";
  return (
    <motion.div
      data-section={data.key}
      className="snap-center shrink-0 w-[1280px] px-8"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6 }}
    >
      <div className="grid grid-rows-[1fr_12px_1fr] grid-cols-1 h-[620px]">
        {/* Emotion lane */}
        <div className="flex items-end">
          <Card
            title={`${data.emoji} ${data.title}`}
            subtitle={data.emo.h}
            tone={toneMap[data.key].emo}
          >
            <p>{data.emo.p}</p>
            {/* Hotspot video chỉ cho 2 vùng đầu */}
            {isFirstTwo && <HotspotVideoLite media={data.emo.media} />}
            <div className="mt-3 text-[11px] italic opacity-70">
              Microcopy: {data.key === "source" ? "“Tôi từng quên mùi đất.”" : "“Học lại cách hỏi đất.”"}
            </div>
          </Card>
        </div>

        {/* connector */}
        <div className="relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-[repeating-linear-gradient(90deg,rgba(0,0,0,0.45)_0_8px,rgba(0,0,0,0)_8px_16px)]" />
          <div className="absolute left-8 -top-2 text-[11px] opacity-60">config = tpConfigs[data.key]</div>
        </div>

        {/* Knowledge lane */}
        <div className="flex items-start">
          <Card
            title={`Tri thức: ${data.know.h}`}
            subtitle="Kho bản địa — ghi chép"
            tone={toneMap[data.key].know}
          >
            {/* Nếu có tooltips (2 vùng đầu) → dùng TooltipList; ngược lại dùng danh sách cũ */}
            {isFirstTwo && data.know.tooltips ? (
              <TooltipList items={data.know.tooltips} />
            ) : (
              <>
                <ul className="list-disc pl-4 space-y-1">
                  {(data.know.items || []).map((t: string, i: number) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
                <div className="mt-3 text-[11px] opacity-60">
                  Hover/click để bật tooltip – ảnh macro/âm thanh/biểu đồ.
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

/* ===================== PAGE WRAPPER ===================== */

export default function HorizontalJourneyWireframe() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const scrollToSource = () => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const el = scroller.querySelector<HTMLElement>("[data-section='source']");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const updateAvailability = () => {
      const node = scrollerRef.current;
      if (!node) {
        return;
      }
      const { scrollLeft, scrollWidth, clientWidth } = node;
      setCanScrollPrev(scrollLeft > 8);
      setCanScrollNext(scrollLeft + clientWidth < scrollWidth - 8);
    };

    updateAvailability();

    const handleResize = () => updateAvailability();

    scroller.addEventListener("scroll", updateAvailability, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      scroller.removeEventListener("scroll", updateAvailability);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const scrollByStep = (direction: "left" | "right") => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const delta = Math.max(scroller.clientWidth * 0.8, 320);
    const offset = direction === "left" ? -delta : delta;

    scroller.scrollBy({ left: offset, behavior: "smooth" });
  };

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
      <Hero onStartClick={scrollToSource} />
      {/* Horizontal scroller */}
      <div className="relative mt-6">
        <div
          ref={scrollerRef}
          className="overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          <div className="flex items-stretch px-6 pb-10" style={{ width: "max-content" }}>
            {sections.map((s) => (
              <Section key={s.key} data={s} />
            ))}
          </div>
        </div>
        {canScrollPrev && (
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg shadow-lg ring-1 ring-black/10 backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40"
            onClick={() => scrollByStep("left")}
            aria-label="Xem phần trước"
          >
            <span aria-hidden>←</span>
          </button>
        )}
        {canScrollNext && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg shadow-lg ring-1 ring-black/10 backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40"
            onClick={() => scrollByStep("right")}
            aria-label="Xem phần tiếp theo"
          >
            <span aria-hidden>→</span>
          </button>
        )}
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

