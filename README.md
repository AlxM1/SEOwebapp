# SEO Audit Pro - Free Website Analysis App

A beautiful, free mobile app that analyzes websites for SEO performance, speed, accessibility, and provides actionable recommendations to help businesses rank higher on Google.

## Features

### Core Features
- **Instant SEO Analysis**: Enter any website URL and get a comprehensive SEO audit in seconds
- **Performance Metrics**: Check Core Web Vitals (FCP, LCP, CLS), page speed, and performance scores
- **SEO Scoring**: Evaluate on-page SEO, technical SEO, and best practices
- **Mobile Optimization**: Check mobile-friendliness and responsive design
- **Security Check**: Verify SSL/HTTPS implementation
- **Accessibility Audit**: Check accessibility standards compliance
- **AI-Powered Recommendations**: Get 5 personalized, actionable SEO improvement tips powered by Grok or OpenAI
- **User Accounts**: Register and login to save analysis history
- **Analysis History**: View and manage all previous website analyses
- **Analytics Dashboard**: Track your analysis activity and patterns

### User Experience
- **Beautiful Hero Animation**: Eye-catching intro with "1 click away" messaging
- **Smooth Animations**: Fluid transitions and micro-interactions powered by React Native Reanimated
- **Clean Report Design**: Easy-to-read dashboard with visual metrics and insights
- **Real-time Analysis**: Fast API integration with Google PageSpeed Insights
- **Light/Dark Mode**: Toggle between themes for comfortable viewing
- **Persistent Authentication**: Secure JWT-based authentication with token storage

### Lead Generation
- **Free Model**: Users can analyze without creating an account
- **Account Optional**: Create account to save history
- **CTA Button**: "We fix it for less than you think" link on report screen (points to your website)
- **Natural Flow**: Users analyze their site, see results, then get interested in your services

## Tech Stack
- **Expo SDK 53** - React Native framework
- **React Native 0.76.7** - Mobile UI framework
- **TypeScript** - Type-safe code
- **NativeWind + Tailwind v3** - Styling
- **React Native Reanimated v3** - Smooth animations
- **Lucide Icons** - Beautiful iconography
- **React Query** - Server/async state management

## APIs Used

### 1. Google PageSpeed Insights API
- **Cost**: Free
- **No Authentication**: Uses public API key
- **What it provides**:
  - Performance score (0-100)
  - SEO score (0-100)
  - Accessibility score (0-100)
  - Best Practices score (0-100)
  - Core Web Vitals metrics

### 2. Webpulls Free SEO Audit API
- **Cost**: Free
- **No Authentication Required**: Simple POST request
- **What it provides**:
  - On-page SEO analysis
  - Mobile optimization check
  - SSL certificate verification
  - Meta tags, headings, links analysis
  - Common SEO issues

### 3. AI Recommendation Engine (Grok or OpenAI)
- **API Support**: Grok 4 Fast (xAI) or GPT-5 Nano (OpenAI)
- **What it provides**:
  - 5 personalized SEO improvement recommendations
  - Impact levels (low/medium/high)
  - Actionable, specific guidance
  - Based on actual site metrics and issues
- **How it works**:
  - App collects all metrics from PageSpeed + Webpulls
  - Sends to AI with prompt for SEO expert analysis
  - Parses AI response and displays numbered recommendations
  - Real-time generation while user views report

## Project Structure

```
src/
├── app/
│   ├── _layout.tsx          # Root navigation with providers
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab layout (single tab for SEO Audit)
│   │   └── index.tsx        # Home screen with search bar
│   └── report.tsx           # Report screen with results
├── components/
│   ├── Logo.tsx
│   └── Themed.tsx
├── lib/
│   ├── cn.ts               # Class name utilities
│   ├── useColorScheme.ts   # Theme hook
│   ├── useClientOnlyValue.ts
│   ├── seo-api.ts          # API integration functions
│   ├── ThemeContext.tsx    # Light/dark mode management
│   ├── AuthContext.tsx     # User authentication state
│   └── api-client.ts       # Backend API client functions

backend/
├── server.js               # Express server setup
├── db.js                   # PostgreSQL database setup
├── middleware/
│   └── auth.js            # JWT authentication middleware
├── routes/
│   ├── auth.js            # Registration & login endpoints
│   ├── analysis.js        # Analysis history endpoints
│   └── analytics.js       # Analytics tracking endpoints
├── Dockerfile             # Docker configuration
└── package.json
```

## Next Steps: Customize Your Website Link

The CTA button currently points to `https://your-website.com/contact`. To update it with your real website:

