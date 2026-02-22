import React, { useEffect, useState, useRef } from 'react';
import { api, socket } from './services/api';
import MapView from './components/MapView';
import AlertPanel from './components/AlertPanel';
import EventList from './components/EventList';
import ResolvedPanel from './components/ResolvedPanel';
import RecommendedActions from './components/RecommendedActions';
import RoleSwitcher from './components/RoleSwitcher';
import TimelineSlider from './components/TimelineSlider';

function App() {
  const [events, setEvents] = useState([]);
  const [signals, setSignals] = useState([]);
  const [connected, setConnected] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  // Map of eventId → centroid trail array  [{latitude, longitude, recorded_at}]
  const [centroidTrails, setCentroidTrails] = useState({});
  // Map of eventId → advisory array
  const [advisories, setAdvisories] = useState({});

  // Enterprise State
  const [activeRole, setActiveRole] = useState('commander');
  const [timeFilter, setTimeFilter] = useState(Date.now());
  const [heatmapToggle, setHeatmapToggle] = useState(false);
  const [mapCenter, setMapCenter] = useState([17.3850, 78.4867]);
  const [now, setNow] = useState(Date.now());
  const [selectedEventId, setSelectedEventId] = useState(null);
  const selectedEventIdRef = useRef(null);

  // Sync ref with state
  useEffect(() => {
    selectedEventIdRef.current = selectedEventId;
  }, [selectedEventId]);

  // Update "now" every second for smoother real-time updates
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update timeFilter max when "now" changes if it was already at max (within 2s slack)
  useEffect(() => {
    if (timeFilter > now - 5000) {
      setTimeFilter(now);
    }
  }, [now]);

  const audioRef = useRef(new Audio('/alert.mp3'));

  // Helper: fetch & store centroid trail for a single high-severity event
  const fetchTrail = async (eventId) => {
    const trail = await api.getEventCentroids(eventId);
    if (trail.length > 0) {
      setCentroidTrails(prev => ({ ...prev, [eventId]: trail }));
    }
  };

  const fetchAdvisories = async (eventId) => {
    const data = await api.getEventAdvisories(eventId);
    if (data.length > 0) {
      setAdvisories(prev => ({ ...prev, [eventId]: data }));
    }
  };

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      const eventData = await api.getEvents();
      const signalData = await api.getSignals();
      setEvents(eventData);
      setSignals(signalData);

      // Pre-load centroid history for all high-severity active events
      const highSev = eventData.filter(e => e.severity >= 7 && e.status !== 'resolved');
      await Promise.all(highSev.map(async (e) => {
        await fetchTrail(e.id);
        await fetchAdvisories(e.id);
      }));
    };
    fetchData();

    // ── Socket Listeners ───────────────────────────────────────────────────
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('systemStatus', (status) => {
      setOfflineMode(status.offlineMode);
    });

    socket.on('newAlert', (newEvent) => {
      setEvents(prev => {
        if (prev.some(e => e.id === newEvent.id)) return prev;
        return [...prev, newEvent];
      });
      api.getSignals().then(setSignals);
      // Seed an empty trail slot; first centroidUpdate will populate it
      setCentroidTrails(prev => ({ ...prev, [newEvent.id]: [] }));
    });

    socket.on('eventUpdate', (updatedEvent) => {
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? { ...e, ...updatedEvent } : e));
      if (updatedEvent.id === selectedEventIdRef.current) {
        setMapCenter([updatedEvent.latitude, updatedEvent.longitude]);
      }
    });

    // Real-time centroid trail update from processor
    socket.on('centroidUpdate', ({ eventId, trail }) => {
      setCentroidTrails(prev => ({ ...prev, [eventId]: trail }));
    });

    socket.on('newAdvisory', (advisory) => {
      setAdvisories(prev => {
        const eventId = advisory.event_id;
        const current = prev[eventId] || [];
        // Avoid duplicates if any
        if (current.some(a => a.id === advisory.id)) return prev;
        return { ...prev, [eventId]: [...current, advisory] };
      });
      // Optionally play sound for advisory
      audioRef.current.play().catch(() => { });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('newAlert');
      socket.off('eventUpdate');
      socket.off('systemStatus');
      socket.off('centroidUpdate');
      socket.off('newAdvisory');
    };
  }, []);

  const handleResolveEvent = async (id) => {
    try {
      await api.resolveEvent(id);
      setEvents(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e));
    } catch (error) {
      console.error("Failed to resolve event:", error);
    }
  };

  const handleForceActive = async (id) => {
    try {
      const updatedEvent = await api.bypassEvent(id);
      setEvents(prev => prev.map(e => e.id === id ? updatedEvent : e));
    } catch (error) {
      console.error("Failed to bypass event:", error);
    }
  };

  const handleSelectEvent = (id) => {
    setSelectedEventId(id === selectedEventId ? null : id);
    if (id && id !== selectedEventId) {
      const event = events.find(e => e.id === id);
      if (event) {
        setMapCenter([event.latitude, event.longitude]);
      }
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Always sort events by recency so they appear at the top
  const sortedEvents = [...events].sort((a, b) => b.created_at - a.created_at);

  const filteredEvents = sortedEvents.filter(e => e.created_at <= timeFilter);
  const filteredSignals = signals.filter(s => s.timestamp <= timeFilter);

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col overflow-hidden font-sans selection:bg-blue-500/30">

      {/* Offline Banner */}
      {offlineMode && (
        <div className="bg-yellow-600/90 text-yellow-50 text-center py-1 px-4 text-xs font-bold tracking-widest uppercase animate-pulse border-b border-yellow-400 z-[2000]">
          ⚠️ Operating in Degraded Connectivity Mode (Mesh Network Only)
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 p-4 flex justify-between items-center shadow-lg z-[1000] relative">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg border border-blue-400/30">
            S
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-white leading-none">
              SIGNALNET
            </h1>
            <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">
              Intelligent Disaster Command
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <TimelineSlider
            value={timeFilter}
            onChange={setTimeFilter}
            min={now - (6 * 60 * 60 * 1000)} // 6 hours ago
            max={now}
          />

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setHeatmapToggle(!heatmapToggle)}
              className={`p-2 rounded border transition-all ${heatmapToggle ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
              title="Toggle Severity Heatmap"
            >
              🔥
            </button>
            <RoleSwitcher activeRole={activeRole} onRoleChange={setActiveRole} />
          </div>

          <div className={`flex items-center space-x-2 px-3 py-1.5 rounded bg-slate-800 border ${connected ? 'border-green-500/30' : 'border-red-500/30'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></span>
            <span className="text-xs font-bold text-slate-300">{connected ? 'SYSTEM ONLINE' : 'DISCONNECTED'}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-900/95 z-[900] shadow-2xl">
          <div className="p-4 overflow-y-auto custom-scrollbar">
            <AlertPanel
              events={filteredEvents}
              onResolve={handleResolveEvent}
              onForceActive={handleForceActive}
              onSelect={handleSelectEvent}
              selectedId={selectedEventId}
              advisories={advisories}
              activeRole={activeRole}
            />
            <RecommendedActions selectedEvent={selectedEvent} />
            <div className="mt-6">
              <EventList
                events={filteredEvents}
                onResolve={handleResolveEvent}
                onForceActive={handleForceActive}
                onSelect={handleSelectEvent}
                selectedId={selectedEventId}
                activeRole={activeRole}
              />
            </div>
            <ResolvedPanel
              events={filteredEvents}
              onSelect={handleSelectEvent}
              selectedId={selectedEventId}
            />
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-slate-950">
          <MapView
            events={filteredEvents}
            signals={filteredSignals}
            centroidTrails={centroidTrails}
            center={mapCenter}
            showHeatmap={heatmapToggle}
            activeRole={activeRole}
            onSelect={handleSelectEvent}
            selectedId={selectedEventId}
          />
          {/* Decorative grid overlay */}
          <div
            className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-10"
            style={{
              backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,0.1) 1px,transparent 1px)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
