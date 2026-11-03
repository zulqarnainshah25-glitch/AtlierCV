import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx';
import { saveAs } from 'file-saver';
import { CVDocument, CVTemplate } from '../types/cv';
import { cleanCVDocumentText, isValidUrl } from './textSanitizer';

function hexClean(color: string, fallback = '0F172A'): string {
  const cleaned = (color || '').replace('#', '').trim();
  return /^[0-9A-Fa-f]{6}$/.test(cleaned) ? cleaned.toUpperCase() : fallback;
}

function dataUrlToUint8Array(dataUrl: string): { bytes: Uint8Array; type: 'jpg' | 'png' } | null {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
    const isPng = dataUrl.startsWith('data:image/png');
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return null;
    const binaryStr = window.atob(base64Part);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { bytes, type: isPng ? 'png' : 'jpg' };
  } catch {
    return null;
  }
}

export async function generateWordDocx(rawCv: CVDocument, template: CVTemplate): Promise<void> {
  const cv = cleanCVDocumentText(rawCv);
  const accentHex = hexClean(template.accentColor, '1D4ED8');
  const secondaryHex = hexClean(template.secondaryColor, '0F172A');
  const fontName = template.fontFamily === 'Fraunces' ? 'Georgia' : 'Calibri';

  const makeSectionHeader = (title: string) =>
    new Paragraph({
      spacing: { before: 280, after: 120 },
      border: {
        bottom: {
          color: accentHex,
          space: 4,
          style: BorderStyle.SINGLE,
          size: 8
        }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: 22,
          color: accentHex,
          font: fontName
        })
      ]
    });

  // Build Contact Line
  const contactParts = [
    cv.email,
    cv.phone,
    cv.address,
    isValidUrl(cv.linkedinUrl) ? cv.linkedinUrl : '',
    isValidUrl(cv.portfolioUrl) ? cv.portfolioUrl : ''
  ].filter(Boolean);

  // Build Header (with optional 35x45mm aspect ratio photo via ImageRun)
  const photoDecoded = cv.photoDataUrl ? dataUrlToUint8Array(cv.photoDataUrl) : null;

  const headerParagraphs: Paragraph[] = [
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: cv.fullName || 'Candidate Name',
          bold: true,
          size: 44,
          color: secondaryHex,
          font: fontName
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: cv.jobTitle || 'Professional Title',
          bold: true,
          size: 26,
          color: accentHex,
          font: fontName
        })
      ]
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({
          text: contactParts.join('  •  '),
          size: 19,
          color: '475569',
          font: 'Calibri'
        })
      ]
    })
  ];

  const docChildren: (Paragraph | Table)[] = [];

  if (photoDecoded) {
    // 35x45mm aspect ratio preserved (105px x 135px)
    const photoParagraph = new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new ImageRun({
          data: photoDecoded.bytes,
          transformation: {
            width: 105,
            height: 135
          },
          type: photoDecoded.type
        })
      ]
    });

    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 78, type: WidthType.PERCENTAGE },
              children: headerParagraphs
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              children: [photoParagraph]
            })
          ]
        })
      ]
    });
    docChildren.push(headerTable);
  } else {
    docChildren.push(...headerParagraphs);
  }

  // Professional Summary
  const summaryText = cv.summary || cv.rawSummary;
  if (summaryText) {
    docChildren.push(makeSectionHeader('Professional Summary'));
    docChildren.push(
      new Paragraph({
        spacing: { after: 160, line: 276 },
        children: [
          new TextRun({
            text: summaryText,
            size: 21,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Work Experience (Line 1: Company/Organization in Bold; Line 2: Role + Work Period)
  if (cv.experience && cv.experience.length > 0) {
    docChildren.push(makeSectionHeader('Work Experience'));
    for (const exp of cv.experience) {
      if (!exp.company && !exp.role) continue;
      const dateRange = [exp.startDate, exp.endDate].filter(Boolean).join(' – ');
      if (exp.company) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 140, after: 20 },
            children: [
              new TextRun({
                text: exp.company,
                bold: true,
                size: 23,
                color: secondaryHex,
                font: fontName
              })
            ]
          })
        );
      }
      docChildren.push(
        new Paragraph({
          spacing: { before: exp.company ? 0 : 140, after: 45 },
          children: [
            new TextRun({
              text: exp.role || 'Role',
              bold: true,
              size: 21,
              color: accentHex,
              font: 'Calibri'
            }),
            new TextRun({
              text: dateRange ? `    |    ${dateRange}` : '',
              bold: true,
              size: 19,
              color: '475569',
              font: 'Calibri'
            })
          ]
        })
      );

      const bullets =
        exp.bullets && exp.bullets.length > 0
          ? exp.bullets
          : exp.rawDescription
          ? exp.rawDescription.split('\n').filter(Boolean)
          : [];

      for (const bullet of bullets) {
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60, line: 260 },
            children: [
              new TextRun({
                text: bullet.replace(/^[•\-*]\s*/, ''),
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          })
        );
      }
    }
  }

  // Skills — Individual Structured Items ({ name, level, percentage })
  const skillItems =
    cv.skillLevels && cv.skillLevels.length > 0
      ? cv.skillLevels
      : (cv.skills || []).map((s) => ({
          name: s,
          level: 'Proficient',
          proficiency: 'Proficient',
          percentage: 85
        }));

  if (skillItems.length > 0) {
    docChildren.push(makeSectionHeader('Core Competencies & Skills'));
    for (const sk of skillItems) {
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 55 },
          children: [
            new TextRun({
              text: sk.name,
              bold: true,
              size: 20,
              color: secondaryHex,
              font: 'Calibri'
            }),
            new TextRun({
              text: `  —  ${sk.level || sk.proficiency || 'Proficient'} (${
                typeof sk.percentage === 'number' ? sk.percentage : 85
              }%)`,
              size: 20,
              color: '475569',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  }

  // Projects
  const validProjects = (cv.projects || []).filter((p) => p.name || p.description);
  if (validProjects.length > 0) {
    docChildren.push(makeSectionHeader('Key Projects'));
    for (const proj of validProjects) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: proj.name || 'Project',
              bold: true,
              size: 22,
              color: secondaryHex,
              font: fontName
            }),
            new TextRun({
              text: proj.roleOrTech ? `  —  ${proj.roleOrTech}` : '',
              italics: true,
              size: 19,
              color: accentHex,
              font: 'Calibri'
            }),
            new TextRun({
              text: isValidUrl(proj.link) ? `  (${proj.link})` : '',
              size: 18,
              color: '64748B',
              font: 'Calibri'
            })
          ]
        })
      );
      if (proj.description) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: proj.description,
                size: 20,
                color: '334155',
                font: 'Calibri'
              })
            ]
          })
        );
      }
    }
  }

  // Education
  const validEducation = (cv.education || []).filter((e) => e.degree || e.institution || e.majorSubject);
  if (validEducation.length > 0) {
    docChildren.push(makeSectionHeader('Education'));
    for (const edu of validEducation) {
      const degreeWithMajor = [
        edu.degree || 'Degree',
        edu.majorSubject ? `(${edu.majorSubject})` : ''
      ]
        .filter(Boolean)
        .join(' ');
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({
              text: degreeWithMajor,
              bold: true,
              size: 22,
              color: secondaryHex,
              font: fontName
            }),
            new TextRun({
              text: edu.institution ? `  |  ${edu.institution}` : '',
              size: 21,
              color: accentHex,
              font: 'Calibri'
            }),
            new TextRun({
              text: edu.year ? `    (${edu.year})` : '',
              size: 19,
              color: '64748B',
              font: 'Calibri'
            })
          ]
        })
      );
      if (edu.details) {
        docChildren.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: edu.details,
                size: 19,
                color: '475569',
                font: 'Calibri'
              })
            ]
          })
        );
      }
    }
  }

  // Certifications & Languages
  if (cv.certifications && cv.certifications.length > 0) {
    docChildren.push(makeSectionHeader('Certifications'));
    for (const cert of cv.certifications) {
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 50 },
          children: [
            new TextRun({
              text: cert,
              size: 20,
              color: '334155',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  }

  // Languages — Individual Structured Items ({ name, proficiency, percentage })
  const langItems =
    cv.languageLevels && cv.languageLevels.length > 0
      ? cv.languageLevels
      : (cv.languages || []).map((l) => ({
          name: l,
          level: 'Conversational (B1)',
          proficiency: 'Conversational (B1)',
          percentage: 75
        }));

  if (langItems.length > 0) {
    docChildren.push(makeSectionHeader('Languages'));
    for (const lg of langItems) {
      docChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 55 },
          children: [
            new TextRun({
              text: lg.name,
              bold: true,
              size: 20,
              color: secondaryHex,
              font: 'Calibri'
            }),
            new TextRun({
              text: `  —  ${lg.proficiency || lg.level || 'Conversational (B1)'} (${
                typeof lg.percentage === 'number' ? lg.percentage : 75
              }%)`,
              size: 20,
              color: '475569',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  }

  // References (Last Section)
  const removed = new Set(cv.removedFields || []);
  const validRefs = (cv.references || []).filter(
    (r) => r.name || r.designation || r.company || r.contact
  );
  if (!removed.has('references')) {
    if (validRefs.length > 0) {
      docChildren.push(makeSectionHeader('References'));
      for (const refItem of validRefs) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 80, after: 40 },
            children: [
              new TextRun({
                text: refItem.name || 'Referee',
                bold: true,
                size: 21,
                color: secondaryHex,
                font: fontName
              }),
              new TextRun({
                text: [refItem.designation, refItem.company].filter(Boolean).length > 0
                  ? `  —  ${[refItem.designation, refItem.company].filter(Boolean).join(', ')}`
                  : '',
                size: 20,
                color: accentHex,
                font: 'Calibri'
              }),
              new TextRun({
                text: refItem.contact ? `    (${refItem.contact})` : '',
                size: 19,
                color: '475569',
                font: 'Calibri'
              })
            ]
          })
        );
      }
    } else if (cv.referencesOnRequest) {
      docChildren.push(makeSectionHeader('References'));
      docChildren.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'References available upon request.',
              italics: true,
              size: 20,
              color: '475569',
              font: 'Calibri'
            })
          ]
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const safeFileName = `${(cv.fullName || 'Professional').replace(/[^a-zA-Z0-9_-]/g, '_')}_CV.docx`;
  saveAs(blob, safeFileName);
}
