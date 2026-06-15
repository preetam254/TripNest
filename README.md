# TripNest - AI-Powered Travel Accommodation Booking Platform

TripNest is a complete, production-ready, full-stack travel accommodation booking platform. Guests can search, review, book, and pay for stay rentals using a secure, responsive, dark-mode-enabled interface. Hosts can list properties and track analytics via a tailored Chart.js dashboard, and Admins can verify stays, moderate comments, and audit transactions.

The project incorporates an **AI Trip Planner** (generating custom day-by-day itineraries matched to local stays based on days/budget inputs) and an **AI Chatbot Assistant** ("Nestor") alongside direct **real-time WebSocket-based guest-host messaging**.

---

## Technical Stack & Architecture

### Backend (Node.js & Express.js)
- **Architecture**: Model-View-Controller (MVC) REST API.
- **Real-Time Gateway**: Socket.io for messaging and typing indicators.
- **Database**: MongoDB Atlas using Mongoose ODM with automated aggregation hooks for reviews and rating recalculations.
- **Security**: JWT inside HTTP-only cookies, password hashing via Bcrypt, Helmet headers, Express Mongo sanitization, XSS protection, and Rate limiting.
- **Integrations**: Multer + Cloudinary (multi-image streams), Nodemailer, Razorpay Checkout SDK, and PDFKit (dynamic PDF invoice generation).

### Frontend (React.js SPA)
- **Build Core**: Vite + ES Modules.
- **Routing**: React Router DOM (with protected role-based guards).
- **Forms**: React Hook Form with input validations.
- **State Management**: Context API (Auth, Socket, Theme).
- **Styling**: Vanilla CSS3 Custom design system with HSL dark-mode toggling and glassmorphic micro-animations.
- **Interactive Map**: Leaflet Map displaying property coordinate pins.
- **Charts**: Chart.js drawing monthly revenue and reservation tallies.

---

## Folder Structure

```
TripNest/
├── backend/
│   ├── config/          # DB, Cloudinary, Nodemailer, Razorpay initializations
│   ├── controllers/     # REST Controllers (Auth, Booking, Payments, AI, etc.)
│   ├── middleware/      # JWT guards, Multer upload filters, Error handlers, Rate limiters
│   ├── models/          # 10 Mongoose schemas
│   ├── routes/          # REST API endpoints
│   ├── utils/           # Invoice generator, AI heuristics helper, Database Seeder
│   ├── server.js        # Server gateway bootstrap
│   └── package.json
└── frontend/
    ├── public/          # Static assets
    ├── src/
    │   ├── components/  # Reusable UI parts (common navbar, Leaflet map, carousel)
    │   ├── context/     # Theme, Auth, and Socket context providers
    │   ├── services/    # Axios API client setup
    │   ├── pages/       # Home, Search, Detail, Auth, Dashboards, and AI Planner
    │   ├── App.jsx      # Core routes mapper
    │   ├── index.css    # Premium CSS design system rules
    │   └── main.jsx     # App entry mounter
    ├── vite.config.js
    └── package.json
```

---

## Getting Started

### 1. Prerequisite
- Make sure Node.js (v18+) and MongoDB are installed on your machine.

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory matching the following configuration:

```env
# Server Config
PORT=5000
NODE_ENV=development
JWT_SECRET=tripnest_secret_key_change_in_production
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173

# Database Config
MONGO_URI=mongodb://localhost:27017/tripnest

# Cloudinary Credentials (For property and profile image uploads)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Razorpay Credentials (For booking transactions checkouts)
# Use 'rzp_test_mockkey' or leave blank to run in mock sandbox bypass mode
RAZORPAY_KEY_ID=rzp_test_mockkey
RAZORPAY_KEY_SECRET=rzp_test_mocksecret

# Nodemailer Credentials (For emails confirmation and forgot passwords recovery)
# Leave blank to fallback to a mock ethereal.email test server
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_specific_password
EMAIL_FROM=support@tripnest.com

# Gemini AI API Key (For live AI planner & AI chat queries)
# Leave blank to fallback to Nestor AI rule-based heuristics planning engine
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Installation
Open a terminal in the root workspace folder and run:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 4. Seed Database
Seeding loads three accounts:
- **Admin**: `admin@tripnest.com` / `password123`
- **Host**: `host@tripnest.com` / `password123`
- **Guest**: `guest@tripnest.com` / `password123`
It also inserts six sample property listings, transaction history, and star reviews.

```bash
cd ../backend
npm run seed
```

### 5. Launch Servers

Start the Backend API Server:
```bash
# From the backend/ folder
npm run dev
```

Start the React Development Server:
```bash
# In another terminal from the frontend/ folder
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## REST API Documentation

