# Analytics Migration Guide - Dynamic Categories

## Overview
This guide explains how to update your Analytics components to use the new dynamic category system.

---

## Key Changes

### Before (Old System)
```typescript
// Old: Used hardcoded category enum
const stats = calculateCategoryStats(events);
// Returns: CategoryStats with 'category' field
```

### After (New System)
```typescript
// New: Pass user categories to calculate stats
const stats = calculateCategoryStats(events, userCategories);
// Returns: CategoryStats with 'categoryId' and 'categoryName' fields
```

---

## Step-by-Step Migration

### Step 1: Update Component to Load Categories

**Before:**
```typescript
const [events, setEvents] = useState<EventType[]>([]);

useEffect(() => {
  loadEvents();
}, []);
```

**After:**
```typescript
const [events, setEvents] = useState<EventType[]>([]);
const [categories, setCategories] = useState<UserCategory[]>([]);

useEffect(() => {
  loadEvents();
  loadCategories();
}, []);

const loadCategories = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from('user_categories')
    .select('*')
    .eq('user_id', user.id)
    .order('display_order', { ascending: true });

  if (!error && data) {
    setCategories(data);
  }
};
```

### Step 2: Update Stats Calculation

**Before:**
```typescript
const categoryStats = calculateCategoryStats(events);
```

**After:**
```typescript
const categoryStats = calculateCategoryStats(events, categories);
```

### Step 3: Update Rendering

**Before:**
```typescript
{categoryStats.map((stat) => (
  <div key={stat.category}>
    <span>{stat.category}</span>
    <span style={{ color: stat.color }}>●</span>
    <span>{stat.totalHours}h</span>
  </div>
))}
```

**After:**
```typescript
{categoryStats.map((stat) => (
  <div key={stat.categoryId}>
    {stat.icon && <span>{stat.icon}</span>}
    <span>{stat.categoryName}</span>
    <span style={{ color: stat.color }}>●</span>
    <span>{stat.totalHours}h</span>
  </div>
))}
```

---

## Example: Complete Analytics Component

```typescript
import { useState, useEffect } from 'react';
import { supabase, Event as EventType, UserCategory } from '@/lib/supabase';
import { calculateCategoryStats, CategoryStats } from '@/lib/analytics/timeStats';

export function AnalyticsDashboard() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [categories, setCategories] = useState<UserCategory[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id);

    // Load categories
    const { data: categoriesData } = await supabase
      .from('user_categories')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    if (eventsData && categoriesData) {
      setEvents(eventsData);
      setCategories(categoriesData);

      // Calculate stats with categories
      const stats = calculateCategoryStats(eventsData, categoriesData);
      setCategoryStats(stats);
    }

    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Category Breakdown</h2>
      <div className="category-list">
        {categoryStats.map((stat) => (
          <div key={stat.categoryId} className="category-item">
            <div className="category-info">
              {stat.icon && <span className="icon">{stat.icon}</span>}
              <span className="name">{stat.categoryName}</span>
            </div>

            <div className="category-stats">
              <span className="color-dot" style={{ backgroundColor: stat.color }} />
              <span className="hours">{stat.totalHours}h</span>
              <span className="percentage">{stat.percentage}%</span>
              <span className="events">{stat.eventCount} events</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Chart Integration Examples

### Pie Chart (e.g., Recharts)

**Before:**
```typescript
<PieChart>
  <Pie
    data={categoryStats}
    dataKey="totalHours"
    nameKey="category"
    fill="#8884d8"
  />
