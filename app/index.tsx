import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Accelerometer, AccelerometerMeasurement } from 'expo-sensors';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface Recording {
  timestamp: string;
  latitude: number;
  longitude: number;
  intensity: number;
}

const getIntensityColor = (intensity: number): string => {
  // Scale intensity to a value between 0 and 1
  const normalized = Math.min(Math.max(intensity / 20, 0), 1);
  
  // Red for high intensity, green for low
  if (normalized < 0.3) return 'green';
  if (normalized < 0.7) return 'yellow';
  return 'red';
};

export default function App(): React.JSX.Element {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [initialRegion, setInitialRegion] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [accelerometerData, setAccelerometerData] = useState<AccelerometerMeasurement>({ x: 0, y: 0, z: 0 });
  const subscription = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
    })();
  }, []);

  const startRecording = async () => {
    try {
      const initialLocation = await Location.getCurrentPositionAsync({});
      setInitialRegion({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      subscription.current = Accelerometer.addListener(data => {
        setAccelerometerData(data);
        const intensity = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2) * 10;
        
        Location.getCurrentPositionAsync({}).then(location => {
          const newRecording: Recording = {
            timestamp: new Date().toISOString(),
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            intensity: intensity,
          };
          setRecordings(prev => [...prev, newRecording]);
        });
      });
      
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (subscription.current) {
      subscription.current.remove();
    }
    setIsRecording(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Movement & Location Tracker</Text>
      
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={initialRegion || {
            latitude: 40.7128,
            longitude: -74.0060,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          provider="google"
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {recordings.map((record, index) => (
            <Marker
              key={`marker-${index}`}
              coordinate={{
                latitude: record.latitude,
                longitude: record.longitude,
              }}
              pinColor={getIntensityColor(record.intensity)}
            />
          ))}
          
          {recordings.length > 1 && (
            <Polyline
              coordinates={recordings.map(record => ({
                latitude: record.latitude,
                longitude: record.longitude,
              }))}
              strokeWidth={3}
              strokeColor="rgba(0,0,255,0.5)"
            />
          )}
        </MapView>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, isRecording ? styles.stopButton : styles.startButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.recordingsList}>
        {recordings.map((record, index) => (
          <View key={index} style={styles.recordingItem}>
            <Text>Time: {new Date(record.timestamp).toLocaleTimeString()}</Text>
            <Text>Intensity: {record.intensity.toFixed(2)}</Text>
            <Text>Lat: {record.latitude.toFixed(4)}, Long: {record.longitude.toFixed(4)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  mapContainer: {
    height: 300,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingsList: {
    flex: 1,
  },
  recordingItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});