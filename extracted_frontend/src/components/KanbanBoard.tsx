import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Zap, Users, Trophy, MoreHorizontal, X, ExternalLink, 
  Edit3, ChevronRight, Clock, Sparkles, MapPin, Filter, 
  Download, Plus, Settings2, GripVertical, Trash2 
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
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
  id: number;
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
        "bg-surface-container-high border hairline-border rounded-2xl p-5 cursor-pointer hover:bg-surface-container-highest transition-all active:scale-[0.98] shadow-lg hover:shadow-2xl group border-transparent hover:border-primary/30",
        isDragging && "shadow-2xl cursor-grabbing scale-105 z-50 border-primary/50"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className={cn("w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm", color === '#000000' ? 'border border-outline-variant bg-[#111]' : '')}
          style={{ backgroundColor: color === '#FFFFFF' ? '#FFFFFF' : (color === '#000000' ? '#111' : `${color}20`), color: color === '#FFFFFF' ? '#000' : color }}
        >
          {logo}
        </div>
        <span className="font-mono text-[10px] font-bold text-on-surface-variant bg-background/40 px-2 py-1 rounded-md">{time}</span>
      </div>
      <h4 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors tracking-tight">{title}</h4>
      <p className="text-xs font-bold text-on-surface-variant mt-1">{company} • {location}</p>
      
      <div className="mt-5 inline-flex items-center gap-2 bg-primary-container/10 px-3 py-1.5 rounded-xl border border-primary/20">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Next: {next}</span>
      </div>
    </motion.div>
  );
};

