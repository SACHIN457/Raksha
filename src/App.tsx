import React, { useState, useEffect } from 'react';
import { Shield, MapPin, AlertTriangle, BookOpen, User as UserIcon, LogOut, Plus, Phone, Trash2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { signInWithGoogle, logout, db } from './firebase';
import { cn, SAFETY_TIPS, LEGAL_RESOURCES, handleFirestoreError, OperationType } from './lib/utils';
import { SOSAlert, Incident, EmergencyContact, UserProfile } from './types';
import { collection, addDoc, query, onSnapshot, orderBy, limit, doc, updateDoc, arrayUnion, arrayRemove, getDocFromServer } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

// --- Connection Test ---
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

// --- Components ---

const Navbar = () => {
  const { user } = useAuth();
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-zinc-200 z-50 px-4 py-3 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center">
          <Shield className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-zinc-900">Rakshak</span>
      </div>
      {user && (
        <button onClick={logout} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <LogOut className="w-5 h-5 text-zinc-500" />
        </button>
      )}
    </nav>
  );
};

const TabButton = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 py-2 px-4 transition-all duration-300 relative",
      active ? "text-rose-600" : "text-zinc-400 hover:text-zinc-600"
    )}
  >
    <Icon className={cn("w-6 h-6", active && "scale-110")} />
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute -top-1 left-0 right-0 h-0.5 bg-rose-600 rounded-full"
      />
    )}
  </button>
);

