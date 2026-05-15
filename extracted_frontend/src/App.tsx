import React, { useState } from 'react';
import Sidebar, { View } from './components/Sidebar';
import TopNav from './components/TopNav';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ResumeBuilder from './components/ResumeBuilder';
import KanbanBoard from './components/KanbanBoard';
import DiscoveryChat from './components/DiscoveryChat';
import OnboardingModal from './components/OnboardingModal';

export default function App() {
  const [view, setView] = useState<View>('landing');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const renderView = () => {
    switch (view) {
      case 'landing':
        return <LandingPage />;
      case 'dashboard':
        return <Dashboard />;
      case 'resume':
        return <ResumeBuilder />;
      case 'board':
        return <KanbanBoard />;
      case 'chat':
        return <DiscoveryChat />;
      default:
        return <LandingPage />;
    }
  };

  const handleSetView = (newView: View) => {
    setView(newView);
    if (newView === 'dashboard' && view === 'landing') {
      setShowOnboarding(true);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background">
      <TopNav currentView={view} setView={handleSetView} />
      
      <div className="flex pt-16 min-h-[calc(100vh-64px)] overflow-hidden">
        {view !== 'landing' && (
          <Sidebar currentView={view} setView={handleSetView} />
        )}
        
        <main className={view !== 'landing' ? "flex-1 md:ml-[240px] overflow-y-auto custom-scrollbar" : "w-full"}>
          {renderView()}
        </main>
      </div>

      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {/* Decorations */}
      <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-tertiary/10 rounded-full blur-[120px] pointer-events-none z-0" />
    </div>
  );
}
