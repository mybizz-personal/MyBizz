import { useState, useEffect, useCallback } from 'react';
import { Plus, MapPin, Calendar as CalendarIcon, Loader2, Edit2, Trash2, X, Search as SearchIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Event {
  id: string;
  name: string;
  description?: string;
  event_type: string;
  venue: string;
  latitude?: number;
  longitude?: number;
  status: string;
  start_date: string;
  end_date: string;
}

// Component to handle map clicks and moving
function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to dynamically update map center
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Events() {
  const { businessId } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  
  const [formData, setFormData] = useState({ name: '', description: '', event_type: 'Exhibition', venue: '', status: 'Upcoming', start_date: '', end_date: '' });
  const [isSaving, setIsSaving] = useState(false);

  // Map State
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]); // Default to India
  const [pinPosition, setPinPosition] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!businessId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('business_id', businessId)
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingMap(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setPinPosition([lat, lon]);
        setFormData({ ...formData, venue: data[0].display_name });
      } else {
        toast.error('Location not found. Try a different search term.');
      }
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearchingMap(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setPinPosition([lat, lng]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.display_name) {
        setFormData(prev => ({ ...prev, venue: data.display_name }));
        setSearchQuery(data.display_name);
      }
    } catch (err) {
      console.error('Reverse geocode failed', err);
    }
  };

  const handleOpenForm = async (e: React.MouseEvent, event?: Event) => {
    e.stopPropagation();
    if (event) {
      setSelectedEvent(event);
      // datetime-local input expects YYYY-MM-DDTHH:mm format
      const formatDateForInput = (isoString: string) => {
        const date = new Date(isoString);
        const offset = date.getTimezoneOffset();
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
      };

      setFormData({ 
        name: event.name, 
        description: event.description || '',
        event_type: event.event_type, 
        venue: event.venue, 
        status: event.status, 
        start_date: formatDateForInput(event.start_date), 
        end_date: formatDateForInput(event.end_date)
      });
      setSearchQuery(event.venue);
      
      // Use exact saved coordinates if available, otherwise fallback to search
      if (event.latitude && event.longitude) {
        setMapCenter([event.latitude, event.longitude]);
        setPinPosition([event.latitude, event.longitude]);
      } else if (event.venue) {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.venue)}&format=json&limit=1`);
          const data = await res.json();
          if (data && data.length > 0) {
            setMapCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            setPinPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        } catch (err) {
          // ignore
        }
      }

    } else {
      setSelectedEvent(null);
      setFormData({ name: '', description: '', event_type: 'Exhibition', venue: '', status: 'Upcoming', start_date: '', end_date: '' });
      setSearchQuery('');
      setPinPosition(null);
      setMapCenter([20.5937, 78.9629]); // Reset to India
    }
    setIsFormModalOpen(true);
  };

  const handleOpenView = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return;
    setIsSaving(true);
    try {
      // Ensure we have complete ISO strings
      const payload = {
        ...formData,
        latitude: pinPosition ? pinPosition[0] : null,
        longitude: pinPosition ? pinPosition[1] : null,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString()
      };

      if (selectedEvent) {
        const { error } = await supabase.from('events').update(payload).eq('id', selectedEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert([{ ...payload, business_id: businessId }]);
        if (error) throw error;
      }
      setIsFormModalOpen(false);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to save event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Delete event ${name}?`)) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };



  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events & Exhibitions</h1>
          <p className="text-gray-500 text-sm">Track upcoming pop-ups and trade shows.</p>
        </div>
        <button onClick={(e) => handleOpenForm(e)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium shadow-sm hover:bg-primary/90 transition-colors">
          <Plus className="w-5 h-5" />
          Create Event
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No events scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div 
              key={event.id} 
              onClick={() => handleOpenView(event)}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative group"
            >
              <div className="absolute top-4 right-4 hidden group-hover:flex gap-2">
                <button onClick={(e) => handleOpenForm(e, event)} className="p-1.5 bg-white shadow-sm border border-gray-200 rounded text-gray-500 hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                <button onClick={(e) => handleDelete(e, event.id, event.name)} className="p-1.5 bg-white shadow-sm border border-gray-200 rounded text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="flex justify-between items-start mb-4 pr-16">
                <h3 className="font-bold text-lg text-gray-900 truncate">{event.name}</h3>
              </div>
              <div className="mb-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  event.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 
                  event.status === 'Ongoing' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {event.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="truncate">{event.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
                  {formatDateTime(event.start_date)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{selectedEvent ? 'Edit Event' : 'Create Event'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Description</label>
                <textarea 
                  required 
                  rows={3}
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Enter details about the event..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary resize-none" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Event Location</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Search location (e.g., Mumbai)" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchLocation(); } }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" 
                  />
                  <button type="button" onClick={handleSearchLocation} disabled={isSearchingMap} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-medium flex items-center gap-2">
                    {isSearchingMap ? <Loader2 className="w-4 h-4 animate-spin" /> : <SearchIcon className="w-4 h-4" />}
                    Search
                  </button>
                </div>
                
                <div className="h-[250px] w-full rounded-md border border-gray-300 overflow-hidden relative z-0">
                  <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <MapUpdater center={mapCenter} />
                    <MapEvents onLocationSelect={handleMapClick} />
                    {pinPosition && <Marker position={pinPosition} />}
                  </MapContainer>
                </div>
                
                <input required type="text" placeholder="Selected Address" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50" readOnly />
                <p className="text-xs text-gray-500">Search for a location or click on the map to drop a pin.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input required type="datetime-local" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input required type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option>Upcoming</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 font-medium">Cancel</button>
                <button type="submit" disabled={isSaving} className="flex-1 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 flex justify-center font-medium">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View/Map Modal */}
      {isViewModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h2>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedEvent.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedEvent.status}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><CalendarIcon className="w-4 h-4" /> {formatDateTime(selectedEvent.start_date)} to {formatDateTime(selectedEvent.end_date)}</span>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {selectedEvent.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Event Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap break-words">{selectedEvent.description}</p>
                </div>
              )}

              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-500" /> Event Venue
              </h3>
              <p className="text-gray-700 mb-4">{selectedEvent.venue}</p>
              
              <div className="w-full h-[300px] bg-gray-100 rounded-xl overflow-hidden border border-gray-200 relative z-0">
                {selectedEvent.latitude && selectedEvent.longitude ? (
                  <MapContainer center={[selectedEvent.latitude, selectedEvent.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                    <Marker position={[selectedEvent.latitude, selectedEvent.longitude]} />
                  </MapContainer>
                ) : (
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEvent.venue)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
