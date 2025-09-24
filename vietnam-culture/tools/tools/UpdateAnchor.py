import json
slots_path = Path('"'"'d:/Project/GitHub/Web/vietnam-culture/tools/data/osm_pipeline_demo/slots.json'"'"')
bundle_path = Path('"'"'d:/Project/GitHub/Web/vietnam-culture/public/data/provinces.bundle.json'"'"')
slots = json.loads(slots_path.read_text(encoding='"'"'utf-8'"'"'))
slot_map = {entry['"'"'province_id'"'"']: [float(entry['"'"'anchor_x'"'"']), float(entry['"'"'anchor_y'"'"'])] for entry in slots}
bundle = json.loads(bundle_path.read_text(encoding='"'"'utf-8'"'"'))
updated = 0
missing = []
for prov in bundle.get('"'"'provinces'"'"', []):
    pid = str(prov.get('"'"'id'"'"'))
    if pid in slot_map:
        anchors = slot_map[pid]
        if list(map(float, prov.get('"'"'anchor_px'"'"', []))) != anchors:
            prov['"'"'anchor_px'"'"'] = anchors
            updated += 1
    else:
        missing.append(pid)
bundle_path.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding='"'"'utf-8'"'"')
print(f'"'"'Updated anchors for {updated} provinces. Missing slots: {missing[:10]}... total {len(missing)}'"'"')
