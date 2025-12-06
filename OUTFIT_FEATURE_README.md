# AI Outfit Planner Feature

## Overview
Complete AI-powered outfit suggestion system that analyzes your wardrobe and generates stylish outfit combinations.

## What Was Built

### 1. Database Schema (`supabase/migrations/20250000_outfit_planner.sql`)
- **Extended `clothes` table** with:
  - `occasion_tags` - Array of occasions (casual, formal, etc.)
  - `season` - Best season for item (spring, summer, fall, winter, all-season)
  - `wear_count` - Tracks how many times worn
  - `last_worn` - Last date worn

- **New `outfits` table** for saved combinations:
  - Stores item IDs, occasion, AI-generated flag
  - Row Level Security enabled
  - Tracks `times_worn` for analytics

- **New `wear_log` table** for tracking usage:
  - Records when outfits/items were worn
  - Automatic trigger updates wear counts
  - Date-based tracking for analytics

### 2. TypeScript Types (`src/types/outfits.ts`)
- Complete type definitions for outfits, wear logs, suggestions
- Exported types: `Outfit`, `OutfitWithItems`, `WearLog`, `OutfitSuggestion`

### 3. API Endpoint (`src/app/api/suggest-outfits/route.ts`)
- **POST `/api/suggest-outfits`**
- Accepts: `occasion`, `season`, `count`
- Fetches user's wardrobe from Supabase
- Uses OpenAI GPT-4o-mini to generate outfit combinations
- Returns styled outfits with reasoning
- Fallback to simple random combinations if AI fails

### 4. React Hook (`src/hooks/useOutfitSuggestions.ts`)
- **`useOutfitSuggestions()`** hook
- Manages loading/error states
- Built-in caching to avoid redundant API calls
- Methods: `generateOutfits()`, `regenerate()`, `clearCache()`

### 5. UI Components

**`OutfitCard`** (`src/components/OutfitCard.tsx`)
- Displays 2x2 grid of outfit items
- Shows AI reasoning for the combination
- Save button to persist outfit to database
- Shuffle button for regeneration

**`OutfitGrid`** (`src/components/OutfitGrid.tsx`)
- Responsive grid layout (1/2/3 columns)
- Loading skeleton states
- Empty state messaging

**`OccasionFilter`** (`src/components/OccasionFilter.tsx`)
- Filter pills for occasions (Any, Casual, Formal, etc.)
- Icon + label design
- Active state styling

### 6. Outfits Page (`src/app/outfits/page.tsx`)
- Main outfit suggestion interface
- Auto-generates on first load
- Occasion filter integration
- Generate/Regenerate actions
- Error handling and empty states

### 7. Navigation Update (`src/components/SideNav.tsx`)
- Added "AI Outfits" link with Sparkles icon

## How to Deploy

### Step 1: Run Database Migration
```bash
# Connect to your Supabase project
# Navigate to SQL Editor in Supabase Dashboard
# Copy contents of supabase/migrations/20250000_outfit_planner.sql
# Execute the SQL script
```

Or via Supabase CLI:
```bash
supabase db push
```

### Step 2: Verify Environment Variables
Ensure these are set in your `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENAI_API_KEY=your_openai_key
```

### Step 3: Deploy to Vercel
```bash
git add .
git commit -m "feat: add AI outfit planner feature"
git push
```

## How It Works

1. **User visits `/outfits`**
2. **Selects occasion** (optional, defaults to "Any")
3. **Clicks "Generate Outfits"**
4. **API fetches** all user's clothing items from Supabase
5. **Groups items** by type (tops, bottoms, shoes, accessories)
6. **Sends to OpenAI** with prompt including:
   - Item descriptions (name, type, colors, tags)
   - Occasion context
   - Season preference
7. **OpenAI returns** 5-6 outfit combinations with reasoning
8. **UI displays** outfits in grid with images
9. **User can save** outfits to database for later

## AI Prompt Strategy

The API uses a structured prompt that:
- Describes each item with ID, name, type, colors, tags
- Specifies the occasion and season
- Enforces rules (at least top + bottom + shoes)
- Considers color harmony (complementary, analogous, monochromatic)
- Matches formality to occasion
- Returns structured JSON with item IDs and reasoning

## Future Enhancements

- [ ] Social feed for sharing outfits
- [ ] Weather integration for seasonal suggestions
- [ ] "Outfit of the Day" notifications
- [ ] Advanced filtering (by color, style, brand)
- [ ] Outfit editing (swap individual items)
- [ ] Statistics dashboard (most worn items, etc.)
- [ ] Calendar integration (plan outfits for week)
- [ ] Collaborative filtering (learn from user preferences)

## Tech Stack
- **Next.js 16** - App Router
- **React 19** - Client components
- **TypeScript** - Type safety
- **Supabase** - Database + Auth + Storage
- **OpenAI API** - GPT-4o-mini for AI suggestions
- **Tailwind CSS v4** - Styling
- **Shadcn UI** - Component library

## File Structure
```
src/
├── app/
│   ├── api/
│   │   └── suggest-outfits/
│   │       └── route.ts          # API endpoint
│   └── outfits/
│       └── page.tsx               # Main outfits page
├── components/
│   ├── OutfitCard.tsx             # Individual outfit display
│   ├── OutfitGrid.tsx             # Grid layout
│   ├── OccasionFilter.tsx         # Filter pills
│   └── SideNav.tsx                # Updated navigation
├── hooks/
│   └── useOutfitSuggestions.ts    # State management
└── types/
    └── outfits.ts                 # TypeScript definitions

supabase/
└── migrations/
    └── 20250000_outfit_planner.sql # Database schema
```

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Visit `/outfits` page (should auto-generate)
- [ ] Try different occasions (casual, formal, etc.)
- [ ] Click "Regenerate" to get new suggestions
- [ ] Save an outfit (check `outfits` table)
- [ ] Verify navigation link appears in sidebar
- [ ] Test on mobile (responsive grid)
- [ ] Check error handling (no items in closet)

## Support

For issues or questions, check:
1. Database migration executed correctly
2. Environment variables set properly
3. OpenAI API key has credits
4. User has items in closet (at least tops, bottoms, shoes)
