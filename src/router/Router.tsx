import React from 'react'
import type { PageId } from '../types'
import { NAV_ITEMS }   from '../config/nav'
import CalendarPage    from '../components/CalendarPage'
import LedgerPage      from '../components/LedgerPage'
import NotesPage       from '../components/NotesPage'
import TasksPage       from '../components/TasksPage'
import HistoryPage     from '../components/HistoryPage'
import SearchPage      from '../components/SearchPage'
import SettingsPage    from '../components/SettingsPage'
import PlaceholderPage from '../components/PlaceholderPage'
import JournalPage     from '../components/JournalPage/JournalPage'
import { JournalStoreProvider } from '../store/JournalStore'
import { auth } from '../config/firebase'

interface RouterProps {
  page: PageId
  activeItemId?: string | null
  onNavigate?: (page: PageId, itemId?: string) => void
}

/**
 * Central router.
 * To add a new feature page: import it here and replace the matching
 * PlaceholderPage case with the real component.
 */
const Router: React.FC<RouterProps> = ({ page, activeItemId }) => {
  switch (page) {
      // ── Implemented pages ─────────────────────────────────────────────
      case 'search':
        return <SearchPage />

      case 'calendar':
        return <CalendarPage />

      case 'ledger':
        return <LedgerPage />

      case 'notes':
        return <NotesPage activeItemId={activeItemId} />

      case 'tasks':
        return <TasksPage activeItemId={activeItemId} />

      case 'journal':
        return (
          <JournalStoreProvider uid={auth.currentUser?.uid || ''}>
            <JournalPage activeItemId={activeItemId} />
          </JournalStoreProvider>
        )

    case 'history':
      return <HistoryPage />

    case 'settings':
      return <SettingsPage />

    // ── Coming-soon pages (replace one-by-one in later stages) ────────
    case 'projects':
    case 'bookmarks':
    case 'stats': {
      const navItem = NAV_ITEMS.find(n => n.id === page)
      return (
        <PlaceholderPage
          pageId={page}
          label={navItem?.label ?? page}
          icon={navItem?.icon ?? '?'}
        />
      )
    }

    default:
      return <CalendarPage />
  }
}

export default Router