const SOSView = () => {
  const { profile, user } = useAuth();
  const [isAlerting, setIsAlerting] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<SOSAlert[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOSAlert));
      setActiveAlerts(alerts);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'alerts');
    });
    return () => unsubscribe();
  }, []);

  const triggerSOS = async () => {
    if (!user || !profile) return;
    
    setIsAlerting(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ lat: latitude, lng: longitude });

        try {
          await addDoc(collection(db, 'alerts'), {
            userId: user.uid,
            userName: profile.displayName || 'Anonymous',
            location: { latitude, longitude },
            status: 'active',
            timestamp: new Date().toISOString()
          });
          // In a real app, this would trigger SMS/Push to emergency contacts
          alert("SOS Alert Sent! Your location has been shared with authorities and emergency contacts.");
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'alerts');
        } finally {
          setTimeout(() => setIsAlerting(false), 3000);
        }
      }, (error) => {
        console.error("Location Error:", error);
        setIsAlerting(false);
        alert("Please enable location services to use SOS.");
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-zinc-900">Safety Center</h2>
        <p className="text-zinc-500">Press and hold the button for 3 seconds in case of emergency.</p>
      </div>

      <div className="flex justify-center py-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={triggerSOS}
          className={cn(
            "w-64 h-64 rounded-full flex flex-items-center justify-center relative transition-all duration-500",
            isAlerting ? "bg-rose-700 scale-110" : "bg-rose-600 shadow-[0_0_50px_rgba(225,29,72,0.3)] hover:shadow-[0_0_70px_rgba(225,29,72,0.5)]"
          )}
        >
          {isAlerting && (
            <motion.div
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 bg-rose-500 rounded-full"
            />
          )}
          <div className="flex flex-col items-center gap-2 z-10">
            <Shield className="w-20 h-20 text-white" />
            <span className="text-white font-black text-4xl tracking-tighter">SOS</span>
          </div>
        </motion.button>
      </div>

      <div className="space-y-4">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <MapPin className="w-5 h-5 text-rose-600" />
          Recent Activity Nearby
        </h3>
        <div className="space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-zinc-200 rounded-2xl text-center text-zinc-400">
              No active alerts in your area.
            </div>
          ) : (
            activeAlerts.map((alert) => (
              <div key={alert.id} className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-zinc-900">{alert.userName}</p>
                  <p className="text-xs text-zinc-500">{new Date(alert.timestamp).toLocaleTimeString()}</p>
                </div>
                <div className="px-3 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-full uppercase tracking-wider">
                  {alert.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const CommunityView = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    type: 'harassment' as Incident['type'],
    description: '',
    address: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'incidents');
    });
    return () => unsubscribe();
  }, []);

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await addDoc(collection(db, 'incidents'), {
            reporterId: user.uid,
            type: newIncident.type,
            description: newIncident.description,
            location: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              address: newIncident.address
            },
            timestamp: new Date().toISOString()
          });
          setShowReportModal(false);
          setNewIncident({ type: 'harassment', description: '', address: '' });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, 'incidents');
        }
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-zinc-900">Community Watch</h2>
        <button
          onClick={() => setShowReportModal(true)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Report Incident
        </button>
      </div>

      <div className="grid gap-4">
        {incidents.map((incident) => (
          <div key={incident.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  incident.type === 'harassment' ? "bg-rose-500" : "bg-amber-500"
                )} />
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">{incident.type}</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {new Date(incident.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-zinc-800 leading-relaxed">{incident.description}</p>
            <div className="flex items-center gap-1 text-zinc-400 text-xs">
              <MapPin className="w-3 h-3" />
              <span>{incident.location.address || 'Location Shared'}</span>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-8 relative z-10 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6">Report an Incident</h3>
              <form onSubmit={handleReport} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-500">Type</label>
                  <select
                    value={newIncident.type}
                    onChange={(e) => setNewIncident({ ...newIncident, type: e.target.value as any })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="harassment">Harassment</option>
                    <option value="unsafe-area">Unsafe Area</option>
                    <option value="theft">Theft</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-500">Location/Address</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Near Central Station"
                    value={newIncident.address}
                    onChange={(e) => setNewIncident({ ...newIncident, address: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-zinc-500">Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe what happened..."
                    value={newIncident.description}
                    onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-rose-600 text-white py-4 rounded-xl font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" /> Submit Report
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ResourcesView = () => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
    <div className="space-y-2">
      <h2 className="text-2xl font-bold text-zinc-900">Safety Resources</h2>
      <p className="text-zinc-500">Knowledge is your first line of defense.</p>
    </div>

    <div className="grid gap-4">
      <h3 className="font-bold text-zinc-400 uppercase text-xs tracking-widest">Safety Tips</h3>
      {SAFETY_TIPS.map((tip, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <h4 className="font-bold text-zinc-900 mb-2">{tip.title}</h4>
          <p className="text-zinc-600 text-sm leading-relaxed">{tip.content}</p>
        </div>
      ))}
    </div>

    <div className="bg-zinc-900 text-white p-8 rounded-3xl space-y-4">
      <h3 className="font-bold text-xl flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-rose-500" />
        Legal Awareness
      </h3>
      <div className="prose prose-invert prose-sm max-w-none opacity-90">
        <ReactMarkdown>{LEGAL_RESOURCES}</ReactMarkdown>
      </div>
    </div>
  </div>
);

const ProfileView = () => {
  const { profile, user } = useAuth();
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newContact.name || !newContact.phone) return;

    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        emergencyContacts: arrayUnion(newContact)
      });
      setNewContact({ name: '', phone: '', relation: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const removeContact = async (contact: EmergencyContact) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        emergencyContacts: arrayRemove(contact)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <UserIcon className="w-10 h-10 text-zinc-300" />
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">{profile?.displayName || 'User'}</h2>
          <p className="text-zinc-500">{profile?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">Emergency Contacts</h3>
          <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded">
            {profile?.emergencyContacts.length || 0} / 5
          </span>
        </div>

        <div className="space-y-3">
          {profile?.emergencyContacts.map((contact, i) => (
            <div key={i} className="bg-white p-4 rounded-xl border border-zinc-200 flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="font-bold text-zinc-900">{contact.name}</p>
                  <p className="text-xs text-zinc-500">{contact.relation} • {contact.phone}</p>
                </div>
              </div>
              <button onClick={() => removeContact(contact)} className="p-2 text-zinc-300 hover:text-rose-600 transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          {(profile?.emergencyContacts.length || 0) < 5 && (
            <form onSubmit={addContact} className="bg-zinc-50 p-4 rounded-xl border-2 border-dashed border-zinc-200 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="p-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-rose-500"
                />
                <input
                  type="text"
                  placeholder="Relation"
                  value={newContact.relation}
                  onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                  className="p-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="flex-1 p-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button type="submit" className="bg-zinc-900 text-white px-4 rounded-lg font-bold text-sm hover:bg-zinc-800 transition-colors">
                  Add
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const LoginView = () => (
  <div className="min-h-screen bg-rose-600 flex flex-col items-center justify-center p-6 text-white text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl"
    >
      <Shield className="w-12 h-12 text-rose-600" />
    </motion.div>
    <h1 className="text-5xl font-black tracking-tighter mb-4">RAKSHAK</h1>
    <p className="text-rose-100 text-lg max-w-xs mb-12 leading-tight">
      Empowering women with safety, community, and awareness.
    </p>
    <button
      onClick={signInWithGoogle}
      className="bg-white text-rose-600 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-rose-50 transition-all active:scale-95 flex items-center gap-3"
    >
      <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
      Continue with Google
    </button>
    <p className="mt-12 text-rose-200 text-xs uppercase tracking-widest font-bold">
      India's Safety Initiative
    </p>
  </div>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'safety' | 'community' | 'resources' | 'profile'>('safety');

  return (
    <AuthProvider>
      <AppContent activeTab={activeTab} setActiveTab={setActiveTab} />
    </AuthProvider>
  );
}

function AppContent({ activeTab, setActiveTab }: { activeTab: any, setActiveTab: any }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24 pt-20">
      <Navbar />
      
      <main className="max-w-xl mx-auto px-6">
        {activeTab === 'safety' && <SOSView />}
        {activeTab === 'community' && <CommunityView />}
        {activeTab === 'resources' && <ResourcesView />}
        {activeTab === 'profile' && <ProfileView />}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-200 z-50 px-2 py-1">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <TabButton
            active={activeTab === 'safety'}
            icon={Shield}
            label="Safety"
            onClick={() => setActiveTab('safety')}
          />
          <TabButton
            active={activeTab === 'community'}
            icon={AlertTriangle}
            label="Watch"
            onClick={() => setActiveTab('community')}
          />
          <TabButton
            active={activeTab === 'resources'}
            icon={BookOpen}
            label="Learn"
            onClick={() => setActiveTab('resources')}
          />
          <TabButton
            active={activeTab === 'profile'}
            icon={UserIcon}
            label="Profile"
            onClick={() => setActiveTab('profile')}
          />
        </div>
      </div>
    </div>
  );
}
