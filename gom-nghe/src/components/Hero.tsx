"use client";
import { motion } from "framer-motion";

export default function Hero({ onStartClick }: { onStartClick: () => void }) {
  return (
    <section className="relative overflow-hidden min-h-[70vh] flex items-center">
      {/* Poster nền nhẹ: tùy chọn */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "url(/hero/hero-poster.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          mixBlendMode: "multiply",
        }}
      />
      {/* Hạt tro bay (CSS dots) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="hero-ash-particles" />
      </div>

      <div className="relative z-10 mx-auto px-6 max-w-5xl">
        <motion.h1
          className="text-4xl md:text-5xl font-semibold tracking-wide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          Gốm Nghê — từ tro bếp đến linh hồn đất Việt
        </motion.h1>
        <motion.p
          className="mt-3 text-base md:text-lg max-w-2xl opacity-80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
        >
          Sần — nhưng thở. Không men bóng để soi gương, chỉ có hơi đất — để soi lòng.
        </motion.p>

        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          <button
            onClick={onStartClick}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 bg-neutral-900 text-white hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
            aria-label="Bắt đầu khám phá hành trình Gốm Nghê"
          >
            Bắt đầu khám phá
            <span aria-hidden>→</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}
