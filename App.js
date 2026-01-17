import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  Text,
  StatusBar,
  Alert
} from 'react-native';
import * as Location from 'expo-location';

import LocationHeader from './src/components/LocationHeader';
import CountdownCard from './src/components/CountdownCard';
import PrayerCard from './src/components/PrayerCard';
import { findDistrictInfo, getPrayerTimesForDate, getNextPrayer } from './src/utils/prayerTimes';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState(null);
  const [prayerTimes, setPrayerTimes] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Konum ve verileri al
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      // Konum iznini kontrol et
      const { status } = await Location.requestForegroundPermissionsAsync();

      let locationCoords;
      if (status !== 'granted') {
        // Varsayılan konum (İstanbul)
        locationCoords = { latitude: 41.0082, longitude: 28.9784 };
      } else {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        locationCoords = currentLocation.coords;
      }

      // Adres bilgisini al
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
      });

      let cityName = 'İstanbul';
      if (reverseGeocode && reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        setAddress(addr);
        cityName = addr.district || addr.city || addr.region || 'İstanbul';
      }

      // İlçe bilgilerini (ID, isim, il) bul
      const districtInfo = await findDistrictInfo(cityName);

      if (districtInfo) {
        // Vakitleri GitHub'dan çek (İl/İlçe yapısı)
        const times = await getPrayerTimesForDate(districtInfo.state, districtInfo.name);
        if (times) {
          setPrayerTimes(times);
          setNextPrayer(getNextPrayer(times));
        } else {
          setErrorMsg('Namaz vakitleri alınamadı.');
        }
      }
    } catch (error) {
      console.error('Hata:', error);
      setErrorMsg('Bir yükleme hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sayaç güncelleme için her dakika başı çalışacak effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (prayerTimes) {
        setNextPrayer(getNextPrayer(prayerTimes));
      }
    }, 60000);

    return () => clearInterval(timer);
  }, [prayerTimes]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Vakitler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.headerBackground} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <LocationHeader
          city={address?.city || 'İstanbul'}
          district={address?.district || ''}
          date={new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          hijriDate={prayerTimes?.hicriDate || ''}
          onRefresh={fetchData}
        />

        {nextPrayer && (
          <CountdownCard
            prayerName={nextPrayer.name}
            remainingTime={`${nextPrayer.remaining.hours}:${nextPrayer.remaining.minutes.toString().padStart(2, '0')}`}
          />
        )}

        <View style={styles.prayersContainer}>
          <PrayerCard
            name="İmsak"
            time={prayerTimes?.imsak}
            icon="weather-night"
            active={nextPrayer?.name === 'İmsak'}
          />
          <PrayerCard
            name="Güneş"
            time={prayerTimes?.gunes}
            icon="solar-panel"
            active={nextPrayer?.name === 'Güneş'}
          />
          <PrayerCard
            name="Öğle"
            time={prayerTimes?.ogle}
            icon="weather-sunny"
            active={nextPrayer?.name === 'Öğle'}
          />
          <PrayerCard
            name="İkindi"
            time={prayerTimes?.ikindi}
            icon="weather-partly-cloudy"
            active={nextPrayer?.name === 'İkindi'}
          />
          <PrayerCard
            name="Akşam"
            time={prayerTimes?.aksam}
            icon="weather-sunset"
            active={nextPrayer?.name === 'Akşam'}
          />
          <PrayerCard
            name="Yatsı"
            time={prayerTimes?.yatsi}
            icon="weather-night"
            active={nextPrayer?.name === 'Yatsı'}
          />
        </View>

        {errorMsg && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 10,
    color: '#2E7D32',
    fontSize: 16,
  },
  scrollContainer: {
    paddingBottom: 30,
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: '#2E7D32',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  prayersContainer: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },
});
