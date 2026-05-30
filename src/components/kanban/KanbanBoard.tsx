"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Zap, Users, Trophy, MoreHorizontal, X, ExternalLink, 
  Edit3, Clock, Sparkles, MapPin, Filter, 
  Download, Plus, Settings2, GripVertical, Trash2, Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface JobCardProps {
  id: string;
  title: string;
  company: string;
  location: string;
  time: string;
  next: string;
  status: string;
  logo: string;
  color: string;
  tags?: string[];
  onClick?: () => void;
  isDragging?: boolean;
}

const SortableJobCard = ({ id, ...props }: JobCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <JobCard id={id} isDragging={isDragging} {...props} />
    </div>
  );
};

const JobCard = ({ id, title, company, location, time, next, logo, color, onClick, isDragging }: JobCardProps) => {
  return (
    <motion.div 
      onClick={onClick}
      className={cn(
        "bg-surface border border-outline-variant rounded-2xl sm:rounded-[1.5rem] lg:rounded-[2rem] p-4 sm:p-5 lg:p-6 cursor-pointer hover:bg-surface-container-low transition-all active:scale-[0.98] shadow-lg hover:shadow-2xl group border-transparent hover:border-primary/30 relative overflow-hidden",
        isDragging && "shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-grabbing scale-105 z-50 border-primary/50"
      )}
    >
      <div className="flex items-start justify-between mb-3 sm:mb-5">
        <div 
          className={cn("w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base lg:text-lg shadow-inner", color === '#000000' ? 'border border-outline-variant bg-[#111]' : '')}
          style={{ backgroundColor: color === '#FFFFFF' ? '#FFFFFF' : (color === '#000000' ? '#111' : `${color}10`), color: color === '#FFFFFF' ? '#000' : color, borderColor: `${color}30` }}
        >
          {logo}
        </div>
        <span className="font-mono text-[8px] sm:text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg uppercase tracking-widest">{time}</span>
      </div>
      <h4 className="text-base sm:text-lg lg:text-xl font-bold text-primary group-hover:text-primary transition-colors tracking-tight leading-snug">{title}</h4>
      <p className="text-xs sm:text-sm font-bold text-on-surface-variant mt-1 sm:mt-1.5 truncate">{company} • {location}</p>
      
      <div className="mt-3 sm:mt-4 lg:mt-6 flex items-center gap-1.5 sm:gap-2.5 bg-primary-container/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl border border-primary/20 w-fit">
        <div className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,178,186,0.6)]" />
        <span className="text-[8px] sm:text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Next: {next}</span>
      </div>
    </motion.div>
  );
};