1. Open `src/app/report.tsx`
2. Find the line: `onPress={() => Linking.openURL('https://your-website.com/contact')}`
3. Replace with your actual website URL

This is your lead magnet for your SEO and AI integration services business!

## Backend Setup

The app now includes a full Node.js/Express backend with PostgreSQL database for:
1. User authentication (registration & login)
2. Analysis history storage
3. Analytics tracking
4. Secure API key management

### Quick Start with Docker

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database on port 5432
- Express API on port 5000

### Manual Setup

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed instructions on:
- Installing PostgreSQL
- Setting up environment variables
- Database initialization
- API endpoints documentation
- Production deployment

### Frontend Configuration

Add to your `.env` file:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## Admin Panel

### Access the Admin Dashboard

Once the backend is running (via Docker Compose or manual setup):

**Navigate to:** `http://localhost:5000/admin`

### Admin Features

1. **Dashboard Statistics**
   - Total Users Count
   - Total Analyses Performed
   - Average Score Across All Analyses
   - Top Analyzed Domains

2. **User Management**
   - View all registered users
   - Promote users to admin status
   - Delete users and their data

3. **App Settings** - Fully Customizable
   - **App Title**: Change the main app name
   - **CTA Text**: Customize the call-to-action button text
   - **CTA URL**: Update the destination link for the CTA button

4. **Analytics**
   - Track top analyzed domains
   - View usage patterns
   - Monitor user activity

5. **Admin Logs**
   - Audit trail of all admin actions
   - Track who promoted/deleted users
   - Review settings changes

### First-Time Admin Setup

By default, the system requires an admin account. You can create one by:

1. Start your backend server (Docker or manual)
2. Register a user via the mobile app or API
3. Access database directly and update user role:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
   ```
4. Login to admin panel with those credentials

### Admin API Endpoints

All protected with JWT authentication + admin role verification:
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List all users
- `DELETE /api/admin/users/:id` - Remove user
- `POST /api/admin/users/:id/promote` - Promote to admin
- `GET /api/admin/settings` - Retrieve app settings
- `POST /api/admin/settings` - Save/update settings
- `GET /api/admin/logs` - Admin action logs

## Recent Updates

### V3.0 - Admin Panel & Full Customization
- ✅ Complete admin dashboard with authentication
- ✅ User management (promote admins, delete users)
- ✅ Customizable app settings (title, CTA text, CTA URL)
- ✅ Admin analytics dashboard (total users, analyses, average scores)
- ✅ Admin action logging & audit trail
- ✅ Role-based access control (user/admin roles)
- ✅ Top domains analytics tracking
- ✅ Responsive web interface accessible at `/admin`

### V2.0 - Full Backend & Authentication
- ✅ Node.js/Express backend
- ✅ PostgreSQL database with 5 tables (users, analysis_history, analytics_events, app_settings, admin_logs)
- ✅ User authentication (JWT-based)
- ✅ Save/retrieve analysis history
- ✅ Analytics event tracking
- ✅ Docker & Docker Compose support
- ✅ Frontend integration with AuthContext
- ✅ Automatic analysis saving for authenticated users

### V1.0 - Launch
- ✅ Beautiful home screen with hero animation
- ✅ Search bar for URL input
- ✅ Google PageSpeed Insights integration
- ✅ Comprehensive report screen with metrics
- ✅ CTA button for lead generation
- ✅ Smooth animations and transitions
- ✅ AI-powered recommendations (Grok or OpenAI)
- ✅ Light/dark mode toggle

## Design Inspiration

The app follows Apple's Human Interface Guidelines and modern mobile design patterns:
- Clean, gradient-based hero section
- Readable typography with clear hierarchy
- Smooth entrance animations
- Touch-friendly buttons and interactive elements
- Dark/light theme support

## How It Works

1. **User enters website URL** → Navigates to report screen
2. **APIs fetch data in parallel** → Google PageSpeed + Webpulls analysis
3. **Results displayed** → Beautiful dashboard with scores and metrics
4. **Lead generation CTA** → User sees consultation button
5. **User clicks CTA** → Redirected to your website for services

## Future Enhancements

- [ ] AI-powered personalized recommendations (pending API key)
- [ ] Historical tracking (save past analyses)
- [ ] Competitor comparison
- [ ] Export PDF reports
- [ ] Backlink analysis
- [ ] Keyword research integration
- [ ] Social media presence check

## No Setup Required

- ✅ Free APIs (no credit card needed)
- ✅ No authentication required
- ✅ No email collection
- ✅ Simple, straightforward user flow

This is your lead magnet for your SEO and AI integration services business!
