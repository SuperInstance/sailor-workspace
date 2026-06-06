import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronLeft, ChevronRight, Check, Lightbulb, Play, Clock, X } from 'lucide-react';
import type { TutorialStep } from '@/lib/blocks';
import { TUTORIALS } from '@/lib/blocks';

interface TutorialPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export default function TutorialPanel({ isOpen, onToggle }: TutorialPanelProps) {
  const [activeTutorial, setActiveTutorial] = useState<TutorialStep | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const startTutorial = (t: TutorialStep) => {
    setActiveTutorial(t);
    setCurrentStep(0);
    setShowHint(false);
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'Beginner': return 'bg-[#5BBD76]/20 text-[#5BBD76]';
      case 'Intermediate': return 'bg-[#E8B820]/20 text-[#E8B820]';
      case 'Advanced': return 'bg-[#D94A4A]/20 text-[#D94A4A]';
      default: return 'bg-[#5A5A78]/20 text-[#5A5A78]';
    }
  };

  return (
    <>
      {/* Collapsed tab */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            onClick={onToggle}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-[#1A1A26] border border-l-0 border-[#252536] rounded-r-lg px-2 py-4 flex flex-col items-center gap-2 hover:bg-[#252536] transition-colors group"
            style={{ top: 'calc(50% + 32px)' }}
          >
            <BookOpen className="w-4 h-4 text-[#E8B820]" />
            <span className="text-[10px] text-[#8A8AA8] font-ui writing-mode-vertical rotate-180 whitespace-nowrap" style={{ writingMode: 'vertical-rl' }}>
              Tutorials
            </span>
            <ChevronRight className="w-3 h-3 text-[#5A5A78]" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }}
            className="bg-[#12121A] border-r border-[#252536] flex flex-col h-full overflow-hidden flex-shrink-0"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#252536]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#E8B820]" />
                <span className="text-sm font-semibold text-[#E8E8F0] font-ui">Tutorials</span>
              </div>
              <button onClick={onToggle} className="p-1 rounded hover:bg-[#252536] transition-colors">
                <X className="w-4 h-4 text-[#5A5A78]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                {activeTutorial ? (
                  <motion.div
                    key={activeTutorial.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                  >
                    {/* Back button */}
                    <button
                      onClick={() => setActiveTutorial(null)}
                      className="flex items-center gap-1 text-xs text-[#5A5A78] hover:text-[#8A8AA8] font-ui mb-4"
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Back to tutorials
                    </button>

                    {/* Tutorial title */}
                    <h3 className="font-display font-semibold text-base text-[#E8E8F0] mb-1">{activeTutorial.title}</h3>
                    <p className="text-xs text-[#8A8AA8] font-ui mb-4">{activeTutorial.description}</p>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-[#252536] rounded-full mb-4 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#E8B820]"
                        animate={{ width: `${(currentStep / activeTutorial.steps.length) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-3 mb-4">
                      {activeTutorial.steps.map((step, i) => (
                        <motion.div
                          key={i}
                          className={`flex gap-3 p-3 rounded-lg border ${
                            i === currentStep
                              ? 'border-[#E8B820]/40 bg-[#E8B820]/5'
                              : i < currentStep
                              ? 'border-[#4ADE80]/20 bg-[#4ADE80]/5'
                              : 'border-[#252536] bg-[#0A0A0F]'
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                            i < currentStep ? 'bg-[#4ADE80] text-void-900' :
                            i === currentStep ? 'bg-[#E8B820] text-void-900' :
                            'bg-[#252536] text-[#5A5A78]'
                          }`}>
                            {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                          </div>
                          <p className={`text-xs font-ui leading-relaxed ${
                            i === currentStep ? 'text-[#E8E8F0]' : 'text-[#8A8AA8]'
                          }`}>
                            {step}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1A1A26] border border-[#252536] text-xs text-[#8A8AA8] font-ui disabled:opacity-40 hover:bg-[#252536] transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        Prev
                      </button>
                      <span className="text-[10px] text-[#5A5A78] font-mono">
                        {currentStep + 1} / {activeTutorial.steps.length}
                      </span>
                      <button
                        onClick={() => setCurrentStep(Math.min(activeTutorial.steps.length - 1, currentStep + 1))}
                        disabled={currentStep === activeTutorial.steps.length - 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#1A1A26] border border-[#252536] text-xs text-[#8A8AA8] font-ui disabled:opacity-40 hover:bg-[#252536] transition-colors"
                      >
                        Next
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Hint */}
                    <div className="space-y-2">
                      {!showHint ? (
                        <button
                          onClick={() => setShowHint(true)}
                          className="flex items-center gap-2 text-xs text-[#E8B820]/70 hover:text-[#E8B820] font-ui transition-colors"
                        >
                          <Lightbulb className="w-3.5 h-3.5" />
                          Show hint
                        </button>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="p-3 rounded-lg bg-[#FEF9E8]/5 border border-[#E8B820]/20"
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Lightbulb className="w-3 h-3 text-[#E8B820]" />
                            <span className="text-[10px] text-[#E8B820] font-ui font-semibold">Hint</span>
                          </div>
                          <p className="text-xs text-[#8A8AA8] font-ui">
                            Look for the {activeTutorial.requiredBlocks[0]?.split('-')[0] || 'required'} block in the palette and drag it to the canvas.
                          </p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {TUTORIALS.map((tutorial, i) => (
                      <motion.button
                        key={tutorial.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => startTutorial(tutorial)}
                        className="w-full text-left p-3 rounded-lg bg-[#0A0A0F] border border-[#252536] hover:border-[#E8B820]/30 hover:bg-[#1A1A26] transition-all group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-8 rounded bg-[#1A1A26] border border-[#252536] flex items-center justify-center">
                              <Play className="w-3 h-3 text-[#E8B820]" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-[#E8E8F0] font-ui group-hover:text-[#E8B820] transition-colors">
                                {tutorial.title}
                              </h4>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${difficultyColor(tutorial.difficulty)}`}>
                                {tutorial.difficulty}
                              </span>
                            </div>
                          </div>
                          {tutorial.completed && (
                            <div className="w-5 h-5 rounded-full bg-[#4ADE80]/20 flex items-center justify-center">
                              <Check className="w-3 h-3 text-[#4ADE80]" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-[#8A8AA8] font-ui line-clamp-2 mb-2">{tutorial.description}</p>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-[9px] text-[#5A5A78]">
                            <Clock className="w-2.5 h-2.5" />
                            {tutorial.estimatedTime}
                          </div>
                          {tutorial.progress > 0 && (
                            <div className="flex-1 h-1 bg-[#252536] rounded-full overflow-hidden">
                              <div className="h-full bg-[#E8B820] rounded-full" style={{ width: `${tutorial.progress}%` }} />
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
