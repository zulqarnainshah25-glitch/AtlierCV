import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Plus,
  Trash2,
  Pencil,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Calendar,
  Star,
  Zap,
  Heart,
  Flag,
  Award,
  Check,
  User,
  Briefcase,
  GraduationCap,
  Rocket,
  FileText,
  Languages
} from 'lucide-react';
import {
  CVDocument,
  CVTemplate,
  TemplateLayoutType,
  WorkExperienceItem,
  EducationItem,
  ProjectItem,
  SkillGroup,
  ReferenceItem,
  ProficiencyItem,
  RemovableFieldKey
} from '../types/cv';
import {
  cleanText,
  cleanCVDocumentText,
  enforceConciseSummary,
  isValidUrl,
  inferSkillTierAndPercentage,
  inferLanguageProficiencyAndPercentage
} from '../lib/textSanitizer';

export type TemplateGridSectionId =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'references';

export interface TemplateGridLayoutConfig {
  layoutType: TemplateLayoutType;
  gridContainerClass: string;
  hasSidebar: boolean;
  sidebarPosition: 'left' | 'right' | 'none';
  headerColSpanClass: string;
  sidebarColSpanClass: string;
  mainColSpanClass: string;
  sectionOrder: {
    sidebar: TemplateGridSectionId[];
    main: TemplateGridSectionId[];
  };
}

/**
 * Maps each template `layoutType` string from the template JSON to its 12-column CSS Grid
 * (`grid-cols-12`) architecture, `col-span-*` column widths, and dynamic section distribution.
 */
export const LAYOUT_TYPE_GRID_MAP: Record<TemplateLayoutType, TemplateGridLayoutConfig> = {
  'two-column-left': {
    layoutType: 'two-column-left',
    gridContainerClass: 'grid grid-cols-12 min-h-[1122px] overflow-hidden',
    hasSidebar: true,
    sidebarPosition: 'left',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'col-span-4',
    mainColSpanClass: 'col-span-8',
    sectionOrder: {
      sidebar: ['skills', 'languages', 'certifications'],
      main: ['summary', 'experience', 'education', 'projects', 'references']
    }
  },
  'two-column-right': {
    layoutType: 'two-column-right',
    gridContainerClass: 'grid grid-cols-12 min-h-[1122px] overflow-hidden',
    hasSidebar: true,
    sidebarPosition: 'right',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'col-span-4',
    mainColSpanClass: 'col-span-8',
    sectionOrder: {
      sidebar: ['skills', 'languages', 'certifications'],
      main: ['summary', 'experience', 'education', 'projects', 'references']
    }
  },
  'header-top': {
    layoutType: 'header-top',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  },
  'single-column-classic': {
    layoutType: 'single-column-classic',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  },
  'minimal-timeline': {
    layoutType: 'minimal-timeline',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  },
  'minimal-editorial': {
    layoutType: 'minimal-editorial',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  },
  'ats-clean': {
    layoutType: 'ats-clean',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'education',
        'skills',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  },
  'creative-split': {
    layoutType: 'creative-split',
    gridContainerClass: 'grid grid-cols-12 overflow-hidden',
    hasSidebar: false,
    sidebarPosition: 'none',
    headerColSpanClass: 'col-span-12',
    sidebarColSpanClass: 'hidden',
    mainColSpanClass: 'col-span-12',
    sectionOrder: {
      sidebar: [],
      main: [
        'summary',
        'experience',
        'skills',
        'education',
        'projects',
        'certifications',
        'languages',
        'references'
      ]
    }
  }
};

/**
 * Resolves the effective `grid-cols-12` layout configuration from a `CVTemplate` JSON object,
 * handling both explicit `layoutType` values and custom CSS / legacy template overrides.
 */
export function resolveTemplateGridLayout(template: CVTemplate): TemplateGridLayoutConfig {
  const hasHeaderSectionCssOnly =
    Boolean(template.customCss && template.customCss.includes('.header-section')) &&
    !Boolean(template.customCss && template.customCss.includes('.sidebar'));
  const isHeaderTopNameOrDesc =
    Boolean(
      template.name &&
        /top\s*header|blue\s*banner|header\s*dark|banner|hexagon/i.test(template.name) &&
        !template.customCss?.includes('.sidebar')
    );

  const effectiveLayoutType: TemplateLayoutType =
    template.layoutType === 'header-top' || hasHeaderSectionCssOnly || isHeaderTopNameOrDesc
      ? 'header-top'
      : LAYOUT_TYPE_GRID_MAP[template.layoutType]
      ? template.layoutType
      : 'two-column-left';

  const baseConfig = LAYOUT_TYPE_GRID_MAP[effectiveLayoutType];

  // Classic Dark Sidebar places Certifications in the main column and keeps Skills + Languages in the sidebar
  const isClassicDark =
    effectiveLayoutType !== 'header-top' &&
    (template.id === 'classic-dark-sidebar' ||
      template.thumbnailType === 'classic-dark-sidebar' ||
      Boolean(template.name && template.name.toLowerCase().includes('classic dark sidebar')) ||
      ((effectiveLayoutType === 'two-column-left' || effectiveLayoutType === 'two-column-right') &&
        Boolean(template.customCss && template.customCss.includes('.sidebar h2'))));

  const forceLeftSidebar =
    template.id === 'classic-dark-sidebar' ||
    Boolean(template.description && template.description.toLowerCase().includes('sidebar on the left'));

  if (isClassicDark) {
    return {
      ...baseConfig,
      sidebarPosition:
        effectiveLayoutType === 'two-column-right' && !forceLeftSidebar ? 'right' : 'left',
      sectionOrder: {
        sidebar: ['skills', 'languages'],
        main: ['summary', 'experience', 'education', 'projects', 'certifications', 'references']
      }
    };
  }

  return baseConfig;
}

const LIVE_SKILL_COMMAND_OPTIONS: Array<{ label: string; level: string; percentage: number }> = [
  { label: 'Expert / Master (100%)', level: 'Expert', percentage: 100 },
  { label: 'Expert (90%)', level: 'Expert', percentage: 90 },
  { label: 'Proficient (85%)', level: 'Proficient', percentage: 85 },
  { label: 'Intermediate (75%)', level: 'Intermediate', percentage: 75 },
  { label: 'Basic (60%)', level: 'Basic', percentage: 60 }
];

const LIVE_LANG_COMMAND_OPTIONS: Array<{ label: string; level: string; percentage: number }> = [
  { label: 'Native / Bilingual (100%)', level: 'Native / Bilingual', percentage: 100 },
  { label: 'Fluent — C2 (95%)', level: 'Fluent (C2)', percentage: 95 },
  { label: 'Fluent — C1 (90%)', level: 'Fluent (C1)', percentage: 90 },
  { label: 'Professional — B2 (80%)', level: 'Professional (B2)', percentage: 80 },
  { label: 'Conversational — B1 (75%)', level: 'Conversational (B1)', percentage: 75 },
  { label: 'Basic — A2 (60%)', level: 'Basic (A2)', percentage: 60 }
];

interface CVTemplateRendererProps {
  cv: CVDocument;
  template: CVTemplate;
  editable: boolean;
  isPremiumUser: boolean;
  onChange?: (updated: CVDocument) => void;
  onBlurSync?: () => void;
  onRemoveField?: (key: RemovableFieldKey) => void;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
}

// Inline editable text primitive that preserves spaces while typing
// and NEVER leaks placeholders into static / PDF export
const EditableSpan: React.FC<{
  value: string;
  placeholder: string;
  editable: boolean;
  multiline?: boolean;
  isUrl?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onSave: (val: string) => void;
  onBlurSync?: () => void;
}> = ({
  value,
  placeholder,
  editable,
  multiline = false,
  isUrl = false,
  className = '',
  style,
  onSave,
  onBlurSync
}) => {
  const displayVal = cleanText(value, false);
  const cleanStaticVal = cleanText(value, true);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (multiline && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [displayVal, multiline]);

  const urlBreakClass = isUrl ? 'cv-url-text break-all' : 'break-words';

  const resolvedColorStyle = style?.color ? { color: style.color } : { color: 'inherit' };

  if (!editable) {
    if (!cleanStaticVal) return null;
    if (multiline) {
      return (
        <div
          style={{
            display: 'block',
            whiteSpace: 'pre-wrap',
            wordSpacing: 'normal',
            textAlign: style?.textAlign || 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'left',
            hyphens: 'auto',
            ...resolvedColorStyle,
            ...style
          }}
          className={`${urlBreakClass} ${className}`}
        >
          {cleanStaticVal}
        </div>
      );
    }
    return (
      <span
        style={{ whiteSpace: 'pre-wrap', wordSpacing: 'normal', ...resolvedColorStyle, ...style }}
        className={`${urlBreakClass} ${className}`}
      >
        {cleanStaticVal}
      </span>
    );
  }

  const { display: _omitDisplay, ...safeStaticStyle } = style || {};

  if (multiline) {
    return (
      <div className="relative group/edit w-full">
        <textarea
          ref={textareaRef}
          value={displayVal}
          placeholder={placeholder}
          rows={1}
          onChange={(e) => {
            onSave(cleanText(e.target.value, false));
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onBlur={() => {
            onSave(cleanText(displayVal, true));
            onBlurSync?.();
          }}
          style={{
            whiteSpace: 'pre-wrap',
            wordSpacing: 'normal',
            textAlign: style?.textAlign || 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'left',
            hyphens: 'auto',
            ...resolvedColorStyle,
            ...style
          }}
          className={`cv-interactive-field w-full bg-transparent resize-none overflow-hidden rounded px-1 -mx-1 border border-transparent hover:border-dashed hover:border-slate-400 focus:border-solid focus:border-blue-500 focus:bg-blue-50/20 focus:outline-none transition-colors leading-snug ${urlBreakClass} ${className}`}
        />
        {cleanStaticVal && (
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordSpacing: 'normal',
              textAlign: safeStaticStyle?.textAlign || 'justify',
              textJustify: 'inter-word',
              textAlignLast: 'left',
              hyphens: 'auto',
              ...resolvedColorStyle,
              ...safeStaticStyle
            }}
            className={`cv-static-export-block leading-snug ${urlBreakClass} ${className}`}
          >
            {cleanStaticVal}
          </div>
        )}
        <Pencil className="cv-edit-cue w-3 h-3 text-slate-400 opacity-0 group-hover/edit:opacity-100 absolute -right-4 top-1 pointer-events-none transition-opacity" />
      </div>
    );
  }

  return (
    <span className={`relative group/edit inline-block max-w-full align-baseline ${urlBreakClass}`}>
      <input
        type="text"
        value={displayVal}
        placeholder={placeholder}
        onChange={(e) => onSave(cleanText(e.target.value, false))}
        onBlur={() => {
          onSave(cleanText(displayVal, true));
          onBlurSync?.();
        }}
        style={{
          width: `${Math.min(Math.max((displayVal || placeholder).length + 2, 6), 44)}ch`,
          maxWidth: '100%',
          wordSpacing: 'normal',
          ...resolvedColorStyle,
          ...style
        }}
        className={`cv-interactive-field bg-transparent rounded px-0.5 border border-transparent hover:border-dashed hover:border-slate-400 focus:border-solid focus:border-blue-500 focus:bg-blue-50/20 focus:outline-none transition-colors ${urlBreakClass} ${className}`}
      />
      {cleanStaticVal && (
        <span
          style={{ whiteSpace: 'pre-wrap', wordSpacing: 'normal', ...resolvedColorStyle, ...safeStaticStyle }}
          className={`cv-static-export-inline ${urlBreakClass} ${className}`}
        >
          {cleanStaticVal}
        </span>
      )}
    </span>
  );
};

// Sortable Bullet Item inside a Work Experience Entry
const SortableBulletRow: React.FC<{
  id: string;
  bullet: string;
  editable: boolean;
  accentColor: string;
  onUpdate: (val: string) => void;
  onDelete: () => void;
  onBlurSync?: () => void;
}> = ({ id, bullet, editable, accentColor, onUpdate, onDelete, onBlurSync }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1
  };

  const cleanedBullet = cleanText(bullet, true);

  if (!editable) {
    if (!cleanedBullet) return null;
    return (
      <li className="text-[11.5px] leading-snug text-slate-700 flex items-start gap-2">
        <span
          className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
        <span
          style={{
            whiteSpace: 'pre-wrap',
            wordSpacing: 'normal',
            textAlign: 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'left'
          }}
          className="cv-bullet-text flex-1 min-w-0 break-words text-justify"
        >
          {cleanedBullet}
        </span>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group/bullet flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-700 py-0.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        title="Drag to reorder bullet"
        className="cv-edit-cue mt-0.5 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span
        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: accentColor }}
      />
      <div
        className="flex-1 min-w-0 text-justify"
        style={{ textAlign: 'justify', textJustify: 'inter-word', textAlignLast: 'left' }}
      >
        <EditableSpan
          value={cleanedBullet}
          placeholder="Describe key impact and quantified achievement..."
          editable={editable}
          multiline={true}
          className="cv-bullet-text text-justify"
          style={{ textAlign: 'justify', textJustify: 'inter-word', textAlignLast: 'left' }}
          onSave={onUpdate}
          onBlurSync={onBlurSync}
        />
      </div>
      <button
        type="button"
        onClick={onDelete}
        title="Delete bullet"
        className="cv-edit-cue opacity-0 group-hover/bullet:opacity-100 max-sm:opacity-90 p-1 min-w-[24px] min-h-[24px] flex items-center justify-center text-slate-400 hover:text-red-600 transition-opacity shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
};

