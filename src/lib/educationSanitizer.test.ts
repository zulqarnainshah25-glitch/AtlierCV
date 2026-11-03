import assert from 'node:assert/strict';
import {
  stripAddressFromEducationField,
  cleanCVDocumentText
} from './textSanitizer.ts';
import { createEmptyCV } from '../data/seedTemplates.ts';

/**
 * Unit Tests for Education Field Sanitization & Personal Address Isolation
 */
export function runEducationSanitizerUnitTests(): void {
  // Test 1: Null / undefined / empty edge cases
  assert.equal(stripAddressFromEducationField(null, null), '');
  assert.equal(stripAddressFromEducationField(undefined, undefined), '');
  assert.equal(stripAddressFromEducationField('   ', 'Karachi'), '');

  // Test 2: Strips exact leaked personal address from Degree or Institution
  const personalAddr = 'Village Syedpur Shareef, Taluka Ubauro, Distt: Ghotki';
  assert.equal(
    stripAddressFromEducationField(
      'Bachelor of Arts - Village Syedpur Shareef, Taluka Ubauro, Distt: Ghotki',
      personalAddr
    ),
    'Bachelor of Arts'
  );

  // Test 3: Strips rural/residential address pattern even if candidateAddress differs slightly in casing
  assert.equal(
    stripAddressFromEducationField(
      'Intermediate (Pre-Medical), village syedpur shareef, taluka ubauro, distt: ghotki',
      ''
    ),
    'Intermediate (Pre-Medical)'
  );

  // Test 4: Preserves legitimate Degree, Major Subject, Board/University, Year, and CGPA/Percentage
  assert.equal(
    stripAddressFromEducationField('Bachelor of Business Administration (BBA)', personalAddr),
    'Bachelor of Business Administration (BBA)'
  );
  assert.equal(
    stripAddressFromEducationField('BISE Sukkur', personalAddr),
    'BISE Sukkur'
  );
  assert.equal(
    stripAddressFromEducationField('CGPA 3.6/4.0 (82%)', personalAddr),
    'CGPA 3.6/4.0 (82%)'
  );

  // Test 5: Full CV document sanitization keeps personal address in cv.address and never in cv.education
  const sampleCV = createEmptyCV('test_user_1');
  sampleCV.address = 'village syedpur shareef, taluka ubauro, distt: ghotki';
  sampleCV.education = [
    {
      id: 'edu_1',
      degree: 'Bachelor of Science Village Syedpur Shareef, Taluka Ubauro, Distt: Ghotki',
      majorSubject: 'Computer Science',
      institution: 'Shah Abdul Latif University Khairpur',
      year: '2020 - 2024',
      details: 'CGPA 3.5/4.0'
    }
  ];

  const cleaned = cleanCVDocumentText(sampleCV);
  assert.equal(cleaned.address, 'Village Syedpur Shareef, Taluka Ubauro, Distt: Ghotki');
  assert.equal(cleaned.education[0].degree, 'Bachelor of Science');
  assert.equal(cleaned.education[0].majorSubject, 'Computer Science');
  assert.equal(cleaned.education[0].institution, 'Shah Abdul Latif University Khairpur');
  assert.equal(cleaned.education[0].year, '2020 - 2024');
  assert.equal(cleaned.education[0].details, 'CGPA 3.5/4.0');
}

// Execute when run directly via tsx
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('educationSanitizer.test')) {
  runEducationSanitizerUnitTests();
  console.log('All Education Sanitizer Unit Tests passed successfully.');
}
