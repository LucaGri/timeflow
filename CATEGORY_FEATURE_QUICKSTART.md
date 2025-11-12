# Customizable Categories - Quick Start Guide

## 🚀 Quick Start (For Testing Locally)

### Step 1: Run the Database Migration

1. Open your Supabase Dashboard (https://app.supabase.com)
2. Navigate to your TimeFlow project
3. Go to **SQL Editor**
4. Copy and paste the entire contents of `migrations/001_add_user_categories.sql`
5. Click **Run** to execute the migration
6. You should see "Success. No rows returned"

### Step 2: Migrate Existing Data

Still in the SQL Editor, run:
```sql
SELECT * FROM migrate_existing_events_to_categories();
```

You should see output like:
```
users_migrated | events_migrated | errors
10            | 150             | {}
```

### Step 3: Verify Migration

Run these verification queries:

**Check categories were created:**
```sql
SELECT user_id, COUNT(*) as category_count
FROM user_categories
GROUP BY user_id;
```
Each user should have 6 categories.

**Check events were migrated:**
```sql
SELECT
  COUNT(*) FILTER (WHERE category_id IS NOT NULL) as with_category_id,
  COUNT(*) FILTER (WHERE category_id IS NULL) as without_category_id
FROM events;
```
All events should have `with_category_id`, none should be `without_category_id`.

### Step 4: Start Your Development Server

```bash
npm install
npm run dev
```

### Step 5: Test the Feature

#### Test 1: Settings Page
1. Navigate to **Settings** page
2. Scroll down to **"Categorie Eventi"** section
3. Try:
   - Edit a category name (e.g., change "Meeting" to "Riunioni")
   - Change a category color (click "Colore" button)
   - Try to delete a default category (should be disabled)
   - Add a new custom category
   - Delete the custom category you just added

#### Test 2: Calendar Page Quick Access
1. Navigate to **Calendar** page
2. Look for the **"Categorie"** button in the header (near the "Sync" button)
3. Click it - a modal should open
4. Make changes in the modal
5. Close and verify changes persist

#### Test 3: Event Creation
1. Click **"Nuovo Evento"** button
2. Open the **Category** dropdown
3. You should see all your categories with icons (e.g., "📅 Meeting")
4. Create an event with a custom category
5. Verify it saves correctly

#### Test 4: Event Editing
1. Click on an existing event
2. Change its category to a custom one
3. Save and verify the change

---

## 🐛 Common Issues & Solutions

### Issue: "relation 'user_categories' does not exist"
**Cause**: Migration not run
**Solution**: Go back to Step 1 and run the migration SQL

### Issue: Categories section not showing in Settings
**Cause**: User not loaded or no userId
**Solution**:
1. Check browser console for errors
2. Verify you're logged in
3. Try refreshing the page

### Issue: EventModal shows "Caricamento..." forever
**Cause**: Categories not loading
**Solution**:
1. Open browser DevTools → Network tab
2. Check if request to `user_categories` is failing
3. Verify RLS policies are set correctly (they should be from migration)

### Issue: TypeScript errors after pulling changes
**Cause**: Types not updated
**Solution**:
```bash
npm install
# Restart your IDE/editor
```

### Issue: "Cannot delete category" error even for custom category
**Cause**: Category has events
**Solution**: This is expected behavior. The delete modal should show event count and ask for reassignment target.

---

## 🎨 Customization Examples

### Example 1: Rename Default Categories to Italian
```
Meeting → Riunione
Deep Work → Lavoro Concentrato
Admin → Amministrazione
Personal → Personale
Break → Pausa
Other → Altro
```

### Example 2: Add Work-Specific Categories
```
📧 Email Processing
📞 Client Calls
💡 Brainstorming
📝 Documentation
🧪 Testing
```

### Example 3: Add Personal Life Categories
```
🏋️ Exercise
🍳 Cooking
📚 Reading
🎮 Gaming
🎬 Entertainment
```

---

## 📊 Testing Analytics

1. Create several events with different categories
2. Go to **Analytics** page
3. Verify:
   - Top 5 categories are shown
   - If you have more than 5 categories with events, the rest are grouped as "Altro"
   - Colors match your customized category colors
   - Icons appear next to category names

---

## 🔍 Debugging Tips

### Check if categories loaded:
Open browser console and run:
```javascript
const { data } = await supabase
  .from('user_categories')
  .select('*')
  .order('display_order');
console.table(data);
```

### Check if events have category_id:
```javascript
const { data } = await supabase
  .from('events')
  .select('id, title, category_id, category')
  .limit(10);
console.table(data);
```

### Force reload categories:
In Settings or Calendar, open DevTools console:
```javascript
window.location.reload();
```

---

## ✅ Verification Checklist

Use this checklist to verify everything works:

**Database**:
- [ ] Migration ran successfully
- [ ] All users have 6 default categories
- [ ] All events have `category_id` set
- [ ] RLS policies are active (SELECT, INSERT, UPDATE, DELETE)

**Settings Page**:
- [ ] Category section appears
- [ ] Can edit category names
- [ ] Can change category colors (preset + custom HEX)
- [ ] Can add new category (up to 12 total)
- [ ] Can delete custom categories
- [ ] Cannot delete default categories
- [ ] Can drag & drop to reorder

**Calendar Page**:
- [ ] "Categorie" button appears in header
- [ ] Clicking opens modal with CategoryManager
- [ ] Changes made in modal persist after closing

**Event Modal**:
- [ ] Category dropdown shows all categories with icons
- [ ] Can create event with any category
- [ ] Can edit event and change category
- [ ] New events save with `category_id`

**Analytics**:
- [ ] Shows top 5 categories by time
- [ ] Additional categories grouped as "Altro"
- [ ] Custom colors appear correctly
- [ ] Icons show next to category names

---

## 📝 Notes for Testing

### Test User Setup
For thorough testing, create a test user with:
1. 6 default categories (auto-created on signup)
2. Add 3-4 custom categories
3. Create 20-30 events across all categories
4. Try all CRUD operations

### Edge Cases to Test
1. **Max Categories**: Try adding more than 12 categories
2. **Duplicate Names**: Try creating category with same name as existing
3. **Invalid Colors**: Try entering invalid HEX codes
4. **Empty Names**: Try saving category with empty name
5. **Delete with Events**: Try deleting category that has events
6. **Reorder**: Drag categories and verify order persists after refresh

### Performance Testing
1. Create 100+ events
2. Navigate to Settings → Categories
3. Verify event counts load quickly
4. Try editing multiple categories rapidly
5. Check for any lag or errors

---

## 🎯 Success Indicators

You'll know everything is working when:
1. ✅ Settings page loads with your categories
2. ✅ You can customize category names and colors
3. ✅ Category dropdown in EventModal shows your custom categories
4. ✅ Events save with the new category system
5. ✅ Analytics displays your category breakdown correctly
6. ✅ No console errors related to categories
7. ✅ Changes persist across page refreshes

---

## 🚨 Rollback (If Needed)

If you need to rollback the changes:

### Quick Rollback (Keep Data)
```sql
-- Just hide the feature by removing the UI components
-- Data remains in database for future use
```

### Full Rollback (Remove All)
```sql
-- WARNING: This deletes all category customizations!

-- Remove category_id from events
ALTER TABLE events DROP COLUMN category_id;

-- Remove the table
DROP TABLE user_categories CASCADE;

-- Remove the functions
DROP FUNCTION seed_default_categories(UUID);
DROP FUNCTION migrate_existing_events_to_categories();
DROP FUNCTION can_add_category(UUID);
DROP FUNCTION get_category_event_count(UUID);
DROP FUNCTION reassign_category_events(UUID, UUID);
```

---

**Happy Testing! 🎉**

For issues, refer to the main IMPLEMENTATION_SUMMARY.md or check the inline code comments.