export default function KanbanBoard() {
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [overContainerId, setOverContainerId] = useState<string | null>(null);

  const [columnsData, setColumnsData] = useState([
    { id: 'Applied', title: 'Applied', color: 'primary' },
    { id: 'Screening', title: 'Screening', color: 'secondary' },
    { id: 'Interview', title: 'Interview', color: 'tertiary' },
    { id: 'Offer', title: 'Offer', color: 'primary' },
    { id: 'Rejected', title: 'Rejected', color: 'outline' },
  ]);

  const [cards, setCards] = useState([
    { id: 1, title: 'Senior Product Designer', company: 'Stripe', location: 'Remote', time: '2D AGO', next: 'REFERRAL FOLLOW-UP', status: 'Applied', logo: 'S', color: '#635BFF', tags: ['Fintech', 'Design'] },
    { id: 2, title: 'Frontend Architect', company: 'Linear', location: 'SF / Remote', time: '1W AGO', next: 'RECRUITER CALL', status: 'Screening', logo: 'L', color: '#FFFFFF', tags: ['SaaS', 'React'] },
    { id: 3, title: 'Design Systems Lead', company: 'Notion', location: 'London / Remote', time: 'TOMORROW', next: 'TECH ONSITE', status: 'Interview', logo: 'N', color: '#000000', tags: ['SaaS', 'Figma'] },
  ]);

  const filteredCards = useMemo(() => {
    if (!filterQuery) return cards;
    const q = filterQuery.toLowerCase();
    return cards.filter(c => 
      c.title.toLowerCase().includes(q) || 
      c.company.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q))
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
    { label: 'Total Applied', value: cards.length.toString(), icon: Send, color: 'text-primary' },
    { label: 'Response Rate', value: '18.5%', icon: Zap, color: 'text-secondary' },
    { label: 'Interviews', value: cards.filter(c => c.status === 'Interview').length.toString(), icon: Users, color: 'text-tertiary' },
    { label: 'Offers', value: cards.filter(c => c.status === 'Offer').length.toString(), icon: Trophy, color: 'text-primary' },
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

    // Find the containers
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

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setCards((prev) => {
        const activeIndex = prev.findIndex(c => c.id === active.id);
        const overIndex = prev.findIndex(c => c.id === over.id);
        
        if (overIndex !== -1) {
          return arrayMove(prev, activeIndex, overIndex);
        }
        return prev;
      });
    }

    setActiveId(null);
    setOverContainerId(null);
  };

  const exportToCSV = () => {
    const headers = ['Title', 'Company', 'Location', 'Status', 'Last Update'];
    const rows = cards.map(c => [c.title, c.company, c.location, c.status, c.time]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `job_applications_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addQuickCard = (status: string) => {
    const newCard = {
      id: Date.now(),
      title: 'New Position',
      company: 'Company Name',
      location: 'Remote / Location',
      time: 'JUST NOW',
      next: 'INITIAL OUTREACH',
      status: status,
      logo: '?',
      color: '#9C4146',
      tags: []
    };
    setCards([newCard, ...cards]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-24 px-8 border-b hairline-border flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-10">
          <h1 className="text-2xl font-bold tracking-tight">Board</h1>
          
          {/* Tag Filter */}
          <div className="relative group flex-1 min-w-[360px]">
            <Filter className={cn(
              "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
              filterQuery ? "text-primary" : "text-on-surface-variant"
            )} />
            <input 
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by title, company, or tags..."
              className="w-full bg-surface-container-high border hairline-border rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary transition-all font-medium placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="p-3 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all border hairline-border"
            title="Export to CSV"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 bg-surface-container-high rounded-xl text-on-surface-variant hover:text-primary transition-all border hairline-border"
            title="Column Settings"
          >
            <Settings2 className="w-5 h-5" />
          </button>
          <div className="h-6 w-[1px] bg-outline-variant mx-2" />
          <button className="bg-primary text-on-primary px-6 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all shadow-lg flex items-center gap-2">
            <Plus className="w-4 h-4" /> New App
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="px-8 py-8 flex flex-wrap gap-6 overflow-x-auto no-scrollbar">
        {stats.map((stat) => (
          <div key={stat.label} className="flex-1 min-w-[220px] bg-surface-container-low border hairline-border rounded-2xl p-6 flex items-center gap-5 hover:bg-surface-container transition-colors shadow-sm group">
            <div className="bg-surface-container-highest p-3 rounded-xl group-hover:scale-110 transition-transform">
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{stat.label}</div>
              <div className="text-2xl font-mono font-bold text-on-surface mt-1">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto px-8 pb-12 custom-scrollbar">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-8 h-full min-w-max">
            {columnsData.map((col) => {
              const colCards = filteredCards.filter(c => c.status === col.id);
              const isOver = overContainerId === col.id;

              return (
                <div key={col.id} className="w-[340px] flex flex-col gap-6 group/col">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                      {col.title} <span className="text-on-surface bg-surface-container-highest px-2 py-0.5 rounded-full text-[10px]">{colCards.length}</span>
                    </h3>
                    <MoreHorizontal className="w-5 h-5 text-on-surface-variant cursor-pointer" />
                  </div>
                  
                  <div className={cn(
                    "flex-1 flex flex-col gap-4 rounded-3xl transition-all duration-300 relative bg-surface-container-low/20 p-2",
                    isOver && "bg-primary/5 ring-2 ring-primary/20 scale-[1.01]"
                  )}>
                    <SortableContext
                      id={col.id}
                      items={colCards.map(c => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="flex flex-col gap-4 overflow-y-auto no-scrollbar pb-8 min-h-[200px]">
                        {colCards.length === 0 && !activeId && (
                           <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed border-outline-variant/30 rounded-3xl opacity-20 my-4">
                              <Plus className="w-8 h-8" />
                           </div>
                        )}
                        {colCards.map((card) => (
                          <SortableJobCard 
                            key={card.id}
                            {...card}
                            onClick={() => setSelectedJob(card)}
                          />
                        ))}
                        
                        {/* Quick Add Button */}
                        <button 
                          onClick={() => addQuickCard(col.id)}
                          className="w-full py-5 border-2 border-dashed border-outline-variant/30 rounded-2xl text-on-surface-variant hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 group/add opacity-40 group-hover/col:opacity-100"
                        >
                          <Plus className="w-4 h-4 transition-transform group-hover/add:rotate-90" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Add Position</span>
                        </button>
                      </div>
                    </SortableContext>
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeId ? (
              <JobCard 
                {...cards.find(c => c.id === activeId)!}
                isDragging
              />
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-surface-container-low border-l hairline-border z-[70] shadow-2xl"
            >
              <div className="h-full flex flex-col">
                <div className="p-8 border-b hairline-border flex items-center justify-between bg-surface-container-low/50 backdrop-blur-md">
                  <div className="flex items-center gap-6">
                    <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center border font-bold text-xl shadow-xl"
                        style={{ backgroundColor: selectedJob.color === '#FFFFFF' ? '#FFFFFF' : (selectedJob.color === '#000000' ? '#111' : `${selectedJob.color}20`), color: selectedJob.color === '#FFFFFF' ? '#000' : selectedJob.color }}
                    >
                      {selectedJob.logo}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">{selectedJob.company}</h2>
                      <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{selectedJob.title}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedJob(null)}
                    className="p-2 hover:bg-surface-container-highest rounded-full transition-colors text-on-surface-variant"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
                  {/* Timeline */}
                  <section>
                    <h3 className="text-[11px] font-bold text-primary mb-8 uppercase tracking-[0.3em]">Application Timeline</h3>
                    <div className="space-y-10 relative before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant before:opacity-30">
                      {[
                        { date: 'SEP 28, 14:00', label: 'Technical Onsite Interview', desc: 'Zoom with Lead System Architect', active: true, dot: 'bg-primary' },
                        { date: 'SEP 22', label: 'Recruiter Screen Passed', desc: 'Feedback: "Excellent portfolio clarity"', active: false, dot: 'bg-tertiary' },
                        { date: 'SEP 18', label: 'Applied', desc: 'Via LazyMe AI Auto-Pilot', active: false, dot: 'bg-outline-variant' }
                      ].map((step, i) => (
                        <div key={i} className={cn("relative pl-10", i > 0 && "opacity-60")}>
                          <div className={cn("absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full ring-4 ring-surface-container-low transition-all", step.dot, step.active && "shadow-[0_0_15px_rgba(255,178,186,0.6)]")} />
                          <div className="font-mono text-xs font-bold text-primary mb-1 uppercase tracking-wider">{step.date}</div>
                          <div className="text-lg font-bold text-on-surface tracking-tight">{step.label}</div>
                          <div className="text-xs font-medium text-on-surface-variant mt-1">{step.desc}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* AI Copilot Insights */}
                  <section className="bg-primary-container/10 border border-primary/20 rounded-3xl p-6 relative overflow-hidden group shadow-xl">
                    <div className="absolute top-0 right-0 p-4 opacity-20 transform translate-x-1/4 -translate-y-1/4 scale-150">
                      <Zap className="w-24 h-24 text-primary fill-primary" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                         <div className="w-8 h-8 rounded-lg bg-primary-container/20 flex items-center justify-center">
                           <Sparkles className="w-4 h-4 text-primary fill-primary/20" />
                         </div>
                         <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Copilot Insights</h3>
                      </div>
                      <p className="text-sm font-medium text-on-surface/90 leading-relaxed italic">
                        "Focus on the collaboration between design and engineering. Notion values candidates who can bridge the gap using React-based design tokens. Mention your work on 'System-Alpha'."
                      </p>
                    </div>
                  </section>

                  {/* Details Grid */}
                  <section className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-low border hairline-border rounded-2xl p-5 shadow-inner">
                      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2 mb-2">
                        <Clock className="w-3 h-3" /> Salary Range
                      </div>
                      <div className="text-lg font-mono font-bold text-on-surface">$180k - $240k</div>
                    </div>
                    <div className="bg-surface-container-low border hairline-border rounded-2xl p-5 shadow-inner">
                      <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2 mb-2">
                        <MapPin className="w-3 h-3" /> Location
                      </div>
                      <div className="text-lg font-mono font-bold text-on-surface">Remote (UK/EU)</div>
                    </div>
                  </section>
                </div>

                <div className="p-8 border-t hairline-border bg-surface-container-low/90 backdrop-blur-md flex gap-4 shadow-2xl">
                  <button className="flex-1 bg-surface-container-high border hairline-border text-on-surface py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2">
                    <ExternalLink className="w-4 h-4" /> View Listing
                  </button>
                  <button className="flex-1 bg-primary text-on-primary py-4 rounded-xl font-bold text-[11px] uppercase tracking-[0.2em] hover:brightness-110 shadow-lg flex items-center justify-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit Details
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Column Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-surface-container rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b hairline-border flex justify-between items-center">
                <div className="flex items-center gap-3 text-primary">
                  <Settings2 className="w-6 h-6" />
                  <h3 className="text-2xl font-bold tracking-tight">Board Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div>
                  <h4 className="text-[11px] font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Manage Workflow Columns</h4>
                  <div className="space-y-3">
                    {columnsData.map((col, idx) => (
                      <div key={col.id} className="flex items-center gap-4 bg-surface-container-high border hairline-border p-4 rounded-2xl group">
                        <GripVertical className="w-5 h-5 text-on-surface-variant cursor-grab active:cursor-grabbing" />
                        <div className="flex-1">
                          <input 
                            type="text"
                            value={col.title}
                            onChange={(e) => {
                              const newCols = [...columnsData];
                              newCols[idx].title = e.target.value;
                              setColumnsData(newCols);
                            }}
                            className="bg-transparent font-bold text-on-surface outline-none focus:text-primary transition-colors w-full"
                          />
                        </div>
                        <button 
                          onClick={() => setColumnsData(columnsData.filter(c => c.id !== col.id))}
                          className="opacity-0 group-hover:opacity-100 p-2 text-on-surface-variant hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => setColumnsData([...columnsData, { id: `new_${Date.now()}`, title: 'New Stage', color: 'primary' }])}
                  className="w-full py-4 border-2 border-dashed border-outline-variant hover:border-primary/50 text-on-surface-variant hover:text-primary rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
                >
                  <Plus className="w-4 h-4 inline mr-2" /> Add Column
                </button>
              </div>

              <div className="p-8 border-t hairline-border bg-surface-container-low/50 backdrop-blur-md flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="bg-primary text-on-primary px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:brightness-110 shadow-lg"
                >
                  Save Workflow
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
