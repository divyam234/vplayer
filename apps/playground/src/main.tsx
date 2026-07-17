import React from 'react'
import ReactDOM from 'react-dom/client'

import '@vplayer/react/player.css'
import './styles.css'
import { Playground } from './playground'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Playground />
  </React.StrictMode>,
)
