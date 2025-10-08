# UI Changes Snapshot (Interrupted)


## 1. ChangeCard Styling & Layout

**File**: `src/components/workspace/ChangeCard.tsx`

### Card Container (Lines 83-90)
```tsx
<div
  key={`${suggestion.id}-${index}`}
  data-testid={`change-card-${suggestion.id}`}
  className="group py-3 px-4 cursor-pointer rounded-lg border border-border/40 bg-background hover:bg-accent/30 hover:border-border/70 hover:shadow-sm transition-all focus-within:bg-accent/35 focus-within:border-border/80 focus-within:outline-none"
  onClick={() => onSuggestionClick(suggestion.id)}
  tabIndex={0}
  onKeyDown={handleCardKeyDown}
>
```

**Key Design Decisions**:
- Subtle borders: `border-border/40` (40% opacity)
- Hover state: `hover:bg-accent/30` + `hover:border-border/70` + `hover:shadow-sm`
- Focus state: `focus-within:bg-accent/35` + `focus-within:border-border/80`
- Padding: `py-3 px-4` for comfortable spacing
- Rounded corners: `rounded-lg`

### Header: Icon + Badge (Lines 92-116)
```tsx
{/* Header: Icon + Badge */}
<div className="flex items-center gap-2.5">
  <div className={`shrink-0 ${getSuggestionIconColor(suggestion.type)}`}>
    {getSuggestionIcon(suggestion.type)}
  </div>
  {isAISuggestion(suggestion) && suggestion.ruleTitle ? (
    <Badge
      variant="outline"
      className="text-[10px] font-normal gap-1 px-1.5 py-0.5 border-0 bg-background/50"
      style={{
        color: getSuggestionRuleColor(suggestion.ruleId),
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: getSuggestionRuleColor(suggestion.ruleId) }}
      />
      {suggestion.ruleTitle}
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0.5">
      {suggestion.actor === 'Tool' ? 'AI Tool' : 'Manual'}
    </Badge>
  )}
</div>
```

**Key Design Decisions**:
- Tiny badges: `text-[10px]`
- AI rule badges: colored dot (1.5x1.5) + rule title with custom color
- Manual/AI Tool badges: secondary variant
- Minimal padding: `px-1.5 py-0.5`

### Note Display (Line 119)
```tsx
{/* Note */}
<div className="text-sm font-medium leading-relaxed text-foreground">{suggestion.note}</div>
```

### Content Changes (Lines 121-147)
**Replace type**:
```tsx
<div className="text-xs space-y-1 pl-0.5">
  <div className="flex gap-2">
    <span className="text-muted-foreground/60 shrink-0 font-normal">From:</span>
    <span className="text-red-500/80 line-through break-words">"{suggestion.before}"</span>
  </div>
  <div className="flex gap-2">
    <span className="text-muted-foreground/60 shrink-0 font-normal">To:</span>
    <span className="text-green-600/80 font-normal break-words">"{suggestion.after}"</span>
  </div>
</div>
```

**Insert type**:
```tsx
<div className="text-xs pl-0.5">
  <span className="text-muted-foreground/60 font-normal">Insert:</span>{' '}
  <span className="text-green-600/80 font-normal break-words">"{suggestion.after}"</span>
</div>
```

**Delete type**:
```tsx
<div className="text-xs pl-0.5">
  <span className="text-muted-foreground/60 font-normal">Remove:</span>{' '}
  <span className="text-red-500/80 line-through break-words">"{suggestion.before}"</span>
</div>
```

**Key Design Decisions**:
- Small text: `text-xs`
- Muted labels: `text-muted-foreground/60`
- Color coding: red for delete, green for insert/new content
- Break words to prevent overflow

