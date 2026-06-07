// The search + ordering row shared by every guest-listing admin panel. Keeps the
// two controls laid out consistently (search grows, sort sits beside it) so each
// panel only supplies its state and its own sort options.
import SearchBox from './SearchBox.jsx'
import SortSelect from './SortSelect.jsx'

export default function PanelControls({
  query,
  onQuery,
  sort,
  onSort,
  sortOptions,
  searchPlaceholder,
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-3">
      <div className="flex-1">
        <SearchBox value={query} onChange={onQuery} placeholder={searchPlaceholder} className="" />
      </div>
      <SortSelect value={sort} onChange={onSort} options={sortOptions} />
    </div>
  )
}