// Sortable Work Experience Entry (supports standard, vertical timeline with circle nodes, and serif styles)
const SortableExperienceCard: React.FC<{
  item: WorkExperienceItem;
  editable: boolean;
  accentColor: string;
  isTimeline?: boolean;
  isSerif?: boolean;
  onUpdateItem: (updated: WorkExperienceItem) => void;
  onDeleteItem: () => void;
  onBlurSync?: () => void;
}> = ({
  item,
  editable,
  accentColor,
  isTimeline = false,
  isSerif = false,
  onUpdateItem,
  onDeleteItem,
  onBlurSync
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const baseStyle: React.CSSProperties = editable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1
      }
    : {};

  const displayBullets = (
    item.bullets && item.bullets.length > 0
      ? item.bullets
      : item.rawDescription
      ? item.rawDescription.split('\n').filter(Boolean)
      : []
  ).map((b) => cleanText(b, true));

  const bulletIds = displayBullets.map((_, idx) => `${item.id}_b_${idx}`);

  const handleBulletDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bulletIds.indexOf(String(active.id));
    const newIndex = bulletIds.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(displayBullets, oldIndex, newIndex);
      onUpdateItem({ ...item, bullets: reordered });
      onBlurSync?.();
    }
  };

  const startText = cleanText(item.startDate, true);
  const endText = cleanText(item.endDate, true);
  const dateDisplay =
    startText && endText ? `${startText} – ${endText}` : startText || endText || '';

  return (
    <div
      ref={editable ? setNodeRef : undefined}
      style={
        isTimeline
          ? { ...baseStyle, borderLeftColor: accentColor }
          : baseStyle
      }
      className={`group/exp relative transition-colors cv-avoid-break ${
        isTimeline ? 'pl-6 border-l-2 pb-4 last:pb-1' : 'py-1 rounded-lg'
      }`}
    >
      {/* Circle Bullet Node for Timeline Classic Template */}
      {isTimeline && (
        <span
          className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 flex items-center justify-center"
          style={{ borderColor: accentColor }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1.5 flex-1 min-w-0">
          {editable && (
            <button
              type="button"
              {...attributes}
              {...listeners}
              title="Drag to reorder role"
              className="cv-edit-cue mt-1 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            {/* LINE 1 (TOP / UPAR): Company / Organization Name in Bold */}
            {(item.company || editable) && (
              <div className={!item.company ? 'cv-edit-cue' : 'w-full'}>
                <span className="font-bold text-[13.5px] text-slate-900 leading-snug block" style={{ color: '#0F172A' }}>
                  <EditableSpan
                    value={item.company}
                    placeholder="Company / Organization Name"
                    editable={editable}
                    style={{ color: '#0F172A' }}
                    onSave={(val) => onUpdateItem({ ...item, company: val })}
                    onBlurSync={onBlurSync}
                  />
                </span>
              </div>
            )}

            {/* LINE 2 (BELOW / NICHE): Role / Designation on Left + Work Period (e.g. 2016 – 2022) on Right */}
            <div className="flex items-baseline justify-between gap-3 mt-0.5 w-full">
              <div className="min-w-0 flex-1">
                <span
                  className={`text-[12px] font-semibold ${isSerif ? 'italic' : ''}`}
                  style={{ color: accentColor }}
                >
                  <EditableSpan
                    value={item.role}
                    placeholder="Job Role / Title (e.g. Trainee)"
                    editable={editable}
                    style={{ color: accentColor }}
                    onSave={(val) => onUpdateItem({ ...item, role: val })}
                    onBlurSync={onBlurSync}
                  />
                </span>
              </div>

              {/* Work Experience Period / Dates (Strictly Right-Aligned next to Role) */}
              {(dateDisplay || editable) && (
                <div
                  className={`text-[11.5px] font-semibold text-slate-700 shrink-0 tabular-nums whitespace-nowrap ml-auto ${
                    !dateDisplay ? 'cv-edit-cue' : ''
                  } ${isTimeline && dateDisplay ? 'bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px]' : ''}`}
                >
                  {editable ? (
                    <span className="inline-flex items-center gap-1">
                      <EditableSpan
                        value={startText}
                        placeholder="Start Date"
                        editable={editable}
                        onSave={(val) => onUpdateItem({ ...item, startDate: val })}
                        onBlurSync={onBlurSync}
                      />
                      {(startText || endText) && <span>–</span>}
                      <EditableSpan
                        value={endText}
                        placeholder="End Date"
                        editable={editable}
                        onSave={(val) => onUpdateItem({ ...item, endDate: val })}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                  ) : (
                    <span>{dateDisplay}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {editable && (
          <button
            type="button"
            onClick={onDeleteItem}
            title="Delete Experience Entry"
            className="cv-edit-cue opacity-0 group-hover/exp:opacity-100 max-sm:opacity-90 p-1 min-w-[26px] min-h-[26px] flex items-center justify-center text-slate-400 hover:text-red-600 transition-opacity shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Bullets list with dnd-kit sorting */}
      {editable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleBulletDragEnd}
        >
          <SortableContext items={bulletIds} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1 mt-1">
              {displayBullets.map((b, idx) => (
                <SortableBulletRow
                  key={`${item.id}_b_${idx}`}
                  id={`${item.id}_b_${idx}`}
                  bullet={b}
                  editable={editable}
                  accentColor={accentColor}
                  onUpdate={(val) => {
                    const updated = [...displayBullets];
                    updated[idx] = cleanText(val, false);
                    onUpdateItem({ ...item, bullets: updated });
                  }}
                  onDelete={() => {
                    const updated = displayBullets.filter((_, i) => i !== idx);
                    onUpdateItem({ ...item, bullets: updated });
                    onBlurSync?.();
                  }}
                  onBlurSync={onBlurSync}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <ul className="space-y-1 mt-1">
          {displayBullets.map((b, idx) => (
            <SortableBulletRow
              key={idx}
              id={`${idx}`}
              bullet={b}
              editable={false}
              accentColor={accentColor}
              onUpdate={() => {}}
              onDelete={() => {}}
            />
          ))}
        </ul>
      )}

      {editable && (
        <button
          type="button"
          onClick={() => {
            const updated = [
              ...displayBullets,
              'Delivered measurable impact across core operational initiatives.'
            ];
            onUpdateItem({ ...item, bullets: updated });
            onBlurSync?.();
          }}
          className="cv-edit-cue add-btn mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 min-h-[24px] rounded-md bg-blue-50/80 hover:bg-blue-100/90 transition-colors whitespace-nowrap"
        >
          <Plus className="w-3 h-3 shrink-0" />
          <span>Bullet</span>
        </button>
      )}
    </div>
  );
};

// ============================================================================
// COLOR LUMINANCE & CONTRAST CORRECTION UTILITIES
// Ensures text colors inside CV templates are always readable on both Light
// and Dark app themes and prevents light-on-light or dark-on-dark text.
// ============================================================================
const NAMED_COLOR_HEX_MAP: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  navy: '#000080',
  slate: '#334155',
  gray: '#4b5563',
  grey: '#4b5563',
  silver: '#c0c0c0',
  transparent: '#ffffff'
};

function getColorLuminance(colorStr?: string): number | null {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const trimmed = colorStr.trim().toLowerCase();
  const mapped = NAMED_COLOR_HEX_MAP[trimmed] || trimmed;

  // Match #RGB or #RRGGBB
  const hexMatch = mapped.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  let r = 0;
  let g = 0;
  let b = 0;

  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else {
    const rgbMatch = mapped.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!rgbMatch) return null;
    r = Number(rgbMatch[1]);
    g = Number(rgbMatch[2]);
    b = Number(rgbMatch[3]);
  }

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function extractCssRuleColor(
  css: string | undefined,
  selectorPattern: RegExp,
  propName: 'background-color' | 'background' | 'color'
): string | null {
  if (!css) return null;
  const blockRegex = new RegExp(`${selectorPattern.source}[^{]*\\{([^}]*)\\}`, 'gi');
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(css)) !== null) {
    const body = match[1];
    const propRegex = new RegExp(`(?:^|;|\\s)${propName}\\s*:\\s*([^;!}]+)`, 'i');
    const propMatch = body.match(propRegex);
    if (propMatch && propMatch[1]) {
      const colorToken = propMatch[1].trim().match(/#[0-9a-f]{3,6}|rgba?\([^)]+\)|[a-z]+/i);
      if (colorToken && getColorLuminance(colorToken[0]) !== null) {
        return colorToken[0];
      }
    }
  }
  return null;
}

function ensureDarkTextOnWhite(colorStr: string | undefined, fallback = '#0F172A'): string {
  const lum = getColorLuminance(colorStr);
  if (lum !== null && lum <= 0.42 && colorStr) {
    return colorStr;
  }
  const fbLum = getColorLuminance(fallback);
  if (fbLum !== null && fbLum <= 0.42) {
    return fallback;
  }
  return '#0F172A';
}

function ensureLightTextOnDark(colorStr: string | undefined, fallback = '#FFFFFF'): string {
  const lum = getColorLuminance(colorStr);
  if (lum !== null && lum >= 0.42 && colorStr) {
    return colorStr;
  }
  const fbLum = getColorLuminance(fallback);
  if (fbLum !== null && fbLum >= 0.42) {
    return fallback;
  }
  return '#FFFFFF';
}

export const CVTemplateRenderer: React.FC<CVTemplateRendererProps> = ({
  cv: rawCv,
  template,
  editable,
  isPremiumUser,
  onChange,
  onBlurSync,
  onRemoveField,
  sheetRef
}) => {
  const cv = cleanCVDocumentText(rawCv);
  const [newSkillText, setNewSkillText] = useState('');
  const removed = new Set<RemovableFieldKey>(cv.removedFields || []);
  const isRemoved = (key: RemovableFieldKey) => removed.has(key);

  const gridLayout = resolveTemplateGridLayout(template);
  const layout = gridLayout.layoutType;

  // Top Banner / Header-Top Layout (Full-width colored/patterned header banner + single-column body below)
  const isHeaderTop = layout === 'header-top';

  // "Classic Dark Sidebar" (Dark grey sidebar with Name/Title at top, darker full-bleed .sidebar h2 section bars, white progress bars)
  const isClassicDarkSidebar =
    !isHeaderTop &&
    (template.id === 'classic-dark-sidebar' ||
      template.thumbnailType === 'classic-dark-sidebar' ||
      Boolean(template.name && template.name.toLowerCase().includes('classic dark sidebar')) ||
      ((layout === 'two-column-left' || layout === 'two-column-right') &&
        Boolean(template.customCss && template.customCss.includes('.sidebar h2'))));

  // 1. "Two-Column Sidebar" (two-column-left or two-column-right using 12-column CSS Grid)
  const isModernSidebar =
    !isHeaderTop &&
    gridLayout.hasSidebar &&
    !isClassicDarkSidebar;

  // Determine whether the sidebar column should be placed on the RIGHT (col-span-8 Left + col-span-4 Right)
  const isSidebarOnRight = gridLayout.sidebarPosition === 'right';

  // 2. "Timeline Classic" (White background + Serif font + Vertical Timeline with Circle Bullet nodes)
  const isTimelineClassic = layout === 'minimal-timeline';
  // 3. "Minimalist Clean" (Centered Name & Job Title + Skills as rounded tags/pills + airy 1-page spacing)
  const isMinimalistClean = layout === 'minimal-editorial' || layout === 'ats-clean';
  // 4. "Creative Accent" (Soft colored accent blocks behind Name & Section Headings + Circular Photo + 2-col Grid for Projects & Certifications)
  const isCreativeAccent = layout === 'creative-split';
  // 5. "Single-Column Classic" (Clean single-column format)
  const isExecutiveSerif = layout === 'single-column-classic';

  const isSerif =
    !isClassicDarkSidebar &&
    !isHeaderTop &&
    (isTimelineClassic ||
      template.id === 'executive-london' ||
      Boolean(template.fontFamily && /fraunces|georgia|serif|times|playfair/i.test(template.fontFamily)));

  // Contrast-safe text & accent colors for white main sheet vs dark/light sidebar & top banner
  const mainHeadingTextColor = ensureDarkTextOnWhite(
    template.secondaryColor,
    ensureDarkTextOnWhite(template.accentColor, '#0F172A')
  );
  const rawMainAccent = isModernSidebar
    ? ensureDarkTextOnWhite(template.accentColor, mainHeadingTextColor)
    : isClassicDarkSidebar
    ? ensureDarkTextOnWhite(template.accentColor, '#1F2937')
    : ensureDarkTextOnWhite(template.accentColor, ensureDarkTextOnWhite(template.secondaryColor, '#1E3A8A'));
  const mainAccentColor = ensureDarkTextOnWhite(rawMainAccent, '#1E3A8A');

  // Detect effective sidebar background color (including customCss overrides) to ensure proper text contrast
  const cssSidebarBg =
    extractCssRuleColor(template.customCss, /\.sidebar\b/, 'background-color') ||
    extractCssRuleColor(template.customCss, /\.sidebar\b/, 'background');
  const defaultSidebarBg = isClassicDarkSidebar
    ? ensureDarkTextOnWhite(template.accentColor, '#374151')
    : ensureDarkTextOnWhite(template.secondaryColor, ensureDarkTextOnWhite(template.accentColor, '#0F2942'));
  const effectiveSidebarBg = cssSidebarBg || defaultSidebarBg;
  const isSidebarDark = (getColorLuminance(effectiveSidebarBg) ?? 0.1) < 0.52;

  const sidebarAccentColor = isSidebarDark
    ? isClassicDarkSidebar
      ? '#FFFFFF'
      : ensureLightTextOnDark(template.accentColor, '#38BDF8')
    : mainAccentColor;

  // Detect effective header-top banner background color (including customCss overrides)
  const cssHeaderTopBg =
    extractCssRuleColor(template.customCss, /\.header-section\b/, 'background-color') ||
    extractCssRuleColor(template.customCss, /\.header-section\b/, 'background');
  const defaultHeaderTopBg = ensureDarkTextOnWhite(
    template.accentColor,
    ensureDarkTextOnWhite(template.secondaryColor, '#1E3A8A')
  );
  const effectiveHeaderTopBg = cssHeaderTopBg || defaultHeaderTopBg;
  const isHeaderTopDark = (getColorLuminance(effectiveHeaderTopBg) ?? 0.1) < 0.52;

  const softAccentBg = '#E6F4F1';

  const photoPosition = template.photoSlot?.position || 'top-right';
  const isPhotoHiddenByTemplate =
    photoPosition === 'hidden' ||
    photoPosition === 'none' ||
    template.photoSlot?.widthMm === 0 ||
    template.photoSlot?.heightMm === 0;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const updateCV = (patch: Partial<CVDocument>) => {
    if (!onChange) return;
    onChange({ ...cv, ...patch });
  };

  const handleRemoveKey = (key: RemovableFieldKey) => {
    if (onRemoveField) {
      onRemoveField(key);
      return;
    }
    const nextRemoved = Array.from(new Set([...(cv.removedFields || []), key]));
    const clearPatch: Partial<CVDocument> = { removedFields: nextRemoved };
    if (key === 'jobTitle') clearPatch.jobTitle = '';
    if (key === 'email') clearPatch.email = '';
    if (key === 'phone') clearPatch.phone = '';
    if (key === 'address') clearPatch.address = '';
    if (key === 'linkedinUrl') clearPatch.linkedinUrl = '';
    if (key === 'portfolioUrl') clearPatch.portfolioUrl = '';
    if (key === 'photoDataUrl') clearPatch.photoDataUrl = '';
    if (key === 'summary') {
      clearPatch.rawSummary = '';
      clearPatch.summary = '';
    }
    if (key === 'experience') clearPatch.experience = [];
    if (key === 'education') clearPatch.education = [];
    if (key === 'skills') {
      clearPatch.skills = [];
      clearPatch.skillGroups = [];
    }
    if (key === 'projects') clearPatch.projects = [];
    if (key === 'languages') clearPatch.languages = [];
    if (key === 'certifications') clearPatch.certifications = [];
    if (key === 'references') {
      clearPatch.references = [];
      clearPatch.referencesOnRequest = false;
    }
    updateCV(clearPatch);
    onBlurSync?.();
  };

  // Render Portrait (35x45mm) or Circular Photo Slot — respects photoSlot.position === 'hidden'
  const renderPhotoSlot = (options?: {
    centered?: boolean;
    circular?: boolean;
    darkSidebar?: boolean;
  }) => {
    if (isPhotoHiddenByTemplate || isRemoved('photoDataUrl') || !cv.photoDataUrl) return null;
    const rawRadius = String(template.photoSlot?.borderRadius || '6px').trim();
    const isCircle =
      options?.circular ||
      isCreativeAccent ||
      rawRadius === '9999px' ||
      rawRadius === '50%';

    const rawW = template.photoSlot?.widthMm || (isCircle ? 36 : 35);
    const rawH = template.photoSlot?.heightMm || (isCircle ? 36 : 45);
    const widthPx = isCircle && rawW === 35 && rawH === 45 ? 98 : Math.round(rawW * 2.6);
    const heightPx = isCircle && rawW === 35 && rawH === 45 ? 98 : Math.round(rawH * 2.6);

    const borderStyle = options?.darkSidebar
      ? template.photoSlot?.showBorder === false
        ? 'none'
        : `3px solid ${sidebarAccentColor}`
      : isCircle
      ? template.photoSlot?.showBorder === false
        ? 'none'
        : `3px solid ${template.accentColor || '#FFFFFF'}`
      : template.photoSlot?.showBorder
      ? `2px solid ${mainAccentColor}`
      : '1px solid #CBD5E1';

    return (
      <div
        data-photo-container={isCircle ? 'circle' : 'portrait'}
        data-photo-width={String(widthPx)}
        data-photo-height={String(heightPx)}
        className={`photo-slot group/photo relative shrink-0 overflow-hidden bg-slate-100 ${
          options?.centered ? 'mx-auto' : ''
        }`}
        style={{
          width: `${widthPx}px`,
          height: `${heightPx}px`,
          borderRadius: isCircle ? '9999px' : rawRadius,
          border: borderStyle
        }}
      >
        <img
          src={cv.photoDataUrl}
          alt={cv.fullName || 'Candidate Portrait'}
          data-photo-shape={isCircle ? 'circle' : 'portrait'}
          data-photo-width={String(widthPx)}
          data-photo-height={String(heightPx)}
          data-photo-radius={isCircle ? '9999px' : rawRadius}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          style={{
            borderRadius: isCircle ? '9999px' : rawRadius
          }}
        />
        {editable && (
          <button
            type="button"
            onClick={() => handleRemoveKey('photoDataUrl')}
            title="Remove Photo"
            className="cv-edit-cue opacity-0 group-hover/photo:opacity-100 absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        {!isPremiumUser && (
          <div className="cv-edit-cue absolute inset-x-0 bottom-0 bg-slate-900/75 text-white text-[8px] font-mono uppercase tracking-wider text-center py-0.5 pointer-events-none">
            AtelierCV Free
          </div>
        )}
      </div>
    );
  };

  // Injects base theme variables + customCss (including hexagon or geometric SVG patterns if applicable)
  const renderDynamicStyleSheet = () => {
    const isHexagonTemplate =
      Boolean(
        (template.id && template.id.toLowerCase().includes('hexagon')) ||
          (template.name && template.name.toLowerCase().includes('hexagon')) ||
          (template.description && template.description.toLowerCase().includes('hexagon')) ||
          (template.thumbnailType && template.thumbnailType.toLowerCase().includes('hexagon'))
      ) && !Boolean(template.customCss && template.customCss.includes('background-image'));

    const hexagonPatternCss = isHexagonTemplate
      ? `.header-section, .sidebar { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E"); }`
      : '';

    const defaultHeaderTopCss = isHeaderTop
      ? `.header-section { background-color: ${effectiveHeaderTopBg}; color: ${isHeaderTopDark ? '#FFFFFF' : '#0F172A'}; }`
      : '';

    const defaultSidebarCss =
      isModernSidebar || isClassicDarkSidebar
        ? `.sidebar { background-color: ${effectiveSidebarBg}; color: ${isSidebarDark ? '#FFFFFF' : '#0F172A'}; }`
        : '';

    return (
      <style>{`
        ${defaultHeaderTopCss}
        ${defaultSidebarCss}
        ${hexagonPatternCss}
        ${template.customCss || ''}
      `}</style>
    );
  };

  // Section Header Renderer tailored to each international template design
  // Enforces white-space: nowrap & word-break: normal so headings like CERTIFICATIONS never wrap letter-by-letter
  const renderSectionHeader = (
    title: string,
    removeKey: RemovableFieldKey,
    darkSidebar = false
  ) => {
    const headingNoWrapStyle: React.CSSProperties = {
      whiteSpace: 'nowrap',
      wordBreak: 'normal',
      overflowWrap: 'normal',
      wordSpacing: 'normal',
      margin: 0,
      display: 'block'
    };

    // Classic Dark Sidebar Main Column Header (.main-heading)
    if (isClassicDarkSidebar && !darkSidebar) {
      return (
        <div
          className="main-heading flex items-center justify-between gap-2 mb-3 pb-1.5 border-b-2 overflow-hidden"
          style={{
            borderBottom: '2px solid #E5E7EB',
            paddingBottom: '5px',
            marginBottom: '10px',
            display: 'flex',
            width: '100%'
          }}
        >
          <h3
            className="cv-section-heading text-[14.5px] font-bold tracking-tight whitespace-nowrap truncate"
            style={{ ...headingNoWrapStyle, color: '#1F2937' }}
          >
            {title}
            <span className="sr-only">{'\n'}</span>
          </h3>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              title={`Remove ${title} section`}
              className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 px-1.5 py-1 min-h-[24px] rounded hover:bg-red-50 transition-opacity shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Classic Dark Sidebar Left Column Full-Bleed Header (.sidebar h2)
    if (isClassicDarkSidebar && darkSidebar) {
      const barBg = template.secondaryColor || '#1F2937';
      return (
        <div
          className="flex items-center justify-between gap-1.5 overflow-hidden"
          style={{
            backgroundColor: barBg,
            color: '#FFFFFF',
            padding: '6px 20px',
            marginLeft: '-20px',
            marginRight: '-20px',
            marginBottom: '12px',
            display: 'flex'
          }}
        >
          <h2
            className="cv-section-heading text-[13px] font-bold tracking-wide whitespace-nowrap truncate"
            style={{ ...headingNoWrapStyle, color: '#FFFFFF' }}
          >
            {title}
            <span className="sr-only">{'\n'}</span>
          </h2>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              title={`Remove ${title} section`}
              className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center justify-center text-[10px] text-red-300 hover:text-white p-1 min-w-[24px] min-h-[24px] rounded transition-opacity shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Dark Sidebar Section Header (for Modern Sidebar / Emerald Sidebar left column)
    if (darkSidebar) {
      return (
        <div
          className="flex items-center justify-between gap-1.5 mb-2.5 pb-1 border-b overflow-hidden"
          style={{
            borderColor: 'rgba(255,255,255,0.22)',
            marginBottom: '10px',
            paddingBottom: '4px',
            display: 'flex',
            width: '100%'
          }}
        >
          <h3
            className="cv-section-heading text-[11px] font-bold uppercase tracking-wider whitespace-nowrap truncate"
            style={{ ...headingNoWrapStyle, color: sidebarAccentColor }}
          >
            {title}
            <span className="sr-only">{'\n'}</span>
          </h3>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              title={`Remove ${title} section`}
              className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center justify-center text-[10px] text-red-300 hover:text-white p-1 min-w-[24px] min-h-[24px] rounded transition-opacity shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Template 4 ("Creative Accent"): Soft colored accent block behind section headings
    if (isCreativeAccent) {
      return (
        <div
          className="flex items-center justify-between gap-2 mb-2.5 px-3 py-1.5 rounded-md overflow-hidden"
          style={{
            backgroundColor: softAccentBg,
            borderLeft: `4px solid ${mainAccentColor}`,
            marginBottom: '10px',
            display: 'flex',
            width: '100%'
          }}
        >
          <h3
            className="cv-section-heading text-[11.5px] font-bold uppercase tracking-wider whitespace-nowrap truncate"
            style={{ ...headingNoWrapStyle, color: mainHeadingTextColor }}
          >
            {title}
            <span className="sr-only">{'\n'}</span>
          </h3>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              title={`Remove ${title} section`}
              className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 px-1.5 py-1 min-h-[24px] rounded hover:bg-red-50 transition-opacity shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Template 2 ("Timeline Classic"): Serif heading with circle icon accent
    if (isTimelineClassic) {
      return (
        <div
          className="flex items-center justify-between gap-2 mb-2.5 pb-1 border-b-2 overflow-hidden"
          style={{
            borderColor: mainAccentColor,
            marginBottom: '10px',
            paddingBottom: '4px',
            display: 'flex',
            width: '100%'
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: mainAccentColor }}
            />
            <h3
              className="cv-section-heading text-[12px] font-bold uppercase tracking-widest whitespace-nowrap truncate"
              style={{ ...headingNoWrapStyle, color: mainAccentColor }}
            >
              {title}
              <span className="sr-only">{'\n'}</span>
            </h3>
          </div>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              title={`Remove ${title} section`}
              className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 px-1.5 py-1 min-h-[24px] rounded hover:bg-red-50 transition-opacity shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    // Template 3 ("Minimalist Clean"), Header-Top, Single-Column Classic & Standard
    return (
      <div
        className="main-heading flex items-center justify-between gap-2 mb-2.5 pb-1 border-b-2 overflow-hidden"
        style={{
          borderColor: isMinimalistClean ? '#CBD5E1' : `${mainAccentColor}45`,
          marginBottom: '10px',
          paddingBottom: '4px',
          display: 'flex',
          width: '100%'
        }}
      >
        <h3
          className="cv-section-heading text-[11.5px] font-bold uppercase tracking-widest whitespace-nowrap truncate"
          style={{ ...headingNoWrapStyle, color: mainAccentColor }}
        >
          {title}
          <span className="sr-only">{'\n'}</span>
        </h3>
        {editable && (
          <button
            type="button"
            onClick={() => handleRemoveKey(removeKey)}
            title={`Remove ${title} section`}
            className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 max-sm:opacity-90 inline-flex items-center gap-1 text-[10px] text-red-600 hover:text-red-800 px-1.5 py-1 min-h-[24px] rounded hover:bg-red-50 transition-opacity shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

  const handleExperienceDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = cv.experience.findIndex((e) => e.id === active.id);
    const newIdx = cv.experience.findIndex((e) => e.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) {
      updateCV({ experience: arrayMove(cv.experience, oldIdx, newIdx) });
      onBlurSync?.();
    }
  };

  // 1. Professional Summary (Block margin below heading so heading and text never merge)
  const renderSummarySection = () => {
    if (isRemoved('summary')) return null;
    const text = enforceConciseSummary(cv.summary || cv.rawSummary);
    if (!text && !editable) return null;
    return (
      <section className={`group/sec ${isMinimalistClean ? 'mb-3.5' : 'mb-4'} cv-avoid-break block`}>
        {renderSectionHeader('Professional Summary', 'summary')}
        <div
          className="cv-summary-text text-[11.5px] leading-relaxed text-slate-700 mt-2 block text-justify"
          style={{
            display: 'block',
            marginTop: '8px',
            color: '#334155',
            textAlign: 'justify',
            textJustify: 'inter-word',
            textAlignLast: 'left',
            hyphens: 'auto'
          }}
        >
          <EditableSpan
            value={text}
            placeholder="Click to write a concise professional summary..."
            editable={editable}
            multiline={true}
            className="cv-summary-text text-justify"
            style={{
              color: '#334155',
              display: 'block',
              textAlign: 'justify',
              textJustify: 'inter-word',
              textAlignLast: 'left',
              hyphens: 'auto'
            }}
            onSave={(val) => updateCV({ summary: val })}
            onBlurSync={onBlurSync}
          />
        </div>
      </section>
    );
  };

  // 2. Work Experience
  const renderExperienceSection = () => {
    if (isRemoved('experience')) return null;
    const hasValidItems = cv.experience.some(
      (e) => e.role.trim() || e.company.trim() || e.rawDescription.trim() || e.bullets.length > 0
    );
    if (!hasValidItems && !editable) return null;
    return (
      <section className={`group/sec ${isMinimalistClean ? 'mb-3.5' : 'mb-4'}`}>
        {renderSectionHeader('Work Experience', 'experience')}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleExperienceDragEnd}
        >
          <SortableContext
            items={cv.experience.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={isTimelineClassic ? 'space-y-0 mt-2.5 ml-2' : 'space-y-2.5'}>
              {cv.experience.map((exp, idx) => (
                <SortableExperienceCard
                  key={exp.id}
                  item={exp}
                  editable={editable}
                  accentColor={mainAccentColor}
                  isTimeline={isTimelineClassic}
                  isSerif={isSerif}
                  onUpdateItem={(updated) => {
                    const next = [...cv.experience];
                    next[idx] = updated;
                    updateCV({ experience: next });
                  }}
                  onDeleteItem={() => {
                    const remaining = cv.experience.filter((_, i) => i !== idx);
                    if (remaining.length === 0) {
                      handleRemoveKey('experience');
                    } else {
                      updateCV({ experience: remaining });
                      onBlurSync?.();
                    }
                  }}
                  onBlurSync={onBlurSync}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {editable && (
          <button
            type="button"
            onClick={() => {
              const newExp: WorkExperienceItem = {
                id: `exp_${Date.now()}`,
                company: 'Organization Name',
                role: 'Role Title',
                startDate: 'Jan 2024',
                endDate: 'Present',
                rawDescription: '',
                bullets: [
                  'Spearheaded high-impact deliverables improving operational efficiency by 25%.'
                ]
              };
              updateCV({ experience: [...cv.experience, newExp] });
              onBlurSync?.();
            }}
            className="cv-edit-cue add-btn mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 min-h-[26px] rounded-md transition-colors whitespace-nowrap"
          >
            <Plus className="w-3 h-3 shrink-0" />
            <span>Experience</span>
          </button>
        )}
      </section>
    );
  };

  // 3. Projects Section (2-Column Grid in "Creative Accent", clean list in others)
  const renderProjectsSection = () => {
    if (isRemoved('projects')) return null;
    const list = (cv.projects || []).filter(
      (p) => editable || p.name.trim() || p.description.trim()
    );
    if (list.length === 0 && !editable) return null;
    return (
      <section className={`group/sec ${isMinimalistClean ? 'mb-3.5' : 'mb-4'} cv-avoid-break`}>
        {renderSectionHeader('Projects', 'projects')}
        <div
          className={
            isCreativeAccent
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
              : 'space-y-2'
          }
        >
          {list.map((proj, idx) => (
            <div
              key={proj.id || idx}
              className={`group/proj relative rounded-lg ${
                isCreativeAccent
                  ? 'bg-slate-50/90 border border-slate-200 p-3'
                  : 'py-0.5'
              }`}
              style={
                isCreativeAccent
                  ? { borderTop: `3px solid ${template.accentColor}` }
                  : undefined
              }
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <div className="font-bold text-[12px] text-slate-900 flex flex-wrap items-baseline gap-1.5">
                  <EditableSpan
                    value={proj.name}
                    placeholder="Project Title"
                    editable={editable}
                    onSave={(val) => {
                      const next = [...list];
                      next[idx] = { ...proj, name: val };
                      updateCV({ projects: next });
                    }}
                    onBlurSync={onBlurSync}
                  />
                  {(proj.roleOrTech || editable) && (
                    <span
                      className={`text-[11px] font-semibold ${!proj.roleOrTech ? 'cv-edit-cue' : ''}`}
                      style={{ color: mainAccentColor }}
                    >
                      <span>· </span>
                      <EditableSpan
                        value={proj.roleOrTech}
                        placeholder="Tech Stack"
                        editable={editable}
                        onSave={(val) => {
                          const next = [...list];
                          next[idx] = { ...proj, roleOrTech: val };
                          updateCV({ projects: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 max-w-full">
                  {Boolean(proj.link && proj.link.trim()) && (
                    <span className="text-[10.5px] font-mono text-slate-500 cv-url-text break-all">
                      <EditableSpan
                        value={proj.link}
                        placeholder=""
                        editable={editable}
                        isUrl={true}
                        onSave={(val) => {
                          const next = [...list];
                          next[idx] = { ...proj, link: val };
                          updateCV({ projects: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                  )}
                  {editable && (
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = list.filter((_, i) => i !== idx);
                        if (remaining.length === 0) {
                          handleRemoveKey('projects');
                        } else {
                          updateCV({ projects: remaining });
                          onBlurSync?.();
                        }
                      }}
                      className="cv-edit-cue opacity-0 group-hover/proj:opacity-100 p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div
                className="cv-justified-text text-[11.5px] text-slate-700 leading-snug mt-1 text-justify"
                style={{ textAlign: 'justify', textJustify: 'inter-word', textAlignLast: 'left' }}
              >
                <EditableSpan
                  value={proj.description}
                  placeholder="Concise description of architecture and measurable results..."
                  editable={editable}
                  multiline={true}
                  className="cv-justified-text text-justify"
                  style={{ textAlign: 'justify', textJustify: 'inter-word', textAlignLast: 'left' }}
                  onSave={(val) => {
                    const next = [...list];
                    next[idx] = { ...proj, description: val };
                    updateCV({ projects: next });
                  }}
                  onBlurSync={onBlurSync}
                />
              </div>
            </div>
          ))}
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => {
              const nextProj: ProjectItem = {
                id: `proj_${Date.now()}`,
                name: 'New Project',
                roleOrTech: 'Core Tools',
                link: '',
                description: 'Delivered measurable improvements and high operational accuracy.'
              };
              updateCV({ projects: [...list, nextProj] });
              onBlurSync?.();
            }}
            className="cv-edit-cue add-btn mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Project</span>
          </button>
        )}
      </section>
    );
  };

  // 4. Skills Section — Individual Structured Entities ({ name, level, percentage }) in all templates (Never flattened or pipe-joined)
  const renderSkillsSection = (darkSidebar = false) => {
    if (isRemoved('skills')) return null;

    const allSkillItems: string[] =
      cv.skills && cv.skills.length > 0
        ? cv.skills.map((s) => cleanText(s, true)).filter(Boolean)
        : (cv.skillGroups || [])
            .flatMap((g) => g.items || [])
            .map((s) => cleanText(s, true))
            .filter(Boolean);

    if (allSkillItems.length === 0 && !editable) return null;

    const structuredSkills: ProficiencyItem[] = allSkillItems.map((skillName, idx) => {
      const existingObj =
        (cv.skillLevels || []).find(
          (item) => cleanText(item?.name, true).toLowerCase() === skillName.toLowerCase()
        ) || (cv.skillLevels || [])[idx];

      const { level, percentage } = inferSkillTierAndPercentage(
        skillName,
        existingObj?.level || existingObj?.proficiency,
        existingObj?.percentage,
        idx
      );

      return {
        name: skillName,
        level,
        proficiency: level,
        percentage
      };
    });

    const handleUpdateSkillName = (idx: number, newName: string) => {
      const cleaned = cleanText(newName, false);
      const nextSkills = [...allSkillItems];
      nextSkills[idx] = cleaned;
      const nextLevels = structuredSkills.map((item, sIdx) =>
        sIdx === idx ? { ...item, name: cleaned } : item
      );
      updateCV({
        skills: nextSkills,
        skillLevels: nextLevels,
        skillGroups: []
      });
    };

    const handleUpdateSkillCommand = (idx: number, nextLvl: string, nextPct: number) => {
      const nextLevels: ProficiencyItem[] = structuredSkills.map((item, sIdx) =>
        sIdx === idx
          ? { ...item, level: nextLvl, proficiency: nextLvl, percentage: nextPct }
          : item
      );
      updateCV({
        skills: allSkillItems,
        skillLevels: nextLevels
      });
      onBlurSync?.();
    };

    const handleRemoveSkillAt = (idx: number) => {
      const nextFlat = allSkillItems.filter((_, i) => i !== idx);
      const nextLevels = structuredSkills.filter((_, i) => i !== idx);
      if (nextFlat.length === 0) {
        handleRemoveKey('skills');
      } else {
        updateCV({
          skills: nextFlat,
          skillLevels: nextLevels,
          skillGroups: []
        });
        onBlurSync?.();
      }
    };

    const handleAddNewSkill = () => {
      const cleaned = cleanText(newSkillText, true);
      if (!cleaned) return;
      const { level, percentage } = inferSkillTierAndPercentage(
        cleaned,
        undefined,
        undefined,
        allSkillItems.length
      );
      const nextSkills = [...allSkillItems, cleaned];
      const nextLevels: ProficiencyItem[] = [
        ...structuredSkills,
        { name: cleaned, level, proficiency: level, percentage }
      ];
      updateCV({
        skills: nextSkills,
        skillLevels: nextLevels,
        skillGroups: []
      });
      setNewSkillText('');
      onBlurSync?.();
    };

    // Dark Sidebar Column (Classic Dark Sidebar & Modern Sidebar): Render each skill object with horizontal progress bar + level & percentage
    if (darkSidebar) {
      if (structuredSkills.length === 0 && !editable) return null;
      return (
        <section className="group/sec mb-5 cv-avoid-break block">
          {renderSectionHeader(
            isClassicDarkSidebar ? 'Additional Skills' : 'Skills & Competencies',
            'skills',
            true
          )}
          <div className="space-y-3 mt-2 block" style={{ display: 'block', marginTop: '8px' }}>
            {structuredSkills.map((skillObj, idx) => {
              const pct = skillObj.percentage;
              const levelText = skillObj.level;
              const matchedOpt =
                LIVE_SKILL_COMMAND_OPTIONS.find(
                  (o) =>
                    o.level.toLowerCase() === levelText.toLowerCase() || o.percentage === pct
                ) || LIVE_SKILL_COMMAND_OPTIONS[1];

              return (
                <div key={`${skillObj.name}_${idx}`} className="group/skbar block">
                  <div className="flex items-center justify-between gap-1 text-[11.5px] font-semibold text-white break-words">
                    <EditableSpan
                      value={skillObj.name}
                      placeholder="Skill Name"
                      editable={editable}
                      style={{ color: '#FFFFFF' }}
                      onSave={(val) => handleUpdateSkillName(idx, val)}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillAt(idx)}
                        className="cv-edit-cue opacity-0 group-hover/skbar:opacity-100 text-red-300 hover:text-white leading-none shrink-0"
                        title="Remove skill"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div
                    className="progress-bar-container"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      height: '6px',
                      width: '100%',
                      marginTop: '4px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      display: 'block'
                    }}
                  >
                    <div
                      className="progress-bar-fill"
                      style={{
                        backgroundColor: isClassicDarkSidebar ? '#FFFFFF' : sidebarAccentColor,
                        height: '6px',
                        width: `${pct}%`,
                        borderRadius: '3px',
                        display: 'block'
                      }}
                    />
                  </div>
                  <div
                    className="text-[10px] text-right mt-1 flex items-center justify-end gap-1"
                    style={{ color: '#E2E8F0' }}
                  >
                    <span>
                      {levelText} ({pct}%)
                    </span>
                    {editable && (
                      <select
                        value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                        onChange={(e) => {
                          const [nextLvl, nextPctRaw] = e.target.value.split('|');
                          handleUpdateSkillCommand(idx, nextLvl, Number(nextPctRaw) || 85);
                        }}
                        className="cv-edit-cue text-[9.5px] bg-slate-800 text-white border border-slate-600 rounded px-1 py-0.5 cursor-pointer"
                        title="Change skill command level"
                      >
                        {LIVE_SKILL_COMMAND_OPTIONS.map((opt) => (
                          <option key={opt.label} value={`${opt.level}|${opt.percentage}`}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {editable && (
            <div className="cv-edit-cue add-btn mt-2.5 flex items-center gap-1">
              <input
                type="text"
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkillText.trim()) {
                    e.preventDefault();
                    handleAddNewSkill();
                  }
                }}
                placeholder="Add skill..."
                className="text-[11px] px-2 py-0.5 border border-slate-500 rounded bg-slate-800 text-white focus:outline-none w-28"
              />
              <button
                type="button"
                onClick={handleAddNewSkill}
                className="add-btn inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-white bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          )}
        </section>
      );
    }

    // Horizontal / Single-Column Templates: Render each skill object as an independent structured row in a 2-column grid
    return (
      <section className="group/sec mb-4 cv-avoid-break block">
        {renderSectionHeader('Skills & Core Competencies', 'skills', false)}

        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-2"
          style={{ marginTop: '8px' }}
        >
          {structuredSkills.map((skillObj, idx) => {
            const pct = skillObj.percentage;
            const levelText = skillObj.level;
            const matchedOpt =
              LIVE_SKILL_COMMAND_OPTIONS.find(
                (o) =>
                  o.level.toLowerCase() === levelText.toLowerCase() || o.percentage === pct
              ) || LIVE_SKILL_COMMAND_OPTIONS[1];

            return (
              <div
                key={`${skillObj.name}_${idx}`}
                className="group/skitem block py-0.5"
              >
                <div className="flex items-baseline justify-between gap-2 text-[11.5px] leading-snug">
                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span
                      className="font-bold shrink-0"
                      style={{ color: mainAccentColor }}
                    >
                      •
                    </span>
                    <span className="font-bold text-slate-900 break-words">
                      <EditableSpan
                        value={skillObj.name}
                        placeholder="Skill Name"
                        editable={editable}
                        style={{ color: '#0F172A' }}
                        onSave={(val) => handleUpdateSkillName(idx, val)}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <span className="text-[10.5px] font-semibold text-slate-600 whitespace-nowrap">
                      {levelText} ({pct}%)
                    </span>
                    {editable && (
                      <select
                        value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                        onChange={(e) => {
                          const [nextLvl, nextPctRaw] = e.target.value.split('|');
                          handleUpdateSkillCommand(idx, nextLvl, Number(nextPctRaw) || 85);
                        }}
                        className="cv-edit-cue text-[9.5px] bg-white text-slate-700 border border-slate-300 rounded px-1 py-0.5 cursor-pointer"
                        title="Select skill command level"
                      >
                        {LIVE_SKILL_COMMAND_OPTIONS.map((opt) => (
                          <option key={opt.label} value={`${opt.level}|${opt.percentage}`}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkillAt(idx)}
                        className="cv-edit-cue opacity-0 group-hover/skitem:opacity-100 text-slate-400 hover:text-red-500 leading-none ml-0.5"
                        title="Remove skill"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="progress-bar-container"
                  style={{
                    backgroundColor: '#E2E8F0',
                    height: '5px',
                    width: '100%',
                    marginTop: '4px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    display: 'block'
                  }}
                >
                  <div
                    className="progress-bar-fill"
                    style={{
                      backgroundColor: mainAccentColor,
                      height: '5px',
                      width: `${pct}%`,
                      borderRadius: '3px',
                      display: 'block'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {editable && (
          <div className="cv-edit-cue add-btn mt-2.5 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSkillText.trim()) {
                    e.preventDefault();
                    handleAddNewSkill();
                  }
                }}
                placeholder="Add skill..."
                className="text-[11px] px-2 py-0.5 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none w-28"
              />
              <button
                type="button"
                onClick={handleAddNewSkill}
                className="add-btn inline-flex items-center gap-0.5 text-[10.5px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
              >
                <Plus className="w-3 h-3" />
                <span>Add Skill</span>
              </button>
            </div>
          </div>
        )}
      </section>
    );
  };

  // 5. Education Section (Includes Degree, Major Subject, Institution, Right-Aligned Year, and Percentage / CGPA)
  const renderEducationSection = () => {
    if (isRemoved('education')) return null;
    const list = (cv.education || []).filter(
      (e) => editable || e.degree.trim() || e.institution.trim() || (e.majorSubject && e.majorSubject.trim())
    );
    if (list.length === 0 && !editable) return null;
    return (
      <section className={`group/sec ${isMinimalistClean ? 'mb-3.5' : 'mb-4'} cv-avoid-break`}>
        {renderSectionHeader('Education', 'education')}
        <div
          className={
            isTimelineClassic
              ? 'space-y-0 mt-2.5 ml-2'
              : 'divide-y divide-slate-100 space-y-2'
          }
        >
          {list.map((edu, idx) => {
            const hasYear = Boolean(edu.year && edu.year.trim());
            const hasMajor = Boolean(edu.majorSubject && edu.majorSubject.trim());
            const hasDetails = Boolean(edu.details && edu.details.trim());
            return (
              <div
                key={edu.id || idx}
                className={`group/edu relative transition-colors ${
                  isTimelineClassic
                    ? 'pl-6 border-l-2 pb-3.5 last:pb-1'
                    : idx > 0
                    ? 'pt-2'
                    : 'py-0.5'
                }`}
                style={
                  isTimelineClassic
                    ? { borderLeftColor: mainAccentColor }
                    : undefined
                }
              >
                {/* Circle Bullet Node for Timeline Classic Template */}
                {isTimelineClassic && (
                  <span
                    className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 flex items-center justify-center"
                    style={{ borderColor: mainAccentColor }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: mainAccentColor }}
                    />
                  </span>
                )}

                {/* Top Row: Bold Degree + Major Subject + Institution on Left, Right-Aligned Year on Right */}
                <div className="flex items-baseline justify-between gap-4 w-full">
                  <div className="flex flex-wrap items-baseline gap-x-1.5 min-w-0 flex-1">
                    <span className="font-bold text-[12.5px] text-slate-900">
                      <EditableSpan
                        value={edu.degree}
                        placeholder="Degree / Qualification"
                        editable={editable}
                        onSave={(val) => {
                          const next = [...list];
                          next[idx] = { ...edu, degree: val };
                          updateCV({ education: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </span>

                    {/* Major Subject */}
                    {(hasMajor || editable) && (
                      <span
                        className={`text-[12px] font-semibold text-slate-700 ${
                          !hasMajor ? 'cv-edit-cue' : ''
                        }`}
                      >
                        <span>(</span>
                        <EditableSpan
                          value={edu.majorSubject || ''}
                          placeholder="Major Subject"
                          editable={editable}
                          onSave={(val) => {
                            const next = [...list];
                            next[idx] = { ...edu, majorSubject: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                        <span>)</span>
                      </span>
                    )}

                    {(edu.institution || editable) && (
                      <span
                        className={`inline-flex items-baseline gap-1.5 ${
                          !edu.institution ? 'cv-edit-cue' : ''
                        }`}
                      >
                        <span className="text-slate-400 font-normal">—</span>
                        <span
                          className={`text-[12px] font-semibold ${isSerif ? 'italic' : ''}`}
                          style={{ color: mainAccentColor }}
                        >
                          <EditableSpan
                            value={edu.institution}
                            placeholder="University / Institution"
                            editable={editable}
                            onSave={(val) => {
                              const next = [...list];
                              next[idx] = { ...edu, institution: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Right-Aligned Year/Dates */}
                  {(hasYear || editable) && (
                    <div
                      className={`flex items-center gap-1 shrink-0 text-right whitespace-nowrap ml-auto ${
                        !hasYear ? 'cv-edit-cue' : ''
                      }`}
                    >
                      <span className="text-[11.5px] font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                        <EditableSpan
                          value={edu.year}
                          placeholder="Year"
                          editable={editable}
                          onSave={(val) => {
                            const next = [...list];
                            next[idx] = { ...edu, year: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </span>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => {
                            const remaining = list.filter((_, i) => i !== idx);
                            if (remaining.length === 0) {
                              handleRemoveKey('education');
                            } else {
                              updateCV({ education: remaining });
                              onBlurSync?.();
                            }
                          }}
                          className="cv-edit-cue opacity-0 group-hover/edu:opacity-100 p-0.5 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Compact Details Line Underneath (Percentage / CGPA / Grade) */}
                {(hasDetails || editable) && (
                  <div
                    className={`text-[11px] text-slate-600 mt-0.5 leading-snug font-medium ${
                      !hasDetails ? 'cv-edit-cue' : ''
                    }`}
                  >
                    <EditableSpan
                      value={edu.details}
                      placeholder="Percentage / CGPA (e.g. CGPA 3.2/4.0 or 69%)"
                      editable={editable}
                      multiline={true}
                      onSave={(val) => {
                        const next = [...list];
                        next[idx] = { ...edu, details: val };
                        updateCV({ education: next });
                      }}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editable && (
          <button
            type="button"
            onClick={() => {
              const nextEdu: EducationItem = {
                id: `edu_${Date.now()}`,
                degree: 'Bachelor of Science',
                majorSubject: 'Computer Science',
                institution: 'University Name',
                year: '2020 - 2024',
                details: 'CGPA 3.5/4.0'
              };
              updateCV({ education: [...list, nextEdu] });
              onBlurSync?.();
            }}
            className="cv-edit-cue add-btn mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Education</span>
          </button>
        )}
      </section>
    );
  };

  // 6A. Certifications Section (Pure Bulleted Text — Never renders an empty heading)
  const renderCertificationsSection = (darkSidebar = false) => {
    if (isRemoved('certifications')) return null;

    const certs = (cv.certifications || [])
      .flatMap((c) => String(c).split(/[\n,|•;]+/))
      .map((c) => cleanText(c, true).replace(/^[•\-*·|]+\s*/, '').trim())
      .filter(Boolean);

    if (certs.length === 0) {
      if (!editable) return null;
      return (
        <div className="cv-edit-cue add-btn mb-3">
          <button
            type="button"
            onClick={() => {
              updateCV({
                certifications: ['Professional Certification'],
                removedFields: (cv.removedFields || []).filter((k) => k !== 'certifications')
              });
              onBlurSync?.();
            }}
            className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded border border-dashed ${
              darkSidebar
                ? 'border-white/30 bg-white/10 hover:bg-white/20 text-white'
                : 'border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add Certifications</span>
          </button>
        </div>
      );
    }

    return (
      <section className={`group/sec ${darkSidebar ? 'mb-4' : 'mb-3.5'} cv-avoid-break block`}>
        {renderSectionHeader('Certifications', 'certifications', darkSidebar)}
        <ul
          style={{ display: isCreativeAccent && !darkSidebar ? undefined : 'block', marginTop: '8px' }}
          className={
            isCreativeAccent && !darkSidebar
              ? 'grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2'
              : 'space-y-1.5 mt-2 block'
          }
        >
          {certs.map((cert, idx) => (
            <li
              key={idx}
              style={{ color: darkSidebar ? '#F1F5F9' : '#1E293B' }}
              className={`group/cert flex items-start justify-between gap-2 text-[11.5px] leading-snug py-0.5 ${
                darkSidebar ? 'text-slate-100' : 'text-slate-800'
              }`}
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span
                  className="font-bold shrink-0 leading-snug"
                  style={{ color: darkSidebar ? sidebarAccentColor : mainAccentColor }}
                >
                  •
                </span>
                <div
                  className="flex-1 min-w-0 font-medium"
                  style={{ color: darkSidebar ? '#F1F5F9' : '#1E293B' }}
                >
                  <EditableSpan
                    value={cert}
                    placeholder="Certification Name"
                    editable={editable}
                    multiline={true}
                    style={{ color: darkSidebar ? '#F1F5F9' : '#1E293B' }}
                    onSave={(val) => {
                      const next = [...certs];
                      next[idx] = val;
                      updateCV({ certifications: next });
                    }}
                    onBlurSync={onBlurSync}
                  />
                </div>
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => {
                    const remaining = certs.filter((_, i) => i !== idx);
                    if (remaining.length === 0) {
                      handleRemoveKey('certifications');
                    } else {
                      updateCV({ certifications: remaining });
                      onBlurSync?.();
                    }
                  }}
                  className="cv-edit-cue opacity-0 group-hover/cert:opacity-100 text-slate-400 hover:text-red-500 p-0.5 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {editable && (
          <button
            type="button"
            onClick={() => {
              updateCV({ certifications: [...certs, 'New Professional Certification'] });
              onBlurSync?.();
            }}
            className={`cv-edit-cue add-btn mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
              darkSidebar
                ? 'bg-white/15 hover:bg-white/25 text-white'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add Certification</span>
          </button>
        )}
      </section>
    );
  };

  // 6B. Languages Section — Individual Structured Entities ({ name, proficiency, percentage }) in all templates (Never flattened or mashed)
  const renderLanguagesSection = (darkSidebar = false) => {
    if (isRemoved('languages')) return null;

    const langs = (cv.languages || [])
      .flatMap((l) => String(l).split(/[\n,|•;]+/))
      .map((l) => cleanText(l, true).replace(/^[•\-*·|]+\s*/, '').trim())
      .filter(Boolean);

    if (langs.length === 0) {
      if (!editable) return null;
      return (
        <div className="cv-edit-cue add-btn mb-3">
          <button
            type="button"
            onClick={() => {
              const initialLangs = ['English', 'Urdu'];
              const initialLevels: ProficiencyItem[] = [
                { name: 'English', level: 'Basic (A2)', proficiency: 'Basic (A2)', percentage: 60 },
                {
                  name: 'Urdu',
                  level: 'Conversational (B1)',
                  proficiency: 'Conversational (B1)',
                  percentage: 75
                }
              ];
              updateCV({
                languages: initialLangs,
                languageLevels: initialLevels,
                removedFields: (cv.removedFields || []).filter((k) => k !== 'languages')
              });
              onBlurSync?.();
            }}
            className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2.5 py-1 rounded border border-dashed ${
              darkSidebar
                ? 'border-white/30 bg-white/10 hover:bg-white/20 text-white'
                : 'border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100'
            }`}
          >
            <Plus className="w-3 h-3" />
            <span>Add Languages</span>
          </button>
        </div>
      );
    }

    const structuredLangs: ProficiencyItem[] = langs.map((langName, idx) => {
      const existingObj =
        (cv.languageLevels || []).find(
          (item) => cleanText(item?.name, true).toLowerCase() === langName.toLowerCase()
        ) || (cv.languageLevels || [])[idx];

      const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
        langName,
        existingObj?.proficiency || existingObj?.level,
        existingObj?.percentage,
        idx
      );

      return {
        name: langName,
        level: proficiency,
        proficiency,
        percentage
      };
    });

    const handleUpdateLangName = (idx: number, newName: string) => {
      const cleaned = cleanText(newName, false);
      const nextLangs = [...langs];
      nextLangs[idx] = cleaned;
      const nextLevels = structuredLangs.map((item, lIdx) =>
        lIdx === idx ? { ...item, name: cleaned } : item
      );
      updateCV({
        languages: nextLangs,
        languageLevels: nextLevels
      });
    };

    const handleUpdateLangCommand = (idx: number, nextProf: string, nextPct: number) => {
      const nextLevels: ProficiencyItem[] = structuredLangs.map((item, lIdx) =>
        lIdx === idx
          ? { ...item, level: nextProf, proficiency: nextProf, percentage: nextPct }
          : item
      );
      updateCV({
        languages: langs,
        languageLevels: nextLevels
      });
      onBlurSync?.();
    };

    const handleRemoveLangAt = (idx: number) => {
      const remaining = langs.filter((_, i) => i !== idx);
      const remainingLevels = structuredLangs.filter((_, i) => i !== idx);
      if (remaining.length === 0) {
        handleRemoveKey('languages');
      } else {
        updateCV({
          languages: remaining,
          languageLevels: remainingLevels
        });
        onBlurSync?.();
      }
    };

    const handleAddLanguage = () => {
      const newLangName = 'New Language';
      const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
        newLangName,
        undefined,
        undefined,
        langs.length
      );
      updateCV({
        languages: [...langs, newLangName],
        languageLevels: [
          ...structuredLangs,
          { name: newLangName, level: proficiency, proficiency, percentage }
        ]
      });
      onBlurSync?.();
    };

    // Dark Sidebar Column (Classic Dark Sidebar & Modern Sidebar): Render languages with horizontal progress bars & CEFR proficiency + percentage
    if (darkSidebar) {
      return (
        <section className="group/sec mb-4 cv-avoid-break block">
          {renderSectionHeader('Languages', 'languages', true)}
          <div className="space-y-3 mt-2 block" style={{ display: 'block', marginTop: '8px' }}>
            {structuredLangs.map((langObj, idx) => {
              const pct = langObj.percentage;
              const proficiencyText = langObj.proficiency || langObj.level;
              const matchedOpt =
                LIVE_LANG_COMMAND_OPTIONS.find(
                  (o) =>
                    o.level.toLowerCase() === proficiencyText.toLowerCase() || o.percentage === pct
                ) || LIVE_LANG_COMMAND_OPTIONS[2];

              return (
                <div key={`${langObj.name}_${idx}`} className="group/lang block">
                  <div className="flex items-center justify-between gap-1 text-[11.5px] font-semibold text-white break-words">
                    <EditableSpan
                      value={langObj.name}
                      placeholder="Language"
                      editable={editable}
                      style={{ color: '#FFFFFF' }}
                      onSave={(val) => handleUpdateLangName(idx, val)}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLangAt(idx)}
                        className="cv-edit-cue opacity-0 group-hover/lang:opacity-100 text-red-300 hover:text-white ml-0.5 shrink-0"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div
                    className="progress-bar-container"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.22)',
                      height: '6px',
                      width: '100%',
                      marginTop: '4px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      display: 'block'
                    }}
                  >
                    <div
                      className="progress-bar-fill"
                      style={{
                        backgroundColor: isClassicDarkSidebar ? '#FFFFFF' : sidebarAccentColor,
                        height: '6px',
                        width: `${pct}%`,
                        borderRadius: '3px',
                        display: 'block'
                      }}
                    />
                  </div>
                  <div
                    className="text-[10px] text-right mt-1 flex items-center justify-end gap-1"
                    style={{ color: '#E2E8F0' }}
                  >
                    <span>
                      {proficiencyText} ({pct}%)
                    </span>
                    {editable && (
                      <select
                        value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                        onChange={(e) => {
                          const [nextLvl, nextPctRaw] = e.target.value.split('|');
                          handleUpdateLangCommand(idx, nextLvl, Number(nextPctRaw) || 75);
                        }}
                        className="cv-edit-cue text-[9.5px] bg-slate-800 text-white border border-slate-600 rounded px-1 py-0.5 cursor-pointer"
                        title="Change language command level"
                      >
                        {LIVE_LANG_COMMAND_OPTIONS.map((opt) => (
                          <option key={opt.label} value={`${opt.level}|${opt.percentage}`}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {editable && (
            <button
              type="button"
              onClick={handleAddLanguage}
              className="cv-edit-cue add-btn mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded"
            >
              <Plus className="w-3 h-3" />
              <span>Add Language</span>
            </button>
          )}
        </section>
      );
    }

    // Horizontal / Single-Column Templates: Render each language object as an independent structured row in a 2-column grid so text never mashes or overlaps
    return (
      <section className="group/sec mb-3.5 cv-avoid-break block">
        {renderSectionHeader('Languages', 'languages', false)}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 mt-2"
          style={{ marginTop: '8px' }}
        >
          {structuredLangs.map((langObj, idx) => {
            const pct = langObj.percentage;
            const proficiencyText = langObj.proficiency || langObj.level;
            const matchedOpt =
              LIVE_LANG_COMMAND_OPTIONS.find(
                (o) =>
                  o.level.toLowerCase() === proficiencyText.toLowerCase() || o.percentage === pct
              ) || LIVE_LANG_COMMAND_OPTIONS[2];

            return (
              <div
                key={`${langObj.name}_${idx}`}
                className="group/lang block py-0.5"
              >
                <div className="flex items-baseline justify-between gap-2 text-[11.5px] leading-snug">
                  <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                    <span
                      className="font-bold shrink-0"
                      style={{ color: mainAccentColor }}
                    >
                      •
                    </span>
                    <span className="font-bold text-slate-900 break-words">
                      <EditableSpan
                        value={langObj.name}
                        placeholder="Language"
                        editable={editable}
                        style={{ color: '#0F172A' }}
                        onSave={(val) => handleUpdateLangName(idx, val)}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-auto">
                    <span className="text-[10.5px] font-semibold text-slate-600 whitespace-nowrap">
                      {proficiencyText} ({pct}%)
                    </span>
                    {editable && (
                      <select
                        value={`${matchedOpt.level}|${matchedOpt.percentage}`}
                        onChange={(e) => {
                          const [nextLvl, nextPctRaw] = e.target.value.split('|');
                          handleUpdateLangCommand(idx, nextLvl, Number(nextPctRaw) || 75);
                        }}
                        className="cv-edit-cue text-[9.5px] bg-white text-slate-700 border border-slate-300 rounded px-1 py-0.5 cursor-pointer"
                        title="Select language command level"
                      >
                        {LIVE_LANG_COMMAND_OPTIONS.map((opt) => (
                          <option key={opt.label} value={`${opt.level}|${opt.percentage}`}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLangAt(idx)}
                        className="cv-edit-cue opacity-0 group-hover/lang:opacity-100 text-slate-400 hover:text-red-500 ml-0.5 leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="progress-bar-container"
                  style={{
                    backgroundColor: '#E2E8F0',
                    height: '5px',
                    width: '100%',
                    marginTop: '4px',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    display: 'block'
                  }}
                >
                  <div
                    className="progress-bar-fill"
                    style={{
                      backgroundColor: mainAccentColor,
                      height: '5px',
                      width: `${pct}%`,
                      borderRadius: '3px',
                      display: 'block'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {editable && (
          <button
            type="button"
            onClick={handleAddLanguage}
            className="cv-edit-cue add-btn mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
          >
            <Plus className="w-3 h-3" />
            <span>Add Language</span>
          </button>
        )}
      </section>
    );
  };

  // 7. References Section (Last Section at the bottom of the CV)
  const renderReferencesSection = () => {
    if (isRemoved('references')) return null;

    const validRefs = (cv.references || []).filter(
      (r) =>
        editable ||
        Boolean(
          r.name?.trim() || r.designation?.trim() || r.company?.trim() || r.contact?.trim()
        )
    );
    const hasPopulatedRefs = (cv.references || []).some((r) =>
      Boolean(r.name?.trim() || r.designation?.trim() || r.company?.trim() || r.contact?.trim())
    );
    const showOnRequestText =
      Boolean(cv.referencesOnRequest) && !hasPopulatedRefs;

    if (!showOnRequestText && !hasPopulatedRefs && !editable) return null;

    return (
      <section className="group/sec mt-2 mb-1 cv-avoid-break">
        {renderSectionHeader('References', 'references', false)}

        {showOnRequestText && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-slate-700 italic py-0.5">
            <span>References available upon request.</span>
            {editable && (
              <button
                type="button"
                onClick={() => {
                  const nextRef: ReferenceItem = {
                    id: `ref_${Date.now()}`,
                    name: 'Referee Name',
                    designation: 'Designation / Role',
                    company: 'Organization Name',
                    contact: '+92 300 0000000 | email@domain.com'
                  };
                  updateCV({
                    referencesOnRequest: false,
                    references: [nextRef]
                  });
                  onBlurSync?.();
                }}
                className="cv-edit-cue add-btn inline-flex items-center gap-1 text-[10px] not-italic font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded"
              >
                <Plus className="w-3 h-3" />
                <span>Add Specific Referee Details</span>
              </button>
            )}
          </div>
        )}

        {!showOnRequestText && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validRefs.map((refItem, idx) => (
                <div
                  key={refItem.id || idx}
                  className={`group/ref relative rounded-md p-2.5 text-[11px] leading-snug ${
                    isCreativeAccent
                      ? 'bg-slate-50 border border-slate-200'
                      : 'bg-slate-50/70 border border-slate-200/80'
                  }`}
                  style={{
                    borderLeftWidth: '3px',
                    borderLeftColor: mainAccentColor
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-[12px] text-slate-900">
                      <EditableSpan
                        value={refItem.name}
                        placeholder="Referee Full Name"
                        editable={editable}
                        onSave={(val) => {
                          const next = [...validRefs];
                          next[idx] = { ...refItem, name: val };
                          updateCV({ referencesOnRequest: false, references: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </div>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => {
                          const remaining = validRefs.filter((_, i) => i !== idx);
                          if (remaining.length === 0) {
                            updateCV({ references: [], referencesOnRequest: true });
                          } else {
                            updateCV({ references: remaining });
                          }
                          onBlurSync?.();
                        }}
                        className="cv-edit-cue opacity-0 group-hover/ref:opacity-100 text-slate-400 hover:text-red-600 p-0.5 shrink-0"
                        title="Remove Referee"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {(refItem.designation || refItem.company || editable) && (
                    <div className="text-[11px] font-semibold text-slate-700 mt-0.5 flex flex-wrap items-baseline gap-1">
                      {(refItem.designation || editable) && (
                        <EditableSpan
                          value={refItem.designation}
                          placeholder="Designation"
                          editable={editable}
                          onSave={(val) => {
                            const next = [...validRefs];
                            next[idx] = { ...refItem, designation: val };
                            updateCV({ referencesOnRequest: false, references: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      )}
                      {(refItem.designation && refItem.company) && (
                        <span className="text-slate-400">·</span>
                      )}
                      {(refItem.company || editable) && (
                        <span style={{ color: mainAccentColor }}>
                          <EditableSpan
                            value={refItem.company}
                            placeholder="Organization"
                            editable={editable}
                            onSave={(val) => {
                              const next = [...validRefs];
                              next[idx] = { ...refItem, company: val };
                              updateCV({ referencesOnRequest: false, references: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </span>
                      )}
                    </div>
                  )}

                  {(refItem.contact || editable) && (
                    <div className="text-[10.5px] font-mono text-slate-600 mt-0.5 break-all">
                      <EditableSpan
                        value={refItem.contact}
                        placeholder="Phone / Email"
                        editable={editable}
                        onSave={(val) => {
                          const next = [...validRefs];
                          next[idx] = { ...refItem, contact: val };
                          updateCV({ referencesOnRequest: false, references: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {editable && (
              <div className="cv-edit-cue add-btn mt-1.5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextRef: ReferenceItem = {
                      id: `ref_${Date.now()}`,
                      name: 'Referee Name',
                      designation: 'Designation',
                      company: 'Organization',
                      contact: '+92 300 0000000'
                    };
                    updateCV({
                      referencesOnRequest: false,
                      references: [...validRefs, nextRef]
                    });
                    onBlurSync?.();
                  }}
                  className="add-btn inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Reference</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateCV({ references: [], referencesOnRequest: true });
                    onBlurSync?.();
                  }}
                  className="add-btn inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 px-2 py-0.5 rounded"
                >
                  <span>Switch to &quot;Available upon request&quot;</span>
                </button>
              </div>
            )}
          </>
        )}
      </section>
    );
  };

  // Contact Details Renderer (supports Dark Sidebar vertical stack, Centered horizontal bar, or Standard bar)
  const renderContactDetails = (options?: {
    vertical?: boolean;
    centered?: boolean;
    darkSidebar?: boolean;
  }) => {
    const showEmail = !isRemoved('email') && Boolean(cv.email && cv.email.trim());
    const showPhone = !isRemoved('phone') && Boolean(cv.phone && cv.phone.trim());
    const showAddress = !isRemoved('address') && Boolean(cv.address && cv.address.trim());
    const showLinkedin =
      !isRemoved('linkedinUrl') &&
      Boolean(cv.linkedinUrl && cv.linkedinUrl.trim()) &&
      isValidUrl(cv.linkedinUrl);
    const showPortfolio =
      !isRemoved('portfolioUrl') &&
      Boolean(cv.portfolioUrl && cv.portfolioUrl.trim()) &&
      isValidUrl(cv.portfolioUrl);

    if (!showEmail && !showPhone && !showAddress && !showLinkedin && !showPortfolio) {
      return null;
    }

    const iconColor = options?.darkSidebar ? sidebarAccentColor : mainAccentColor;
    const textColor = options?.darkSidebar ? '#F1F5F9' : '#475569';

    const containerClass = options?.vertical
      ? 'flex flex-col gap-2.5 text-[11px]'
      : `flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] mt-2 ${
          options?.centered ? 'justify-center' : ''
        }`;

    return (
      <div className={containerClass} style={{ color: textColor }}>
        {showEmail && (
          <span className="group/citem inline-flex items-center gap-2 cv-url-text break-all">
            <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
            <EditableSpan
              value={cv.email}
              placeholder="email@domain.com"
              editable={editable}
              isUrl={true}
              style={{ color: textColor }}
              onSave={(val) => updateCV({ email: val })}
              onBlurSync={onBlurSync}
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey('email')}
                title="Remove Email field"
                className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-400 hover:text-red-600 ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}
        {showPhone && (
          <span className="group/citem inline-flex items-center gap-2 font-mono tabular-nums shrink-0">
            <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
            <EditableSpan
              value={cv.phone}
              placeholder="+92 300 0000000"
              editable={editable}
              style={{ color: textColor }}
              onSave={(val) => updateCV({ phone: val })}
              onBlurSync={onBlurSync}
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey('phone')}
                title="Remove Phone field"
                className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-400 hover:text-red-600 ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}
        {showAddress && (
          <span className="group/citem inline-flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
            <EditableSpan
              value={cv.address}
              placeholder="City, Country"
              editable={editable}
              style={{ color: textColor }}
              onSave={(val) => updateCV({ address: val })}
              onBlurSync={onBlurSync}
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey('address')}
                title="Remove Address field"
                className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-400 hover:text-red-600 ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}
        {showLinkedin && (
          <span className="group/citem inline-flex items-center gap-2 cv-url-text break-all">
            <Linkedin className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
            <EditableSpan
              value={cv.linkedinUrl}
              placeholder="linkedin.com/in/profile"
              editable={editable}
              isUrl={true}
              style={{ color: textColor }}
              onSave={(val) => updateCV({ linkedinUrl: val })}
              onBlurSync={onBlurSync}
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey('linkedinUrl')}
                title="Remove LinkedIn field"
                className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-400 hover:text-red-600 ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}
        {showPortfolio && (
          <span className="group/citem inline-flex items-center gap-2 cv-url-text break-all">
            <Globe className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />
            <EditableSpan
              value={cv.portfolioUrl}
              placeholder="portfolio.dev"
              editable={editable}
              isUrl={true}
              style={{ color: textColor }}
              onSave={(val) => updateCV({ portfolioUrl: val })}
              onBlurSync={onBlurSync}
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey('portfolioUrl')}
                title="Remove Portfolio field"
                className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-400 hover:text-red-600 ml-0.5"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            )}
          </span>
        )}
      </div>
    );
  };

  const hasJobTitleText = !isRemoved('jobTitle') && Boolean(cv.jobTitle && cv.jobTitle.trim());
  const showJobTitle = !isRemoved('jobTitle') && (hasJobTitleText || editable);
  const hasPhoto = !isPhotoHiddenByTemplate && !isRemoved('photoDataUrl') && Boolean(cv.photoDataUrl);
  const serifSheetClass = isSerif ? 'cv-serif-sheet font-serif' : 'font-sans';
  const isPhotoOnHeaderLeft =
    photoPosition === 'header-left' || photoPosition === 'top-left' || photoPosition === 'sidebar-top';
  const isPhotoOnHeaderCenter = photoPosition === 'header-center';

  // Dynamically renders any CV section by its TemplateGridSectionId within the mapped col-span container
  const renderSectionById = (sectionId: TemplateGridSectionId, darkSidebar: boolean) => {
    switch (sectionId) {
      case 'summary':
        return renderSummarySection();
      case 'experience':
        return renderExperienceSection();
      case 'education':
        return renderEducationSection();
      case 'skills':
        return renderSkillsSection(darkSidebar);
      case 'projects':
        return renderProjectsSection();
      case 'certifications':
        return renderCertificationsSection(darkSidebar);
      case 'languages':
        return renderLanguagesSection(darkSidebar);
      case 'references':
        return renderReferencesSection();
      default:
        return null;
    }
  };

  const renderDynamicSectionList = (
    sectionIds: TemplateGridSectionId[],
    darkSidebar: boolean
  ) => (
    <>
      {sectionIds.map((sectionId) => (
        <React.Fragment key={sectionId}>
          {renderSectionById(sectionId, darkSidebar)}
        </React.Fragment>
      ))}
    </>
  );

  // ============================================================================
  // SHARED STRUCTURED DATA HELPERS FOR EXACT PNG TEMPLATE REPLICATIONS (1-10)
  // ============================================================================
  const pngSummaryText = enforceConciseSummary(cv.summary || cv.rawSummary);
  const pngSkillsFlat: string[] =
    cv.skills && cv.skills.length > 0
      ? cv.skills.map((s) => cleanText(s, true)).filter(Boolean)
      : (cv.skillGroups || [])
          .flatMap((g) => g.items || [])
          .map((s) => cleanText(s, true))
          .filter(Boolean);

  const pngStructuredSkills: ProficiencyItem[] = pngSkillsFlat.map((skillName, idx) => {
    const existingObj =
      (cv.skillLevels || []).find(
        (item) => cleanText(item?.name, true).toLowerCase() === skillName.toLowerCase()
      ) || (cv.skillLevels || [])[idx];
    const { level, percentage } = inferSkillTierAndPercentage(
      skillName,
      existingObj?.level || existingObj?.proficiency,
      existingObj?.percentage,
      idx
    );
    return { name: skillName, level, proficiency: level, percentage };
  });

  const pngLangsFlat = (cv.languages || [])
    .flatMap((l) => String(l).split(/[\n,|•;]+/))
    .map((l) => cleanText(l, true).replace(/^[•\-*·|]+\s*/, '').trim())
    .filter(Boolean);

  const pngStructuredLangs: ProficiencyItem[] = pngLangsFlat.map((langName, idx) => {
    const existingObj =
      (cv.languageLevels || []).find(
        (item) => cleanText(item?.name, true).toLowerCase() === langName.toLowerCase()
      ) || (cv.languageLevels || [])[idx];
    const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
      langName,
      existingObj?.proficiency || existingObj?.level,
      existingObj?.percentage,
      idx
    );
    return { name: langName, level: proficiency, proficiency, percentage };
  });

  const pngCertsList = (cv.certifications || [])
    .flatMap((c) => String(c).split(/[\n,|•;]+/))
    .map((c) => cleanText(c, true).replace(/^[•\-*·|]+\s*/, '').trim())
    .filter(Boolean);

  const pngProjectsList = (cv.projects || []).filter(
    (p) => editable || p.name.trim() || p.description.trim()
  );

  const pngEduList = (cv.education || []).filter(
    (e) => editable || e.degree.trim() || e.institution.trim() || (e.majorSubject && e.majorSubject.trim())
  );

  const handleUpdatePngSkill = (idx: number, val: string) => {
    const cleaned = cleanText(val, false);
    const nextFlat = [...pngSkillsFlat];
    nextFlat[idx] = cleaned;
    const nextLevels = pngStructuredSkills.map((item, i) =>
      i === idx ? { ...item, name: cleaned } : item
    );
    updateCV({ skills: nextFlat, skillLevels: nextLevels, skillGroups: [] });
  };

  const handleRemovePngSkill = (idx: number) => {
    const nextFlat = pngSkillsFlat.filter((_, i) => i !== idx);
    const nextLevels = pngStructuredSkills.filter((_, i) => i !== idx);
    if (nextFlat.length === 0) {
      handleRemoveKey('skills');
    } else {
      updateCV({ skills: nextFlat, skillLevels: nextLevels, skillGroups: [] });
      onBlurSync?.();
    }
  };

  const handleAddPngSkill = () => {
    const cleaned = cleanText(newSkillText, true) || 'New Skill';
    const { level, percentage } = inferSkillTierAndPercentage(
      cleaned,
      undefined,
      undefined,
      pngSkillsFlat.length
    );
    updateCV({
      skills: [...pngSkillsFlat, cleaned],
      skillLevels: [...pngStructuredSkills, { name: cleaned, level, proficiency: level, percentage }],
      skillGroups: []
    });
    setNewSkillText('');
    onBlurSync?.();
  };

  const handleUpdatePngLang = (idx: number, val: string) => {
    const cleaned = cleanText(val, false);
    const nextLangs = [...pngLangsFlat];
    nextLangs[idx] = cleaned;
    const nextLevels = pngStructuredLangs.map((item, i) =>
      i === idx ? { ...item, name: cleaned } : item
    );
    updateCV({ languages: nextLangs, languageLevels: nextLevels });
  };

  const handleRemovePngLang = (idx: number) => {
    const nextLangs = pngLangsFlat.filter((_, i) => i !== idx);
    const nextLevels = pngStructuredLangs.filter((_, i) => i !== idx);
    if (nextLangs.length === 0) {
      handleRemoveKey('languages');
    } else {
      updateCV({ languages: nextLangs, languageLevels: nextLevels });
      onBlurSync?.();
    }
  };

  const handleAddPngLang = () => {
    const newLang = 'New Language';
    const { proficiency, percentage } = inferLanguageProficiencyAndPercentage(
      newLang,
      undefined,
      undefined,
      pngLangsFlat.length
    );
    updateCV({
      languages: [...pngLangsFlat, newLang],
      languageLevels: [
        ...pngStructuredLangs,
        { name: newLang, level: proficiency, proficiency, percentage }
      ]
    });
    onBlurSync?.();
  };

  const getExperienceBullets = (exp: WorkExperienceItem): string[] =>
    (exp.bullets && exp.bullets.length > 0
      ? exp.bullets
      : exp.rawDescription
      ? exp.rawDescription.split('\n').filter(Boolean)
      : []
    ).map((b) => cleanText(b, true));

  const renderFiveDotRating = (
    percentage: number,
    filledColor: string,
    emptyColor: string
  ) => {
    const filledCount = Math.max(1, Math.min(5, Math.round((percentage || 80) / 20)));
    return (
      <div className="inline-flex items-center gap-1 shrink-0">
        {[1, 2, 3, 4, 5].map((dotIdx) => (
          <span
            key={dotIdx}
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{
              backgroundColor: dotIdx <= filledCount ? filledColor : emptyColor
            }}
          />
        ))}
      </div>
    );
  };

  // ============================================================================
  // PNG TEMPLATE 1: "JOSH PARKER — SLATE EXECUTIVE (DAYJOB)"
  // Matches /assets/aistudio/1_2bb88509.jpg
  // Top-left photo & stacked Name on white; #7B92A8 Slate Blue lower-left sidebar
  // with Education & two-tone Black/White skill bars; Right column with Profile,
  // dark square icon contact list, and Date-Left Career timeline.
  // ============================================================================
  if (template.id === 'josh-slate-sidebar' || template.thumbnailType === 'josh-slate-sidebar') {
    const slateBoxColor = template.secondaryColor || '#7B92A8';
    const showEmail = !isRemoved('email') && Boolean(cv.email && cv.email.trim());
    const showPhone = !isRemoved('phone') && Boolean(cv.phone && cv.phone.trim());
    const showAddress = !isRemoved('address') && Boolean(cv.address && cv.address.trim());
    const showLinkedin =
      !isRemoved('linkedinUrl') && Boolean(cv.linkedinUrl && cv.linkedinUrl.trim()) && isValidUrl(cv.linkedinUrl);
    const showPortfolio =
      !isRemoved('portfolioUrl') && Boolean(cv.portfolioUrl && cv.portfolioUrl.trim()) && isValidUrl(cv.portfolioUrl);

    return (
      <div
        ref={sheetRef}
        data-layout-type="two-column-left"
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}
        <div className="grid grid-cols-12 min-h-[1123px] items-stretch">
          {/* LEFT COLUMN (col-span-4) */}
          <aside className="col-span-4 flex flex-col pl-7 pr-3 pt-7 pb-7 bg-white">
            {/* Top White Box: Photo + Stacked Bold Name + Subtitle */}
            <div className="bg-white pb-6">
              {hasPhoto && (
                <div className="mb-4 w-full overflow-hidden">
                  {renderPhotoSlot({ centered: false, darkSidebar: false })}
                </div>
              )}
              <h1
                className="cv-name text-[24px] font-extrabold uppercase tracking-tight leading-none text-slate-900 break-words"
                style={{ color: '#0F172A' }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="JOSH PARKER"
                  editable={editable}
                  multiline={true}
                  style={{ color: '#0F172A' }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>
              {showJobTitle && (
                <div
                  className={`group/jtitle flex items-center gap-1 text-[13px] font-semibold mt-1.5 ${
                    !hasJobTitleText ? 'cv-edit-cue' : ''
                  }`}
                  style={{ color: '#1E293B' }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="Chief Executive"
                    editable={editable}
                    style={{ color: '#1E293B' }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('jobTitle')}
                      className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lower Slate-Blue Box (#7B92A8) with Education, PRO. SKILLS & PER. SKILLS */}
            <div
              className="sidebar cv-dark-sidebar flex-1 p-5 flex flex-col gap-6"
              style={{ backgroundColor: slateBoxColor, color: '#FFFFFF' }}
            >
              {/* EDUCATION */}
              {!isRemoved('education') && (pngEduList.length > 0 || editable) && (
                <section className="group/sec cv-avoid-break">
                  <div className="flex items-center justify-between border-b border-white/45 pb-1 mb-3">
                    <h3
                      className="cv-section-heading text-[12px] font-bold uppercase tracking-wider text-white"
                      style={{ color: '#FFFFFF', whiteSpace: 'nowrap' }}
                    >
                      EDUCATION
                    </h3>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('education')}
                        className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-200 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3.5 text-[10.5px] text-white">
                    {pngEduList.map((edu, idx) => (
                      <div key={edu.id || idx} className="group/edu relative">
                        <div className="flex items-baseline justify-between gap-2 font-bold text-white">
                          <EditableSpan
                            value={edu.institution}
                            placeholder="University name"
                            editable={editable}
                            style={{ color: '#FFFFFF' }}
                            onSave={(val) => {
                              const next = [...pngEduList];
                              next[idx] = { ...edu, institution: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                          <EditableSpan
                            value={edu.degree}
                            placeholder="Course details"
                            editable={editable}
                            style={{ color: '#FFFFFF' }}
                            onSave={(val) => {
                              const next = [...pngEduList];
                              next[idx] = { ...edu, degree: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        {(edu.details || editable) && (
                          <div className="text-white/90 mt-0.5 leading-snug">
                            <EditableSpan
                              value={edu.details}
                              placeholder="Modules / Details"
                              editable={editable}
                              multiline={true}
                              style={{ color: '#F1F5F9' }}
                              onSave={(val) => {
                                const next = [...pngEduList];
                                next[idx] = { ...edu, details: val };
                                updateCV({ education: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                        )}
                        {(edu.year || editable) && (
                          <div className="text-white/90 mt-0.5 font-medium">
                            <EditableSpan
                              value={edu.year}
                              placeholder="2016 - 2020"
                              editable={editable}
                              style={{ color: '#FFFFFF' }}
                              onSave={(val) => {
                                const next = [...pngEduList];
                                next[idx] = { ...edu, year: val };
                                updateCV({ education: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* PRO. SKILLS (Black & White Horizontal Bars) */}
              {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
                <section className="group/sec cv-avoid-break">
                  <div className="flex items-center justify-between border-b border-white/45 pb-1 mb-3">
                    <h3
                      className="cv-section-heading text-[12px] font-bold uppercase tracking-wider text-white"
                      style={{ color: '#FFFFFF', whiteSpace: 'nowrap' }}
                    >
                      PRO. SKILLS
                    </h3>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('skills')}
                        className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-200 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {pngStructuredSkills.map((sk, idx) => (
                      <div key={`${sk.name}_${idx}`} className="group/sk flex items-center gap-2">
                        <div className="w-24 shrink-0 text-[10.5px] font-medium text-white truncate">
                          <EditableSpan
                            value={sk.name}
                            placeholder="Skill"
                            editable={editable}
                            style={{ color: '#FFFFFF' }}
                            onSave={(val) => handleUpdatePngSkill(idx, val)}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <div
                          className="flex-1 h-2 bg-white overflow-hidden"
                          style={{ backgroundColor: '#FFFFFF', height: '8px' }}
                        >
                          <div
                            style={{
                              width: `${sk.percentage}%`,
                              height: '100%',
                              backgroundColor: '#0F172A'
                            }}
                          />
                        </div>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => handleRemovePngSkill(idx)}
                            className="cv-edit-cue opacity-0 group-hover/sk:opacity-100 text-red-200 hover:text-white text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={handleAddPngSkill}
                      className="cv-edit-cue add-btn mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Skill</span>
                    </button>
                  )}
                </section>
              )}

              {/* PER. SKILLS / LANGUAGES (Black & White Horizontal Bars) */}
              {!isRemoved('languages') && (pngStructuredLangs.length > 0 || editable) && (
                <section className="group/sec cv-avoid-break">
                  <div className="flex items-center justify-between border-b border-white/45 pb-1 mb-3">
                    <h3
                      className="cv-section-heading text-[12px] font-bold uppercase tracking-wider text-white"
                      style={{ color: '#FFFFFF', whiteSpace: 'nowrap' }}
                    >
                      PER. SKILLS
                    </h3>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('languages')}
                        className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-200 hover:text-white"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {pngStructuredLangs.map((lg, idx) => (
                      <div key={`${lg.name}_${idx}`} className="group/lg flex items-center gap-2">
                        <div className="w-24 shrink-0 text-[10.5px] font-medium text-white truncate">
                          <EditableSpan
                            value={lg.name}
                            placeholder="Language"
                            editable={editable}
                            style={{ color: '#FFFFFF' }}
                            onSave={(val) => handleUpdatePngLang(idx, val)}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <div
                          className="flex-1 h-2 bg-white overflow-hidden"
                          style={{ backgroundColor: '#FFFFFF', height: '8px' }}
                        >
                          <div
                            style={{
                              width: `${lg.percentage}%`,
                              height: '100%',
                              backgroundColor: '#0F172A'
                            }}
                          />
                        </div>
                        {editable && (
                          <button
                            type="button"
                            onClick={() => handleRemovePngLang(idx)}
                            className="cv-edit-cue opacity-0 group-hover/lg:opacity-100 text-red-200 hover:text-white text-xs"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {editable && (
                    <button
                      type="button"
                      onClick={handleAddPngLang}
                      className="cv-edit-cue add-btn mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Item</span>
                    </button>
                  )}
                </section>
              )}
            </div>
          </aside>

          {/* RIGHT COLUMN (col-span-8) */}
          <main className="main-content col-span-8 bg-white px-7 py-7 flex flex-col gap-5">
            {/* PROFILE */}
            {!isRemoved('summary') && (pngSummaryText || editable) && (
              <section className="group/sec cv-avoid-break">
                <div className="flex items-center justify-between mb-2">
                  <h2
                    className="cv-section-heading text-[13px] font-extrabold uppercase tracking-wider text-slate-900"
                    style={{ color: '#0F172A' }}
                  >
                    PROFILE
                  </h2>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('summary')}
                      className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] leading-relaxed text-slate-800 text-justify">
                  <EditableSpan
                    value={pngSummaryText}
                    placeholder="Write executive profile summary..."
                    editable={editable}
                    multiline={true}
                    style={{ color: '#1E293B' }}
                    onSave={(val) => updateCV({ summary: val })}
                    onBlurSync={onBlurSync}
                  />
                </div>
              </section>
            )}

            {/* VERTICAL SQUARE-ICON CONTACT LIST */}
            {(showAddress || showPhone || showEmail || showLinkedin || showPortfolio) && (
              <div className="space-y-2 py-1 text-[11px] text-slate-900">
                {showAddress && (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                    <EditableSpan
                      value={cv.address}
                      placeholder="Address"
                      editable={editable}
                      style={{ color: '#0F172A' }}
                      onSave={(val) => updateCV({ address: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
                {showPhone && (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </span>
                    <EditableSpan
                      value={cv.phone}
                      placeholder="Phone"
                      editable={editable}
                      style={{ color: '#0F172A' }}
                      onSave={(val) => updateCV({ phone: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
                {showEmail && (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Mail className="w-3.5 h-3.5" />
                    </span>
                    <EditableSpan
                      value={cv.email}
                      placeholder="Email"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#0F172A' }}
                      onSave={(val) => updateCV({ email: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
                {showLinkedin && (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Linkedin className="w-3.5 h-3.5" />
                    </span>
                    <EditableSpan
                      value={cv.linkedinUrl}
                      placeholder="LinkedIn"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#0F172A' }}
                      onSave={(val) => updateCV({ linkedinUrl: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
                {showPortfolio && (
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 bg-slate-900 text-white flex items-center justify-center shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </span>
                    <EditableSpan
                      value={cv.portfolioUrl}
                      placeholder="Portfolio"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#0F172A' }}
                      onSave={(val) => updateCV({ portfolioUrl: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                )}
              </div>
            )}

            {/* CAREER (Left-Date Column + Right Role/Company/Bullets) */}
            {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                <div className="flex items-center justify-between mb-3">
                  <h2
                    className="cv-section-heading text-[13px] font-extrabold uppercase tracking-wider text-slate-900"
                    style={{ color: '#0F172A' }}
                  >
                    CAREER
                  </h2>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('experience')}
                      className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {cv.experience.map((exp, idx) => {
                    const bullets = getExperienceBullets(exp);
                    const dateStr =
                      exp.startDate && exp.endDate
                        ? `${exp.startDate} - ${exp.endDate}`
                        : exp.startDate || exp.endDate || '2020 - Present';

                    return (
                      <div key={exp.id || idx} className="group/exp flex items-start gap-4">
                        <div className="w-[95px] shrink-0 text-[10.5px] font-bold text-slate-900 pt-0.5">
                          {editable ? (
                            <EditableSpan
                              value={exp.startDate}
                              placeholder="2020 - Present"
                              editable={editable}
                              style={{ color: '#0F172A' }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, startDate: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          ) : (
                            <span>{dateStr}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-0.5 text-[11px] font-extrabold text-slate-900">
                            <span className="uppercase">
                              <EditableSpan
                                value={exp.role}
                                placeholder="CHIEF EXECUTIVE"
                                editable={editable}
                                style={{ color: '#0F172A' }}
                                onSave={(val) => {
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, role: val };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </span>
                            <span>
                              <EditableSpan
                                value={exp.company}
                                placeholder="Company name"
                                editable={editable}
                                style={{ color: '#0F172A' }}
                                onSave={(val) => {
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, company: val };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </span>
                          </div>

                          <ul className="mt-1.5 space-y-1 text-[10.5px] text-slate-800 list-disc pl-4">
                            {bullets.map((b, bIdx) => (
                              <li key={bIdx} className="leading-snug">
                                <EditableSpan
                                  value={b}
                                  placeholder="Key achievement..."
                                  editable={editable}
                                  multiline={true}
                                  style={{ color: '#1E293B' }}
                                  onSave={(val) => {
                                    const updatedB = [...bullets];
                                    updatedB[bIdx] = val;
                                    const next = [...cv.experience];
                                    next[idx] = { ...exp, bullets: updatedB };
                                    updateCV({ experience: next });
                                  }}
                                  onBlurSync={onBlurSync}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PROJECTS & CERTIFICATIONS IF PRESENT */}
            {renderProjectsSection()}
            {renderCertificationsSection(false)}

            {/* REFERENCES */}
            {renderReferencesSection()}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PNG TEMPLATE 2: "THEODORA DEVINE — NAVY SPLIT HEADER & PILLS (NOVORESUME)"
  // Matches /assets/aistudio/2_8b21dd4c.png
  // Rounded-square photo on top-left next to #162F44 Dark Navy box containing
  // Name, Title + short underline, and Summary; 2-col contact bar; solid navy
  // expertise pills; Work Experience with hollow circle bullets.
  // ============================================================================
  if (template.id === 'theodora-navy-pill' || template.thumbnailType === 'theodora-navy-pill') {
    const navyColor = template.accentColor || '#162F44';
    return (
      <div
        ref={sheetRef}
        data-layout-type="header-top"
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        {/* TOP SPLIT HEADER: Left Rounded Photo + Right Dark Navy Box with Name, Title & Summary */}
        <div className="pt-6 pl-8 flex items-stretch gap-5">
          {hasPhoto && (
            <div className="shrink-0 flex items-center">
              {renderPhotoSlot({ centered: false, darkSidebar: false })}
            </div>
          )}
          <header
            className="header-section flex-1 px-7 py-5"
            style={{ backgroundColor: navyColor, color: '#FFFFFF' }}
          >
            <h1
              className="cv-name text-[26px] font-bold tracking-tight leading-tight text-white"
              style={{ color: '#FFFFFF' }}
            >
              <EditableSpan
                value={cv.fullName}
                placeholder="Theodora Devine"
                editable={editable}
                style={{ color: '#FFFFFF' }}
                onSave={(val) => updateCV({ fullName: val })}
                onBlurSync={onBlurSync}
              />
            </h1>
            {showJobTitle && (
              <div className="mt-0.5 pb-1.5 border-b border-white/40 inline-block pr-8">
                <EditableSpan
                  value={cv.jobTitle}
                  placeholder="Marketing Executive"
                  editable={editable}
                  className="text-[13.5px] font-medium text-slate-200"
                  style={{ color: '#E2E8F0' }}
                  onSave={(val) => updateCV({ jobTitle: val })}
                  onBlurSync={onBlurSync}
                />
              </div>
            )}
            {!isRemoved('summary') && (pngSummaryText || editable) && (
              <div className="mt-2.5 text-[10.8px] leading-relaxed text-slate-100">
                <EditableSpan
                  value={pngSummaryText}
                  placeholder="Write a results-oriented professional summary..."
                  editable={editable}
                  multiline={true}
                  style={{ color: '#F1F5F9' }}
                  onSave={(val) => updateCV({ summary: val })}
                  onBlurSync={onBlurSync}
                />
              </div>
            )}
          </header>
        </div>

        {/* 2-COLUMN CONTACT BAR */}
        <div className="px-8 py-3 border-b border-slate-200">
          {renderContactDetails({ vertical: false, centered: false, darkSidebar: false })}
        </div>

        {/* MAIN SINGLE-COLUMN BODY */}
        <main className="main-content px-8 py-5 space-y-5 bg-white text-slate-900">
          {/* AREAS OF EXPERTISE (Solid Dark Navy Pill Badges) */}
          {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              <div
                className="flex items-center justify-between pb-1 mb-3 border-b-[1.5px]"
                style={{ borderColor: navyColor }}
              >
                <h2
                  className="cv-section-heading text-[13.5px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyColor }}
                >
                  AREAS OF EXPERTISE
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('skills')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {pngStructuredSkills.map((sk, idx) => (
                  <span
                    key={`${sk.name}_${idx}`}
                    className="group/sk inline-flex items-center gap-1.5 px-3 py-1 rounded-[5px] text-[11px] font-semibold text-white"
                    style={{ backgroundColor: navyColor, color: '#FFFFFF' }}
                  >
                    <EditableSpan
                      value={sk.name}
                      placeholder="Expertise"
                      editable={editable}
                      style={{ color: '#FFFFFF' }}
                      onSave={(val) => handleUpdatePngSkill(idx, val)}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemovePngSkill(idx)}
                        className="cv-edit-cue opacity-0 group-hover/sk:opacity-100 text-red-200 hover:text-white text-xs"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={handleAddPngSkill}
                  className="cv-edit-cue add-btn mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Expertise</span>
                </button>
              )}
            </section>
          )}

          {/* WORK EXPERIENCE */}
          {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              <div
                className="flex items-center justify-between pb-1 mb-3 border-b-[1.5px]"
                style={{ borderColor: navyColor }}
              >
                <h2
                  className="cv-section-heading text-[13.5px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyColor }}
                >
                  WORK EXPERIENCE
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('experience')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {cv.experience.map((exp, idx) => {
                  const bullets = getExperienceBullets(exp);
                  return (
                    <div key={exp.id || idx} className="group/exp">
                      <div className="text-[13.5px] font-bold text-slate-900">
                        <EditableSpan
                          value={exp.role}
                          placeholder="Digital Marketing Executive"
                          editable={editable}
                          style={{ color: '#0F172A' }}
                          onSave={(val) => {
                            const next = [...cv.experience];
                            next[idx] = { ...exp, role: val };
                            updateCV({ experience: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                      <div className="text-[12.5px] font-medium text-slate-800">
                        <EditableSpan
                          value={exp.company}
                          placeholder="Company / Consultancy"
                          editable={editable}
                          style={{ color: '#1E293B' }}
                          onSave={(val) => {
                            const next = [...cv.experience];
                            next[idx] = { ...exp, company: val };
                            updateCV({ experience: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] italic text-slate-500 mt-0.5">
                        <span>
                          {exp.startDate}
                          {exp.endDate ? ` – ${exp.endDate}` : ''}
                        </span>
                      </div>
                      <div className="text-[10px] italic text-slate-500 mt-1">Achievements</div>
                      <ul className="mt-1 space-y-1 text-[11px] text-slate-800">
                        {bullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2 leading-snug">
                            <span
                              className="mt-1.5 w-1.5 h-1.5 rounded-full border shrink-0"
                              style={{ borderColor: navyColor }}
                            />
                            <div className="flex-1 min-w-0">
                              <EditableSpan
                                value={b}
                                placeholder="Achievement bullet..."
                                editable={editable}
                                multiline={true}
                                style={{ color: '#1E293B' }}
                                onSave={(val) => {
                                  const updatedB = [...bullets];
                                  updatedB[bIdx] = val;
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, bullets: updatedB };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {renderEducationSection()}
          {renderProjectsSection()}
          {renderCertificationsSection(false)}
          {renderLanguagesSection(false)}
          {renderReferencesSection()}
        </main>
      </div>
    );
  }

  // ============================================================================
  // PNG TEMPLATES 3, 4, 5, 6, 7: ENHANCV EXECUTIVE TWO-COLUMN FAMILY
  // - Image 3: ats-standard / ella-white-teal (White Left + Deep Teal Right Sidebar)
  // - Image 4: anthony-royal-coral (Royal Blue & Coral 2-Column White)
  // - Image 5: luna-charcoal-grid (Charcoal Monochrome Underlined 2-Column)
  // - Image 6: ava-electric-hex (Electric Blue & Hexagon Pattern 2-Column)
  // - Image 7: mila-navy-banner (Full-Width Navy Top Banner + 2-Column White)
  // ============================================================================
  const isEllaTeal =
    template.id === 'ats-standard' || template.thumbnailType === 'ella-white-teal';
  const isAnthonyCoral =
    template.id === 'anthony-royal-coral' || template.thumbnailType === 'anthony-royal-coral';
  const isLunaCharcoal =
    template.id === 'luna-charcoal-grid' || template.thumbnailType === 'luna-charcoal-grid';
  const isAvaHex =
    template.id === 'ava-electric-hex' || template.thumbnailType === 'ava-electric-hex';
  const isMilaBanner =
    template.id === 'mila-navy-banner' || template.thumbnailType === 'mila-navy-banner';

  if (isEllaTeal || isAnthonyCoral || isLunaCharcoal || isAvaHex || isMilaBanner) {
    const primaryHeadingColor = isAnthonyCoral
      ? '#0B3578'
      : isLunaCharcoal
      ? '#27272A'
      : isAvaHex
      ? '#000000'
      : '#334155';

    const highlightColor = isEllaTeal
      ? '#0D9488'
      : isAnthonyCoral
      ? '#EA580C'
      : isLunaCharcoal
      ? '#52525B'
      : isAvaHex
      ? '#0077FF'
      : '#1E325C';

    const roleTitleColor = isAnthonyCoral ? '#0B3578' : primaryHeadingColor;
    const companyTextColor = isAnthonyCoral
      ? '#1E293B'
      : isLunaCharcoal
      ? '#52525B'
      : highlightColor;
    const institutionTextColor = highlightColor;

    const rightSidebarDark = isEllaTeal;
    const rightSidebarBg = isEllaTeal ? template.secondaryColor || '#065F5B' : '#FFFFFF';

    const renderEnhancvSectionRule = (
      title: string,
      removeKey: RemovableFieldKey,
      onDark = false
    ) => {
      if (isAnthonyCoral) {
        return (
          <div className="flex items-center justify-between mb-2">
            <h3
              className="cv-section-heading text-[10.5px] font-semibold uppercase tracking-widest"
              style={{ color: '#64748B' }}
            >
              {title}
            </h3>
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveKey(removeKey)}
                className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      }

      const borderStyle = onDark
        ? '1px solid rgba(255,255,255,0.35)'
        : isEllaTeal
        ? '1px solid #CBD5E1'
        : `2px solid ${primaryHeadingColor}`;

      return (
        <div
          className="flex items-center justify-between pb-1 mb-2.5"
          style={{ borderBottom: borderStyle }}
        >
          <h3
            className={`cv-section-heading uppercase tracking-wide ${
              isEllaTeal ? 'text-[13px] font-medium' : 'text-[14px] font-extrabold'
            }`}
            style={{ color: onDark ? '#FFFFFF' : primaryHeadingColor }}
          >
            {title}
          </h3>
          {editable && (
            <button
              type="button"
              onClick={() => handleRemoveKey(removeKey)}
              className={`cv-edit-cue opacity-0 group-hover/sec:opacity-100 ${
                onDark ? 'text-red-200 hover:text-white' : 'text-red-500'
              }`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    };

    const headerNode = (onDarkBanner = false) => (
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1
            className="cv-name text-[28px] font-extrabold uppercase tracking-tight leading-none"
            style={{ color: onDarkBanner ? '#FFFFFF' : primaryHeadingColor }}
          >
            <EditableSpan
              value={cv.fullName}
              placeholder="YOUR FULL NAME"
              editable={editable}
              style={{ color: onDarkBanner ? '#FFFFFF' : primaryHeadingColor }}
              onSave={(val) => updateCV({ fullName: val })}
              onBlurSync={onBlurSync}
            />
          </h1>
          {showJobTitle && (
            <div
              className="text-[14px] font-semibold mt-1.5"
              style={{
                color: onDarkBanner
                  ? '#F8FAFC'
                  : isLunaCharcoal
                  ? '#71717A'
                  : highlightColor
              }}
            >
              <EditableSpan
                value={cv.jobTitle}
                placeholder="Executive Vice President | Strategy"
                editable={editable}
                style={{
                  color: onDarkBanner
                    ? '#F8FAFC'
                    : isLunaCharcoal
                    ? '#71717A'
                    : highlightColor
                }}
                onSave={(val) => updateCV({ jobTitle: val })}
                onBlurSync={onBlurSync}
              />
            </div>
          )}
          <div className="mt-2">
            {renderContactDetails({
              vertical: false,
              centered: false,
              darkSidebar: onDarkBanner
            })}
          </div>
        </div>
        {hasPhoto && (
          <div className="shrink-0">
            {renderPhotoSlot({ centered: false, darkSidebar: onDarkBanner })}
          </div>
        )}
      </div>
    );

    const achievementIcons = [Flag, Heart, Zap, Award, Star, Check];

    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{
          backgroundColor: '#ffffff',
          color: '#0f172a',
          width: '794px',
          minWidth: '794px',
          maxWidth: '794px',
          backgroundImage: isAvaHex
            ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='98' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2394a3b8' fill-opacity='0.14' fill-rule='nonzero'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            : undefined
        }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        {/* Full-Width Top Banner for Mila Allen (Image 7) */}
        {isMilaBanner && (
          <header
            className="header-section px-9 py-6"
            style={{ backgroundColor: '#1E325C', color: '#FFFFFF' }}
          >
            {headerNode(true)}
          </header>
        )}

        {/* Full-Width White Header for Anthony (4), Luna (5), Ava (6) */}
        {!isEllaTeal && !isMilaBanner && (
          <header className="header-section px-9 pt-7 pb-3">
            {headerNode(false)}
          </header>
        )}

        {/* Two-Column Body */}
        <div className="grid grid-cols-12 min-h-[960px]">
          {/* LEFT MAIN COLUMN */}
          <main
            className={`main-content ${
              isEllaTeal ? 'col-span-8 px-8 py-7' : 'col-span-7 pl-9 pr-5 py-4'
            } bg-white flex flex-col gap-5`}
          >
            {/* Header inside Left Column for Ella White (Image 3) */}
            {isEllaTeal && <div className="mb-1">{headerNode(false)}</div>}

            {/* SUMMARY */}
            {!isRemoved('summary') && (pngSummaryText || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('SUMMARY', 'summary', false)}
                <div className="text-[11px] leading-relaxed text-slate-700 text-justify">
                  <EditableSpan
                    value={pngSummaryText}
                    placeholder="Write executive summary..."
                    editable={editable}
                    multiline={true}
                    style={{ color: '#334155' }}
                    onSave={(val) => updateCV({ summary: val })}
                    onBlurSync={onBlurSync}
                  />
                </div>
              </section>
            )}

            {/* EXPERIENCE */}
            {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('EXPERIENCE', 'experience', false)}
                <div className="space-y-4">
                  {cv.experience.map((exp, idx) => {
                    const bullets = getExperienceBullets(exp);
                    const dateStr =
                      exp.startDate && exp.endDate
                        ? `${exp.startDate} - ${exp.endDate}`
                        : exp.startDate || exp.endDate || '';
                    return (
                      <div
                        key={exp.id || idx}
                        className={`group/exp ${
                          (isLunaCharcoal || isMilaBanner) && idx < cv.experience.length - 1
                            ? 'pb-3 border-b border-dashed border-slate-200'
                            : ''
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <div
                            className="text-[13.5px] font-semibold"
                            style={{ color: roleTitleColor }}
                          >
                            <EditableSpan
                              value={exp.role}
                              placeholder="Senior Vice President"
                              editable={editable}
                              style={{ color: roleTitleColor }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, role: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                          {isEllaTeal && dateStr && (
                            <span className="text-[10.5px] text-slate-600 shrink-0">
                              {dateStr}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
                          <div
                            className="text-[11.5px] font-bold"
                            style={{ color: companyTextColor }}
                          >
                            <EditableSpan
                              value={exp.company}
                              placeholder="Company Name"
                              editable={editable}
                              style={{ color: companyTextColor }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, company: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                        </div>

                        {!isEllaTeal && dateStr && (
                          <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5" />
                              <span>{dateStr}</span>
                            </span>
                          </div>
                        )}

                        <ul className="mt-1.5 space-y-1 text-[10.8px] text-slate-700 list-disc pl-4">
                          {bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              <EditableSpan
                                value={b}
                                placeholder="Key impact bullet..."
                                editable={editable}
                                multiline={true}
                                style={{ color: '#334155' }}
                                onSave={(val) => {
                                  const updatedB = [...bullets];
                                  updatedB[bIdx] = val;
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, bullets: updatedB };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* EDUCATION */}
            {!isRemoved('education') && (pngEduList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('EDUCATION', 'education', false)}
                <div className="space-y-3">
                  {pngEduList.map((edu, idx) => (
                    <div key={edu.id || idx} className="group/edu">
                      <div className="flex items-baseline justify-between gap-2">
                        <div
                          className="text-[13px] font-semibold"
                          style={{ color: roleTitleColor }}
                        >
                          <EditableSpan
                            value={edu.degree}
                            placeholder="Master of Business Administration (MBA)"
                            editable={editable}
                            style={{ color: roleTitleColor }}
                            onSave={(val) => {
                              const next = [...pngEduList];
                              next[idx] = { ...edu, degree: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        {isEllaTeal && edu.year && (
                          <span className="text-[10.5px] text-slate-600 shrink-0">{edu.year}</span>
                        )}
                      </div>
                      <div
                        className="text-[11.5px] font-bold mt-0.5"
                        style={{ color: institutionTextColor }}
                      >
                        <EditableSpan
                          value={edu.institution}
                          placeholder="University Name"
                          editable={editable}
                          style={{ color: institutionTextColor }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, institution: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                      {!isEllaTeal && edu.year && (
                        <div className="text-[10px] text-slate-500 mt-0.5 inline-flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          <span>{edu.year}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* RIGHT SIDEBAR COLUMN */}
          <aside
            className={`sidebar ${
              rightSidebarDark ? 'cv-dark-sidebar col-span-4 px-6 py-7' : 'cv-light-sidebar col-span-5 pl-5 pr-9 py-4'
            } flex flex-col gap-5`}
            style={{
              backgroundColor: rightSidebarBg,
              color: rightSidebarDark ? '#FFFFFF' : '#0F172A'
            }}
          >
            {/* LANGUAGES (with 5-Dot Rating) */}
            {!isRemoved('languages') && (pngStructuredLangs.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('LANGUAGES', 'languages', rightSidebarDark)}
                <div className="space-y-2.5">
                  {pngStructuredLangs.map((lg, idx) => (
                    <div
                      key={`${lg.name}_${idx}`}
                      className={`flex items-center justify-between gap-2 ${
                        !rightSidebarDark && !isAnthonyCoral && idx < pngStructuredLangs.length - 1
                          ? 'pb-2 border-b border-dashed border-slate-200'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div
                          className="text-[11.5px] font-bold"
                          style={{
                            color: rightSidebarDark
                              ? '#FFFFFF'
                              : isAnthonyCoral
                              ? '#0B3578'
                              : '#0F172A'
                          }}
                        >
                          <EditableSpan
                            value={lg.name}
                            placeholder="English"
                            editable={editable}
                            style={{
                              color: rightSidebarDark
                                ? '#FFFFFF'
                                : isAnthonyCoral
                                ? '#0B3578'
                                : '#0F172A'
                            }}
                            onSave={(val) => handleUpdatePngLang(idx, val)}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: rightSidebarDark ? '#CBD5E1' : '#64748B' }}
                        >
                          {lg.proficiency}
                        </div>
                      </div>
                      {renderFiveDotRating(
                        lg.percentage,
                        rightSidebarDark ? '#FFFFFF' : highlightColor,
                        rightSidebarDark ? 'rgba(255,255,255,0.28)' : '#E2E8F0'
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* KEY ACHIEVEMENTS (Projects) */}
            {!isRemoved('projects') && (pngProjectsList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('KEY ACHIEVEMENTS', 'projects', rightSidebarDark)}
                <div className="space-y-3">
                  {pngProjectsList.map((proj, idx) => {
                    const IconComp = achievementIcons[idx % achievementIcons.length];
                    return (
                      <div key={proj.id || idx} className="flex items-start gap-2.5">
                        <IconComp
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          style={{ color: rightSidebarDark ? '#FFFFFF' : highlightColor }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-[11.5px] font-bold leading-snug"
                            style={{
                              color: rightSidebarDark
                                ? '#FFFFFF'
                                : isAnthonyCoral
                                ? '#0B3578'
                                : '#0F172A'
                            }}
                          >
                            <EditableSpan
                              value={proj.name}
                              placeholder="Key Strategic Initiative"
                              editable={editable}
                              style={{
                                color: rightSidebarDark
                                  ? '#FFFFFF'
                                  : isAnthonyCoral
                                  ? '#0B3578'
                                  : '#0F172A'
                              }}
                              onSave={(val) => {
                                const next = [...pngProjectsList];
                                next[idx] = { ...proj, name: val };
                                updateCV({ projects: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                          <div
                            className="text-[10.5px] leading-snug mt-0.5"
                            style={{ color: rightSidebarDark ? '#CCFBF1' : '#475569' }}
                          >
                            <EditableSpan
                              value={proj.description}
                              placeholder="Describe measurable impact..."
                              editable={editable}
                              multiline={true}
                              style={{ color: rightSidebarDark ? '#CCFBF1' : '#475569' }}
                              onSave={(val) => {
                                const next = [...pngProjectsList];
                                next[idx] = { ...proj, description: val };
                                updateCV({ projects: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* SKILLS (Dot-separated in Ella White; Underlined chips in Anthony, Luna, Ava, Mila) */}
            {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('SKILLS', 'skills', rightSidebarDark)}
                {rightSidebarDark ? (
                  <div className="text-[11px] leading-relaxed text-white flex flex-wrap gap-x-1.5 gap-y-1">
                    {pngStructuredSkills.map((sk, idx) => (
                      <span key={`${sk.name}_${idx}`} className="inline-flex items-center gap-1">
                        <EditableSpan
                          value={sk.name}
                          placeholder="Skill"
                          editable={editable}
                          style={{ color: '#FFFFFF' }}
                          onSave={(val) => handleUpdatePngSkill(idx, val)}
                          onBlurSync={onBlurSync}
                        />
                        {idx < pngStructuredSkills.length - 1 && <span>·</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {pngStructuredSkills.map((sk, idx) => (
                      <span
                        key={`${sk.name}_${idx}`}
                        className="group/sk inline-flex items-center gap-1 border-b border-slate-300 pb-1 px-1 text-[11px] font-bold"
                        style={{ color: isAnthonyCoral ? '#0B3578' : '#0F172A' }}
                      >
                        <EditableSpan
                          value={sk.name}
                          placeholder="Skill"
                          editable={editable}
                          style={{ color: isAnthonyCoral ? '#0B3578' : '#0F172A' }}
                          onSave={(val) => handleUpdatePngSkill(idx, val)}
                          onBlurSync={onBlurSync}
                        />
                        {editable && (
                          <button
                            type="button"
                            onClick={() => handleRemovePngSkill(idx)}
                            className="cv-edit-cue opacity-0 group-hover/sk:opacity-100 text-red-500 text-xs"
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TRAINING / COURSES (Certifications) */}
            {!isRemoved('certifications') && (pngCertsList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderEnhancvSectionRule('TRAINING / COURSES', 'certifications', rightSidebarDark)}
                <div className="space-y-2.5">
                  {pngCertsList.map((cert, idx) => (
                    <div key={idx} className="text-[11px] leading-snug">
                      <div
                        className="font-bold"
                        style={{
                          color: rightSidebarDark
                            ? '#FFFFFF'
                            : isAnthonyCoral
                            ? '#0B3578'
                            : isAvaHex || isMilaBanner
                            ? highlightColor
                            : '#52525B'
                        }}
                      >
                        <EditableSpan
                          value={cert}
                          placeholder="Professional Certification"
                          editable={editable}
                          multiline={true}
                          style={{
                            color: rightSidebarDark
                              ? '#FFFFFF'
                              : isAnthonyCoral
                              ? '#0B3578'
                              : isAvaHex || isMilaBanner
                              ? highlightColor
                              : '#52525B'
                          }}
                          onSave={(val) => {
                            const next = [...pngCertsList];
                            next[idx] = val;
                            updateCV({ certifications: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    );
  }

  // ============================================================================
  // PNG TEMPLATE 8: "ELLA GREEN — GOLDEN AMBER TIMELINE (classic-oxford)"
  // Matches /assets/aistudio/8_3d51f7d2.png
  // Navy #0F2942 Name & Section Headings, Golden Amber #CA8A04 Subtitle/Companies/
  // Institutions, Underlined Skill Chips, and Left-Date Timeline Rail with Circle Dots.
  // ============================================================================
  if (isTimelineClassic) {
    const navyHeading = mainHeadingTextColor || '#0F2942';
    const amberAccent = template.accentColor || '#CA8A04';

    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        <div className="px-9 pt-7 pb-5 space-y-5">
          {/* HEADER */}
          <header className="header-section flex items-start justify-between gap-5">
            <div className="flex-1 min-w-0">
              <h1
                className="cv-name text-[28px] font-extrabold uppercase tracking-tight leading-none"
                style={{ color: navyHeading }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="ELLA GREEN"
                  editable={editable}
                  style={{ color: navyHeading }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>
              {showJobTitle && (
                <div
                  className="text-[14px] font-bold mt-1.5"
                  style={{ color: amberAccent }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="Fractional CEO | Sustainable Technology Leadership"
                    editable={editable}
                    style={{ color: amberAccent }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                </div>
              )}
              <div className="mt-2">
                {renderContactDetails({ vertical: false, centered: false })}
              </div>
            </div>
            {hasPhoto && renderPhotoSlot({ centered: false })}
          </header>

          {/* SUMMARY */}
          {!isRemoved('summary') && (pngSummaryText || editable) && (
            <section className="group/sec cv-avoid-break">
              <div className="flex items-center justify-between mb-1.5">
                <h2
                  className="cv-section-heading text-[14px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyHeading }}
                >
                  SUMMARY
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('summary')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="text-[11px] leading-relaxed text-slate-700 text-justify">
                <EditableSpan
                  value={pngSummaryText}
                  placeholder="Write executive summary..."
                  editable={editable}
                  multiline={true}
                  style={{ color: '#334155' }}
                  onSave={(val) => updateCV({ summary: val })}
                  onBlurSync={onBlurSync}
                />
              </div>
            </section>
          )}

          {/* SKILLS (Underlined Bold Skill Chips) */}
          {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              <div className="flex items-center justify-between mb-2">
                <h2
                  className="cv-section-heading text-[14px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyHeading }}
                >
                  SKILLS
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('skills')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {pngStructuredSkills.map((sk, idx) => (
                  <span
                    key={`${sk.name}_${idx}`}
                    className="group/sk inline-flex items-center gap-1 border-b border-slate-300 pb-1 px-2 text-[11px] font-bold"
                    style={{ color: navyHeading }}
                  >
                    <EditableSpan
                      value={sk.name}
                      placeholder="Skill"
                      editable={editable}
                      style={{ color: navyHeading }}
                      onSave={(val) => handleUpdatePngSkill(idx, val)}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemovePngSkill(idx)}
                        className="cv-edit-cue opacity-0 group-hover/sk:opacity-100 text-red-500 text-xs"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCE (Left-Date Column + Vertical Timeline Line + Circle Node + Right Role/Amber Company/Bullets) */}
          {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              <div className="flex items-center justify-between mb-2.5">
                <h2
                  className="cv-section-heading text-[14px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyHeading }}
                >
                  EXPERIENCE
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('experience')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-0">
                {cv.experience.map((exp, idx) => {
                  const bullets = getExperienceBullets(exp);
                  const dateStr =
                    exp.startDate && exp.endDate
                      ? `${exp.startDate} - ${exp.endDate}`
                      : exp.startDate || exp.endDate || '01/2024 - Present';

                  return (
                    <div key={exp.id || idx} className="flex items-stretch">
                      {/* Left Date & Location Column */}
                      <div className="w-[130px] shrink-0 pr-4 pt-0.5">
                        <div className="text-[11px] font-bold" style={{ color: navyHeading }}>
                          {editable ? (
                            <EditableSpan
                              value={exp.startDate}
                              placeholder="01/2024 - Present"
                              editable={editable}
                              style={{ color: navyHeading }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, startDate: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          ) : (
                            <span>{dateStr}</span>
                          )}
                        </div>
                      </div>

                      {/* Vertical Timeline Divider + Circle Dot + Right Content */}
                      <div className="relative flex-1 pl-6 pb-4 border-l border-slate-300">
                        <span
                          className="w-2 h-2 rounded-full absolute -left-[4.5px] top-1.5"
                          style={{ backgroundColor: navyHeading }}
                        />
                        <div className="text-[14px] font-medium" style={{ color: navyHeading }}>
                          <EditableSpan
                            value={exp.role}
                            placeholder="Chief Executive Officer"
                            editable={editable}
                            style={{ color: navyHeading }}
                            onSave={(val) => {
                              const next = [...cv.experience];
                              next[idx] = { ...exp, role: val };
                              updateCV({ experience: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <div className="text-[11.5px] font-bold mt-0.5" style={{ color: amberAccent }}>
                          <EditableSpan
                            value={exp.company}
                            placeholder="Organization Name"
                            editable={editable}
                            style={{ color: amberAccent }}
                            onSave={(val) => {
                              const next = [...cv.experience];
                              next[idx] = { ...exp, company: val };
                              updateCV({ experience: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <ul className="mt-1.5 space-y-1 text-[10.8px] text-slate-700 list-disc pl-4">
                          {bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              <EditableSpan
                                value={b}
                                placeholder="Key impact bullet..."
                                editable={editable}
                                multiline={true}
                                style={{ color: '#334155' }}
                                onSave={(val) => {
                                  const updatedB = [...bullets];
                                  updatedB[bIdx] = val;
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, bullets: updatedB };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* EDUCATION (Left-Date Column + Vertical Timeline Line + Circle Dot) */}
          {!isRemoved('education') && (pngEduList.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              <div className="flex items-center justify-between mb-2.5">
                <h2
                  className="cv-section-heading text-[14px] font-extrabold uppercase tracking-wide"
                  style={{ color: navyHeading }}
                >
                  EDUCATION
                </h2>
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('education')}
                    className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="space-y-0">
                {pngEduList.map((edu, idx) => (
                  <div key={edu.id || idx} className="flex items-stretch">
                    <div className="w-[130px] shrink-0 pr-4 pt-0.5">
                      <div className="text-[11px] font-bold" style={{ color: navyHeading }}>
                        <EditableSpan
                          value={edu.year}
                          placeholder="01/2012 - 01/2014"
                          editable={editable}
                          style={{ color: navyHeading }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, year: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                    </div>
                    <div className="relative flex-1 pl-6 pb-3.5 border-l border-slate-300">
                      <span
                        className="w-2 h-2 rounded-full absolute -left-[4.5px] top-1.5"
                        style={{ backgroundColor: navyHeading }}
                      />
                      <div className="text-[13.5px] font-medium" style={{ color: navyHeading }}>
                        <EditableSpan
                          value={edu.degree}
                          placeholder="Master of Business Administration"
                          editable={editable}
                          style={{ color: navyHeading }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, degree: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                      <div className="text-[11.5px] font-bold mt-0.5" style={{ color: amberAccent }}>
                        <EditableSpan
                          value={edu.institution}
                          placeholder="Stanford Graduate School of Business"
                          editable={editable}
                          style={{ color: amberAccent }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, institution: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {renderProjectsSection()}
          {renderCertificationsSection(false)}
          {renderLanguagesSection(false)}
          {renderReferencesSection()}
        </div>
      </div>
    );
  }

  // ============================================================================
  // PNG TEMPLATE 9: "MIA WILLIAMS — CRIMSON & WARM ORANGE EDITORIAL (executive-board)"
  // Matches /assets/aistudio/9_432aad43.png
  // Single-column layout with bold black Name, #991B1B Crimson Red contact bar,
  // roles, degrees & language names, #EA580C Warm Orange companies & 2-col
  // Key Achievements titles, comma-separated skills, and right-aligned dates.
  // ============================================================================
  if (
    template.id === 'executive-board' ||
    template.thumbnailType === 'mia-crimson-editorial'
  ) {
    const crimsonColor = '#991B1B';
    const orangeColor = '#EA580C';

    const renderMiaHeading = (title: string, removeKey: RemovableFieldKey) => (
      <div className="flex items-center justify-between mb-1.5">
        <h3
          className="cv-section-heading text-[11.5px] font-bold uppercase tracking-wider"
          style={{ color: '#64748B' }}
        >
          {title}
        </h3>
        {editable && (
          <button
            type="button"
            onClick={() => handleRemoveKey(removeKey)}
            className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );

    return (
      <div
        ref={sheetRef}
        data-layout-type="single-column-classic"
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}
        <div className="px-9 py-7 space-y-4">
          {/* HEADER */}
          <header className="header-section">
            <h1
              className="cv-name text-[28px] font-extrabold uppercase tracking-tight leading-none text-black"
              style={{ color: '#000000' }}
            >
              <EditableSpan
                value={cv.fullName}
                placeholder="MIA WILLIAMS"
                editable={editable}
                style={{ color: '#000000' }}
                onSave={(val) => updateCV({ fullName: val })}
                onBlurSync={onBlurSync}
              />
            </h1>
            {showJobTitle && (
              <div className="text-[14.5px] text-slate-700 mt-1" style={{ color: '#334155' }}>
                <EditableSpan
                  value={cv.jobTitle}
                  placeholder="Executive Director | Strategic Leadership | Educational Outreach"
                  editable={editable}
                  style={{ color: '#334155' }}
                  onSave={(val) => updateCV({ jobTitle: val })}
                  onBlurSync={onBlurSync}
                />
              </div>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-medium" style={{ color: crimsonColor }}>
              {cv.phone && <span>{cv.phone}</span>}
              {cv.email && <span>{cv.email}</span>}
              {cv.linkedinUrl && <span>{cv.linkedinUrl}</span>}
              {cv.address && <span>{cv.address}</span>}
            </div>
          </header>

          {/* SUMMARY */}
          {!isRemoved('summary') && (pngSummaryText || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('SUMMARY', 'summary')}
              <div className="text-[11px] leading-relaxed text-slate-700">
                <EditableSpan
                  value={pngSummaryText}
                  placeholder="Write executive summary..."
                  editable={editable}
                  multiline={true}
                  style={{ color: '#334155' }}
                  onSave={(val) => updateCV({ summary: val })}
                  onBlurSync={onBlurSync}
                />
              </div>
            </section>
          )}

          {/* SKILLS (Comma-separated inline list) */}
          {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('SKILLS', 'skills')}
              <div className="text-[11px] leading-relaxed text-slate-800 flex flex-wrap gap-x-1.5">
                {pngStructuredSkills.map((sk, idx) => (
                  <span key={`${sk.name}_${idx}`} className="inline-flex items-center">
                    <EditableSpan
                      value={sk.name}
                      placeholder="Skill"
                      editable={editable}
                      style={{ color: '#1E293B' }}
                      onSave={(val) => handleUpdatePngSkill(idx, val)}
                      onBlurSync={onBlurSync}
                    />
                    {idx < pngStructuredSkills.length - 1 && <span>,</span>}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* EXPERIENCE */}
          {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('EXPERIENCE', 'experience')}
              <div className="space-y-3.5">
                {cv.experience.map((exp, idx) => {
                  const bullets = getExperienceBullets(exp);
                  const dateStr =
                    exp.startDate && exp.endDate
                      ? `${exp.startDate} - ${exp.endDate}`
                      : exp.startDate || exp.endDate || '';
                  return (
                    <div key={exp.id || idx} className="group/exp">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[15px] font-medium" style={{ color: crimsonColor }}>
                          <EditableSpan
                            value={exp.role}
                            placeholder="Chief Programs Officer"
                            editable={editable}
                            style={{ color: crimsonColor }}
                            onSave={(val) => {
                              const next = [...cv.experience];
                              next[idx] = { ...exp, role: val };
                              updateCV({ experience: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        {dateStr && (
                          <span className="text-[10.5px] text-slate-600 shrink-0">{dateStr}</span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[12px] font-medium" style={{ color: orangeColor }}>
                          <EditableSpan
                            value={exp.company}
                            placeholder="Organization Name"
                            editable={editable}
                            style={{ color: orangeColor }}
                            onSave={(val) => {
                              const next = [...cv.experience];
                              next[idx] = { ...exp, company: val };
                              updateCV({ experience: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                      </div>
                      <ul className="mt-1 space-y-1 text-[10.8px] text-slate-700 list-disc pl-4">
                        {bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-snug">
                            <EditableSpan
                              value={b}
                              placeholder="Impact bullet..."
                              editable={editable}
                              multiline={true}
                              style={{ color: '#334155' }}
                              onSave={(val) => {
                                const updatedB = [...bullets];
                                updatedB[bIdx] = val;
                                const next = [...cv.experience];
                                next[idx] = { ...exp, bullets: updatedB };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* EDUCATION */}
          {!isRemoved('education') && (pngEduList.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('EDUCATION', 'education')}
              <div className="space-y-2.5">
                {pngEduList.map((edu, idx) => (
                  <div key={edu.id || idx} className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-[14.5px] font-medium flex flex-wrap items-baseline gap-1.5" style={{ color: crimsonColor }}>
                        <EditableSpan
                          value={edu.degree}
                          placeholder="Master's in Nonprofit Management"
                          editable={editable}
                          style={{ color: crimsonColor }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, degree: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                        {edu.majorSubject && (
                          <span className="text-[12.5px] text-slate-700 font-normal">
                            ({edu.majorSubject})
                          </span>
                        )}
                      </div>
                      <div className="text-[12px] text-slate-800">
                        <EditableSpan
                          value={edu.institution}
                          placeholder="University of Washington"
                          editable={editable}
                          style={{ color: '#1E293B' }}
                          onSave={(val) => {
                            const next = [...pngEduList];
                            next[idx] = { ...edu, institution: val };
                            updateCV({ education: next });
                          }}
                          onBlurSync={onBlurSync}
                        />
                      </div>
                      {edu.details && (
                        <div className="text-[11px] text-slate-600 mt-0.5">{edu.details}</div>
                      )}
                    </div>
                    <div className="text-right text-[10.5px] text-slate-600 shrink-0">
                      {edu.year && <div>{edu.year}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* KEY ACHIEVEMENTS (2-Column Grid with Warm Orange Titles) */}
          {!isRemoved('projects') && (pngProjectsList.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('KEY ACHIEVEMENTS', 'projects')}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                {pngProjectsList.map((proj, idx) => (
                  <div key={proj.id || idx}>
                    <div className="text-[12px] font-bold" style={{ color: orangeColor }}>
                      <EditableSpan
                        value={proj.name}
                        placeholder="Dramatic Increase in Funding"
                        editable={editable}
                        style={{ color: orangeColor }}
                        onSave={(val) => {
                          const next = [...pngProjectsList];
                          next[idx] = { ...proj, name: val };
                          updateCV({ projects: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </div>
                    <div className="text-[10.8px] text-slate-700 leading-snug mt-0.5">
                      <EditableSpan
                        value={proj.description}
                        placeholder="Describe measurable impact..."
                        editable={editable}
                        multiline={true}
                        style={{ color: '#334155' }}
                        onSave={(val) => {
                          const next = [...pngProjectsList];
                          next[idx] = { ...proj, description: val };
                          updateCV({ projects: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* LANGUAGES */}
          {!isRemoved('languages') && (pngStructuredLangs.length > 0 || editable) && (
            <section className="group/sec cv-avoid-break">
              {renderMiaHeading('LANGUAGES', 'languages')}
              <div className="flex flex-wrap items-center gap-x-12 gap-y-1 text-[11.5px]">
                {pngStructuredLangs.map((lg, idx) => (
                  <div key={`${lg.name}_${idx}`} className="inline-flex items-baseline gap-1.5">
                    <span className="font-semibold" style={{ color: crimsonColor }}>
                      <EditableSpan
                        value={lg.name}
                        placeholder="English"
                        editable={editable}
                        style={{ color: crimsonColor }}
                        onSave={(val) => handleUpdatePngLang(idx, val)}
                        onBlurSync={onBlurSync}
                      />
                    </span>
                    <span className="text-slate-600 text-[10.5px]">({lg.proficiency})</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // PNG TEMPLATE 10: "JACKSON MILLER — SKY PILL & ICON BADGE SIDEBAR (creative-studio)"
  // Matches /assets/aistudio/10_52d3e9bf.png
  // Two-column white layout with thin uppercase Name + #8AB4F8 rounded sky-blue
  // pill banner for Job Title, and soft sky-blue square icon badges next to every
  // section heading across both columns.
  // ============================================================================
  if (
    template.id === 'creative-studio' ||
    template.thumbnailType === 'jackson-sky-pill' ||
    isCreativeAccent
  ) {
    const skyPillBg = '#8AB4F8';
    const skyIconBg = '#BFDBFE';
    const skyDotColor = '#3B82F6';

    const renderJacksonIconHeading = (
      title: string,
      IconComp: React.ComponentType<{ className?: string }>,
      removeKey?: RemovableFieldKey
    ) => (
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: skyIconBg, color: '#0F172A' }}
          >
            <IconComp className="w-3.5 h-3.5" />
          </span>
          <h3
            className="cv-section-heading text-[12.5px] font-extrabold uppercase tracking-wider text-slate-900"
            style={{ color: '#0F172A' }}
          >
            {title}
          </h3>
        </div>
        {editable && removeKey && (
          <button
            type="button"
            onClick={() => handleRemoveKey(removeKey)}
            className="cv-edit-cue opacity-0 group-hover/sec:opacity-100 text-red-500"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    );

    return (
      <div
        ref={sheetRef}
        data-layout-type="two-column-left"
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] min-h-[1123px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        <div className="grid grid-cols-12 p-8 gap-7 min-h-[1123px]">
          {/* LEFT SIDEBAR COLUMN (col-span-4, white background) */}
          <aside className="col-span-4 flex flex-col gap-5">
            {hasPhoto && (
              <div className="mb-1">
                {renderPhotoSlot({ circular: true, centered: false })}
              </div>
            )}

            {/* CONTACTS */}
            <section className="group/sec cv-avoid-break">
              {renderJacksonIconHeading('CONTACTS', Mail)}
              {renderContactDetails({ vertical: true, darkSidebar: false })}
            </section>

            {/* SKILLS */}
            {!isRemoved('skills') && (pngStructuredSkills.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('SKILLS', Rocket, 'skills')}
                <div className="text-[11px] leading-relaxed text-slate-700 flex flex-wrap gap-x-1.5 gap-y-1">
                  {pngStructuredSkills.map((sk, idx) => (
                    <span key={`${sk.name}_${idx}`} className="inline-flex items-center gap-1">
                      <EditableSpan
                        value={sk.name}
                        placeholder="Skill"
                        editable={editable}
                        style={{ color: '#334155' }}
                        onSave={(val) => handleUpdatePngSkill(idx, val)}
                        onBlurSync={onBlurSync}
                      />
                      {idx < pngStructuredSkills.length - 1 && <span>·</span>}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* KEY ACHIEVEMENTS */}
            {!isRemoved('projects') && (pngProjectsList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('KEY ACHIEVEMENTS', Flag, 'projects')}
                <div className="space-y-3">
                  {pngProjectsList.map((proj, idx) => (
                    <div key={proj.id || idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11.5px] font-bold text-slate-900 leading-snug">
                          <EditableSpan
                            value={proj.name}
                            placeholder="Cost Reduction Success"
                            editable={editable}
                            style={{ color: '#0F172A' }}
                            onSave={(val) => {
                              const next = [...pngProjectsList];
                              next[idx] = { ...proj, name: val };
                              updateCV({ projects: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        <div className="text-[10.5px] text-slate-600 leading-snug mt-0.5">
                          <EditableSpan
                            value={proj.description}
                            placeholder="Describe measurable impact..."
                            editable={editable}
                            multiline={true}
                            style={{ color: '#475569' }}
                            onSave={(val) => {
                              const next = [...pngProjectsList];
                              next[idx] = { ...proj, description: val };
                              updateCV({ projects: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* LANGUAGES */}
            {!isRemoved('languages') && (pngStructuredLangs.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('LANGUAGES', Languages, 'languages')}
                <div className="space-y-2">
                  {pngStructuredLangs.map((lg, idx) => (
                    <div
                      key={`${lg.name}_${idx}`}
                      className="flex items-center justify-between gap-2 text-[10.5px]"
                    >
                      <span className="uppercase font-medium text-slate-800">
                        <EditableSpan
                          value={lg.name}
                          placeholder="ENGLISH"
                          editable={editable}
                          style={{ color: '#1E293B' }}
                          onSave={(val) => handleUpdatePngLang(idx, val)}
                          onBlurSync={onBlurSync}
                        />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{lg.proficiency}</span>
                        {renderFiveDotRating(lg.percentage, skyDotColor, '#E2E8F0')}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* TRAINING / COURSES */}
            {!isRemoved('certifications') && (pngCertsList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('TRAINING / COURSES', FileText, 'certifications')}
                <div className="space-y-2">
                  {pngCertsList.map((cert, idx) => (
                    <div key={idx} className="text-[11px] font-bold text-slate-900">
                      <EditableSpan
                        value={cert}
                        placeholder="PMP Certification"
                        editable={editable}
                        multiline={true}
                        style={{ color: '#0F172A' }}
                        onSave={(val) => {
                          const next = [...pngCertsList];
                          next[idx] = val;
                          updateCV({ certifications: next });
                        }}
                        onBlurSync={onBlurSync}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>

          {/* RIGHT MAIN COLUMN (col-span-8, white background) */}
          <main className="main-content col-span-8 flex flex-col gap-5">
            {/* HEADER: Light Uppercase Name + Sky-Blue Rounded Pill Job Title */}
            <header className="header-section">
              <h1
                className="cv-name text-[32px] font-light uppercase tracking-[0.06em] leading-none text-slate-900"
                style={{ color: '#1E293B' }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="JACKSON MILLER"
                  editable={editable}
                  style={{ color: '#1E293B' }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>
              {showJobTitle && (
                <div
                  className="mt-2.5 px-4 py-2.5 rounded-xl uppercase tracking-[0.12em] text-[13px] font-medium"
                  style={{ backgroundColor: skyPillBg, color: '#0F172A' }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="CHIEF INFORMATION OFFICER | IT VISION | INNOVATION"
                    editable={editable}
                    style={{ color: '#0F172A' }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                </div>
              )}
            </header>

            {/* SUMMARY */}
            {!isRemoved('summary') && (pngSummaryText || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('SUMMARY', User, 'summary')}
                <div className="text-[11px] leading-relaxed text-slate-700 text-justify">
                  <EditableSpan
                    value={pngSummaryText}
                    placeholder="Write executive summary..."
                    editable={editable}
                    multiline={true}
                    style={{ color: '#334155' }}
                    onSave={(val) => updateCV({ summary: val })}
                    onBlurSync={onBlurSync}
                  />
                </div>
              </section>
            )}

            {/* EXPERIENCE */}
            {!isRemoved('experience') && (cv.experience.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('EXPERIENCE', Briefcase, 'experience')}
                <div className="space-y-4">
                  {cv.experience.map((exp, idx) => {
                    const bullets = getExperienceBullets(exp);
                    const dateStr =
                      exp.startDate && exp.endDate
                        ? `${exp.startDate} - ${exp.endDate}`
                        : exp.startDate || exp.endDate || '';
                    return (
                      <div key={exp.id || idx} className="group/exp">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="text-[13px] font-bold text-slate-900">
                            <EditableSpan
                              value={exp.company}
                              placeholder="Microsoft"
                              editable={editable}
                              style={{ color: '#0F172A' }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, company: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                          {dateStr && (
                            <span className="text-[11px] text-slate-700 shrink-0">{dateStr}</span>
                          )}
                        </div>
                        <div className="flex items-baseline justify-between gap-2 mt-0.5">
                          <div className="text-[12px] text-slate-800">
                            <EditableSpan
                              value={exp.role}
                              placeholder="Chief Information Officer"
                              editable={editable}
                              style={{ color: '#1E293B' }}
                              onSave={(val) => {
                                const next = [...cv.experience];
                                next[idx] = { ...exp, role: val };
                                updateCV({ experience: next });
                              }}
                              onBlurSync={onBlurSync}
                            />
                          </div>
                        </div>
                        <ul className="mt-1.5 space-y-1 text-[10.8px] text-slate-700 list-disc pl-4">
                          {bullets.map((b, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              <EditableSpan
                                value={b}
                                placeholder="Key impact bullet..."
                                editable={editable}
                                multiline={true}
                                style={{ color: '#334155' }}
                                onSave={(val) => {
                                  const updatedB = [...bullets];
                                  updatedB[bIdx] = val;
                                  const next = [...cv.experience];
                                  next[idx] = { ...exp, bullets: updatedB };
                                  updateCV({ experience: next });
                                }}
                                onBlurSync={onBlurSync}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* EDUCATION */}
            {!isRemoved('education') && (pngEduList.length > 0 || editable) && (
              <section className="group/sec cv-avoid-break">
                {renderJacksonIconHeading('EDUCATION', GraduationCap, 'education')}
                <div className="space-y-3">
                  {pngEduList.map((edu, idx) => (
                    <div key={edu.id || idx}>
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="text-[13px] font-bold text-slate-900">
                          <EditableSpan
                            value={edu.institution}
                            placeholder="University of Washington"
                            editable={editable}
                            style={{ color: '#0F172A' }}
                            onSave={(val) => {
                              const next = [...pngEduList];
                              next[idx] = { ...edu, institution: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                        </div>
                        {edu.year && (
                          <span className="text-[11px] text-slate-700 shrink-0">{edu.year}</span>
                        )}
                      </div>
                      <div className="flex items-baseline justify-between gap-2 mt-0.5">
                        <div className="text-[12px] text-slate-800 flex flex-wrap items-baseline gap-1">
                          <EditableSpan
                            value={edu.degree}
                            placeholder="Master of Information Technology"
                            editable={editable}
                            style={{ color: '#1E293B' }}
                            onSave={(val) => {
                              const next = [...pngEduList];
                              next[idx] = { ...edu, degree: val };
                              updateCV({ education: next });
                            }}
                            onBlurSync={onBlurSync}
                          />
                          {edu.majorSubject && (
                            <span className="text-[11px] text-slate-600">
                              ({edu.majorSubject})
                            </span>
                          )}
                        </div>
                        {edu.details && (
                          <span className="text-[11px] text-slate-600 shrink-0">{edu.details}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 0A. "HEADER-TOP" / TOP BANNER TEMPLATE (Top Header Dark, Blue Banner, Hexagon Pattern, etc.)
  // Uses LAYOUT_TYPE_GRID_MAP['header-top'] -> grid-cols-12 with col-span-12 Header & col-span-12 Main
  // ============================================================================
  if (isHeaderTop) {
    const headerPrimaryText = isHeaderTopDark ? '#FFFFFF' : mainHeadingTextColor;
    const headerSubText = isHeaderTopDark ? '#E2E8F0' : mainAccentColor;

    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className={`cv-paper-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] transition-all overflow-hidden ${serifSheetClass}`}
      >
        {renderDynamicStyleSheet()}

        <div className={gridLayout.gridContainerClass}>
          {/* Full-Width Top Banner / Header Section (col-span-12) */}
          <header
            className={`${gridLayout.headerColSpanClass} header-section top-header banner-header cv-header px-9 py-7 ${
              isPhotoOnHeaderCenter
                ? 'flex flex-col items-center text-center gap-4'
                : 'flex items-center justify-between gap-6'
            }`}
          >
            {hasPhoto && (isPhotoOnHeaderLeft || isPhotoOnHeaderCenter) && (
              <div className="shrink-0">
                {renderPhotoSlot({ centered: isPhotoOnHeaderCenter, darkSidebar: isHeaderTopDark })}
              </div>
            )}

            <div className={`flex-1 min-w-0 ${isPhotoOnHeaderCenter ? 'text-center flex flex-col items-center' : ''}`}>
              <h1
                className="cv-name text-[28px] font-extrabold uppercase tracking-tight leading-tight break-words"
                style={{ color: headerPrimaryText }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="Your Full Name"
                  editable={editable}
                  style={{ color: headerPrimaryText }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>

              {showJobTitle && (
                <p
                  className={`group/jtitle inline-flex items-center gap-1.5 text-[14px] font-semibold uppercase tracking-wider mt-1.5 ${
                    !hasJobTitleText ? 'cv-edit-cue' : ''
                  }`}
                  style={{ color: headerSubText }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="Target Job Title"
                    editable={editable}
                    style={{ color: headerSubText }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('jobTitle')}
                      title="Remove Job Title field"
                      className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-300 hover:text-white"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </p>
              )}

              <div className="mt-2.5">
                {renderContactDetails({
                  vertical: false,
                  centered: isPhotoOnHeaderCenter,
                  darkSidebar: isHeaderTopDark
                })}
              </div>
            </div>

            {hasPhoto && !isPhotoOnHeaderLeft && !isPhotoOnHeaderCenter && (
              <div className="shrink-0">
                {renderPhotoSlot({ centered: false, darkSidebar: isHeaderTopDark })}
              </div>
            )}
          </header>

          {/* Single-Column Main Content Below Top Banner (col-span-12) */}
          <main className={`${gridLayout.mainColSpanClass} main-content px-9 py-6 bg-white text-slate-900`}>
            {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 0B. "CLASSIC DARK SIDEBAR" TEMPLATE (Dark Sidebar + Progress Bars + Two-Column Layout)
  // Uses gridLayout.gridContainerClass (grid-cols-12) + sidebarColSpanClass (col-span-4) + mainColSpanClass (col-span-8)
  // ============================================================================
  if (isClassicDarkSidebar) {
    const headerBarBg =
      template.secondaryColor && template.secondaryColor !== '#FFFFFF'
        ? template.secondaryColor
        : '#1F2937';

    const showEmail = !isRemoved('email') && Boolean(cv.email && cv.email.trim());
    const showPhone = !isRemoved('phone') && Boolean(cv.phone && cv.phone.trim());
    const showAddress = !isRemoved('address') && Boolean(cv.address && cv.address.trim());
    const showLinkedin =
      !isRemoved('linkedinUrl') &&
      Boolean(cv.linkedinUrl && cv.linkedinUrl.trim()) &&
      isValidUrl(cv.linkedinUrl);
    const showPortfolio =
      !isRemoved('portfolioUrl') &&
      Boolean(cv.portfolioUrl && cv.portfolioUrl.trim()) &&
      isValidUrl(cv.portfolioUrl);
    const hasAnyContact =
      showEmail || showPhone || showAddress || showLinkedin || showPortfolio;

    const sidebarColumn = (
      <aside
        className={`sidebar cv-dark-sidebar ${gridLayout.sidebarColSpanClass} min-w-[250px] px-5 py-6 flex flex-col gap-5 overflow-hidden`}
        style={{ color: '#FFFFFF', maxWidth: '100%' }}
      >
        {/* Top Candidate Name & Job Title in Sidebar */}
        <div className="block w-full overflow-hidden">
          <h1
            className="cv-name text-[21px] font-extrabold tracking-tight leading-snug break-words block"
            style={{
              color: '#FFFFFF',
              display: 'block',
              margin: 0,
              wordBreak: 'break-word',
              overflowWrap: 'anywhere'
            }}
          >
            <EditableSpan
              value={cv.fullName}
              placeholder="Your Full Name"
              editable={editable}
              multiline={true}
              style={{ color: '#FFFFFF' }}
              onSave={(val) => updateCV({ fullName: val })}
              onBlurSync={onBlurSync}
            />
          </h1>
          {showJobTitle && (
            <div
              className={`group/jtitle flex items-start justify-between gap-1 text-[12.5px] font-medium leading-snug mt-1.5 break-words ${
                !hasJobTitleText ? 'cv-edit-cue' : ''
              }`}
              style={{
                color: '#D1D5DB',
                display: 'block',
                marginTop: '6px',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}
            >
              <EditableSpan
                value={cv.jobTitle}
                placeholder="Target Job Title"
                editable={editable}
                multiline={true}
                style={{ color: '#D1D5DB' }}
                onSave={(val) => updateCV({ jobTitle: val })}
                onBlurSync={onBlurSync}
              />
              {editable && (
                <button
                  type="button"
                  onClick={() => handleRemoveKey('jobTitle')}
                  title="Remove Job Title field"
                  className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-300 hover:text-white ml-1 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {hasPhoto && (
          <div className="pt-1 pb-1 flex justify-start">
            {renderPhotoSlot({ centered: false, darkSidebar: true })}
          </div>
        )}

        {/* Personal Info Section with Darker Full-Width Bar & Labeled Fields */}
        {hasAnyContact && (
          <div className="cv-avoid-break block">
            <div
              style={{
                backgroundColor: headerBarBg,
                color: '#FFFFFF',
                padding: '6px 20px',
                marginLeft: '-20px',
                marginRight: '-20px',
                marginBottom: '12px',
                display: 'block'
              }}
            >
              <h2
                className="cv-section-heading text-[13px] font-bold tracking-wide"
                style={{ color: '#FFFFFF', margin: 0, display: 'block' }}
              >
                Personal Info
                <span className="sr-only">{'\n'}</span>
              </h2>
            </div>

            <div className="space-y-3 text-[11px] block" style={{ display: 'block' }}>
              {showAddress && (
                <div className="group/citem block">
                  <div className="font-bold text-white flex items-center justify-between" style={{ color: '#FFFFFF' }}>
                    <span>Address</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('address')}
                        className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-300 hover:text-white"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 leading-snug" style={{ color: '#E5E7EB' }}>
                    <EditableSpan
                      value={cv.address}
                      placeholder="City, Country"
                      editable={editable}
                      style={{ color: '#E5E7EB' }}
                      onSave={(val) => updateCV({ address: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                </div>
              )}

              {showPhone && (
                <div className="group/citem block">
                  <div className="font-bold text-white flex items-center justify-between" style={{ color: '#FFFFFF' }}>
                    <span>Phone</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('phone')}
                        className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-300 hover:text-white"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono tabular-nums" style={{ color: '#E5E7EB' }}>
                    <EditableSpan
                      value={cv.phone}
                      placeholder="+92 300 0000000"
                      editable={editable}
                      style={{ color: '#E5E7EB' }}
                      onSave={(val) => updateCV({ phone: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                </div>
              )}

              {showEmail && (
                <div className="group/citem block">
                  <div className="font-bold text-white flex items-center justify-between" style={{ color: '#FFFFFF' }}>
                    <span>E-mail</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('email')}
                        className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-300 hover:text-white"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 break-all cv-url-text" style={{ color: '#E5E7EB' }}>
                    <EditableSpan
                      value={cv.email}
                      placeholder="email@domain.com"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#E5E7EB' }}
                      onSave={(val) => updateCV({ email: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                </div>
              )}

              {showPortfolio && (
                <div className="group/citem block">
                  <div className="font-bold text-white flex items-center justify-between" style={{ color: '#FFFFFF' }}>
                    <span>WWW</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('portfolioUrl')}
                        className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-300 hover:text-white"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 break-all cv-url-text" style={{ color: '#E5E7EB' }}>
                    <EditableSpan
                      value={cv.portfolioUrl}
                      placeholder="portfolio.dev"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#E5E7EB' }}
                      onSave={(val) => updateCV({ portfolioUrl: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                </div>
              )}

              {showLinkedin && (
                <div className="group/citem block">
                  <div className="font-bold text-white flex items-center justify-between" style={{ color: '#FFFFFF' }}>
                    <span>LinkedIn</span>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('linkedinUrl')}
                        className="cv-edit-cue opacity-0 group-hover/citem:opacity-100 text-red-300 hover:text-white"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-0.5 break-all cv-url-text" style={{ color: '#E5E7EB' }}>
                    <EditableSpan
                      value={cv.linkedinUrl}
                      placeholder="linkedin.com/in/profile"
                      editable={editable}
                      isUrl={true}
                      style={{ color: '#E5E7EB' }}
                      onSave={(val) => updateCV({ linkedinUrl: val })}
                      onBlurSync={onBlurSync}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamically rendered Sidebar sections from LAYOUT_TYPE_GRID_MAP */}
        {renderDynamicSectionList(gridLayout.sectionOrder.sidebar, true)}
      </aside>
    );

    const mainColumn = (
      <main
        className={`main-content ${gridLayout.mainColSpanClass} bg-white p-7 flex flex-col`}
        style={{ backgroundColor: '#FFFFFF', color: '#1F2937' }}
      >
        {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
      </main>
    );

    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#1F2937', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className={`cv-paper-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] transition-all overflow-hidden ${serifSheetClass}`}
      >
        {renderDynamicStyleSheet()}
        <div className={gridLayout.gridContainerClass}>
          {isSidebarOnRight ? (
            <>
              {mainColumn}
              {sidebarColumn}
            </>
          ) : (
            <>
              {sidebarColumn}
              {mainColumn}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 1. "TWO-COLUMN SIDEBAR" TEMPLATE (two-column-left & two-column-right via grid-cols-12)
  // Uses LAYOUT_TYPE_GRID_MAP -> sidebarColSpanClass (col-span-4) & mainColSpanClass (col-span-8)
  // ============================================================================
  if (isModernSidebar) {
    const darkBgHex = mainHeadingTextColor;
    const sidebarThemeClass = isSidebarDark ? 'cv-dark-sidebar' : 'cv-light-sidebar';
    const sidebarBaseTextColor = isSidebarDark ? '#F8FAFC' : '#0F172A';
    const showPhotoInHeader =
      hasPhoto &&
      (photoPosition === 'header-left' ||
        photoPosition === 'top-left' ||
        photoPosition === 'header-right' ||
        photoPosition === 'top-right' ||
        photoPosition === 'header-center');
    const showPhotoInSidebar = hasPhoto && !showPhotoInHeader;

    const sidebarColumn = (
      <aside
        className={`sidebar ${sidebarThemeClass} ${gridLayout.sidebarColSpanClass} min-w-[250px] p-6 flex flex-col gap-5 overflow-hidden`}
        style={{ color: sidebarBaseTextColor }}
      >
        {showPhotoInSidebar && (
          <div className="pt-1 pb-2 flex justify-center">
            {renderPhotoSlot({ centered: true, darkSidebar: isSidebarDark })}
          </div>
        )}

        {/* Sidebar Contact Info */}
        <div className="cv-avoid-break overflow-hidden">
          <div
            className="mb-2.5 pb-1 border-b overflow-hidden"
            style={{ borderColor: isSidebarDark ? 'rgba(255,255,255,0.22)' : '#CBD5E1' }}
          >
            <h3
              className="cv-section-heading text-[11px] font-bold uppercase tracking-wider whitespace-nowrap truncate"
              style={{ color: sidebarAccentColor, whiteSpace: 'nowrap', wordBreak: 'normal' }}
            >
              Contact Info
            </h3>
          </div>
          {renderContactDetails({ vertical: true, darkSidebar: isSidebarDark })}
        </div>

        {/* Dynamically rendered Sidebar sections from LAYOUT_TYPE_GRID_MAP */}
        {renderDynamicSectionList(gridLayout.sectionOrder.sidebar, isSidebarDark)}
      </aside>
    );

    const mainColumn = (
      <main className={`main-content ${gridLayout.mainColSpanClass} bg-white p-7 flex flex-col`}>
        <header
          className="header-section pb-4 mb-5 border-b-2 flex items-center justify-between gap-4"
          style={{ borderColor: darkBgHex }}
        >
          {showPhotoInHeader && isPhotoOnHeaderLeft && (
            <div className="shrink-0">
              {renderPhotoSlot({ centered: false })}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1
              className="cv-name text-[26px] font-extrabold uppercase tracking-tight leading-tight break-words"
              style={{ color: darkBgHex }}
            >
              <EditableSpan
                value={cv.fullName}
                placeholder="Your Full Name"
                editable={editable}
                style={{ color: darkBgHex }}
                onSave={(val) => updateCV({ fullName: val })}
                onBlurSync={onBlurSync}
              />
            </h1>
            {showJobTitle && (
              <p
                className={`group/jtitle inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wider mt-1 ${
                  !hasJobTitleText ? 'cv-edit-cue' : ''
                }`}
                style={{ color: mainAccentColor }}
              >
                <EditableSpan
                  value={cv.jobTitle}
                  placeholder="Target Job Title"
                  editable={editable}
                  style={{ color: mainAccentColor }}
                  onSave={(val) => updateCV({ jobTitle: val })}
                  onBlurSync={onBlurSync}
                />
                {editable && (
                  <button
                    type="button"
                    onClick={() => handleRemoveKey('jobTitle')}
                    title="Remove Job Title field"
                    className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </p>
            )}
          </div>
          {showPhotoInHeader && !isPhotoOnHeaderLeft && (
            <div className="shrink-0">
              {renderPhotoSlot({ centered: false })}
            </div>
          )}
        </header>

        {/* Dynamically rendered Main sections from LAYOUT_TYPE_GRID_MAP */}
        {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
      </main>
    );

    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a', width: '794px', minWidth: '794px', maxWidth: '794px' }}
        className={`cv-paper-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-[794px] min-w-[794px] max-w-[794px] transition-all overflow-hidden ${serifSheetClass}`}
      >
        {renderDynamicStyleSheet()}
        <div className={gridLayout.gridContainerClass}>
          {isSidebarOnRight ? (
            <>
              {mainColumn}
              {sidebarColumn}
            </>
          ) : (
            <>
              {sidebarColumn}
              {mainColumn}
            </>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. "TIMELINE CLASSIC" TEMPLATE (Clean White + Serif Typography + Vertical Timeline with Circle Nodes)
  // ============================================================================
  if (isTimelineClassic) {
    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        className="cv-paper-sheet cv-serif-sheet font-serif bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-full max-w-[794px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        <div className={gridLayout.gridContainerClass}>
          <div className={`${gridLayout.headerColSpanClass} px-9 pt-7`}>
            <header
              className="header-section pb-4 border-b-2 flex items-start justify-between gap-5"
              style={{ borderColor: mainAccentColor }}
            >
              {hasPhoto && isPhotoOnHeaderLeft && renderPhotoSlot({ centered: false })}
              <div className="flex-1 min-w-0">
                <h1
                  className="cv-name text-[26px] font-bold uppercase tracking-wide leading-tight"
                  style={{ color: mainHeadingTextColor }}
                >
                  <EditableSpan
                    value={cv.fullName}
                    placeholder="Your Full Name"
                    editable={editable}
                    style={{ color: mainHeadingTextColor }}
                    onSave={(val) => updateCV({ fullName: val })}
                    onBlurSync={onBlurSync}
                  />
                </h1>
                {showJobTitle && (
                  <p
                    className={`group/jtitle inline-flex items-center gap-1.5 text-[14px] font-semibold italic mt-1 ${
                      !hasJobTitleText ? 'cv-edit-cue' : ''
                    }`}
                    style={{ color: mainAccentColor }}
                  >
                    <EditableSpan
                      value={cv.jobTitle}
                      placeholder="Target Job Title"
                      editable={editable}
                      style={{ color: mainAccentColor }}
                      onSave={(val) => updateCV({ jobTitle: val })}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('jobTitle')}
                        title="Remove Job Title field"
                        className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </p>
                )}
                {renderContactDetails({ vertical: false, centered: false })}
              </div>
              {hasPhoto && !isPhotoOnHeaderLeft && renderPhotoSlot({ centered: false })}
            </header>
          </div>

          <main className={`${gridLayout.mainColSpanClass} main-content px-9 py-5`}>
            {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. "MINIMALIST CLEAN" TEMPLATE (Center-Aligned Name & Job Title + Rounded Skill Pills + 1-Page Fit)
  // ============================================================================
  if (isMinimalistClean) {
    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        className="cv-paper-sheet font-sans bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-full max-w-[794px] transition-all overflow-hidden"
      >
        {renderDynamicStyleSheet()}

        <div className={gridLayout.gridContainerClass}>
          <div className={`${gridLayout.headerColSpanClass} px-10 pt-7`}>
            <header className="header-section pb-4 border-b border-slate-300 text-center flex flex-col items-center">
              {hasPhoto && (
                <div className="mb-3">
                  {renderPhotoSlot({ centered: true })}
                </div>
              )}
              <h1
                className="cv-name text-[25px] font-bold uppercase tracking-widest leading-tight text-center"
                style={{ color: mainHeadingTextColor }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="Your Full Name"
                  editable={editable}
                  style={{ color: mainHeadingTextColor }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>
              {showJobTitle && (
                <p
                  className={`group/jtitle inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold uppercase tracking-widest text-slate-600 mt-1 ${
                    !hasJobTitleText ? 'cv-edit-cue' : ''
                  }`}
                  style={{ color: '#475569' }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="Target Job Title"
                    editable={editable}
                    style={{ color: '#475569' }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('jobTitle')}
                      title="Remove Job Title field"
                      className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </p>
              )}
              {renderContactDetails({ vertical: false, centered: true })}
            </header>
          </div>

          <main className={`${gridLayout.mainColSpanClass} main-content px-10 py-4`}>
            {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 4. "SINGLE-COLUMN CLASSIC" TEMPLATE (Clean Classic Corporate Format with Header & Single Column Body)
  // ============================================================================
  if (isExecutiveSerif) {
    return (
      <div
        ref={sheetRef}
        data-layout-type={gridLayout.layoutType}
        style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
        className={`cv-paper-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-full max-w-[794px] transition-all overflow-hidden ${serifSheetClass}`}
      >
        {renderDynamicStyleSheet()}

        <div className={gridLayout.gridContainerClass}>
          <div className={`${gridLayout.headerColSpanClass} px-9 pt-7`}>
            <header
              className={`header-section pb-4 border-b-4 border-double ${
                isPhotoOnHeaderCenter
                  ? 'flex flex-col items-center text-center gap-4'
                  : 'flex items-center justify-between gap-6'
              }`}
              style={{ borderColor: mainHeadingTextColor }}
            >
              {hasPhoto && (isPhotoOnHeaderLeft || isPhotoOnHeaderCenter) && (
                <div className="shrink-0">
                  {renderPhotoSlot({ circular: false, centered: isPhotoOnHeaderCenter })}
                </div>
              )}
              <div className={`flex-1 min-w-0 ${isPhotoOnHeaderCenter ? 'text-center flex flex-col items-center' : ''}`}>
                <h1
                  className="cv-name text-[27px] font-bold tracking-wide leading-tight"
                  style={{ color: mainHeadingTextColor }}
                >
                  <EditableSpan
                    value={cv.fullName}
                    placeholder="Your Full Name"
                    editable={editable}
                    style={{ color: mainHeadingTextColor }}
                    onSave={(val) => updateCV({ fullName: val })}
                    onBlurSync={onBlurSync}
                  />
                </h1>
                {showJobTitle && (
                  <p
                    className={`group/jtitle inline-flex items-center gap-1.5 text-[14px] font-bold uppercase tracking-widest mt-1 ${
                      !hasJobTitleText ? 'cv-edit-cue' : ''
                    }`}
                    style={{ color: mainAccentColor }}
                  >
                    <EditableSpan
                      value={cv.jobTitle}
                      placeholder="Target Job Title"
                      editable={editable}
                      style={{ color: mainAccentColor }}
                      onSave={(val) => updateCV({ jobTitle: val })}
                      onBlurSync={onBlurSync}
                    />
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleRemoveKey('jobTitle')}
                        title="Remove Job Title field"
                        className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </p>
                )}
                {renderContactDetails({ vertical: false, centered: isPhotoOnHeaderCenter })}
              </div>
              {hasPhoto && !isPhotoOnHeaderLeft && !isPhotoOnHeaderCenter && (
                <div className="shrink-0">
                  {renderPhotoSlot({ circular: false })}
                </div>
              )}
            </header>
          </div>

          <main className={`${gridLayout.mainColSpanClass} main-content px-9 py-5`}>
            {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
          </main>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 5. "CREATIVE ACCENT" TEMPLATE (Soft Colored Accent Blocks behind Name & Headings + Circular Photo + 2-Col Projects/Certs Grid)
  // ============================================================================
  return (
    <div
      ref={sheetRef}
      data-layout-type={gridLayout.layoutType}
      style={{ backgroundColor: '#ffffff', color: '#0f172a' }}
      className={`cv-paper-sheet bg-white text-slate-900 shadow-sm border border-slate-200 mx-auto w-full max-w-[794px] transition-all overflow-hidden ${serifSheetClass}`}
    >
      {renderDynamicStyleSheet()}

      <div className={gridLayout.gridContainerClass}>
        {/* Soft Colored Accent Block Header with Circular Photo (col-span-12) */}
        <div className={`${gridLayout.headerColSpanClass} px-8 pt-6`}>
          <header
            className="header-section p-5 rounded-xl flex items-center justify-between gap-6"
            style={{
              backgroundColor: isCreativeAccent ? softAccentBg : '#F8FAFC',
              borderLeft: `6px solid ${mainAccentColor}`
            }}
          >
            {hasPhoto && isPhotoOnHeaderLeft && renderPhotoSlot({ circular: isCreativeAccent })}
            <div className="flex-1 min-w-0">
              <h1
                className="cv-name text-[26px] font-extrabold leading-tight"
                style={{ color: mainHeadingTextColor }}
              >
                <EditableSpan
                  value={cv.fullName}
                  placeholder="Your Full Name"
                  editable={editable}
                  style={{ color: mainHeadingTextColor }}
                  onSave={(val) => updateCV({ fullName: val })}
                  onBlurSync={onBlurSync}
                />
              </h1>
              {showJobTitle && (
                <p
                  className={`group/jtitle inline-flex items-center gap-1.5 text-[13.5px] font-bold uppercase tracking-wider mt-1 ${
                    !hasJobTitleText ? 'cv-edit-cue' : ''
                  }`}
                  style={{ color: mainAccentColor }}
                >
                  <EditableSpan
                    value={cv.jobTitle}
                    placeholder="Target Job Title"
                    editable={editable}
                    style={{ color: mainAccentColor }}
                    onSave={(val) => updateCV({ jobTitle: val })}
                    onBlurSync={onBlurSync}
                  />
                  {editable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveKey('jobTitle')}
                      title="Remove Job Title field"
                      className="cv-edit-cue opacity-0 group-hover/jtitle:opacity-100 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </p>
              )}
              {renderContactDetails({ vertical: false, centered: false })}
            </div>

            {/* Circular Photo (Gol) for Creative Accent */}
            {hasPhoto && !isPhotoOnHeaderLeft && renderPhotoSlot({ circular: isCreativeAccent })}
          </header>
        </div>

        {/* Main Content Body (col-span-12) */}
        <main className={`${gridLayout.mainColSpanClass} main-content px-8 py-5`}>
          {renderDynamicSectionList(gridLayout.sectionOrder.main, false)}
        </main>
      </div>
    </div>
  );
};
