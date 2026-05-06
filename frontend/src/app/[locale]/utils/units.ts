export const UBL_UNITS = [
    { value: 'NIU', label: 'Adet (NIU)', short: 'adet' },
    { value: 'KGM', label: 'Kilogram (KGM)', short: 'kg' },
    { value: 'GRM', label: 'Gram (GRM)', short: 'gr' },
    { value: 'LTR', label: 'Litre (LTR)', short: 'lt' },
    { value: 'MLT', label: 'Mililitre (MLT)', short: 'ml' },
    { value: 'CLT', label: 'Santilitre (CLT)', short: 'cl' },
    { value: 'PK', label: 'Paket (PK)', short: 'pkt' },
    { value: 'BX', label: 'Kutu (BX)', short: 'kutu' },
    { value: 'MTR', label: 'Metre (MTR)', short: 'm' },
    { value: 'MTK', label: 'Metrekare (MTK)', short: 'm2' },
    { value: 'MTQ', label: 'Metreküp (MTQ)', short: 'm3' },
    { value: 'HUR', label: 'Saat (HUR)', short: 'sa' },
    { value: 'DAY', label: 'Gün (DAY)', short: 'gn' },
    { value: 'MON', label: 'Ay (MON)', short: 'ay' },
    { value: 'ANN', label: 'Yıl (ANN)', short: 'yl' },
    { value: 'TNE', label: 'Ton (TNE)', short: 'tn' },
    { value: 'SET', label: 'Set (SET)', short: 'set' },
    { value: 'C62', label: 'Birim (C62)', short: 'br' },
];

export const getUnitLabel = (value: string) => {
    const unit = UBL_UNITS.find(u => u.value === value);
    return unit ? unit.label : value;
};

export const getUnitName = (value: string) => {
    if (!value) return '';
    const unit = UBL_UNITS.find(u => u.value === value);
    if (!unit) return value;
    return unit.short || unit.label.split(' (')[0];
};
