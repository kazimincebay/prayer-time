const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/kazimincebay/prayer-time/main';

/**
 * Konum ismine göre ilçe bilgilerini bulur
 * @param {string} cityName - Şehir/İlçe adı
 * @returns {Promise<Object|null>} İlçe bilgileri veya null
 */
export const findDistrictInfo = async (cityName) => {
  try {
    const response = await fetch(`${GITHUB_BASE_URL}/prayer-times.districts.json`);
    const districts = await response.json();

    // İsme göre eşleştirme (Küçük-büyük harf duyarsız)
    const match = districts.find(d =>
      d.name.toLowerCase() === cityName.toLowerCase() ||
      cityName.toLowerCase().includes(d.name.toLowerCase())
    );

    return match || { id: '15153', name: 'ÜSKÜDAR', state: 'İSTANBUL' }; // Varsayılan
  } catch (error) {
    console.error('İlçe bilgisi bulunamadı:', error);
    return { id: '15153', name: 'ÜSKÜDAR', state: 'İSTANBUL' };
  }
};

/**
 * GitHub üzerinden ilçe vakitlerini çeker (İl/İlçe yapısı)
 * @param {string} stateName - İl adı
 * @param {string} districtName - İlçe adı
 * @returns {Promise<Array>} Vakit listesi
 */
export const fetchPrayerTimes = async (stateName, districtName) => {
  try {
    const encodedState = encodeURIComponent(stateName);
    const encodedDistrict = encodeURIComponent(districtName.toLowerCase());
    const url = `${GITHUB_BASE_URL}/data/${encodedState}/${encodedDistrict}.json`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} adresinden veri çekilemedi`);
    return await response.json();
  } catch (error) {
    console.error('Vakitler çekilirken hata:', error);
    return null;
  }
};

/**
 * API'den gelen veriyi uygulama formatına dönüştürür
 */
const mapApiToAppFormat = (apiRecord) => {
  if (!apiRecord) return null;

  const [year, month, day] = apiRecord.date.split('T')[0].split('-');

  const parseTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date(year, month - 1, day, hours, minutes);
    return date;
  };

  return {
    imsak: parseTime(apiRecord.times.imsak),
    gunes: parseTime(apiRecord.times.gunes),
    ogle: parseTime(apiRecord.times.ogle),
    ikindi: parseTime(apiRecord.times.ikindi),
    aksam: parseTime(apiRecord.times.aksam),
    yatsi: parseTime(apiRecord.times.yatsi),
    hicriDate: apiRecord.hijri_date.full_date
  };
};

/**
 * Verilen il/ilçe ve tarih için namaz vakitlerini getirir
 */
export const getPrayerTimesForDate = async (stateName, districtName, date = new Date()) => {
  const allTimes = await fetchPrayerTimes(stateName, districtName);
  if (!allTimes) return null;

  const targetDateStr = date.toISOString().split('T')[0];
  const dayRecord = allTimes.find(record => record.date.startsWith(targetDateStr));

  return mapApiToAppFormat(dayRecord);
};

/**
 * Vakti formatla (HH:MM)
 */
export const formatTime = (time) => {
  if (!time) return '--:--';
  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Bir sonraki namaz vaktini bul
 */
export const getNextPrayer = (prayerTimes) => {
  if (!prayerTimes) return null;

  const now = new Date();
  const prayers = [
    { name: 'İmsak', time: prayerTimes.imsak },
    { name: 'Güneş', time: prayerTimes.gunes },
    { name: 'Öğle', time: prayerTimes.ogle },
    { name: 'İkindi', time: prayerTimes.ikindi },
    { name: 'Akşam', time: prayerTimes.aksam },
    { name: 'Yatsı', time: prayerTimes.yatsi },
  ];

  for (let prayer of prayers) {
    if (prayer.time > now) {
      const diff = prayer.time - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        name: prayer.name,
        time: prayer.time,
        remaining: { hours, minutes },
      };
    }
  }

  return {
    name: 'İmsak (Yarın)',
    time: null, // Yarınki vakti çekmek için tekrar getPrayerTimesForDate çağrılmalı
    remaining: { hours: 0, minutes: 0 },
  };
};
