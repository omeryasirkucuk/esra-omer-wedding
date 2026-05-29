import { motion } from 'framer-motion'
import { timeAgo, avatarColor, initial } from './format.js'

const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6 H20 M9 6 V4.5 A1 1 0 0 1 10 3.5 H14 A1 1 0 0 1 15 4.5 V6 M6.5 6 L7.3 19 A1.5 1.5 0 0 0 8.8 20.5 H15.2 A1.5 1.5 0 0 0 16.7 19 L17.5 6" />
  </svg>
)

// A single memory-board entry: avatar, name, time, text, optional media,
// like toggle and (for the author's own device) a delete control.
export default function PostCard({ post, liked, canDelete, onLike, onDelete, now }) {
  const { id, displayName, text, media, likes } = post

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="card-soft p-3 md:p-4"
    >
      <header className="flex items-center gap-2.5">
        <span
          className="flex h-7 w-7 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full font-sans text-[12px] md:text-[14px] text-white"
          style={{ background: avatarColor(displayName) }}
          aria-hidden="true"
        >
          {initial(displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-primary text-[15px] md:text-base leading-tight">
            {displayName}
          </p>
          <p className="label" style={{ fontSize: '0.5rem' }}>
            {timeAgo(post.createdAt, now)}
          </p>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(id)}
            aria-label="Gönderiyi sil"
            className="text-muted p-1"
          >
            <TrashIcon />
          </button>
        )}
      </header>

      {text && (
        <p className="mt-2 whitespace-pre-wrap break-words font-display text-primary-soft text-[15px] md:text-base leading-relaxed">
          {text}
        </p>
      )}

      {media?.url && (
        <div className="mt-2 overflow-hidden rounded-xl border border-[#e8dcbf]">
          {media.type === 'video' ? (
            <video
              src={media.url}
              controls
              className="w-full md:max-h-[420px] md:object-contain md:bg-[#f4ecdd]"
            />
          ) : (
            <img
              src={media.url}
              alt=""
              loading="lazy"
              className="w-full md:max-h-[420px] md:object-contain md:bg-[#f4ecdd]"
            />
          )}
        </div>
      )}

      <footer className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onLike(id)}
          aria-pressed={liked}
          aria-label="Beğen"
          className={`inline-flex items-center gap-1.5 text-[13px] font-display ${
            liked ? 'text-rose' : 'text-muted'
          }`}
        >
          <span className="text-base leading-none">{liked ? '♥' : '♡'}</span>
          {likes > 0 && <span>{likes}</span>}
        </button>
      </footer>
    </motion.article>
  )
}
