import { Link } from 'react-router-dom'

// Shown on a game's end screen once its score has been recorded: a short
// confirmation plus a link to the scoreboard. Rendered alongside GameOverActions.
export default function ScoreSubmitted({ submitted }) {
  if (!submitted) return null
  return (
    <p className="label-gold mt-4">
      Skor tablosuna eklendi ·{' '}
      <Link to="/oyunlar/skor" className="underline">
        Skorlar
      </Link>
    </p>
  )
}
