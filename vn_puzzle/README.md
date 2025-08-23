# VN Map Puzzle — Phaser + TypeScript (Starter)

Chạy được ngay (Vite), có kéo-thả, xoay (R), và snap vào bóng đổ.
Thay thế 2 mảnh mẫu bằng bộ SVG/JSON 63/34 mảnh của bạn.

## Chạy dev
```bash
npm i
npm run dev
```
Truy cập: http://localhost:5173

## Build
```bash
npm run build
npm run preview
```

## Nạp bộ mảnh 63/34
- Copy SVG vào `public/assets/svg-63` hoặc `public/assets/svg-34`.
- Cập nhật `public/assets/data/pieces.json` (id, name, svg, start, target, scale).
- Code đọc SVG dạng text rồi tạo texture (không phụ thuộc loader .svg), nên chạy ổn trên mọi trình duyệt.

## Hướng phát triển
- Sinh `pieces.json` tự động từ JSON trung tâm (centroid/neighbor) với bố trí target chuẩn hóa.
- Snap thông minh theo centroid/kề cận, hút nam châm.
- 3 cấp độ khó, timer, sticker/album.
- PWA + Capacitor (mobile) + Tauri (desktop).
