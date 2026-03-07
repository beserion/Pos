import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

export default function SetMapCenter({ coords }: { coords: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.flyTo(coords, 16, { animate: true, duration: 1.5 });
        }
    }, [coords, map]);
    return null;
}