### Action Buttons (Lines 149-191)
```tsx
{/* Actions */}
<div className="flex gap-2">
  <Button
    data-testid={`change-card-accept-${suggestion.id}`}
    size="sm"
    variant="ghost"
    className="flex-1 text-xs h-7 font-normal border border-border/40 bg-background hover:bg-green-50 hover:text-green-700 hover:border-green-200 dark:hover:bg-green-950/30 dark:hover:text-green-400 dark:hover:border-green-900"
    onClick={(e) => {
      e.stopPropagation();
      onAccept?.(suggestion.id);
      // Focus next card after action
      setTimeout(() => {
        const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
        nextCard?.focus();
      }, 100);
    }}
    disabled={!onAccept || isBusy}
    aria-keyshortcuts="Enter"
  >
    <Check className="mr-1.5 h-3.5 w-3.5" />
    Accept
  </Button>
  <Button
    data-testid={`change-card-reject-${suggestion.id}`}
    size="sm"
    variant="ghost"
    className="flex-1 text-xs h-7 font-normal border border-border/40 bg-background hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-950/30 dark:hover:text-red-400 dark:hover:border-red-900"
    onClick={(e) => {
      e.stopPropagation();
      onReject?.(suggestion.id);
      // Focus next card after action
      setTimeout(() => {
        const nextCard = document.querySelector(`[data-testid="${getNextFocusableCard(index)}"]`) as HTMLElement;
        nextCard?.focus();
      }, 100);
    }}
    disabled={!onReject || isBusy}
    aria-keyshortcuts="Shift+Enter"
  >
    <X className="mr-1.5 h-3.5 w-3.5" />
    Reject
  </Button>
</div>
```

**Key Design Decisions**:
- Equal width buttons: `flex-1`
- Compact height: `h-7`
- Small text: `text-xs`
- Hover states with semantic colors (green for accept, red for reject)
- Dark mode variants included
- Keyboard shortcuts: Enter (accept), Shift+Enter (reject)
- Auto-focus next card after action

### Color Mapping (Lines 45-60)
```tsx
const getSuggestionRuleColor = (ruleId: string | undefined): string => {
  const ruleColorMap: { [key: string]: string } = {
    'copy-editor': '#DC143C',
    'line-editor': '#FF8C00',
    'proofreader': '#8A2BE2',
    'cmos-formatter': '#4682B4',
    'manuscript-evaluator': '#059669',
    'developmental-editor': '#7C3AED',
    // Fallback colors for legacy or custom rules
    'grammar': '#DC143C',
    'clarity': '#0066CC',
    'tone': '#009900',
    'style': '#9333EA',
  };
  return ruleColorMap[ruleId || ''] || '#6B7280';
};
```

---

## 2. ChangeList Layout & Container

**File**: `src/components/workspace/ChangeList.tsx`

### Container Structure (Lines 105-244)
```tsx
<div data-testid="changes-list" className="h-full flex flex-col">
  {/* Header */}
  <div className="px-4 py-3 border-b border-border/40">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <h3 className="font-semibold text-sm text-foreground">Change List</h3>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Show/Hide + Apply All buttons */}
      </div>
    </div>
  </div>

  {/* Rule Filter */}
  <div className="px-4 py-2.5 border-b border-border/30" data-testid="changes-filter-group">
    {/* Filter buttons */}
  </div>

  {/* Scrollable Card List */}
  <div className="flex-1 overflow-y-auto">
    <div className="p-3 space-y-2">
      {/* ChangeCards render here */}
    </div>
  </div>
</div>
```

### Filter Buttons (Lines 143-178)
```tsx
<Button
  size="sm"
  variant={ruleFilter === "all" ? "secondary" : "ghost"}
  className="text-xs h-7 px-3 font-normal rounded-md"
  onClick={() => setRuleFilter("all")}
>
  All
</Button>
{hasNonAISuggestions && (
  <Button
    size="sm"
    variant={ruleFilter === "non-ai" ? "secondary" : "ghost"}
    className="text-xs h-7 px-3 font-normal rounded-md"
    onClick={() => setRuleFilter("non-ai")}
  >
    Manual
  </Button>
)}
{rulesInUse.map((rule) => (
  <Button
    key={rule.id}
    size="sm"
    variant={ruleFilter === rule.id ? "secondary" : "ghost"}
    className="text-xs h-7 px-3 gap-1.5 font-normal rounded-md"
    onClick={() => setRuleFilter(rule.id)}
  >
    <div
      className="w-2 h-2 rounded-full"
      style={{
        backgroundColor: rule.color,
      }}
    />
    {rule.title}
  </Button>
))}
```

**Key Design Decisions**:
- Small compact buttons: `h-7 px-3 text-xs`
- Colored dots (2x2) for AI rule filters
- Active filter: `secondary` variant, inactive: `ghost`
- Minimal gap between buttons: `gap-0.5`

