import { useTheme } from '@/src/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

interface LocationData {
    latitude: number;
    longitude: number;
    address: string;
}

interface Props {
    isVisible: boolean;
    onClose: () => void;
    onSelect: (location: LocationData) => void;
    initialLocation?: LocationData | null;
}

const mapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100vw; }
        .leaflet-control-container { display: none; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', {zoomControl: false}).setView([-23.55052, -46.633308], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        var marker;
        var circle;
        var radius = 200;

        function setLocation(lat, lng) {
            map.setView([lat, lng], 15);
            if (marker) map.removeLayer(marker);
            if (circle) map.removeLayer(circle);
            marker = L.marker([lat, lng]).addTo(map);
            circle = L.circle([lat, lng], {
                color: '#007AFF',
                fillColor: '#007AFF',
                fillOpacity: 0.2,
                radius: radius
            }).addTo(map);
        }

        // Clique no mapa → notifica o RN com lat/lng
        map.on('click', function(e) {
            setLocation(e.latlng.lat, e.latlng.lng);
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'mapClick',
                lat: e.latlng.lat,
                lng: e.latlng.lng
            }));
        });

        // Recebe comandos do RN (setLocation)
        function handleMessage(event) {
            try {
                var data = JSON.parse(event.data);
                if (data.type === 'setLocation') {
                    setLocation(data.lat, data.lng);
                }
                // Sinaliza que o mapa está pronto
                if (data.type === 'ping') {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
                }
            } catch(e) {}
        }

        document.addEventListener('message', handleMessage);
        window.addEventListener('message', handleMessage);
    </script>
