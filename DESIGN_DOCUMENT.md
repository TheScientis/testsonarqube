# Detailed UI/UX Design Specification
**Project:** WIWOKDETOK 
**Theme:** Civic Tracker / Public Accountability Dashboard

This document serves as the single source of truth for the product's visual identity, user experience guidelines, and component specifications. It is intended for designers to maintain systemic consistency across all interfaces.

---

## 1. Design & UX Principles

1. **Clarity Over Clutter:** The interface presents dense data (promises, maps, and ledgers) using generous whitespace and strict asymmetrical grids to guide the user's eye naturally.
2. **Actionable Trust:** The app deals with public accountability. Visuals must invoke trust and authority, utilizing a stark, clean, mostly-white aesthetic accented by highly deliberate semantic colors.
3. **Immersive Context:** The use of interactive maps, large photography, and fluid transitions ensures the user feels anchored in the physical reality of the data. 
4. **Mobile-First Readability:** All typography, hit areas (buttons), and cards are scaled to be legible and easily tappable on hand-held devices before scaling up to desktop.

---

## 2. Color System

The application relies heavily on a neutral grayscale palette for its skeleton, utilizing vibrant semantic colors sparingly to highlight states, data metrics, and calls to action.

### 2.1 Base Colors (The Skeleton)
- **Application Background:** `#FFFFFF` (Pure White). Used for the entirety of the canvas, ensuring maximum contrast.
- **Surface Elevation Background:** `#F8FAFC` to `#F1F5F9` (Off-white / Ghost Gray). Used for hover states, modal backdrops, and secondary container backgrounds.

### 2.2 Typography Colors
- **Primary Text (Headers, High Emphasis):** `#0F172A` (Deep Slate / Near Black). Used for all headers, titles, and active data points.
- **Secondary Text (Body, Low Emphasis):** `#64748B` to `#94A3B8` (Muted Slate). Used for timestamps, descriptions, placeholders, and auxiliary data.

### 2.3 Semantic Colors (The Accents)
- **Success / Verified / Positive Actions:**
  - **Base:** `#10B981` (Vibrant Emerald)
  - **Interaction (Hover/Press):** `#059669` (Dark Emerald)
  - **Usage:** "Kept" promises, verified indicators, primary submit buttons.
- **Danger / Alert / Complaints:**
  - **Base:** `#FA5538` (Vibrant Red-Orange)
  - **Usage:** "Walk vs Talk" critical alerts, failed promises, urgent map constraints.
- **Warning / Caution:**
  - **Base:** `#F59E0B` (Amber)
  - **Usage:** Trending gaps, pending validations, or metrics requiring user attention but not panic.

### 2.4 Gradients & Overlays
- Map markers utilize linear gradients to pop against complex cartography:
  - **Complaint/Alert Markers:** A swift transition from `#FF6B4A` to `#FA5538`.
  - **Verification Markers:** A swift transition from `#34D399` to `#10B981`.
- **Image Overlays:** Hero background photography is darkened via a top-to-bottom gradient overlay transitioning from 90% opacity deep slate to 25% opacity, ensuring white overlay text is perfectly legible.

---

## 3. Typography & Scale

The product utilizes a single sans-serif typeface—**Inter**—optimized for highly legible interfaces and dense data dashboards. 

### 3.1 Font Weights
- **Regular (400):** Used for standard body copy, timestamps, and input text.
- **Medium (500):** Used for navigation links, secondary headers, and minor buttons.
- **Bold (700):** Used for primary buttons, module titles, component headers, and primary data figures.
- **Black (900):** Reserved exclusively for massive hero statements and primary page titles (e.g., the 57px landing page hero).

### 3.2 Typographic Hierarchy
- **Hero Display:** Scales fluidly based on viewport (from 32px on mobile to up to 72px on desktop). Features negative letter-spacing (-5%) and tightly compressed line height (0.9) to appear as a solid block of text.
- **H2 (Section Headers):** 24px (Desktop) / 18px (Mobile), Heavy weight, standard line height (1.2).
- **H3 (Card/Module Headers):** 16px to 18px, Bold.
- **Body Copy:** 14px (Secondary reading) to 16px (Primary reading). Line height is relaxed (1.5) for reading comfort.
- **Micro-Copy (Metadata, Tags):** 10px to 12px, often uppercase with aggressive letter-spacing (e.g., `0.06em`) for stylistic, architectural aesthetic.

---

## 4. Layout, Spacing & Grid System

Spatial consistency defines the professional feel of the dashboard.

### 4.1 Spacing Rhythm
The design adheres to an strict 4px/8px baselined grid rule.
- **Micro Spacing:** 4px (Between icons and accompanying text).
- **Component Inner Spacing:** 8px to 12px (Inside input fields, between list items).
- **Card Padding:** 20px to 24px (Inside statistic cards, feed wrappers, or modals).
- **Section Spacing:** 32px to 48px (Between major vertical sections on a page).

