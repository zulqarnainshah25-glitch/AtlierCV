import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Check, ArrowRight, ShieldCheck, X } from 'lucide-react';
import { PlanTier } from '../types/cv';

interface WelcomeUpgradeModalProps {
  isOpen: boolean;
  userName: string;
  userEmail: string;
  plan: PlanTier;
  onClose: () => void;
  onOpenPlans: () => void;
}

export const WelcomeUpgradeModal: React.FC<WelcomeUpgradeModalProps> = ({
  isOpen,
  userName,
  userEmail,
  plan,
  onClose,
  onOpenPlans
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Animated Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Dialog Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl p-6 sm:p-7 z-10 text-center space-y-5"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Badge & Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Sparkles className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full">
            Welcome to AtelierCV
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mt-2.5">
            Aap Ka Free Tier Account Tayar Hai! 🎉
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto">
            Khushamdeed, <span className="font-semibold text-slate-800 dark:text-slate-200">{userName || userEmail.split('@')[0]}</span>! Aap ke account mein Free Tier activate ho chuka hai.
          </p>
        </div>

        {/* Free Tier Included Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-left text-xs space-y-2">
          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
            <span>Free Tier Mein Shamil Hain:</span>
            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full">
              FREE
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>2 Clean ATS Templates (Minimalist Zurich &amp; Timeline Classic)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>1 High-Quality PDF Export</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Full AI Content Polishing &amp; Roman Urdu Translation</span>
          </div>
        </div>

        {/* Upgrade Callout */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-950 dark:text-emerald-200 text-left space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Need More Downloads or Word Format?</span>
          </div>
          <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
            Tamam 6 Templates, Unlimited PDF exports aur Word (.docx) downloads ke liye hamare Pakistani Rupee plans sirf <strong>Rs. 200</strong> se shuru hain!
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Start with Free Plan
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPlans();
            }}
            className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>View Plans &amp; Upgrade</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