export default function KanbanBoard() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [columnsData, setColumnsData] = useState([
    { id: 'Saved', title: 'Saved', color: 'outline' },
    { id: 'Applied', title: 'Applied', color: 'primary' },
    { id: 'Screening', title: 'Screening', color: 'secondary' },
    { id: 'Interview', title: 'Interview', color: 'tertiary' },
    { id: 'Offer', title: 'Offer', color: 'primary' },
    { id: 'Rejected', title: 'Rejected', color: 'outline' },
  ]);

  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    async function fetchApplications() {
      try {
        const res = await fetch('/api/applications');
        const data = await res.json();
        
        const transformed = data.map((app: any) => ({
          id: app.id,
          title: app.job.role || app.job.title,
          company: app.job.company,
          location: app.job.location || 'Remote',
          time: new Date(app.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase(),
          next: app.status === 'Applied' ? 'FOLLOW-UP' : app.status.toUpperCase(),
          status: app.status,
          logo: app.job.company[0],
          color: app.job.logoColor || '#635BFF',
          tags: app.job.tags || [],
          raw: app 
        }));
        
        setCards(transformed);
      } catch (error) {
        console.error("Failed to fetch applications:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchApplications();
  }, []);

  const filteredCards = useMemo(() => {
    if (!filterQuery) return cards;
    const q = filterQuery.toLowerCase();
    return cards.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.company.toLowerCase().includes(q) ||
      c.tags?.some((t: string) => t.toLowerCase().includes(q))
    );
  }, [cards, filterQuery]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const stats = [
    { label: 'Total Tracked', value: cards.length.toString(), icon: Send, color: 'text-primary' },
    { label: 'Live Interviews', value: cards.filter(c => c.status === 'Interview').length.toString(), icon: Users, color: 'text-tertiary' },
    { label: 'Confirmed Offers', value: cards.filter(c => c.status === 'Offer').length.toString(), icon: Trophy, color: 'text-primary' },
  ];

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) {
      setOverContainerId(null);
      return;
    }

    const activeCardId = active.id;
    const overId = over.id;

    const activeContainer = cards.find(c => c.id === activeCardId)?.status;
    const overContainer = columnsData.find(c => c.id === overId) ? overId : cards.find(c => c.id === overId)?.status;

    setOverContainerId(overContainer as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setCards((prev) => {
      const activeIndex = prev.findIndex(c => c.id === activeCardId);
      const newStatus = overContainer as string;
      
      const newItems = [...prev];
      newItems[activeIndex] = { ...newItems[activeIndex], status: newStatus };
      return newItems;
    });
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (over) {
      const activeCard = cards.find(c => c.id === active.id);
      if (activeCard) {
        try {
          await fetch('/api/applications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: active.id,
              status: activeCard.status
            })
          });
        } catch (error) {
          console.error("Failed to sync status:", error);
        }
      }

      if (active.id !== over.id) {
        setCards((prev) => {
          const activeIndex = prev.findIndex(c => c.id === active.id);
          const overIndex = prev.findIndex(c => c.id === over.id);
          
          if (overIndex !== -1) {
            return arrayMove(prev, activeIndex, overIndex);
          }
          return prev;
        });
      }
    }

    setActiveId(null);
    setOverContainerId(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative animate-pulse">
        {/* Header Skeleton */}
        <header className="h-auto min-h-[72px] sm:h-28 px-4 sm:px-10 py-3 sm:py-0 border-b border-outline-variant flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-12 w-full">
            <div className="space-y-2">
              <div className="h-6 sm:h-8 bg-surface-container-high rounded-lg w-20 sm:w-28" />
              <div className="h-3 sm:h-4 bg-surface-container-high rounded-lg w-24 sm:w-36" />
            </div>
            <div className="h-10 sm:h-12 bg-surface-container-high rounded-xl sm:rounded-2xl w-full sm:w-[280px] lg:w-[420px]" />
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="w-8 sm:w-12 h-8 sm:h-12 bg-surface-container-high rounded-xl sm:rounded-2xl" />
            <div className="w-8 sm:w-12 h-8 sm:h-12 bg-surface-container-high rounded-xl sm:rounded-2xl" />
            <div className="h-8 sm:h-12 bg-surface-container-high rounded-xl sm:rounded-2xl w-24 sm:w-40" />
          </div>
        </header>

        {/* Stats Bar Skeleton */}
        <div className="px-4 sm:px-10 py-4 sm:py-10 flex gap-3 sm:gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 bg-surface-container-high/50 border border-outline-variant rounded-xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex items-center gap-3 sm:gap-6">
              <div className="w-8 sm:w-10 lg:w-14 h-8 sm:h-10 lg:h-14 bg-surface-container-high rounded-xl sm:rounded-2xl shrink-0" />
              <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                <div className="h-2 sm:h-3 bg-surface-container-high rounded-lg w-1/2" />
                <div className="h-4 sm:h-5 lg:h-6 bg-surface-container-high rounded-lg w-1/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Columns Skeleton */}
        <div className="flex-1 px-4 sm:px-10 pb-16 flex gap-4 sm:gap-6 lg:gap-10 overflow-hidden">
          {[1, 2, 3].map((colIndex) => (
            <div key={colIndex} className="w-[240px] sm:w-[300px] lg:w-[380px] flex flex-col gap-4 sm:gap-6 lg:gap-8">
              <div className="flex justify-between items-center px-2 sm:px-3">
                <div className="h-4 sm:h-5 bg-surface-container-high rounded-lg w-16 sm:w-24" />
                <div className="w-4 sm:w-5 h-4 sm:h-5 bg-surface-container-high rounded-full" />
              </div>
              <div className="flex-1 bg-surface-container-high/30 p-2 sm:p-3 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] space-y-3 sm:space-y-4 lg:space-y-6">
                {[1, 2].map((cardIndex) => (
                  <div key={cardIndex} className="bg-surface-container border border-outline-variant rounded-xl sm:rounded-[1.5rem] lg:rounded-[2rem] p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                    <div className="flex justify-between">
                      <div className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 bg-surface-container-high rounded-xl sm:rounded-2xl" />
                      <div className="w-12 sm:w-16 h-4 sm:h-6 bg-surface-container-high rounded-lg" />
                    </div>
                    <div className="h-4 sm:h-5 lg:h-6 bg-surface-container-high rounded-lg w-3/4" />
                    <div className="h-3 sm:h-4 bg-surface-container-high rounded-lg w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-auto min-h-[72px] sm:h-28 px-4 sm:px-10 py-3 sm:py-0 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 gap-3 sm:gap-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 lg:gap-12 w-full sm:w-auto">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Board</h1>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Pipeline Management</p>
            </div>
            <div className="flex sm:hidden items-center gap-2">
              <button 
                className="p-3 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
                title="Export Insights"
              >
                <Download className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-3 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
                title="Workflow Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button className="bg-primary text-on-primary px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Tag Filter */}
          <div className="relative group w-full sm:min-w-[280px] lg:min-w-[420px]">
            <Filter className={cn(
              "absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors",
              filterQuery ? "text-primary" : "text-on-surface-variant"
            )} />
            <input 
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by role, company, or AI tags..."
              className="w-full bg-surface-container-high border border-outline-variant rounded-xl sm:rounded-2xl pl-10 sm:pl-12 pr-4 sm:pr-6 py-3 sm:py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-on-surface-variant/40 shadow-inner"
            />
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 sm:gap-4">
          <button 
            className="p-3 sm:p-4 bg-surface-container-high rounded-xl sm:rounded-2xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
            title="Export Insights"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 sm:p-4 bg-surface-container-high rounded-xl sm:rounded-2xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
            title="Workflow Settings"
          >
            <Settings2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="h-6 sm:h-8 w-[1px] bg-outline-variant mx-2 sm:mx-4 opacity-50" />
          <button className="bg-primary text-on-primary px-5 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-2 sm:gap-3">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> New Application
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-4 sm:px-10 py-4 sm:py-10 flex flex-wrap gap-3 sm:gap-8 overflow-x-auto no-scrollbar">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 min-w-[140px] sm:min-w-[200px] lg:min-w-[260px] bg-surface border border-outline-variant rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 flex items-center gap-3 sm:gap-6 hover:bg-surface-container-low transition-all shadow-xl group border-transparent hover:border-primary/20">
            <div className="bg-surface-container-high p-2 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
              <stat.icon className={cn("w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7", stat.color)} />
            </div>
            <div>
              <div className="text-[8px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{stat.label}</div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-mono font-bold text-primary mt-1 tracking-tight">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto px-4 sm:px-10 pb-16 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 sm:gap-6 lg:gap-10 h-full min-w-[800px] sm:min-w-max">
            {columnsData.map((col) => {
              const colCards = filteredCards.filter(c => c.status === col.id);
              const isOver = overContainerId === col.id;

              return (
                <div key={col.id} className="w-[260px] sm:w-[320px] lg:w-[380px] flex flex-col gap-4 sm:gap-6 lg:gap-8 group/col">
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        col.id === 'Interview' ? 'bg-tertiary animate-pulse' : (col.id === 'Offer' ? 'bg-primary' : 'bg-on-surface-variant/30')
                      )} />
                      <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.25em] flex items-center gap-3">
                        {col.title} <span className="text-on-surface-variant bg-surface-container-highest px-3 py-1 rounded-full font-mono text-[10px]">{colCards.length}</span>
                      </h3>
                    </div>
                    <MoreHorizontal className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary transition-colors" />
                  </div>
                  
                  <div className={cn(
                    "flex-1 flex flex-col gap-3 sm:gap-4 lg:gap-6 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] transition-all duration-500 relative bg-surface-container-low/10 p-2 sm:p-3 border border-transparent",
                    isOver && "bg-primary/5 border-primary/20 scale-[1.02] shadow-2xl"
                  )}>
                    <SortableContext
                      id={col.id}
                      items={colCards.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-3 sm:gap-4 lg:gap-6 overflow-y-auto no-scrollbar pb-8 sm:pb-12 min-h-[200px] sm:min-h-[300px]">
                        {colCards.length === 0 && !activeId && (
                           <div className="flex-1 flex items-center justify-center p-12 border-2 border-dashed border-outline-variant/20 rounded-[2rem] opacity-10 my-6">
                              <Plus className="w-10 h-10" />
                           </div>
                        )}
                        {colCards.map((card) => (
                          <SortableJobCard 
                            key={card.id}
                            {...card}
                            onClick={() => setSelectedJob(card)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <div className="scale-105 shadow-[0_40px_80px_rgba(0,0,0,0.6)] rounded-[2rem] overflow-hidden rotate-2">
                <JobCard 
                  {...cards.find(c => c.id === activeId)!}
                  isDragging
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Flyout Job Details Panel */}
      <AnimatePresence>
        {selectedJob && !activeId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedJob(null)}
              className="fixed inset-0 bg-on-background/80 backdrop-blur-md z-[60]"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] lg:w-[540px] bg-surface-container-low border-l border-outline-variant z-[70] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="h-full flex flex-col">
                <div className="p-4 sm:p-6 lg:p-10 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50 backdrop-blur-md">
                  <div className="flex items-center gap-4 sm:gap-6 lg:gap-8 min-w-0">
                    <div 
                        className="w-12 sm:w-16 lg:w-20 h-12 sm:h-16 lg:h-20 rounded-2xl sm:rounded-3xl flex items-center justify-center border-2 font-bold text-xl sm:text-2xl lg:text-3xl shadow-2xl shrink-0"
                        style={{ backgroundColor: `${selectedJob.color}10`, color: selectedJob.color, borderColor: `${selectedJob.color}30` }}
                    >
                      {selectedJob.logo}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tighter truncate">{selectedJob.company}</h2>
                      <p className="text-xs sm:text-sm font-bold text-on-surface-variant uppercase tracking-[0.2em] mt-1 truncate">{selectedJob.title}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedJob(null)}
                    className="p-2 sm:p-3 hover:bg-surface-container-highest rounded-full transition-all text-on-surface-variant hover:rotate-90 shrink-0"
                  >
                    <X className="w-5 sm:w-6 lg:w-8 h-5 sm:h-6 lg:h-8" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-8 sm:space-y-12 lg:space-y-16 custom-scrollbar">
                  {/* Timeline */}
                  <section>
                    <div className="flex items-center justify-between mb-6 sm:mb-8 lg:mb-10">
                      <h3 className="text-[10px] sm:text-[11px] font-black text-primary uppercase tracking-[0.4em]">Operations Timeline</h3>
                      <div className="px-2 sm:px-3 py-1 bg-primary/10 rounded-lg text-[9px] sm:text-[10px] font-bold text-primary uppercase tracking-widest">Active</div>
                    </div>
                    <div className="space-y-6 sm:space-y-8 lg:space-y-12 relative before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant before:opacity-20">
                      {((selectedJob.raw.timeline as any[]) || []).map((step, i) => (
                        <div key={i} className="relative pl-8 sm:pl-10 lg:pl-12 group/step">
                          <div className="absolute left-0 top-1.5 w-[14px] sm:w-[20px] h-[14px] sm:h-[20px] rounded-full ring-4 sm:ring-8 ring-surface-container-low bg-primary shadow-[0_0_20px_rgba(255,178,186,0.6)] transition-transform group-hover/step:scale-125" />
                          <div className="font-mono text-[8px] sm:text-[10px] font-bold text-primary/60 mb-1 sm:mb-2 uppercase tracking-widest">{new Date(step.timestamp).toLocaleString()}</div>
                          <div className="text-base sm:text-lg lg:text-xl font-bold text-primary tracking-tight">{step.status}</div>
                          <div className="text-xs sm:text-sm font-medium text-on-surface-variant mt-1 sm:mt-2 leading-relaxed opacity-80">{step.note}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* AI Copilot Insights */}
                  <section className="bg-primary-container/10 border-2 border-primary/20 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 transform translate-x-1/4 -translate-y-1/4 scale-[1.5] sm:scale-[2] lg:scale-[2.5]">
                      <Zap className="w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 text-primary fill-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                         <div className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 rounded-xl sm:rounded-2xl bg-primary-container/20 flex items-center justify-center shadow-lg border border-primary/20">
                           <Sparkles className="w-4 sm:w-5 lg:w-6 h-4 sm:h-5 lg:h-6 text-primary fill-primary/20" />
                         </div>
                         <h3 className="text-xs sm:text-sm font-black text-primary uppercase tracking-[0.25em]">Copilot Strategy</h3>
                      </div>
                       <p className="text-base sm:text-lg font-medium text-primary leading-relaxed italic opacity-90">
                        "{selectedJob.raw.aiInsights || "LazyMe is generating a custom interview strategy for this role. We are currently analyzing their tech stack vs your profile graph."}"
                      </p>
                    </div>
                  </section>

                  {/* Skills Match */}
                  <section>
                    <h3 className="text-[10px] sm:text-[11px] font-black text-on-surface-variant uppercase tracking-[0.4em] mb-4 sm:mb-6 lg:mb-8">Matching Skills</h3>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                       {selectedJob.tags?.map((tag: string) => (
                         <span key={tag} className="px-3 sm:px-5 py-1.5 sm:py-2 bg-surface-container-highest border border-outline-variant rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-on-primary cursor-default">{tag}</span>
                       ))}
                    </div>
                  </section>
                </div>

                <div className="p-4 sm:p-6 lg:p-10 border-t border-outline-variant bg-surface-container-low/95 backdrop-blur-xl flex gap-3 sm:gap-6 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                  <button className="flex-1 bg-surface-container-high border border-outline-variant text-primary py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.3em] hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95">
                    <ExternalLink className="w-4 sm:w-5 h-4 sm:h-5" /> Portal
                  </button>
                  <button className="flex-1 bg-primary text-on-primary py-4 sm:py-5 rounded-xl sm:rounded-2xl font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.3em] hover:brightness-110 shadow-2xl shadow-primary/30 flex items-center justify-center gap-2 sm:gap-3 active:scale-95">
                    <Edit3 className="w-4 sm:w-5 h-4 sm:h-5" /> Optimize
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
