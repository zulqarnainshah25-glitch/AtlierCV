import React from 'react';
import {
  Plus,
  Pencil,
  Copy,
  Trash2,
  FileText,
  CreditCard,
  CheckCircle2,
  FolderOpen,
  BarChart3,
  Layers,
  LayoutTemplate,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { CVDocument, CVTemplate, UserProfile } from '../types/cv';

interface DashboardViewProps {
  user: UserProfile;
  cvs: CVDocument[];
  templates: CVTemplate[];
  onCreateNewCV: () => void;
  onEditCV: (cv: CVDocument, openInPreview: boolean) => void;
  onDuplicateCV: (cv: CVDocument) => void;
  onDeleteCV: (cvId: string) => void;
  onOpenPaywall: (reason: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  cvs,
  templates,
  onCreateNewCV,
  onEditCV,
  onDuplicateCV,
  onDeleteCV,
  onOpenPaywall
}) => {
  const isPaidUser = user.plan !== 'free';
  const isUnlimited = user.plan === 'unlimited' || user.plan === 'premium';
  const pdfLimitDisplay = isUnlimited ? '∞' : String(user.pdfLimit ?? (user.plan === 'free' ? 1 : 10));
  const wordLimitDisplay = isUnlimited ? '∞' : String(user.wordLimit ?? (user.plan === 'starter' ? 2 : user.plan === 'pro' ? 10 : 0));

  // Analytics calculations
  const totalCVVersions = cvs.length;
  const polishedCVCount = cvs.filter((c) => c.isPolished).length;

  // Calculate template usage counts
  const templateUsageCounts: Record<string, number> = {};
  cvs.forEach((cv) => {
    const tId = cv.templateId || 'modern-atelier';
    templateUsageCounts[tId] = (templateUsageCounts[tId] || 0) + 1;
  });

  const templateStats = Object.entries(templateUsageCounts)
    .map(([templateId, count]) => {
      const tpl = templates.find((t) => t.id === templateId);
      const percentage = totalCVVersions > 0 ? Math.round((count / totalCVVersions) * 100) : 0;
      return {
        id: templateId,
        name: tpl?.name || templateId,
        category: tpl?.category || 'Professional',
        accentColor: tpl?.accentColor || '#38BDF8',
        isPremium: tpl?.isPremium ?? false,
        count,
        percentage
      };
    })
    .sort((a, b) => b.count - a.count);

  const mostUsedTemplate = templateStats.length > 0 ? templateStats[0] : null;

  // Total roles & skills tracked across all CV versions
  const totalRolesLogged = cvs.reduce((sum, c) => sum + (c.experience?.length || 0), 0);
  const totalSkillsLogged = cvs.reduce((sum, c) => sum + (c.skills?.length || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Summary Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-colors">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-y-1">
            <span>Workspace Dashboard</span>
            <span className="mx-2">·</span>
            <span>{user.email}</span>
            <span className="mx-2">·</span>
            <span className="font-mono tabular-nums">
              Plan: <strong className="text-emerald-600 dark:text-emerald-400 uppercase font-bold">{user.plan}</strong>
            </span>
            <span className="mx-2">·</span>
            <span className="font-mono tabular-nums">
              PDF Downloads: {user.pdfExportsUsed}/{pdfLimitDisplay}
            </span>
            <span className="mx-2">·</span>
            <span className="font-mono tabular-nums">
              Word Downloads: {user.wordExportsUsed ?? 0}/{wordLimitDisplay}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1.5">
            Welcome back, {user.displayName}
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Manage your saved CVs, duplicate tailored versions for specific roles, or create a new AI-polished resume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!isUnlimited && (
            <button
              type="button"
              onClick={() =>
                onOpenPaywall(
                  'Upgrade your plan via Easypaisa or Bank Transfer to unlock all templates, extra PDF downloads, and structured Word (.docx) exports.'
                )
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-800" />
              <span>{user.plan === 'free' ? 'Upgrade Plan (Rs. 200 / 500 / 1000)' : 'Change Plan'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCreateNewCV}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New CV</span>
          </button>
        </div>
      </div>

      {/* CV Analytics & Insights Section */}
      <section className="mb-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 transition-colors shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                CV Portfolio Analytics &amp; Template Usage
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Real-time insights across your saved resume versions, template adoption, and AI polishing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Workspace Sync</span>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Total CV Versions */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Total CV Versions</span>
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {totalCVVersions}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {totalCVVersions === 0
                ? 'No drafts yet'
                : `${totalCVVersions} tailored career version${totalCVVersions > 1 ? 's' : ''}`}
            </div>
          </div>

          {/* Card 2: Most Used Template */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Most Used Template</span>
              <LayoutTemplate className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="mt-2 text-base font-bold text-slate-900 dark:text-white truncate">
              {mostUsedTemplate ? mostUsedTemplate.name : 'None Yet'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              {mostUsedTemplate ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: mostUsedTemplate.accentColor }}
                  />
                  <span className="truncate">
                    {mostUsedTemplate.count} CV{mostUsedTemplate.count > 1 ? 's' : ''} ({mostUsedTemplate.percentage}%)
                  </span>
                </>
              ) : (
                <span>Create a CV to track template use</span>
              )}
            </div>
          </div>

          {/* Card 3: AI Polished Resumes */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">AI ATS-Polished</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {polishedCVCount}
              <span className="text-xs font-normal text-slate-400 ml-1">/ {totalCVVersions}</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {totalCVVersions > 0
                ? `${Math.round((polishedCVCount / totalCVVersions) * 100)}% ATS optimized`
                : 'Action-verb ready'}
            </div>
          </div>

          {/* Card 4: Career Experience Footprint */}
          <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="text-xs font-semibold">Experience &amp; Skills</span>
              <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {totalRolesLogged} <span className="text-xs font-normal text-slate-500">roles</span> · {totalSkillsLogged} <span className="text-xs font-normal text-slate-500">skills</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Logged across your CV library
            </div>
          </div>
        </div>

        {/* Template Adoption Breakdown Bars */}
        {templateStats.length > 0 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Template Adoption Breakdown
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {templateStats.length} template{templateStats.length > 1 ? 's' : ''} currently utilized
              </span>
            </div>
            <div className="space-y-3">
              {templateStats.map((item) => (
                <div key={item.id} className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: item.accentColor }}
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        ({item.category})
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          item.isPremium
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {item.isPremium ? 'Paid' : 'Free'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                      <span>{item.count} CV{item.count > 1 ? 's' : ''}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-900 dark:text-white">{item.percentage}%</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.percentage}%`,
                        backgroundColor: item.accentColor || '#38BDF8'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Saved CVs Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
          Your Saved CVs ({cvs.length})
        </h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Synced with localStorage & Firestore Offline Persistence
        </span>
      </div>

      {cvs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center transition-colors">
          <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Saved CVs Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Start by creating your first CV. Enter raw career notes in simple language and let Groq Llama 3.3 70B structure your complete ATS-ready resume.
          </p>
          <button
            type="button"
            onClick={onCreateNewCV}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First CV</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cvs.map((cv) => {
            const tpl = templates.find((t) => t.id === cv.templateId) || templates[0];
            return (
              <div
                key={cv.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                        {cv.title || `${cv.fullName || 'Untitled'} CV`}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {cv.fullName || 'No Name'} · {cv.jobTitle || 'No Role'}
                      </p>
                    </div>
                    {cv.isPolished && (
                      <span title="AI Polished" className="shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    <span>Template: {tpl?.name || cv.templateId}</span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono tabular-nums">
                      {cv.experience?.length || 0} roles
                    </span>
                    <span className="mx-1.5">·</span>
                    <span className="font-mono tabular-nums">
                      {cv.skills?.length || 0} skills
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {cv.summary || cv.rawSummary || 'No summary added yet.'}
                  </p>
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditCV(cv, true)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 rounded-md whitespace-nowrap shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Preview & Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditCV(cv, false)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md whitespace-nowrap shrink-0"
                      title="Edit Raw Form"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>Form</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onDuplicateCV(cv)}
                      title="Duplicate CV"
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCV(cv.id)}
                      title="Delete CV"
                      className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
