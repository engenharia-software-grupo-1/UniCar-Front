import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/driving';

export default function MapaTrajeto({ origem, destino }) {
  const origemCoordenadas = coordenadasValidas(origem);
  const destinoCoordenadas = coordenadasValidas(destino);
  const [rota, setRota] = useState([]);

  useEffect(() => {
    if (!origemCoordenadas || !destinoCoordenadas) {
      setRota([]);
      return undefined;
    }

    const controller = new AbortController();
    const url = `${OSRM_BASE_URL}/${origemCoordenadas.longitude},${origemCoordenadas.latitude};${destinoCoordenadas.longitude},${destinoCoordenadas.latitude}?overview=full&geometries=geojson`;

    fetch(url, { signal: controller.signal })
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        const pontos = dados?.routes?.[0]?.geometry?.coordinates;
        setRota(
          Array.isArray(pontos)
            ? pontos.map(([longitude, latitude]) => [latitude, longitude])
            : [],
        );
      })
      .catch((erro) => {
        if (erro.name !== 'AbortError') setRota([]);
      });

    return () => controller.abort();
  }, [origemCoordenadas?.latitude, origemCoordenadas?.longitude, destinoCoordenadas?.latitude, destinoCoordenadas?.longitude]);

  const pontosDoMapa = useMemo(() => {
    if (!origemCoordenadas || !destinoCoordenadas) return [];
    return rota.length > 1
      ? rota
      : [
          [origemCoordenadas.latitude, origemCoordenadas.longitude],
          [destinoCoordenadas.latitude, destinoCoordenadas.longitude],
        ];
  }, [origemCoordenadas, destinoCoordenadas, rota]);

  if (!origemCoordenadas || !destinoCoordenadas) {
    return <div className="mapa-trajeto-indisponivel">Coordenadas do trajeto não informadas.</div>;
  }

  const inicio = [origemCoordenadas.latitude, origemCoordenadas.longitude];
  const fim = [destinoCoordenadas.latitude, destinoCoordenadas.longitude];

  return (
    <MapContainer className="mapa-trajeto" center={inicio} zoom={13} scrollWheelZoom={false} aria-label="Mapa do trajeto">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AjustarMapa pontos={pontosDoMapa} />
      <Polyline positions={pontosDoMapa} pathOptions={{ color: '#3456d1', weight: 5, opacity: 0.85 }} />
      <CircleMarker center={inicio} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#3456d1', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]}>{origem?.descricao || 'Origem'}</Tooltip>
      </CircleMarker>
      <CircleMarker center={fim} radius={8} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#047857', fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]}>{destino?.descricao || 'Destino'}</Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}

function AjustarMapa({ pontos }) {
  const mapa = useMap();

  useEffect(() => {
    if (pontos.length > 1) mapa.fitBounds(pontos, { padding: [28, 28], maxZoom: 15 });
  }, [mapa, pontos]);

  return null;
}

function coordenadasValidas(local) {
  const latitude = Number(local?.latitude);
  const longitude = Number(local?.longitude);

  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}