All API endpoints are prefixed with `/api`. Protected routes require a valid JWT passed in the request cookie (`token`) or authorization header (`Bearer <token>`).

### 1. Authentication (`/auth`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register a new account (Guest/Host) and email verification token |
| `POST` | `/auth/login` | Public | Login credentials, sets authentication cookie |
| `POST` | `/auth/logout` | Public | Destroys current cookies |
| `POST` | `/auth/verify-email/:token` | Public | Verify account email address |
| `POST` | `/auth/forgot-password` | Public | Send recovery reset token via Nodemailer |
| `POST` | `/auth/reset-password/:token` | Public | Resets password with token |
| `POST` | `/auth/change-password` | Protected | Updates password (logged-in user) |
| `GET` | `/auth/me` | Protected | Returns user profile session context |

### 2. Properties (`/properties`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/properties` | Public | Fetch property list with filters (city, ratings, price, dates) |
| `GET` | `/properties/:id` | Public | Fetch stay detailed record |
| `POST` | `/properties` | Host/Admin | Create new stay (Multer multi-images upload) |
| `PUT` | `/properties/:id` | Host/Admin | Edit property stay details |
| `DELETE` | `/properties/:id` | Host/Admin | Delete property listing |

### 3. Bookings (`/bookings`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/bookings/check-availability` | Public | Check if dates are unreserved |
| `POST` | `/bookings` | Guest | Create pending stay reservation |
| `GET` | `/bookings/my-bookings` | Protected | Retrieves logged-in guest booking history |
| `GET` | `/bookings/host-bookings` | Host/Admin | Retrieves stays booked on Host properties |
| `PUT` | `/bookings/:id/cancel` | Protected | Cancel booking stay (triggers refund if PAID) |
| `GET` | `/bookings/:id/invoice` | Protected | Streams dynamic PDF invoice directly |

### 4. Payments (`/payments`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/payments/order` | Guest | Generate Razorpay transaction order in paise |
| `POST` | `/payments/verify` | Guest | Verify cryptographic signature and confirm Booking |
| `POST` | `/payments/refund/:bookingId` | Host/Admin | Triggers refund transaction via SDK |

### 5. AI Services (`/ai`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/ai/plan` | Public | Takes destination, days, budget and returns custom itinerary |
| `GET` | `/ai/recommend/:propertyId`| Public | Fetch properties matching category or city |
| `POST` | `/ai/chat` | Public | Conversational replies from Nestor AI chatbot |

---

## Socket.io Gateway Schema

### Handshake Parameters
Pass user ID in query arguments to track online indicator:
```javascript
const socket = io('http://localhost:5000', {
  query: { userId: user.id }
});
```

### Event Names
- `join_room` (Client emit): Payload `{ conversationId }`.
- `typing` (Client emit / Server broadcast): Payload `{ conversationId, userName }`.
- `stop_typing` (Client emit / Server broadcast): Payload `{ conversationId }`.
- `send_message` (Client emit): Payload `{ conversationId, message }`.
- `new_message` (Server broadcast): Broadcasts to conversation room participants.
- `message_notification` (Server broadcast): Direct notifications alert to other active participants.
- `user_status` (Server broadcast): Broadcasts `{ userId, status: 'online'|'offline' }`.