</PieChart>
```

**After:**
```typescript
<PieChart>
  <Pie
    data={categoryStats}
    dataKey="totalHours"
    nameKey="categoryName"  // Changed from 'category'
  >
    {categoryStats.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Pie>
</PieChart>
```

### Bar Chart (e.g., Recharts)

**Before:**
```typescript
<BarChart data={categoryStats}>
  <XAxis dataKey="category" />
  <Bar dataKey="totalHours" fill="#8884d8" />
</BarChart>
```

**After:**
```typescript
<BarChart data={categoryStats}>
  <XAxis dataKey="categoryName" />  // Changed
  <Bar dataKey="totalHours">
    {categoryStats.map((entry, index) => (
      <Cell key={`cell-${index}`} fill={entry.color} />
    ))}
  </Bar>
</BarChart>
```

### Legend with Icons

```typescript
<div className="chart-legend">
  {categoryStats.map((stat) => (
    <div key={stat.categoryId} className="legend-item">
      <span className="icon">{stat.icon}</span>
      <span className="dot" style={{ backgroundColor: stat.color }} />
      <span className="label">{stat.categoryName}</span>
      <span className="value">{stat.totalHours}h ({stat.percentage}%)</span>
    </div>
  ))}
</div>
```

---

## Top 5 + "Other" Behavior

The `calculateCategoryStats()` function automatically handles the Top 5 + "Other" logic:

```typescript
// Input: 8 categories with events
const stats = calculateCategoryStats(events, categories);

// Output: 6 items
// [0-4]: Top 5 categories by time
// [5]: "Other" (aggregates categories 6-8)

// Example output:
[
  { categoryId: 'cat1', categoryName: 'Meeting', totalHours: 45, ... },
  { categoryId: 'cat2', categoryName: 'Deep Work', totalHours: 38, ... },
  { categoryId: 'cat3', categoryName: 'Admin', totalHours: 22, ... },
  { categoryId: 'cat4', categoryName: 'Personal', totalHours: 15, ... },
  { categoryId: 'cat5', categoryName: 'Break', totalHours: 8, ... },
  { categoryId: 'other', categoryName: 'Altro', totalHours: 12, ... }
]
```

**Handling "Other" in UI:**
```typescript
{categoryStats.map((stat) => (
  <div key={stat.categoryId}>
    {stat.categoryId === 'other' ? (
      // Special rendering for "Other"
      <span className="other-category">📌 {stat.categoryName}</span>
    ) : (
      // Regular category
      <span>{stat.icon} {stat.categoryName}</span>
    )}
  </div>
))}
```

---

## Event Filtering for Analytics

When filtering events for analytics, ensure events have `category_id`:

```typescript
// Filter last 7 days
const sevenDaysAgo = new Date();
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { data: recentEvents } = await supabase
  .from('events')
  .select('*')
  .eq('user_id', userId)
  .gte('start_time', sevenDaysAgo.toISOString())
  .not('category_id', 'is', null);  // Exclude events without category

// Now safe to calculate stats
const stats = calculateCategoryStats(recentEvents, categories);
```

---

## Handling Missing Categories

If an event references a deleted category (shouldn't happen due to ON DELETE RESTRICT, but just in case):

```typescript
const calculateSafeStats = (events: EventType[], categories: UserCategory[]) => {
  // Filter out events with invalid category_id
  const validEvents = events.filter(event => {
    if (!event.category_id) return false;
    return categories.some(cat => cat.id === event.category_id);
  });

  return calculateCategoryStats(validEvents, categories);
};
```

---

## TypeScript Migration

Update your type imports:

**Before:**
```typescript
import { CategoryStats } from '@/lib/analytics/timeStats';

// Old interface:
interface CategoryStats {
  category: 'meeting' | 'deep_work' | ...
  // ...
}
```

**After:**
```typescript
import { CategoryStats } from '@/lib/analytics/timeStats';

// New interface:
interface CategoryStats {
  categoryId: string
  categoryName: string
  icon?: string
  // ...
}
```

---

## Common Pitfalls

### ❌ Pitfall 1: Not loading categories
```typescript
// BAD: This will fail
const stats = calculateCategoryStats(events, categories);
// If categories is empty array, stats will be empty too
```

**Solution**: Always load categories before calculating stats

### ❌ Pitfall 2: Using old 'category' field
```typescript
// BAD: Old field no longer reliable
<span>{stat.category}</span>
```

**Solution**: Use `stat.categoryName` instead

### ❌ Pitfall 3: Hardcoding colors
```typescript
// BAD: Doesn't respect user customization
const getColor = (category: string) => {
  return category === 'meeting' ? '#3b82f6' : '#6b7280';
};
```

**Solution**: Use `stat.color` from the CategoryStats

### ❌ Pitfall 4: Not handling "Other"
```typescript
// BAD: Assumes all stats have icons
{stats.map(stat => <span>{stat.icon}</span>)}
```

**Solution**: Check for icon existence:
```typescript
{stat.icon && <span>{stat.icon}</span>}
```

---

## Testing Your Analytics

### Test Checklist:
- [ ] Analytics loads without errors
- [ ] All custom category names display correctly
- [ ] Custom colors appear in charts
- [ ] Icons show next to category names
- [ ] Top 5 + "Other" logic works correctly
- [ ] Percentages add up to 100%
- [ ] No "undefined" or "null" categories appear
- [ ] Charts update when categories change
- [ ] Empty state handles gracefully (no events)

### Sample Test Data:
```typescript
// Create test events across all categories
const testEvents = [
  { category_id: 'cat1', start_time: '...', end_time: '...', ... }, // 4 hours
  { category_id: 'cat2', start_time: '...', end_time: '...', ... }, // 3 hours
  { category_id: 'cat3', start_time: '...', end_time: '...', ... }, // 2 hours
  // ... more events
];

const testCategories = [
  { id: 'cat1', name: 'Meeting', color: '#3b82f6', icon: '📅', ... },
  { id: 'cat2', name: 'Deep Work', color: '#8b5cf6', icon: '🎯', ... },
  // ... more categories
];

const stats = calculateCategoryStats(testEvents, testCategories);
console.table(stats);
```

---

## Performance Optimization

### Memoization
```typescript
import { useMemo } from 'react';

const categoryStats = useMemo(() => {
  return calculateCategoryStats(events, categories);
}, [events, categories]);
```

### Lazy Loading
```typescript
// Only calculate stats when user views analytics tab
const [activeTab, setActiveTab] = useState('overview');

useEffect(() => {
  if (activeTab === 'categories') {
    const stats = calculateCategoryStats(events, categories);
    setCategoryStats(stats);
  }
}, [activeTab, events, categories]);
```

---

## Need Help?

- Check the main `IMPLEMENTATION_SUMMARY.md` for database details
- Review `timeStats.ts` for function signatures
- Check browser console for errors
- Verify events have `category_id` set
- Ensure categories are loaded before calculating stats

---

**Happy Analytics! 📊**
