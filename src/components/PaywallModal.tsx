import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Lock,
  Copy,
  CheckCheck,
  Building2,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  Clock
} from 'lucide-react';
import { PaymentAccountsConfig, PaymentPlan, PlanTier } from '../types/cv';
import { DEFAULT_PAYMENT_ACCOUNTS, DEFAULT_PAYMENT_PLANS } from '../data/seedTemplates';

export interface PaywallModalProps {
  isOpen: boolean;
  reason: string;
  userId: string;
  userEmail: string;
  userName?: string;
  currentPlan?: PlanTier;
  plans?: PaymentPlan[];
  paymentAccounts?: PaymentAccountsConfig;
  initialStep?: 'select_plan' | 'payment';
  onClose: () => void;
  onSubmitPaymentProof: (proof: {
    planId: 'starter' | 'pro' | 'unlimited';
    planName: string;
    amountPkr: number;
    method: 'easypaisa' | 'bank';
    senderName: string;
    senderPhone: string;
    trxId: string;
    notes?: string;
  }) => Promise<void>;
  onInstantActivatePlan?: (planId: 'starter' | 'pro' | 'unlimited') => Promise<void>;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  reason,
  userId,
  userEmail,
  userName = 'User',
  currentPlan = 'free',
  plans = DEFAULT_PAYMENT_PLANS,
  paymentAccounts = DEFAULT_PAYMENT_ACCOUNTS,
  initialStep = 'select_plan',
  onClose,
  onSubmitPaymentProof,
  onInstantActivatePlan
}) => {
  const [step, setStep] = useState<'select_plan' | 'payment' | 'submitted'>(initialStep);
  const [selectedPlanId, setSelectedPlanId] = useState<'starter' | 'pro' | 'unlimited'>('pro');
  const [paymentMethod, setPaymentMethod] = useState<'easypaisa' | 'bank'>('easypaisa');

  // Payment Form Fields
  const [senderName, setSenderName] = useState(userName || '');
  const [senderPhone, setSenderPhone] = useState('');
  const [trxId, setTrxId] = useState('');
  const [notes, setNotes] = useState('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSelectPlanAndProceed = (planId: 'starter' | 'pro' | 'unlimited') => {
    setSelectedPlanId(planId);
    setStep('payment');
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      setErrorMsg('Transaction ID (TID) enter karna lazmi hai.');
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMsg('Sender Mobile Number enter karna lazmi hai.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onSubmitPaymentProof({
        planId: selectedPlan.id,
        planName: selectedPlan.name,
        amountPkr: selectedPlan.pricePkr,
        method: paymentMethod,
        senderName: senderName.trim() || 'User',
        senderPhone: senderPhone.trim(),
        trxId: trxId.trim(),
        notes: notes.trim()
      });
      setStep('submitted');
    } catch {
      setErrorMsg('Proof submit karne mein masla aaya, dobara koshish karein.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInstantDemoActivate = async () => {
    if (!onInstantActivatePlan) return;
    setSubmitting(true);
    try {
      await onInstantActivatePlan(selectedPlan.id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

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
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl my-6 flex flex-col max-h-[92vh] z-10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {step === 'select_plan' && 'Choose Your AtelierCV Plan'}
                  {step === 'payment' && `Pay Rs. ${selectedPlan.pricePkr} · ${selectedPlan.name}`}
                  {step === 'submitted' && 'Payment Under Verification'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  PKR
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Easypaisa &amp; Bank Transfer · Real-Time Automatic Activation
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reason Alert Banner */}
        {reason && step !== 'submitted' && (
          <div className="px-6 pt-4">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2.5 shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Free Tier Limit Reached: </span>
                {reason}
              </div>
            </motion.div>
          </div>
        )}

        {/* Scrollable Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          <AnimatePresence mode="wait">
            {/* STEP 1: SELECT PLAN */}
            {step === 'select_plan' && (
              <motion.div
                key="step-select"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Select Plan &amp; Unlock Studio Features
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Step 1 of 2
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Free tier includes 2 templates and 1 PDF export. Upgrade now to unlock all templates and high-resolution exports.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    return (
                      <motion.div
                        key={p.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`cursor-pointer rounded-2xl p-4.5 transition-all relative border flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/25 ring-2 ring-emerald-500/30 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                        }`}
                      >
                        {p.popular && (
                          <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            Most Popular
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {p.name}
                            </span>
                            <span
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </span>
                          </div>

                          <div className="mt-2.5 text-2xl font-black text-slate-900 dark:text-white font-mono">
                            Rs. {p.pricePkr}
                          </div>

                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                            {p.isUnlimited ? (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Unlimited PDF &amp; Word
                              </span>
                            ) : (
                              <span>
                                {p.pdfLimit} PDF · {p.wordLimit} Word
                              </span>
                            )}
                          </div>

                          <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>All 6 CV templates unlocked</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>AI Roman Urdu translator</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>High-DPI PDF &amp; Word</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlanAndProceed(p.id);
                          }}
                          className={`mt-4 w-full py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <span>Select Plan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Safe &amp; Direct verification via Easypaisa or Bank</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep('payment')}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Proceed to Payment (Rs. {selectedPlan.pricePkr})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PAYMENT SCREEN */}
            {step === 'payment' && (
              <motion.div
                key="step-pay"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                {/* Plan Bar with Change Link */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Selected: {selectedPlan.name}
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                      Rs. {selectedPlan.pricePkr}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('select_plan')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Plan</span>
                  </button>
                </div>

                {/* Method Tabs */}
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
                    Payment Method
                  </div>
                  <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('easypaisa')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'easypaisa'
                          ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Easypaisa Mobile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bank')}
                      className={`flex-1 inline-flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
                        paymentMethod === 'bank'
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Bank Transfer / Raast</span>
                    </button>
                  </div>
                </div>

                {/* Account Details Box */}
                {paymentMethod === 'easypaisa' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Account Title
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {paymentAccounts.easypaisaTitle}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Easypaisa Mobile Number
                          </div>
                          <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {paymentAccounts.easypaisaNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopy(paymentAccounts.easypaisaNumber, 'easypaisa')
                          }
                          className="p-1.5 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Copy Mobile Number"
                        >
                          {copiedKey === 'easypaisa' ? (
                            <CheckCheck className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Bank Name &amp; Title
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {paymentAccounts.bankName} · {paymentAccounts.bankTitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          Account Number
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          {paymentAccounts.bankAccount}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(paymentAccounts.bankAccount, 'acc_num')
                        }
                        className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        {copiedKey === 'acc_num' ? (
                          <CheckCheck className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {paymentAccounts.iban && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            IBAN (Raast Transfer)
                          </div>
                          <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                            {paymentAccounts.iban}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentAccounts.iban, 'iban')}
                          className="p-1.5 text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                        >
                          {copiedKey === 'iban' ? (
                            <CheckCheck className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 3 Step Instruction Guide */}
                <div className="p-3.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">
                    How it Works:
                  </div>
                  <div>1. Apne Easypaisa ya Bank app se <strong className="text-slate-900 dark:text-white">Rs. {selectedPlan.pricePkr}</strong> send karein.</div>
                  <div>2. SMS ya receipt se <strong className="text-slate-900 dark:text-white">Transaction ID (TID)</strong> copy karein.</div>
                  <div>3. Neeche apna Mobile No. aur TID enter kar ke <strong className="text-emerald-600 dark:text-emerald-400">Submit Payment Proof</strong> press karein.</div>
                </div>

                {/* Proof Submission Form */}
                <form onSubmit={handleSubmitProof} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Your Full Name
                      </label>
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="e.g. Zulqarnain Shah"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Sender Mobile Number <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={senderPhone}
                        onChange={(e) => setSenderPhone(e.target.value)}
                        placeholder="03001234567"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction ID (TID) / Ref No. <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="e.g. 81726354891"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Additional Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Transfer time or additional info"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                      {errorMsg}
                    </div>
                  )}

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('select_plan')}
                      className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Back to Plans</span>
                    </button>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                      {onInstantActivatePlan && (
                        <button
                          type="button"
                          onClick={handleInstantDemoActivate}
                          disabled={submitting}
                          className="inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl"
                          title="Instantly unlocks this plan in local testing mode"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Test Mode Unlock</span>
                        </button>
                      )}

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Submitting Proof...</span>
                          </>
                        ) : (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Submit Payment Proof</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}

            {/* STEP 3: SUBMITTED SUCCESS & LIVE SYNC */}
            {step === 'submitted' && (
              <motion.div
                key="step-submitted"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="py-8 text-center space-y-4"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm animate-bounce">
                  <CheckCheck className="w-9 h-9" />
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Payment Proof Submitted Successfully!
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  Shukriya! Aap ka payment proof record ho chuka hai:
                </p>

                <div className="inline-block p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1">
                  <div><strong>Plan:</strong> {selectedPlan.name} (Rs. {selectedPlan.pricePkr})</div>
                  <div><strong>Transaction ID:</strong> <span className="font-mono font-bold text-emerald-600">{trxId}</span></div>
                  <div><strong>Method:</strong> {paymentMethod === 'easypaisa' ? 'Easypaisa Mobile' : 'Bank Transfer'}</div>
                </div>

                {/* Real-time synchronization badge */}
                <div className="max-w-md mx-auto p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2.5 text-left">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                  </span>
                  <span>
                    <strong>Real-Time Live Sync Active:</strong> Jese hi Admin (Zulqarnain Shah) aap ka TID verify kar ke Approve kare ga, aap ka plan yahan automatic activate ho jaye ga! Page refresh karne ki zaroorat nahi.
                  </span>
                </div>

                <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Close &amp; Keep Editing
                  </button>

                  {onInstantActivatePlan && (
                    <button
                      type="button"
                      onClick={handleInstantDemoActivate}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Instant Test Mode Activate</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
