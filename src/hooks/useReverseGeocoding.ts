import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export const useReverseGeocoding = (lat, lng) => {
  return useQuery({
    // Cache key based on coordinates
    queryKey: ['address', lat, lng],
    queryFn: async () => {
      if (!lat || !lng) return null;

      const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
        params: {
          format: 'jsonv2',
          lat: lat,
          lon: lng,
        },
        headers: {
        //   'User-Agent': 'RAI-Reports/1.0 (contact: lungsod app)', 
        },
      });

      return response.data;
    },
    // Only run the query if we have both coordinates
    enabled: !!lat && !!lng,
    // Address data doesn't change often, so we can keep it for a long time
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};