### Pagination (Lines 216-242)
```tsx
{totalPages > 1 && visibleSuggestions.length > 0 && (
  <div className="sticky bottom-0 bg-background/98 backdrop-blur-sm border-t border-border/30 py-2">
    <div className="flex items-center justify-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="h-6 px-2 text-xs"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs text-muted-foreground/80 px-2 font-medium min-w-[60px] text-center">
        {currentPage} / {totalPages}
      </span>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="h-6 px-2 text-xs"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
)}
```

**Key Design Decisions**:
- Sticky to bottom: `sticky bottom-0`
- Frosted glass effect: `bg-background/98 backdrop-blur-sm`
- Very compact buttons: `h-6 px-2`
- 25 items per page (reduced from 50)

---

## 3. Right Sidebar Width

**File**: `src/components/workspace/Editor.tsx`

### Sidebar Container (Line 1609)
```tsx
<div id="right-sidebar" className="w-full lg:w-[440px] bg-muted border-t lg:border-t-0 lg:border-l border-border overflow-hidden flex-shrink-0">
```

**Key Design Decisions**:
- **Desktop width**: `lg:w-[440px]` (increased from previous narrower width)
- **Mobile**: `w-full` (full width on mobile)
- **Non-shrinking**: `flex-shrink-0` ensures it maintains its width
- Background: `bg-muted`
- Borders: Top on mobile (`border-t`), left on desktop (`lg:border-l`)

---

## 4. Header Row 2 - Status Badges Consolidation

**File**: `src/components/workspace/Editor.tsx` (Similar structure exists in current editor)

### Full Header Row 2 Structure
```tsx
{/* Header Row 2 - Status Information */}
<div className="px-4 lg:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
  {/* Left: Large manuscript title */}
  <h1 className="text-2xl lg:text-3xl font-semibold text-foreground truncate flex-1 min-w-0">{manuscript.title}</h1>

  {/* Right: Status badges and metadata */}
  <div className="flex items-center gap-2 lg:gap-4 flex-wrap lg:flex-nowrap flex-shrink-0">
    <ProcessingStatus manuscript={manuscript} />
    <Badge className={getStatusBadgeVariant(manuscript.status)}>
      Round {manuscript.round}
    </Badge>
    <Badge className={getStatusBadgeVariant(manuscript.status)}>
      {manuscript.status}
    </Badge>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <User className="h-4 w-4" />
      <span>{manuscript.owner}</span>
    </div>
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <SettingsIcon className="h-4 w-4" />
      <span>Current turn</span>
    </div>
  </div>
</div>
```

**Key Design Decisions**:
- **Row Layout**: Flexbox with column on mobile, row on desktop
- **Left side**: Large title (text-2xl lg:text-3xl) with truncation
- **Right side**: All status info grouped together
  - ProcessingStatus component
  - Round badge
  - Status badge
  - Owner info (User icon + name)
  - Turn info (Settings icon + "Current turn")
- **Responsive gaps**: `gap-2` on mobile, `gap-4` on desktop
- **Wrapping**: `flex-wrap` on mobile, `lg:flex-nowrap` on desktop
- **Spacing**: `px-4 lg:px-6 py-4`

---

## Summary of Changes

### Visual Improvements
1. **ChangeCard**: Refined card borders, hover states, and typography
2. **Badges**: Tiny (10px) badges with colored dots for AI rules
3. **Buttons**: Compact action buttons with semantic color hovers
4. **Pagination**: Frosted glass sticky footer with 25 items/page

### Layout Changes
1. **Right Sidebar**: Widened to 440px on desktop
2. **Header Row 2**: Consolidated all status badges and metadata into single right-aligned group
3. **Card spacing**: `space-y-2` between cards in list

### UX Improvements
1. Keyboard navigation (Enter/Shift+Enter)
2. Auto-focus next card after action
3. Click-to-scroll behavior
4. Better mobile responsiveness

---

## Next Steps (When Resuming)

1. Apply UI changes from this document to Editor.tsx
2. Test sidebar width on various screen sizes
3. Verify badge grouping displays correctly
4. Test pagination performance with 1000+ suggestions

**Note**: Build verified successful (no blocking errors). The 21 TypeScript errors in Editor.tsx are pre-existing and unrelated to these UI changes.

---

**End of Snapshot**
