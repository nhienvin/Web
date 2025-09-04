export type Fact = { vi: string; en?: string };
export type Media = { type: 'image'|'audio'; src: string; caption_vi?: string; credit?: string };

export type Province = {
  id: string;
  name_vi: string;
  name_en: string;
  region_code: string;
  region_name: string;
  lat: number; lon: number;
  svg_path_file: string;               // ví dụ "map/svg/HN.svg"
  anchor_px: [number, number];         // toạ độ anchor theo board 800x1400
  bbox_px?: [number, number, number, number] | null;
  neighbors: string[];
  facts: Fact[];
  media: Media[];
  snap_tolerance_px: number;
  difficulty_1to5: number;
};

export type Bundle = {
  viewBox: [number, number, number, number]; // [0,0,800,1400]
  provinces: Province[];
  indexById: Record<string, number>;
};
