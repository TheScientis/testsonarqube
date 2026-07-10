-- Master table for regions (Indonesian provinces + nasional).
-- Single source of truth for region id/label; app keeps src/lib/regions.ts in sync for now.
CREATE TABLE IF NOT EXISTS m_regions (
    id text PRIMARY KEY,
    label text NOT NULL
);

INSERT INTO m_regions (id, label) VALUES
('nasional', 'Nasional'),
('aceh', 'Aceh'),
('sumatera-utara', 'Sumatera Utara'),
('sumatera-barat', 'Sumatera Barat'),
('riau', 'Riau'),
('kepulauan-riau', 'Kepulauan Riau'),
('jambi', 'Jambi'),
('sumatera-selatan', 'Sumatera Selatan'),
('bengkulu', 'Bengkulu'),
('lampung', 'Lampung'),
('kepulauan-bangka-belitung', 'Kepulauan Bangka Belitung'),
('dki-jakarta', 'DKI Jakarta'),
('jawa-barat', 'Jawa Barat'),
('banten', 'Banten'),
('jawa-tengah', 'Jawa Tengah'),
('di-yogyakarta', 'DI Yogyakarta'),
('jawa-timur', 'Jawa Timur'),
('bali', 'Bali'),
('nusa-tenggara-barat', 'Nusa Tenggara Barat'),
('nusa-tenggara-timur', 'Nusa Tenggara Timur'),
('kalimantan-barat', 'Kalimantan Barat'),
('kalimantan-tengah', 'Kalimantan Tengah'),
('kalimantan-selatan', 'Kalimantan Selatan'),
('kalimantan-timur', 'Kalimantan Timur'),
('kalimantan-utara', 'Kalimantan Utara'),
('sulawesi-utara', 'Sulawesi Utara'),
('sulawesi-tengah', 'Sulawesi Tengah'),
('sulawesi-selatan', 'Sulawesi Selatan'),
('sulawesi-tenggara', 'Sulawesi Tenggara'),
('sulawesi-barat', 'Sulawesi Barat'),
('gorontalo', 'Gorontalo'),
('maluku', 'Maluku'),
('maluku-utara', 'Maluku Utara'),
('papua-barat', 'Papua Barat'),
('papua', 'Papua'),
('papua-selatan', 'Papua Selatan'),
('papua-tengah', 'Papua Tengah'),
('papua-pegunungan', 'Papua Pegunungan')
ON CONFLICT (id) DO NOTHING;
