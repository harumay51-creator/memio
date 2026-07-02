import type { NavItem } from '../types'

export const NAV_ITEMS: NavItem[] = [
  // ── Home ──────────────────────────────────────────────
  { id: 'dashboard',  label: '홈',          icon: '⌂',  group: 'home' },
  // ── Input ──────────────────────────────────────────────
  { id: 'calendar',   label: '달력',        icon: '◷',  group: 'input' },
  { id: 'tasks',      label: '업무',        icon: '✓',  group: 'input' },
  { id: 'notes',      label: '메모',        icon: '✎',  group: 'input' },
  { id: 'ledger',     label: '가계부',      icon: '₩',  group: 'input' },
  // ── Explore ──────────────────────────────────────────────
  { id: 'history',    label: '히스토리',    icon: '☰',  group: 'explore' },
  { id: 'search',     label: '검색',        icon: '⌕',  group: 'explore' },
  // ── Hidden (Commented Out) ──────────────────────────────────
  // { id: 'projects',   label: '프로젝트',    icon: '◈',  group: 'main' },
  // { id: 'bookmarks',  label: '즐겨찾기',    icon: '★',  group: 'main' },
  // { id: 'stats',      label: '통계',        icon: '↗',  group: 'utility' },
  // ── Utility ───────────────────────────────────────────
  { id: 'settings',   label: '설정',        icon: '⚙',  group: 'utility' },
]
