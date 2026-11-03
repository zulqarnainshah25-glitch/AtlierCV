import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { CVDocument, CVTemplate } from '../types/cv';
import { cleanCVDocumentText } from './textSanitizer';

export async function exportCVToPdf(
  element: HTMLElement,
  rawCv: CVDocument,
  template: CVTemplate
): Promise<void> {
  const cv = cleanCVDocumentText(rawCv);
  const cleanName = (cv.fullName || 'Professional').replace(/[^a-zA-Z0-9]/g, '_');
  const safeFileName = `${cleanName}_CV.pdf`;

  // 1. Create an isolated light-mode wrapper within viewport bounds so html2canvas renders all Grid/Flexbox columns, dark sidebars, and custom CSS accurately
  const wrapper = document.createElement('div');
  wrapper.className = 'cv-light-isolation cv-exporting-mode';
  wrapper.style.position = 'fixed';
  wrapper.style.left = '0';
  wrapper.style.top = '0';
  wrapper.style.width = '794px';
  wrapper.style.maxWidth = '794px';
  wrapper.style.zIndex = '-9999';
  wrapper.style.pointerEvents = 'none';
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#0f172a';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';

  // 2. Clone the live CV sheet so the live editor DOM is never mutated
  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add('cv-exporting-mode');

  // 2B. Sync computed styles from live DOM onto cloned structural sections (.header-section, .sidebar, .main-heading, .progress-bar-container, .progress-bar-fill)
  // so customCss background colors, gradients, and SVG patterns (e.g. Top Header Dark, Blue Banner, Hexagon pattern) print 100% faithfully in PDF
  const styleSelectors = [
    '.header-section',
    '.sidebar',
    '.main-heading',
    '.progress-bar-container',
    '.progress-bar-fill'
  ];
  styleSelectors.forEach((selector) => {
    const liveNodes = element.querySelectorAll<HTMLElement>(selector);
    const cloneNodes = clone.querySelectorAll<HTMLElement>(selector);
    liveNodes.forEach((liveNode, idx) => {
      const cloneNode = cloneNodes[idx];
      if (!cloneNode) return;
      const computed = window.getComputedStyle(liveNode);
      if (computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        cloneNode.style.backgroundColor = computed.backgroundColor;
      }
      if (computed.backgroundImage && computed.backgroundImage !== 'none') {
        cloneNode.style.backgroundImage = computed.backgroundImage;
        cloneNode.style.backgroundSize = computed.backgroundSize;
        cloneNode.style.backgroundPosition = computed.backgroundPosition;
        cloneNode.style.backgroundRepeat = computed.backgroundRepeat;
      }
      if (computed.color) {
        cloneNode.style.color = computed.color;
      }
      if (computed.borderBottomWidth && computed.borderBottomWidth !== '0px') {
        cloneNode.style.borderBottomWidth = computed.borderBottomWidth;
        cloneNode.style.borderBottomStyle = computed.borderBottomStyle;
        cloneNode.style.borderBottomColor = computed.borderBottomColor;
      }
      if (computed.borderLeftWidth && computed.borderLeftWidth !== '0px') {
        cloneNode.style.borderLeftWidth = computed.borderLeftWidth;
        cloneNode.style.borderLeftStyle = computed.borderLeftStyle;
        cloneNode.style.borderLeftColor = computed.borderLeftColor;
      }
    });
  });

  // Ensure template customCss is also embedded inside the cloned sheet
  if (template.customCss) {
    const customStyleEl = document.createElement('style');
    customStyleEl.textContent = template.customCss;
    clone.prepend(customStyleEl);
  }

  // 3. Remove all interactive inputs/textareas/selects, UI buttons, add buttons, drag handles, and edit cues
  clone
    .querySelectorAll(
      'button, select, .cv-edit-cue, .add-btn, .add-button, [data-dnd-handle], .drag-handle, [role="button"], [aria-roledescription="sortable"] button, input, textarea, .cv-interactive-field, .sr-only'
    )
    .forEach((el) => el.remove());

  // 4. Remove any remaining stray leaf elements containing UI button labels
  clone.querySelectorAll('*').forEach((el) => {
    if (el.children.length > 0) return;
    const text = (el.textContent || '').trim();
    if (
      /^\+?\s*\+?\s*Add\b/i.test(text) ||
      /^\+?\s*\+?\s*Group\b/i.test(text) ||
      text === '×' ||
      text === 'Remove Section' ||
      text === 'Remove' ||
      text === 'Add'
    ) {
      el.remove();
    }
  });

  // 5. Clear any residual dnd-kit transform styles so no element or date can ever float out of flow
  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (el.style && el.style.transform) {
      el.style.transform = 'none';
      el.style.transition = 'none';
    }
  });

  // 6. Make all static export text blocks and inline spans visible with proper line breaks and spacing
  clone.querySelectorAll<HTMLElement>('.cv-static-export-block').forEach((el) => {
    el.style.display = 'block';
    el.style.whiteSpace = 'pre-wrap';
    el.style.wordSpacing = 'normal';
    el.style.wordBreak = 'break-word';
    el.style.marginTop = '2px';
  });

  clone.querySelectorAll<HTMLElement>('.cv-static-export-inline').forEach((el) => {
    el.style.display = 'inline';
    el.style.whiteSpace = 'pre-wrap';
    el.style.wordSpacing = 'normal';
    el.style.wordBreak = 'break-word';
  });

  // Enforce justified alignment for summary, bullets, and text blocks in PDF export
  clone.querySelectorAll<HTMLElement>('.cv-summary-text, .cv-bullet-text, .cv-justified-text, .text-justify').forEach((el) => {
    el.style.textAlign = 'justify';
    (el.style as any).textJustify = 'inter-word';
    (el.style as any).textAlignLast = 'left';
    el.style.wordSpacing = 'normal';
  });

  // 7. Enforce explicit block display and bottom margin on all section headings so headings and body text NEVER stick together
  clone.querySelectorAll<HTMLElement>('.cv-section-heading, .main-heading, h2, h3').forEach((heading) => {
    heading.style.display = 'block';
    heading.style.wordSpacing = 'normal';
    const parent = heading.parentElement as HTMLElement | null;
    if (parent && parent !== clone) {
      if (!parent.style.marginBottom || parent.style.marginBottom === '0px') {
        parent.style.marginBottom = '10px';
      }
    }
  });

  // 8. Photo Slot Handling in PDF Export:
  // If template.photoSlot.position === 'hidden' or 'none', remove any photo slot from the clone;
  // otherwise preserve exact photo dimensions and border radius
  const isPhotoHidden =
    template.photoSlot?.position === 'hidden' ||
    template.photoSlot?.position === 'none' ||
    template.photoSlot?.widthMm === 0 ||
    template.photoSlot?.heightMm === 0;

  if (isPhotoHidden) {
    clone.querySelectorAll('.photo-slot, [data-photo-container]').forEach((el) => el.remove());
  } else {
    const images = clone.querySelectorAll('img');
    images.forEach((img) => {
      const isCircle = img.getAttribute('data-photo-shape') === 'circle';
      const customW = img.getAttribute('data-photo-width');
      const customH = img.getAttribute('data-photo-height');
      const customRadius = img.getAttribute('data-photo-radius');
      if (customW && customH) {
        img.style.width = `${customW}px`;
        img.style.height = `${customH}px`;
        img.style.maxWidth = `${customW}px`;
        img.style.maxHeight = `${customH}px`;
        img.style.borderRadius = customRadius || (isCircle ? '9999px' : '6px');
        img.style.objectFit = 'cover';
      } else if (isCircle) {
        img.style.width = '98px';
        img.style.height = '98px';
        img.style.maxWidth = '98px';
        img.style.maxHeight = '98px';
        img.style.borderRadius = '9999px';
        img.style.objectFit = 'cover';
      } else {
        img.style.width = '35mm';
        img.style.height = '45mm';
        img.style.maxWidth = '35mm';
        img.style.maxHeight = '45mm';
        img.style.objectFit = 'cover';
      }
    });
  }

  // 9. Configure exact A4 width (794px) and typography on the cloned sheet
  const hasHeaderSectionCssOnly =
    Boolean(template.customCss && template.customCss.includes('.header-section')) &&
    !Boolean(template.customCss && template.customCss.includes('.sidebar'));
  const isHeaderTop =
    template.layoutType === 'header-top' ||
    hasHeaderSectionCssOnly ||
    Boolean(
      template.name &&
        /top\s*header|blue\s*banner|header\s*dark|banner|hexagon/i.test(template.name) &&
        !template.customCss?.includes('.sidebar')
    );

  const isClassicDarkSidebar =
    !isHeaderTop &&
    (template.id === 'classic-dark-sidebar' ||
      template.thumbnailType === 'classic-dark-sidebar' ||
      Boolean(template.name && template.name.toLowerCase().includes('classic dark sidebar')) ||
      ((template.layoutType === 'two-column-left' || template.layoutType === 'two-column-right') &&
        Boolean(template.customCss && template.customCss.includes('.sidebar h2'))));

  const isSerif =
    !isClassicDarkSidebar &&
    !isHeaderTop &&
    (template.layoutType === 'minimal-timeline' ||
      template.id === 'executive-london' ||
      Boolean(template.fontFamily && /fraunces|georgia|serif|times|playfair/i.test(template.fontFamily)));

  clone.style.margin = '0';
  clone.style.width = '794px';
  clone.style.maxWidth = '794px';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';
  clone.style.background = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.fontFamily = isSerif
    ? "Georgia, 'Times New Roman', Times, serif"
    : 'Arial, Helvetica, sans-serif';
  clone.style.wordSpacing = 'normal';
  clone.style.letterSpacing = 'normal';

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // Allow browser layout & custom CSS styles to settle before capturing screenshot
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const canvas = await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      width: 794,
      windowWidth: 794
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidthMm = pdf.internal.pageSize.getWidth(); // 210mm
    const pageHeightMm = pdf.internal.pageSize.getHeight(); // 297mm

    const isFullBleedBannerOrSidebar =
      isHeaderTop ||
      isClassicDarkSidebar ||
      template.layoutType === 'two-column-left' ||
      template.layoutType === 'two-column-right';

    // For Top-Banner (header-top) and Sidebar templates (two-column-left / two-column-right), use tight 4mm margins so banners/sidebars look bold and full-bleed
    const marginX = isFullBleedBannerOrSidebar ? 4 : 12;
    const marginY = isFullBleedBannerOrSidebar ? 4 : 10;
    const usableWidthMm = pageWidthMm - marginX * 2;
    const usableHeightMm = pageHeightMm - marginY * 2;

    const rawImgHeightMm = (canvas.height * usableWidthMm) / canvas.width;

    // Fit 1-page CVs cleanly onto a single page within safe margins
    if (rawImgHeightMm <= usableHeightMm * 1.2) {
      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const scaleFactor = rawImgHeightMm > usableHeightMm ? usableHeightMm / rawImgHeightMm : 1;
      const finalWidthMm = usableWidthMm * scaleFactor;
      const finalHeightMm = rawImgHeightMm * scaleFactor;
      const centeredX = marginX + (usableWidthMm - finalWidthMm) / 2;

      pdf.addImage(imgData, 'JPEG', centeredX, marginY, finalWidthMm, finalHeightMm);
    } else {
      // Multi-page CV: slice canvas cleanly page-by-page
      const pxPerMm = canvas.width / usableWidthMm;
      const pageSliceHeightPx = Math.floor(usableHeightMm * pxPerMm);
      let currentY = 0;
      let pageIndex = 0;

      while (currentY < canvas.height - 8) {
        if (pageIndex > 0) {
          pdf.addPage();
        }
        const sliceHeightPx = Math.min(pageSliceHeightPx, canvas.height - currentY);
        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeightPx;

        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            currentY,
            canvas.width,
            sliceHeightPx,
            0,
            0,
            canvas.width,
            sliceHeightPx
          );
          const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
          const sliceHeightMm = sliceHeightPx / pxPerMm;
          pdf.addImage(sliceData, 'JPEG', marginX, marginY, usableWidthMm, sliceHeightMm);
        }

        currentY += sliceHeightPx;
        pageIndex += 1;
      }
    }

    pdf.save(safeFileName);
  } finally {
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
  }
}