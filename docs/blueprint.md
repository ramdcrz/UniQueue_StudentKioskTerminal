# **App Name**: UniQueue

## Core Features:

- Kiosk Ticket Generation: Allows students to select their service (Cashier or Accounting, if Main Building) and print a ticket. Smart logic ensures correct service options based on department configuration.
- Real-time Public Monitor: Displays 'Now Serving' tickets in a high-contrast grid, updated instantly via WebSockets, and uses a Text-to-Speech (TTS) tool to announce ticket calls aloud.
- Staff/Teller Dashboard: Provides an interface for staff to call the next chronological ticket, mark transactions as complete, or record no-shows. Includes conditional smart assignment logic for ticket allocation based on department and service type.
- Admin Analytics Dashboard: Offers department-specific or university-wide analytics on ticket volume, wait times, and staff efficiency, with the UI adapting to display data relevant to the admin's role (Department Admin vs. Superadmin).
- Role-Based Access Control (RBAC): Manages distinct permissions for Superadmin, Department Admin, Staff/Teller, and Kiosk/Public Monitor roles, enforced via JWT-based authentication and API routing.
- Real-time Data Synchronization: Utilizes Socket.io for instantaneous updates across all client interfaces (Kiosk, Public Monitor, Staff, Admin) whenever ticket status or queue state changes, ensuring immediate visibility.
- Robust Data Persistence: A PostgreSQL database managed with Prisma ORM storing Users, Departments, Counters, and Tickets, designed to support relational data, strict data isolation, and RBAC requirements.

## Style Guidelines:

- The 'Primary' color token is a bright, bold blue: #1856FF, used for dominant interactive elements, branding, and to signify importance.
- The 'Secondary' color token is a deep charcoal: #3A344E, providing a strong contrast and used for complementary UI elements and text against lighter backgrounds.
- The 'Success' token is a vibrant green: #07CA6B, specifically used to denote positive actions, confirmed statuses, and highlights.
- The 'Warning' token is a warm orange: #E89558, applied for alerts, pending states, or actions requiring user caution.
- The 'Danger' token is a bright red: #EA2143, reserved for critical actions, error messages, and alerts that require immediate attention.
- The 'Surface' token is pure white: #FFFFFF, forming the clean base for UI elements and translucent glassmorphism effects, ensuring clarity and modern appeal.
- The 'Text' token is a dark grey: #141414, chosen for optimal readability on all light-colored surfaces and enterprise-grade visual clarity.
- The background canvas color will be a very light, desaturated blueish-grey: #F4F4F7, maintaining the clean aesthetic and providing a subtle foundation for glassmorphic elements.
- An accent color, a deep indigo: #4D23AC, will be used sparingly for specific highlights or secondary brand elements, providing a strong complementary contrast to the primary blue.
- Display and Primary UI font: 'Plus Jakarta Sans' (sans-serif), chosen for its clean, modern, and enterprise-grade aesthetic, aligning with a mobile-first compact scale. Note: currently only Google Fonts are supported.
- Monospace font for numbers and data: 'JetBrains Mono' (monospace), specifically used for queue numbers and critical data points to ensure high readability and distinction. Note: currently only Google Fonts are supported.
- Utilize simple, clean, and professional outline icons that perfectly complement the high-contrast, liquidglass, and glassmorphic aesthetic. Icons will maintain WCAG 2.2 AA compliance for maximum accessibility and clarity.
- The application will implement a mobile-first approach with a comfortable density mode. Dashboards will strategically employ modern Bento-card layouts to organize information effectively and aesthetically across views.
- Specific layout guidelines include a centered frosted glassmorphism card for the Kiosk, a high-contrast 70/30 split column for the Public Monitor, and enterprise-grade Bento-style frosted cards for the Staff and Admin Dashboards.
- Subtle, fluid transitions and interactive animations, leveraging Framer Motion, will enhance user experience and bring the 'liquidglass' effects to life without distracting from core functionality.