### 4.2 Grid Architecture
Sub-pages and dashboards execute an asymmetrical column split:
- **Total Canvas Width:** Max 1440px, centrally aligned.
- **Desktop Split:** A 12-column grid structure.
  - **Primary Content Area:** 8 columns wide (approx 66%), housing main feeds, search bars, and complex data forms.
  - **Contextual Sidebar:** 4 columns wide (approx 33%), housing supplementary widgets, trending bars, and map preview windows.
- **Mobile Split:** Stacks linearly, 100% width.

---

## 5. Shape, Elevation, and Shadows

The design relies on "soft containment"—using rounded corners, faint borders, and subtle shadows to separate content rather than harsh lines.

### 5.1 Corner Radii (Border Radius)
- **Sharp/Small (4px):** Checkboxes, tiny micro-tags.
- **Standard UI (8px):** Buttons, standard input fields, feed listing highlights.
- **Cards & Modals (12px to 16px):** Primary statistic cards, navigation dropdowns, pop-up modal containers, interactive maps.
- **Pill/Circular (Fully Rounded):** Avatars, primary icon wrappers, standalone action buttons (like a data-saver toggle).

### 5.2 Elevation (Shadows & Depth)
- **Level 1 (Flat):** 1px solid light gray border line (e.g., `#E2E8F0`). Used for standard cards sleeping on a white background. No shadow.
- **Level 2 (Hover/Actionable):** Tiny dropdown shadow with zero spread, dropping vertically by 2px with 5% opacity. Accompanied by the border color darkening slightly.
- **Level 3 (Dropdowns & Tooltips):** A broader shadow, dropping 4px with 10% opacity, ensuring the floating element visibly detach from the canvas. Tooltips employ a heavy background blur (backdrop filter blur 8px).
- **Level 4 (Modals & Dialogs):** The highest elevation. A double-layered shadow consisting of a wide 25px blur and an intense dropping shadow, placing the modal far above the UI. The background of the entire app is dimmed by a 50% opacity deep-slate overlay with an active blurring effect.

---

## 6. Component Specifications

### 6.1 Buttons
- **Primary Buttons:** Filled with the primary Semantic Green. Text is bold white. Highly rounded (8px to 12px rounding). Accompanied by a colored glow (shadow taking on the button's color at 20% opacity).
- **Secondary Buttons:** Transparent background with bold slate text. On hover, the background softly shifts to off-white/gray.
- **Hit Area:** Minimum height of 40px, but generally leaning toward 44px-56px on mobile interfaces to respect touch guidelines.

### 6.2 Forms & Input Fields
- **Container:** Tall, spacious input boxes (minimum 48px to 56px high).
- **State - Default:** Off-white background, 1px light gray border.
- **State - Active/Focus:** The border immediately transitions to the primary Semantic Green. An outer 'halo' ring of green at 20% opacity wraps the input, clearly indicating the active area.
- **Labels:** Bold, dark slate, positioned 6px above the input box.

### 6.3 Badges & Tags
Used heavily to define data state (e.g., "Verification", "Complaint").
- **Style:** Instead of solid blocks of color, badges use a 10% opacity wash of their respective color with text and borders in the 100% solid variant of that same color. This creates a lightweight, glowing effect rather than a heavy, dark block. 
- **Typography:** 10px, bold layout, fully capitalized with wide letter spacing.

### 6.4 Modals
- **Backdrop:** 50% opacity dark slate, applying a blur effect to the background application.
- **Entrance Animation:** Modals fade in over 200 milliseconds while simultaneously scaling up from 95% to 100% size, creating a popping "zoom-in" effect.
- **Header:** Contains a bold title aligned to the left and a circular, soft-hover close button positioned on the far right. Separated from the body by a 1px gray line.

---

## 7. Motion & Interaction Guidelines

Motion in the application is designed to feel responsive, organic, and entirely purposeful. Nothing moves without user provocation or critical system updates.

- **Micro-Interactions (Hover States):** Color transitions (e.g., a button turning from green to dark-green, or a border turning from gray to primary) occur over an ultra-fast **150ms** baseline, feeling instantaneous but not jarring.
- **Dramatic Image Scaling:** Featured images hidden behind data blocks will slowly scale up by 5% over a very long **700ms** duration when the user hovers the mouse over the container. This creates a premium, cinematic parallax feel without shifting actual UI elements.
- **Pulsing Alerts:** Critical UI elements (like a "Live Alert" dot) pulse opacity continuously to draw the eye indefinitely.
- **Feed Lists:** Hovering over a row inside a list applies a soft gray background. The transition acts immediately to enforce the feeling that the application interfaces closely with the user's cursor.

---

## 8. Map & Cartography Aesthetics
- **Canvas:** Map tiles are de-saturated and simplified. Labels for smaller roads or extraneous data are ignored, focusing the user entirely on territorial borders and data points.
- **Pins (Markers):** The actual map pins eschew traditional teardrop shapes in favor of perfect 36x36px circles. They feature a thick solid 3px white border, casting a distinct drop-shadow on the map beneath.
- **Pop-ups:** When clicking a pin, the pop-up dialogue box borrows the exact styling as standard application tooltips (rounded edges, slight backdrop blur, bold typography), making the map feel like a native extension of the UI rather than an embedded third-party widget.
