import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Invitation from './pages/invitation/Invitation.jsx'
import Pano from './pages/Pano.jsx'
import Album from './pages/Album.jsx'
import GamesHub from './pages/games/GamesHub.jsx'
import GameRoute from './pages/games/GameRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/davetiye" element={<Invitation />} />
        <Route path="/pano" element={<Pano />} />
        <Route path="/album" element={<Album />} />
        <Route path="/oyunlar" element={<GamesHub />} />
        <Route path="/oyunlar/:gameId" element={<GameRoute />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}
