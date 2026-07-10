export interface Region {
    id: string;
    label: string;
}

// Canonical list; kept in sync with m_regions table (see migration create_m_regions_and_seed).
const REGIONS: Region[] = [
    { id: "nasional", label: "Nasional" },
    { id: "aceh", label: "Aceh" },
    { id: "sumatera-utara", label: "Sumatera Utara" },
    { id: "sumatera-barat", label: "Sumatera Barat" },
    { id: "riau", label: "Riau" },
    { id: "kepulauan-riau", label: "Kepulauan Riau" },
    { id: "jambi", label: "Jambi" },
    { id: "sumatera-selatan", label: "Sumatera Selatan" },
    { id: "bengkulu", label: "Bengkulu" },
    { id: "lampung", label: "Lampung" },
    { id: "kepulauan-bangka-belitung", label: "Kepulauan Bangka Belitung" },
    { id: "dki-jakarta", label: "DKI Jakarta" },
    { id: "jawa-barat", label: "Jawa Barat" },
    { id: "banten", label: "Banten" },
    { id: "jawa-tengah", label: "Jawa Tengah" },
    { id: "di-yogyakarta", label: "DI Yogyakarta" },
    { id: "jawa-timur", label: "Jawa Timur" },
    { id: "bali", label: "Bali" },
    { id: "nusa-tenggara-barat", label: "Nusa Tenggara Barat" },
    { id: "nusa-tenggara-timur", label: "Nusa Tenggara Timur" },
    { id: "kalimantan-barat", label: "Kalimantan Barat" },
    { id: "kalimantan-tengah", label: "Kalimantan Tengah" },
    { id: "kalimantan-selatan", label: "Kalimantan Selatan" },
    { id: "kalimantan-timur", label: "Kalimantan Timur" },
    { id: "kalimantan-utara", label: "Kalimantan Utara" },
    { id: "sulawesi-utara", label: "Sulawesi Utara" },
    { id: "sulawesi-tengah", label: "Sulawesi Tengah" },
    { id: "sulawesi-selatan", label: "Sulawesi Selatan" },
    { id: "sulawesi-tenggara", label: "Sulawesi Tenggara" },
    { id: "sulawesi-barat", label: "Sulawesi Barat" },
    { id: "gorontalo", label: "Gorontalo" },
    { id: "maluku", label: "Maluku" },
    { id: "maluku-utara", label: "Maluku Utara" },
    { id: "papua-barat", label: "Papua Barat" },
    { id: "papua", label: "Papua" },
    { id: "papua-selatan", label: "Papua Selatan" },
    { id: "papua-tengah", label: "Papua Tengah" },
    { id: "papua-pegunungan", label: "Papua Pegunungan" },
];

export function getRegions(): Region[] {
    return REGIONS;
}

export function getRegionLabel(id: string): string | undefined {
    return REGIONS.find((r) => r.id === id)?.label;
}
