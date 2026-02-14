## Packages
recharts | Dashboard charts for stock trends and usage analytics
framer-motion | Smooth transitions for modals, lists, and page entries
date-fns | Formatting dates for transaction history (e.g., "2 hours ago", "Dec 15, 2023")
lucide-react | Beautiful icons for the dashboard interface (already in base but explicit for clarity)
clsx | Utility for constructing className strings conditionally
tailwind-merge | Utility for merging Tailwind classes safely

## Notes
- The app uses a dashboard layout with a sidebar.
- "Low Stock" logic: currentStock <= minStockLevel.
- Transactions are immutable; only creation is allowed (IN/OUT).
- Ingredients can be updated (name, unit, minStockLevel).