</body>
</html>
`;

export function MapPickerModal({ isVisible, onClose, onSelect, initialLocation }: Props) {
    const { colors } = useTheme();

    const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
        initialLocation || null,
    );
    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [geocoding, setGeocoding] = useState(false); // geocode reverso após clique no mapa
    const [mapReady, setMapReady] = useState(false);

    const webViewRef = useRef<WebView>(null);
    // Guarda a localização inicial que deve ser aplicada assim que o mapa ficar pronto
    const pendingLocationRef = useRef<{ lat: number; lng: number } | null>(null);

    // ─── Injeta uma localização no mapa ──────────────────────────────────────
    const injectLocation = useCallback((lat: number, lng: number) => {
        webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify({ type: 'setLocation', lat: ${lat}, lng: ${lng} })
            }));
            true;
        `);
    }, []);

    // ─── Quando o mapa sinaliza que está pronto, aplica localização pendente ──
    const handleMapReady = useCallback(() => {
        setMapReady(true);
        if (pendingLocationRef.current) {
            const { lat, lng } = pendingLocationRef.current;
            pendingLocationRef.current = null;
            injectLocation(lat, lng);
        }
    }, [injectLocation]);

    // ─── Abre o modal: pede permissão e centraliza na posição atual ───────────
    useEffect(() => {
        if (!isVisible) {
            // Reseta estado ao fechar
            setMapReady(false);
            setSearchText('');
            return;
        }

        if (initialLocation) {
            setSelectedLocation(initialLocation);
            // Aplica no mapa quando estiver pronto
            if (mapReady) {
                injectLocation(initialLocation.latitude, initialLocation.longitude);
            } else {
                pendingLocationRef.current = {
                    lat: initialLocation.latitude,
                    lng: initialLocation.longitude,
                };
            }
            return;
        }

        // Sem initialLocation: tenta centralizar na posição atual (silencioso se negar)
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return;

            const loc = await Location.getCurrentPositionAsync({});
            const { latitude: lat, longitude: lng } = loc.coords;

            if (mapReady) {
                injectLocation(lat, lng);
            } else {
                pendingLocationRef.current = { lat, lng };
            }
        })();
    }, [isVisible, initialLocation]);

    // Quando o mapa fica pronto DEPOIS do useEffect já ter rodado
    useEffect(() => {
        if (!mapReady || !pendingLocationRef.current) return;
        const { lat, lng } = pendingLocationRef.current;
        pendingLocationRef.current = null;
        injectLocation(lat, lng);
    }, [mapReady]);

    // ─── Mensagens vindas do WebView ─────────────────────────────────────────
    const handleMapMessage = async (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data.type === 'ready') {
                handleMapReady();
                return;
            }

            if (data.type === 'mapClick' && data.lat && data.lng) {
                setGeocoding(true);
                const coords = { latitude: data.lat, longitude: data.lng };
                setSelectedLocation({ ...coords, address: 'Buscando endereço...' });
                setSearchText('');

                try {
                    const geocode = await Location.reverseGeocodeAsync(coords);
                    if (geocode.length > 0) {
                        const place = geocode[0];
                        const raw = `${place.street || place.name || ''}, ${place.streetNumber || ''} - ${place.subregion || place.city || ''}`;
                        const address = raw.replace(/^,\s*|\s*-\s*$/g, '');
                        setSelectedLocation({ ...coords, address });
                        setSearchText(address);
                    } else {
                        setSelectedLocation({ ...coords, address: 'Endereço desconhecido' });
                    }
                } catch {
                    setSelectedLocation({ ...coords, address: 'Endereço desconhecido' });
                } finally {
                    setGeocoding(false);
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Sinaliza pro mapa que o WebView terminou de carregar (mapa pode ainda não estar pronto)
    const handleLoadEnd = () => {
        webViewRef.current?.injectJavaScript(`
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
            true;
        `);
    };

    // ─── Busca de endereço por texto ─────────────────────────────────────────
    const handleSearchAddress = async () => {
        if (!searchText.trim()) return;
        setSearching(true);

        try {
            const results = await Location.geocodeAsync(searchText.trim());
            if (results.length === 0) {
                // Nenhum resultado — mantém o mapa como está
                setSearching(false);
                return;
            }

            const { latitude: lat, longitude: lng } = results[0];
            injectLocation(lat, lng);

            // Geocode reverso para obter endereço formatado
            const coords = { latitude: lat, longitude: lng };
            const geocode = await Location.reverseGeocodeAsync(coords);
            let address = searchText.trim();
            if (geocode.length > 0) {
                const place = geocode[0];
                const raw = `${place.street || place.name || ''}, ${place.streetNumber || ''} - ${place.subregion || place.city || ''}`;
                address = raw.replace(/^,\s*|\s*-\s*$/g, '') || address;
            }

            setSelectedLocation({ ...coords, address });
            setSearchText(address);
        } catch {
            // Falha silenciosa — usuário pode tentar de novo
        } finally {
            setSearching(false);
        }
    };

    const handleConfirm = () => {
        if (selectedLocation) onSelect(selectedLocation);
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>

                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <Ionicons name="close" size={26} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Selecionar Local</Text>
                    <TouchableOpacity onPress={handleConfirm} disabled={!selectedLocation} style={styles.iconBtn}>
                        <Ionicons
                            name="checkmark"
                            size={26}
                            color={selectedLocation ? colors.primary : colors.textMuted}
                        />
                    </TouchableOpacity>
                </View>

                {/* Barra de busca */}
                <View style={[styles.searchBar, { backgroundColor: colors.background, borderBottomColor: colors.divider }]}>
                    <View style={[styles.searchInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
                        <Ionicons name="search" size={18} color={colors.inputIcon} style={{ marginRight: 8 }} />
                        <TextInput
                            style={[styles.searchInput, { color: colors.inputText }]}
                            placeholder="Buscar endereço..."
                            placeholderTextColor={colors.inputPlaceholder}
                            value={searchText}
                            onChangeText={setSearchText}
                            returnKeyType="search"
                            onSubmitEditing={handleSearchAddress}
                            autoCorrect={false}
                        />
                        {searching
                            ? <ActivityIndicator size="small" color={colors.primary} />
                            : searchText.length > 0 && (
                                <TouchableOpacity onPress={handleSearchAddress}>
                                    <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
                                </TouchableOpacity>
                            )
                        }
                    </View>
                </View>

                {/* Mapa */}
                <WebView
                    ref={webViewRef}
                    style={styles.map}
                    source={{ html: mapHtml }}
                    onMessage={handleMapMessage}
                    onLoadEnd={handleLoadEnd}
                    scrollEnabled={false}
                    bounces={false}
                />

                {/* Footer */}
                <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.divider }]}>
                    {selectedLocation ? (
                        <>
                            <Ionicons name="location" size={24} color={colors.primary} />
                            <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={2}>
                                {selectedLocation.address}
                            </Text>
                            {geocoding && <ActivityIndicator size="small" color={colors.primary} />}
                        </>
                    ) : (
                        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
                            Busque um endereço ou toque no mapa.
                        </Text>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    iconBtn: { padding: 4 },
    title: { fontSize: 18, fontWeight: '600' },
    searchBar: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        padding: 0, // remove padding nativo do Android
    },
    map: { flex: 1, width: Dimensions.get('window').width },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        paddingBottom: 40,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 10,
    },
    addressText: { flex: 1, fontSize: 15, fontWeight: '500' },
    placeholderText: { flex: 1, fontSize: 15, textAlign: 'center' },
});