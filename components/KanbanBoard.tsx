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
        "bg-surface border border-outline-variant rounded-[2rem] p-6 cursor-pointer hover:bg-surface-container-low transition-all active:scale-[0.98] shadow-lg hover:shadow-2xl group border-transparent hover:border-primary/30 relative overflow-hidden",
        isDragging && "shadow-[0_40px_80px_rgba(0,0,0,0.5)] cursor-grabbing scale-105 z-50 border-primary/50"
      )}
    >
      <div className="flex items-start justify-between mb-5">
        <div 
          className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-inner", color === '#000000' ? 'border border-outline-variant bg-[#111]' : '')}
          style={{ backgroundColor: color === '#FFFFFF' ? '#FFFFFF' : (color === '#000000' ? '#111' : `${color}10`), color: color === '#FFFFFF' ? '#000' : color, borderColor: `${color}30` }}
        >
          {logo}
        </div>
        <span className="font-mono text-[9px] font-bold text-on-surface-variant bg-surface-container-highest px-3 py-1.5 rounded-lg uppercase tracking-widest">{time}</span>
      </div>
      <h4 className="text-xl font-bold text-primary group-hover:text-primary transition-colors tracking-tight leading-snug">{title}</h4>
      <p className="text-sm font-bold text-on-surface-variant mt-1.5">{company} • {location}</p>
      
      <div className="mt-6 flex items-center gap-2.5 bg-primary-container/10 px-4 py-2 rounded-2xl border border-primary/20 w-fit">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(255,178,186,0.6)]" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-[0.15em]">Next: {next}</span>
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
        <header className="h-28 px-10 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-12">
            <div className="space-y-2">
              <div className="h-8 bg-surface-container-high rounded-lg w-28" />
              <div className="h-4 bg-surface-container-high rounded-lg w-36" />
            </div>
            <div className="h-12 bg-surface-container-high rounded-2xl w-[420px]" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl" />
            <div className="w-12 h-12 bg-surface-container-high rounded-2xl" />
            <div className="h-12 bg-surface-container-high rounded-2xl w-40" />
          </div>
        </header>

        {/* Stats Bar Skeleton */}
        <div className="px-10 py-10 flex gap-8">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 bg-surface-container-high/50 border border-outline-variant rounded-3xl p-8 flex items-center gap-6">
              <div className="w-14 h-14 bg-surface-container-high rounded-2xl shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-surface-container-high rounded-lg w-1/2" />
                <div className="h-6 bg-surface-container-high rounded-lg w-1/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Columns Skeleton */}
        <div className="flex-1 px-10 pb-16 flex gap-10 overflow-hidden">
          {[1, 2, 3].map((colIndex) => (
            <div key={colIndex} className="w-[380px] flex flex-col gap-8">
              <div className="flex justify-between items-center px-3">
                <div className="h-5 bg-surface-container-high rounded-lg w-24" />
                <div className="w-5 h-5 bg-surface-container-high rounded-full" />
              </div>
              <div className="flex-1 bg-surface-container-high/30 p-3 rounded-[2.5rem] space-y-6">
                {[1, 2].map((cardIndex) => (
                  <div key={cardIndex} className="bg-surface-container border border-outline-variant rounded-[2rem] p-6 space-y-4">
                    <div className="flex justify-between">
                      <div className="w-12 h-12 bg-surface-container-high rounded-2xl" />
                      <div className="w-16 h-6 bg-surface-container-high rounded-lg" />
                    </div>
                    <div className="h-6 bg-surface-container-high rounded-lg w-3/4" />
                    <div className="h-4 bg-surface-container-high rounded-lg w-1/2" />
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
      <header className="h-28 px-10 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Board</h1>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Pipeline Management</p>
          </div>
          
          {/* Tag Filter */}
          <div className="relative group flex-1 min-w-[420px]">
            <Filter className={cn(
              "absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
              filterQuery ? "text-primary" : "text-on-surface-variant"
            )} />
            <input 
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search by role, company, or AI tags..."
              className="w-full bg-surface-container-high border border-outline-variant rounded-2xl pl-12 pr-6 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium placeholder:text-on-surface-variant/40 shadow-inner"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            className="p-4 bg-surface-container-high rounded-2xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
            title="Export Insights"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-4 bg-surface-container-high rounded-2xl text-on-surface-variant hover:text-primary transition-all border border-outline-variant shadow-lg active:scale-95"
            title="Workflow Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <div className="h-8 w-[1px] bg-outline-variant mx-4 opacity-50" />
          <button className="bg-primary text-on-primary px-8 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-xl shadow-primary/20 flex items-center gap-3">
            <Plus className="w-5 h-5" /> New Application
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-10 py-10 flex flex-wrap gap-8 overflow-x-auto no-scrollbar">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 min-w-[260px] bg-surface border border-outline-variant rounded-3xl p-8 flex items-center gap-6 hover:bg-surface-container-low transition-all shadow-xl group border-transparent hover:border-primary/20">
            <div className="bg-surface-container-high p-4 rounded-2xl group-hover:scale-110 transition-transform shadow-inner">
              <stat.icon className={cn("w-7 h-7", stat.color)} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{stat.label}</div>
              <div className="text-3xl font-mono font-bold text-primary mt-1.5 tracking-tight">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto px-10 pb-16 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-10 h-full min-w-max">
            {columnsData.map((col) => {
              const colCards = filteredCards.filter(c => c.status === col.id);
              const isOver = overContainerId === col.id;

              return (
                <div key={col.id} className="w-[380px] flex flex-col gap-8 group/col">
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
                    "flex-1 flex flex-col gap-6 rounded-[2.5rem] transition-all duration-500 relative bg-surface-container-low/10 p-3 border border-transparent",
                    isOver && "bg-primary/5 border-primary/20 scale-[1.02] shadow-2xl"
                  )}>
                    <SortableContext
                      id={col.id}
                      items={colCards.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-6 overflow-y-auto no-scrollbar pb-12 min-h-[300px]">
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
              className="fixed right-0 top-0 bottom-0 w-full md:w-[540px] bg-surface-container-low border-l border-outline-variant z-[70] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
              <div className="h-full flex flex-col">
                <div className="p-10 border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50 backdrop-blur-md">
                  <div className="flex items-center gap-8">
                    <div 
                        className="w-20 h-20 rounded-3xl flex items-center justify-center border-2 font-bold text-3xl shadow-2xl"
                        style={{ backgroundColor: `${selectedJob.color}10`, color: selectedJob.color, borderColor: `${selectedJob.color}30` }}
                    >
                      {selectedJob.logo}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tighter">{selectedJob.company}</h2>
                      <p className="text-sm font-bold text-on-surface-variant uppercase tracking-[0.2em] mt-1">{selectedJob.title}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedJob(null)}
                    className="p-3 hover:bg-surface-container-highest rounded-full transition-all text-on-surface-variant hover:rotate-90"
                  >
                    <X className="w-8 h-8" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-16 custom-scrollbar">
                  {/* Timeline */}
                  <section>
                    <div className="flex items-center justify-between mb-10">
                      <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.4em]">Operations Timeline</h3>
                      <div className="px-3 py-1 bg-primary/10 rounded-lg text-[10px] font-bold text-primary uppercase tracking-widest">Active</div>
                    </div>
                    <div className="space-y-12 relative before:content-[''] before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-outline-variant before:opacity-20">
                      {((selectedJob.raw.timeline as any[]) || []).map((step, i) => (
                        <div key={i} className="relative pl-12 group/step">
                          <div className="absolute left-0 top-1.5 w-[20px] h-[20px] rounded-full ring-8 ring-surface-container-low bg-primary shadow-[0_0_20px_rgba(255,178,186,0.6)] transition-transform group-hover/step:scale-125" />
                          <div className="font-mono text-[10px] font-bold text-primary/60 mb-2 uppercase tracking-widest">{new Date(step.timestamp).toLocaleString()}</div>
                          <div className="text-xl font-bold text-primary tracking-tight">{step.status}</div>
                          <div className="text-sm font-medium text-on-surface-variant mt-2 leading-relaxed opacity-80">{step.note}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* AI Copilot Insights */}
                  <section className="bg-primary-container/10 border-2 border-primary/20 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 p-6 opacity-5 transform translate-x-1/4 -translate-y-1/4 scale-[2.5]">
                      <Zap className="w-32 h-32 text-primary fill-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center shadow-lg border border-primary/20">
                           <Sparkles className="w-6 h-6 text-primary fill-primary/20" />
                         </div>
                         <h3 className="text-sm font-black text-primary uppercase tracking-[0.25em]">Copilot Strategy</h3>
                      </div>
                       <p className="text-lg font-medium text-primary leading-relaxed italic opacity-90">
                        "{selectedJob.raw.aiInsights || "LazyMe is generating a custom interview strategy for this role. We are currently analyzing their tech stack vs your profile graph."}"
                      </p>
                    </div>
                  </section>

                  {/* Skills Match */}
                  <section>
                    <h3 className="text-[11px] font-black text-on-surface-variant uppercase tracking-[0.4em] mb-8">Matching Skills</h3>
                    <div className="flex flex-wrap gap-3">
                       {selectedJob.tags?.map((tag: string) => (
                         <span key={tag} className="px-5 py-2 bg-surface-container-highest border border-outline-variant rounded-2xl text-[11px] font-bold uppercase tracking-widest text-primary transition-all hover:bg-primary hover:text-on-primary cursor-default">{tag}</span>
                       ))}
                    </div>
                  </section>
                </div>

                <div className="p-10 border-t border-outline-variant bg-surface-container-low/95 backdrop-blur-xl flex gap-6 shadow-[0_-20px_50px_rgba(0,0,0,0.3)]">
                  <button className="flex-1 bg-surface-container-high border border-outline-variant text-primary py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] hover:bg-surface-container-highest transition-all flex items-center justify-center gap-3 active:scale-95">
                    <ExternalLink className="w-5 h-5" /> Portal
                  </button>
                  <button className="flex-1 bg-primary text-on-primary py-5 rounded-2xl font-bold text-[11px] uppercase tracking-[0.3em] hover:brightness-110 shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-95">
                    <Edit3 className="w-5 h-5" /> Optimize
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
