# AtelierCV — AI-Powered Professional CV Builder

A full-stack AI-powered CV Builder web application built with **React 19**, **Tailwind CSS**, **Node.js + Express**, **Firebase Firestore (Offline Persistence)**, **Firebase Auth**, **Groq API (`llama-3.3-70b-versatile`)**, **Stripe Checkout**, **react-easy-crop**, **dnd-kit**, and **PDF / Word (`.docx`) Export**.

---

## Key Features

1. **Structured User CV Form & Auto-Saved Drafts**:
   - Captures Full Name, Job Title, Email, Phone, Address, LinkedIn URL, Portfolio URL, Raw Professional Summary, Work Experience (multiple entries), Education (multiple entries), Skills, Projects, Languages, and Certifications.
   - Real-time validation for required fields, email format, and phone format.
   - Automatically saves form drafts to `localStorage`.

2. **6 Configurable JSON/CSS Templates with 35×45mm Photo Slot**:
   - **Modern Atelier** (`modern-atelier` — Free)
   - **ATS Precision** (`ats-standard` — Free)
   - **Classic Editorial** (`classic-oxford` — Premium)
   - **Minimal Zurich** (`minimal-zurich` — Premium)
   - **Creative Studio** (`creative-studio` — Premium)
   - **Executive Boardroom** (`executive-board` — Premium)
   - Side-by-side live preview next to the form.

3. **Single-Button AI "Build CV" (Groq `llama-3.3-70b-versatile`)**:
   - Sends raw form data to `/api/build-cv` on the Express backend.
   - Rewrites the summary into a 3–4 line executive profile, converts each work experience entry into 3–5 quantified action-verb bullet points, logically groups skills, and sharpens project descriptions while preserving all original facts, dates, companies, and degrees.
   - Includes automatic structured fallback if `GROQ_API_KEY` is missing or unreachable.

4. **Inline Editing + Drag-and-Drop Reordering (`@dnd-kit`)**:
   - Directly edit any field, summary, bullet point, skill tag, education entry, project, or certification on the rendered CV sheet.
   - Reorder work experience entries and individual bullet points via drag-and-drop.
   - Add or delete bullets, skills, and section items inline.

5. **Two-Tier Auto-Save (Device `localStorage` + Firestore Offline Persistence)**:
   - **Debounced Local Save (600ms)**: Immediately writes edits to `localStorage` without network latency.
   - **Database Sync (Every 7s, on field `onBlur`, and via "Save Changes")**: Synchronizes with Firebase Firestore (`persistentLocalCache` + `persistentMultipleTabManager` enabled).

6. **Pre-Export Sync Verification & High-Fidelity PDF / Word (`.docx`) Downloads**:
   - Waits for Firestore sync completion before exporting and displays `"Aap ke changes save ho gaye hain, ab download karein."` (or `"Cloud sync pending, local saved"` when offline without blocking export).
   - **PDF Export**: Preserves layout, typography, colors, and the 35×45mm photo slot.
   - **Word (`.docx`) Export**: Built with the `docx` package, embedding the 35×45mm cropped portrait via `ImageRun`.

7. **Passport Photo Upload & Crop (`react-easy-crop`)**:
   - Supports JPG/PNG up to 5MB, validates minimum 300×300px resolution, and crops to exact 35×45mm aspect ratio with zero AI modification.

8. **Admin Console (`/admin`)**:
   - Role-based access check for administrators.
   - Add, edit, delete, or seed CV templates and inspect registered users and their CVs (read-only).

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables (`.env`)
Copy `.env.example` to `.env` and configure the following secrets:

- **`GROQ_API_KEY`**:
  1. Visit [console.groq.com/keys](https://console.groq.com/keys) and generate an API key.
  2. Add `GROQ_API_KEY="gsk_..."` to `.env` or AI Studio Secrets.
  3. The backend `/api/build-cv` route uses model `llama-3.3-70b-versatile`.

- **Firebase Configuration & Offline Persistence**:
  - Firebase client credentials are automatically loaded from `firebase-applet-config.json`.
  - Offline persistence is enabled in `src/lib/firebase.ts` using `initializeFirestore` with `persistentLocalCache({ tabManager: persistentMultipleTabManager() })`.
  - Deploy security rules using the Firebase CLI or AI Studio integration:
    ```bash
    npx eslint firestore.rules
    ```

- **Stripe Checkout & Webhook Configuration**:
  1. Add `STRIPE_SECRET_KEY="sk_test_..."` and `STRIPE_WEBHOOK_SECRET="whsec_..."` to `.env`.
  2. For local webhook testing with the Stripe CLI:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhook/stripe
     ```
  3. When `checkout.session.completed` fires, the user's status is upgraded to `'premium'`.

### 3. Run the Application
```bash
npm run dev
```
The full-stack Express + Vite application starts on `http://localhost:3000`.
