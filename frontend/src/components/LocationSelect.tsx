import React from 'react';
import AsyncSelect from 'react-select/async';
import { API_BASE_URL } from '@/api';

export interface LocationOption {
  label: string;
  value: {
    lat: number;
    lon: number;
    name: string;
  };
}

interface LocationSelectProps {
  onChange: (value: LocationOption | null) => void;
  placeholder?: string;
  value?: LocationOption | null;
}

const LocationSelect: React.FC<LocationSelectProps> = ({ onChange, placeholder = "Search for a village, shop, or location...", value }) => {

  const loadOptions = async (inputValue: string): Promise<LocationOption[]> => {
    if (!inputValue || inputValue.length < 3) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/location/search?q=${encodeURIComponent(inputValue)}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data.map((item: any) => ({
          label: `${item.name}${item.city ? `, ${item.city}` : ''}${item.state ? `, ${item.state}` : ''}`,
          value: {
            lat: item.lat,
            lon: item.lon,
            name: item.name
          }
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching locations:", error);
      return [];
    }
  };

  return (
    <div className="text-black">
      <AsyncSelect
        cacheOptions
        defaultOptions
        value={value}
        loadOptions={loadOptions}
        onChange={onChange as any} // react-select type compatibility
        placeholder={placeholder}
        classNamePrefix="react-select"
        styles={{
          control: (base) => ({
            ...base,
            border: '1px solid #e2e8f0',
            boxShadow: 'none',
            borderRadius: '0.75rem',
            padding: '4px',
            backgroundColor: '#f8fafc',
            '&:hover': {
              borderColor: '#cbd5e1'
            }
          }),
          menu: (base) => ({
            ...base,
            borderRadius: '0.75rem',
            overflow: 'hidden',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? '#f1f5f9' : 'white',
            color: '#1e293b',
            padding: '12px 16px',
            cursor: 'pointer',
          })
        }}
      />
    </div>
  );
};

export default LocationSelect;
